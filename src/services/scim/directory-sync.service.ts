/**
 * FlowForge Directory Sync Service
 * Manages sync configurations, scheduling, and incremental sync
 */

import { randomUUID } from 'crypto';
import type {
  DirectorySyncConfig,
  AttributeMapping,
  SyncEvent,
  SyncError,
  SCIMUser,
  SCIMGroup,
  SCIMListResponse,
} from '../../types/scim';
import { SCIMService, scimService } from './scim.service';

// ============================================================================
// In-Memory Storage (Replace with Prisma in production)
// ============================================================================

const syncConfigs = new Map<string, DirectorySyncConfig>();
const syncEvents = new Map<string, SyncEvent[]>();

// ============================================================================
// Default Attribute Mappings
// ============================================================================

const DEFAULT_USER_MAPPING: AttributeMapping[] = [
  { source: 'userName', target: 'username', required: true },
  { source: 'emails[primary eq true].value', target: 'email', required: true },
  { source: 'name.givenName', target: 'firstName' },
  { source: 'name.familyName', target: 'lastName' },
  { source: 'displayName', target: 'displayName' },
  { source: 'title', target: 'title' },
  { source: 'active', target: 'active' },
  { source: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User.department', target: 'department' },
  { source: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User.employeeNumber', target: 'employeeId' },
];

const DEFAULT_GROUP_MAPPING: AttributeMapping[] = [
  { source: 'displayName', target: 'name', required: true },
  { source: 'externalId', target: 'externalId' },
];

// ============================================================================
// Directory Sync Service
// ============================================================================

export class DirectorySyncService {
  private scimService: SCIMService;

  constructor() {
    this.scimService = scimService;
  }

  // ============================================================================
  // Sync Configuration Management
  // ============================================================================

  async createConfig(input: {
    name: string;
    provider: DirectorySyncConfig['provider'];
    baseUrl: string;
    bearerToken: string;
    syncInterval?: number;
    userId: string;
  }): Promise<DirectorySyncConfig> {
    const id = randomUUID();
    const now = new Date();

    const config: DirectorySyncConfig = {
      id,
      name: input.name,
      provider: input.provider,
      enabled: false,
      baseUrl: input.baseUrl,
      bearerToken: input.bearerToken,
      syncInterval: input.syncInterval || 60, // Default 1 hour
      userMapping: [...DEFAULT_USER_MAPPING],
      groupMapping: [...DEFAULT_GROUP_MAPPING],
      syncUsers: true,
      syncGroups: true,
      provisionUsers: true,
      deprovisionUsers: false,
      provisionGroups: true,
      deprovisionGroups: false,
      createdAt: now,
      updatedAt: now,
      createdBy: input.userId,
    };

    syncConfigs.set(id, config);
    syncEvents.set(id, []);

    return config;
  }

  async getConfig(id: string): Promise<DirectorySyncConfig | null> {
    return syncConfigs.get(id) || null;
  }

  async listConfigs(): Promise<DirectorySyncConfig[]> {
    return Array.from(syncConfigs.values());
  }

  async updateConfig(
    id: string,
    input: Partial<Omit<DirectorySyncConfig, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<DirectorySyncConfig | null> {
    const config = syncConfigs.get(id);
    if (!config) return null;

    Object.assign(config, input, { updatedAt: new Date() });
    syncConfigs.set(id, config);

    return config;
  }

  async deleteConfig(id: string): Promise<boolean> {
    if (!syncConfigs.has(id)) return false;
    syncConfigs.delete(id);
    syncEvents.delete(id);
    return true;
  }

  async enableConfig(id: string): Promise<DirectorySyncConfig | null> {
    return this.updateConfig(id, { enabled: true });
  }

  async disableConfig(id: string): Promise<DirectorySyncConfig | null> {
    return this.updateConfig(id, { enabled: false });
  }

  // ============================================================================
  // Sync Execution
  // ============================================================================

  async runFullSync(configId: string): Promise<SyncEvent> {
    const config = syncConfigs.get(configId);
    if (!config) {
      throw new Error(`Sync config ${configId} not found`);
    }

    const event = this.createSyncEvent(configId, 'full');

    try {
      // Sync users
      if (config.syncUsers) {
        await this.syncUsers(config, event);
      }

      // Sync groups
      if (config.syncGroups) {
        await this.syncGroups(config, event);
      }

      event.status = event.userErrors + event.groupErrors > 0 ? 'partial' : 'success';
      event.completedAt = new Date();

      // Update config
      config.lastSyncAt = new Date();
      config.lastSyncStatus = event.status;
      config.lastSyncError = (event.status as string) === 'failed'
        ? event.errors[0]?.message
        : undefined;
      syncConfigs.set(configId, config);

    } catch (error) {
      event.status = 'failed';
      event.completedAt = new Date();
      event.errors.push({
        resourceType: 'User',
        operation: 'read',
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      config.lastSyncStatus = 'failed';
      config.lastSyncError = error instanceof Error ? error.message : 'Unknown error';
      syncConfigs.set(configId, config);
    }

    // Store event
    const configEvents = syncEvents.get(configId) || [];
    configEvents.push(event);
    syncEvents.set(configId, configEvents);

    return event;
  }

  async runIncrementalSync(configId: string, since: Date): Promise<SyncEvent> {
    const config = syncConfigs.get(configId);
    if (!config) {
      throw new Error(`Sync config ${configId} not found`);
    }

    const event = this.createSyncEvent(configId, 'incremental');

    try {
      // Fetch only users/groups modified since last sync
      // This would use the IdP's delta API in production

      if (config.syncUsers) {
        await this.syncUsers(config, event, since);
      }

      if (config.syncGroups) {
        await this.syncGroups(config, event, since);
      }

      event.status = event.userErrors + event.groupErrors > 0 ? 'partial' : 'success';
      event.completedAt = new Date();

      config.lastSyncAt = new Date();
      config.lastSyncStatus = event.status;
      syncConfigs.set(configId, config);

    } catch (error) {
      event.status = 'failed';
      event.completedAt = new Date();
    }

    const configEvents = syncEvents.get(configId) || [];
    configEvents.push(event);
    syncEvents.set(configId, configEvents);

    return event;
  }

  // ============================================================================
  // User Sync
  // ============================================================================

  private async syncUsers(
    config: DirectorySyncConfig,
    event: SyncEvent,
    since?: Date
  ): Promise<void> {
    // In production, this would call the external IdP
    // For demo, we'll simulate fetching users

    const externalUsers = await this.fetchExternalUsers(config, since);

    for (const externalUser of externalUsers) {
      try {
        // Map external user to internal format
        const userData = this.mapUser(externalUser, config.userMapping);

        // Check if user exists
        const existingUser = await this.scimService.getUserByExternalId(
          externalUser.externalId || externalUser.id
        );

        if (existingUser) {
          // Update existing user
          if (config.provisionUsers) {
            await this.scimService.updateUser(existingUser.id, userData);
            event.usersUpdated++;
          } else {
            event.usersSkipped++;
          }
        } else {
          // Create new user
          if (config.provisionUsers) {
            await this.scimService.createUser({
              ...userData,
              externalId: externalUser.externalId || externalUser.id,
            }, config.id);
            event.usersCreated++;
          } else {
            event.usersSkipped++;
          }
        }
      } catch (error) {
        event.userErrors++;
        event.errors.push({
          resourceType: 'User',
          externalId: externalUser.externalId || externalUser.id,
          operation: 'create',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Handle deprovisioning
    if (config.deprovisionUsers) {
      await this.deprovisionUsers(config, externalUsers, event);
    }
  }

  private async fetchExternalUsers(
    config: DirectorySyncConfig,
    since?: Date
  ): Promise<SCIMUser[]> {
    // In production, this would make HTTP requests to the IdP's SCIM endpoint
    // For demo, return empty array - actual implementation would use fetch()

    // Example of what the implementation would look like:
    /*
    const filter = since 
      ? `meta.lastModified gt "${since.toISOString()}"` 
      : config.userFilter;
    
    const response = await fetch(`${config.baseUrl}/Users?filter=${filter}`, {
      headers: {
        'Authorization': `Bearer ${config.bearerToken}`,
        'Content-Type': 'application/scim+json',
      },
    });
    
    const data = await response.json() as SCIMListResponse<SCIMUser>;
    return data.Resources;
    */

    return [];
  }

  private mapUser(
    externalUser: SCIMUser,
    mapping: AttributeMapping[]
  ): Partial<SCIMUser> {
    const result: Record<string, unknown> = {};

    for (const map of mapping) {
      const value = this.getNestedValue(externalUser as unknown as Record<string, unknown>, map.source);

      if (value !== undefined && value !== null) {
        let transformedValue = value;

        // Apply transform
        if (map.transform === 'lowercase' && typeof value === 'string') {
          transformedValue = value.toLowerCase();
        } else if (map.transform === 'uppercase' && typeof value === 'string') {
          transformedValue = value.toUpperCase();
        } else if (map.transform === 'trim' && typeof value === 'string') {
          transformedValue = value.trim();
        }

        this.setNestedValue(result, map.target, transformedValue);
      } else if (map.defaultValue !== undefined) {
        this.setNestedValue(result, map.target, map.defaultValue);
      }
    }

    return result as Partial<SCIMUser>;
  }

  private async deprovisionUsers(
    config: DirectorySyncConfig,
    currentUsers: SCIMUser[],
    event: SyncEvent
  ): Promise<void> {
    // Get all users synced from this config
    const response = await this.scimService.listUsers();
    const existingUserIds = new Set(currentUsers.map(u => u.externalId || u.id));

    for (const user of response.Resources) {
      if (user.externalId && !existingUserIds.has(user.externalId)) {
        try {
          // User no longer exists in IdP - deactivate
          await this.scimService.updateUser(user.id, { active: false });
          event.usersDeactivated++;
        } catch (error) {
          event.userErrors++;
          event.errors.push({
            resourceType: 'User',
            resourceId: user.id,
            operation: 'update',
            message: 'Failed to deactivate user',
          });
        }
      }
    }
  }

  // ============================================================================
  // Group Sync
  // ============================================================================

  private async syncGroups(
    config: DirectorySyncConfig,
    event: SyncEvent,
    since?: Date
  ): Promise<void> {
    const externalGroups = await this.fetchExternalGroups(config, since);

    for (const externalGroup of externalGroups) {
      try {
        const existingGroup = await this.findGroupByExternalId(
          externalGroup.externalId || externalGroup.id
        );

        if (existingGroup) {
          if (config.provisionGroups) {
            await this.scimService.updateGroup(existingGroup.id, {
              displayName: externalGroup.displayName,
              members: externalGroup.members,
            });
            event.groupsUpdated++;

            // Track membership changes
            const addedMembers = this.getMembershipChanges(
              existingGroup.members || [],
              externalGroup.members || [],
              'added'
            );
            const removedMembers = this.getMembershipChanges(
              existingGroup.members || [],
              externalGroup.members || [],
              'removed'
            );
            event.membershipsAdded += addedMembers.length;
            event.membershipsRemoved += removedMembers.length;
          } else {
            event.groupsSkipped++;
          }
        } else {
          if (config.provisionGroups) {
            await this.scimService.createGroup({
              ...externalGroup,
              externalId: externalGroup.externalId || externalGroup.id,
            }, config.id);
            event.groupsCreated++;
            event.membershipsAdded += (externalGroup.members?.length || 0);
          } else {
            event.groupsSkipped++;
          }
        }
      } catch (error) {
        event.groupErrors++;
        event.errors.push({
          resourceType: 'Group',
          externalId: externalGroup.externalId || externalGroup.id,
          operation: 'create',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (config.deprovisionGroups) {
      await this.deprovisionGroups(config, externalGroups, event);
    }
  }

  private async fetchExternalGroups(
    config: DirectorySyncConfig,
    since?: Date
  ): Promise<SCIMGroup[]> {
    // Similar to fetchExternalUsers - would call IdP in production
    return [];
  }

  private async findGroupByExternalId(externalId: string): Promise<SCIMGroup | null> {
    const response = await this.scimService.listGroups({
      filter: `externalId eq "${externalId}"`,
    });
    return response.Resources[0] || null;
  }

  private getMembershipChanges(
    oldMembers: Array<{ value: string }>,
    newMembers: Array<{ value: string }>,
    type: 'added' | 'removed'
  ): string[] {
    const oldIds = new Set(oldMembers.map(m => m.value));
    const newIds = new Set(newMembers.map(m => m.value));

    if (type === 'added') {
      return [...newIds].filter(id => !oldIds.has(id));
    } else {
      return [...oldIds].filter(id => !newIds.has(id));
    }
  }

  private async deprovisionGroups(
    config: DirectorySyncConfig,
    currentGroups: SCIMGroup[],
    event: SyncEvent
  ): Promise<void> {
    const response = await this.scimService.listGroups();
    const existingGroupIds = new Set(currentGroups.map(g => g.externalId || g.id));

    for (const group of response.Resources) {
      if (group.externalId && !existingGroupIds.has(group.externalId)) {
        try {
          await this.scimService.deleteGroup(group.id);
          event.groupsDeleted++;
        } catch (error) {
          event.groupErrors++;
          event.errors.push({
            resourceType: 'Group',
            resourceId: group.id,
            operation: 'delete',
            message: 'Failed to delete group',
          });
        }
      }
    }
  }

  // ============================================================================
  // Sync History
  // ============================================================================

  async getSyncHistory(
    configId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ events: SyncEvent[]; total: number }> {
    const events = syncEvents.get(configId) || [];
    const sorted = [...events].sort((a, b) =>
      b.startedAt.getTime() - a.startedAt.getTime()
    );

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    return {
      events: sorted.slice(offset, offset + limit),
      total: events.length,
    };
  }

  async getLastSyncEvent(configId: string): Promise<SyncEvent | null> {
    const events = syncEvents.get(configId) || [];
    if (events.length === 0) return null;

    return events.reduce((latest, event) =>
      event.startedAt > latest.startedAt ? event : latest
    );
  }

  // ============================================================================
  // Test Connection
  // ============================================================================

  async testConnection(config: DirectorySyncConfig): Promise<{
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  }> {
    try {
      // In production, this would make a test request to the IdP
      /*
      const response = await fetch(`${config.baseUrl}/ServiceProviderConfig`, {
        headers: {
          'Authorization': `Bearer ${config.bearerToken}`,
          'Content-Type': 'application/scim+json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Connection successful',
        details: data,
      };
      */

      // For demo, simulate success
      return {
        success: true,
        message: 'Connection test passed',
        details: {
          provider: config.provider,
          baseUrl: config.baseUrl,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private createSyncEvent(configId: string, type: SyncEvent['type']): SyncEvent {
    return {
      id: randomUUID(),
      configId,
      type,
      status: 'running',
      startedAt: new Date(),
      usersCreated: 0,
      usersUpdated: 0,
      usersDeactivated: 0,
      usersSkipped: 0,
      userErrors: 0,
      groupsCreated: 0,
      groupsUpdated: 0,
      groupsDeleted: 0,
      groupsSkipped: 0,
      groupErrors: 0,
      membershipsAdded: 0,
      membershipsRemoved: 0,
      errors: [],
    };
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    // Handle array filter syntax: emails[primary eq true].value
    const arrayMatch = path.match(/^([^[]+)\[([^\]]+)\]\.?(.*)$/);

    if (arrayMatch) {
      const [, arrayPath, filter, restPath] = arrayMatch;
      const array = this.getNestedValue(obj, arrayPath!);

      if (!Array.isArray(array)) return undefined;

      // Parse simple filter: primary eq true
      const filterMatch = filter!.match(/^(\w+)\s+eq\s+(.+)$/);
      if (filterMatch) {
        const [, key, valueStr] = filterMatch;
        const value = valueStr! === 'true' ? true :
          valueStr! === 'false' ? false :
            valueStr!.replace(/^["']|["']$/g, '');

        const item = array.find(i =>
          typeof i === 'object' && i !== null && (i as Record<string, unknown>)[key!] === value
        );

        if (item && restPath) {
          return this.getNestedValue(item as Record<string, unknown>, restPath);
        }
        return item;
      }
    }

    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!(part! in current)) {
        current[part!] = {};
      }
      current = current[part!] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]!] = value;
  }
}

export const directorySyncService = new DirectorySyncService();
