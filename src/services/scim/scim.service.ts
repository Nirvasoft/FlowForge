/**
 * FlowForge SCIM Service
 * SCIM 2.0 compliant user and group provisioning
 */

import { randomUUID } from 'crypto';
import type {
  SCIMUser,
  SCIMGroup,
  SCIMListResponse,
  SCIMPatchRequest,
  SCIMPatchOperation,
  SCIMError,
  SCIMServiceProviderConfig,
  SCIMResourceType,
  SCIMMeta,
  DirectoryUser,
  DirectoryGroup,
  DirectoryMembership,
} from '../../types/scim';
import { SCIMFilterParser, SCIMFilterMatcher, FilterExpression } from './filter-parser';

// ============================================================================
// In-Memory Storage (Replace with Prisma in production)
// ============================================================================

const users = new Map<string, DirectoryUser>();
const groups = new Map<string, DirectoryGroup>();
const memberships = new Map<string, DirectoryMembership>();

// ============================================================================
// SCIM Service
// ============================================================================

export class SCIMService {
  private baseUrl: string;
  private filterParser: SCIMFilterParser;
  private filterMatcher: SCIMFilterMatcher;

  constructor(baseUrl: string = 'https://api.flowforge.io/scim/v2') {
    this.baseUrl = baseUrl;
    this.filterParser = new SCIMFilterParser();
    this.filterMatcher = new SCIMFilterMatcher();
  }

  // ============================================================================
  // Service Provider Configuration
  // ============================================================================

  getServiceProviderConfig(): SCIMServiceProviderConfig {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      documentationUri: 'https://docs.flowforge.io/scim',
      patch: { supported: true },
      bulk: {
        supported: true,
        maxOperations: 1000,
        maxPayloadSize: 1048576, // 1MB
      },
      filter: {
        supported: true,
        maxResults: 200,
      },
      changePassword: { supported: false },
      sort: { supported: true },
      etag: { supported: true },
      authenticationSchemes: [
        {
          type: 'oauthbearertoken',
          name: 'OAuth Bearer Token',
          description: 'Authentication scheme using OAuth 2.0 Bearer Token',
          specUri: 'https://tools.ietf.org/html/rfc6750',
          primary: true,
        },
      ],
      meta: {
        resourceType: 'ServiceProviderConfig',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        location: `${this.baseUrl}/ServiceProviderConfig`,
      },
    };
  }

  getResourceTypes(): SCIMResourceType[] {
    return [
      {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
        id: 'User',
        name: 'User',
        description: 'User Account',
        endpoint: '/Users',
        schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
        schemaExtensions: [
          {
            schema: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
            required: false,
          },
        ],
        meta: {
          resourceType: 'ResourceType',
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          location: `${this.baseUrl}/ResourceTypes/User`,
        },
      },
      {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
        id: 'Group',
        name: 'Group',
        description: 'Group',
        endpoint: '/Groups',
        schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
        meta: {
          resourceType: 'ResourceType',
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          location: `${this.baseUrl}/ResourceTypes/Group`,
        },
      },
    ];
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  async createUser(scimUser: Partial<SCIMUser>, configId: string = 'default'): Promise<SCIMUser> {
    // Check for existing user with same userName
    for (const user of users.values()) {
      if (user.username.toLowerCase() === scimUser.userName?.toLowerCase()) {
        throw this.createError('409', 'uniqueness', `User with userName "${scimUser.userName}" already exists`);
      }
    }

    const id = randomUUID();
    const now = new Date();

    // Extract primary email
    const primaryEmail = scimUser.emails?.find(e => e.primary)?.value ||
      scimUser.emails?.[0]?.value ||
      scimUser.userName || '';

    // Create internal user
    const directoryUser: DirectoryUser = {
      id,
      externalId: scimUser.externalId || id,
      configId,
      username: scimUser.userName || '',
      email: primaryEmail,
      emailVerified: false,
      firstName: scimUser.name?.givenName,
      lastName: scimUser.name?.familyName,
      displayName: scimUser.displayName ||
        `${scimUser.name?.givenName || ''} ${scimUser.name?.familyName || ''}`.trim() ||
        scimUser.userName || '',
      title: scimUser.title,
      department: scimUser['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User']?.department,
      active: scimUser.active !== false,
      suspended: false,
      rawData: scimUser as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
      lastSyncAt: now,
    };

    users.set(id, directoryUser);

    return this.toSCIMUser(directoryUser);
  }

  async getUser(id: string): Promise<SCIMUser | null> {
    const user = users.get(id);
    if (!user) return null;
    return this.toSCIMUser(user);
  }

  async getUserByExternalId(externalId: string): Promise<SCIMUser | null> {
    for (const user of users.values()) {
      if (user.externalId === externalId) {
        return this.toSCIMUser(user);
      }
    }
    return null;
  }

  async listUsers(options: {
    filter?: string;
    startIndex?: number;
    count?: number;
    sortBy?: string;
    sortOrder?: 'ascending' | 'descending';
    attributes?: string[];
  } = {}): Promise<SCIMListResponse<SCIMUser>> {
    let items = Array.from(users.values());

    // Apply filter
    if (options.filter) {
      try {
        const expression = this.filterParser.parse(options.filter);
        items = items.filter(user => {
          const scimUser = this.toSCIMUser(user);
          return this.filterMatcher.match(scimUser as unknown as Record<string, unknown>, expression);
        });
      } catch (error) {
        throw this.createError('400', 'invalidFilter', `Invalid filter: ${error}`);
      }
    }

    // Apply sort
    if (options.sortBy) {
      items.sort((a, b) => {
        const aVal = this.getSortValue(a, options.sortBy!);
        const bVal = this.getSortValue(b, options.sortBy!);
        const cmp = String(aVal).localeCompare(String(bVal));
        return options.sortOrder === 'descending' ? -cmp : cmp;
      });
    }

    // Paginate
    const startIndex = options.startIndex || 1;
    const count = Math.min(options.count || 100, 200);
    const total = items.length;
    const start = startIndex - 1;
    const pageItems = items.slice(start, start + count);

    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: total,
      startIndex,
      itemsPerPage: pageItems.length,
      Resources: pageItems.map(u => this.toSCIMUser(u)),
    };
  }

  async updateUser(id: string, scimUser: Partial<SCIMUser>): Promise<SCIMUser> {
    const existing = users.get(id);
    if (!existing) {
      throw this.createError('404', undefined, `User ${id} not found`);
    }

    const now = new Date();

    // Update fields
    if (scimUser.userName !== undefined) existing.username = scimUser.userName;
    if (scimUser.active !== undefined) existing.active = scimUser.active;
    if (scimUser.displayName !== undefined) existing.displayName = scimUser.displayName;
    if (scimUser.title !== undefined) existing.title = scimUser.title;
    if (scimUser.name?.givenName !== undefined) existing.firstName = scimUser.name.givenName;
    if (scimUser.name?.familyName !== undefined) existing.lastName = scimUser.name.familyName;
    if (scimUser.emails?.length) {
      const primaryEmail = scimUser.emails.find(e => e.primary)?.value || scimUser.emails[0]?.value;
      if (primaryEmail) existing.email = primaryEmail;
    }

    const enterprise = scimUser['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'];
    if (enterprise?.department !== undefined) existing.department = enterprise.department;

    existing.rawData = { ...existing.rawData, ...scimUser };
    existing.updatedAt = now;
    existing.lastSyncAt = now;

    users.set(id, existing);

    return this.toSCIMUser(existing);
  }

  async patchUser(id: string, patchRequest: SCIMPatchRequest): Promise<SCIMUser> {
    const existing = users.get(id);
    if (!existing) {
      throw this.createError('404', undefined, `User ${id} not found`);
    }

    for (const operation of patchRequest.Operations) {
      this.applyPatchOperation(existing, operation);
    }

    existing.updatedAt = new Date();
    existing.lastSyncAt = new Date();
    users.set(id, existing);

    return this.toSCIMUser(existing);
  }

  async deleteUser(id: string): Promise<void> {
    if (!users.has(id)) {
      throw this.createError('404', undefined, `User ${id} not found`);
    }

    // Remove user from all groups
    for (const [membershipId, membership] of memberships) {
      if (membership.userId === id) {
        memberships.delete(membershipId);
      }
    }

    users.delete(id);
  }

  // ============================================================================
  // Group Operations
  // ============================================================================

  async createGroup(scimGroup: Partial<SCIMGroup>, configId: string = 'default'): Promise<SCIMGroup> {
    // Check for existing group with same displayName
    for (const group of groups.values()) {
      if (group.displayName.toLowerCase() === scimGroup.displayName?.toLowerCase()) {
        throw this.createError('409', 'uniqueness', `Group with displayName "${scimGroup.displayName}" already exists`);
      }
    }

    const id = randomUUID();
    const now = new Date();

    const directoryGroup: DirectoryGroup = {
      id,
      externalId: scimGroup.externalId || id,
      configId,
      name: scimGroup.displayName || '',
      displayName: scimGroup.displayName || '',
      description: undefined,
      memberCount: 0,
      rawData: scimGroup as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
      lastSyncAt: now,
    };

    groups.set(id, directoryGroup);

    // Add members if provided
    if (scimGroup.members?.length) {
      for (const member of scimGroup.members) {
        await this.addGroupMember(id, member.value);
      }
      directoryGroup.memberCount = scimGroup.members.length;
      groups.set(id, directoryGroup);
    }

    return this.toSCIMGroup(directoryGroup);
  }

  async getGroup(id: string): Promise<SCIMGroup | null> {
    const group = groups.get(id);
    if (!group) return null;
    return this.toSCIMGroup(group);
  }

  async listGroups(options: {
    filter?: string;
    startIndex?: number;
    count?: number;
    sortBy?: string;
    sortOrder?: 'ascending' | 'descending';
  } = {}): Promise<SCIMListResponse<SCIMGroup>> {
    let items = Array.from(groups.values());

    // Apply filter
    if (options.filter) {
      try {
        const expression = this.filterParser.parse(options.filter);
        items = items.filter(group => {
          const scimGroup = this.toSCIMGroup(group);
          return this.filterMatcher.match(scimGroup as unknown as Record<string, unknown>, expression);
        });
      } catch (error) {
        throw this.createError('400', 'invalidFilter', `Invalid filter: ${error}`);
      }
    }

    // Apply sort
    if (options.sortBy) {
      items.sort((a, b) => {
        const aVal = a.displayName;
        const bVal = b.displayName;
        const cmp = aVal.localeCompare(bVal);
        return options.sortOrder === 'descending' ? -cmp : cmp;
      });
    }

    // Paginate
    const startIndex = options.startIndex || 1;
    const count = Math.min(options.count || 100, 200);
    const total = items.length;
    const start = startIndex - 1;
    const pageItems = items.slice(start, start + count);

    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: total,
      startIndex,
      itemsPerPage: pageItems.length,
      Resources: pageItems.map(g => this.toSCIMGroup(g)),
    };
  }

  async updateGroup(id: string, scimGroup: Partial<SCIMGroup>): Promise<SCIMGroup> {
    const existing = groups.get(id);
    if (!existing) {
      throw this.createError('404', undefined, `Group ${id} not found`);
    }

    if (scimGroup.displayName !== undefined) {
      existing.displayName = scimGroup.displayName;
      existing.name = scimGroup.displayName;
    }

    existing.rawData = { ...existing.rawData, ...scimGroup };
    existing.updatedAt = new Date();
    existing.lastSyncAt = new Date();

    // Handle member updates (replace all)
    if (scimGroup.members !== undefined) {
      // Remove all existing memberships
      for (const [membershipId, membership] of memberships) {
        if (membership.groupId === id) {
          memberships.delete(membershipId);
        }
      }

      // Add new members
      for (const member of scimGroup.members) {
        await this.addGroupMember(id, member.value);
      }

      existing.memberCount = scimGroup.members.length;
    }

    groups.set(id, existing);

    return this.toSCIMGroup(existing);
  }

  async patchGroup(id: string, patchRequest: SCIMPatchRequest): Promise<SCIMGroup> {
    const existing = groups.get(id);
    if (!existing) {
      throw this.createError('404', undefined, `Group ${id} not found`);
    }

    for (const operation of patchRequest.Operations) {
      await this.applyGroupPatchOperation(id, existing, operation);
    }

    existing.updatedAt = new Date();
    existing.lastSyncAt = new Date();
    groups.set(id, existing);

    return this.toSCIMGroup(existing);
  }

  async deleteGroup(id: string): Promise<void> {
    if (!groups.has(id)) {
      throw this.createError('404', undefined, `Group ${id} not found`);
    }

    // Remove all memberships
    for (const [membershipId, membership] of memberships) {
      if (membership.groupId === id) {
        memberships.delete(membershipId);
      }
    }

    groups.delete(id);
  }

  // ============================================================================
  // Membership Operations
  // ============================================================================

  async addGroupMember(groupId: string, userId: string): Promise<void> {
    const group = groups.get(groupId);
    if (!group) {
      throw this.createError('404', undefined, `Group ${groupId} not found`);
    }

    const user = users.get(userId);
    if (!user) {
      throw this.createError('404', undefined, `User ${userId} not found`);
    }

    // Check if already a member
    for (const membership of memberships.values()) {
      if (membership.groupId === groupId && membership.userId === userId) {
        return; // Already a member
      }
    }

    const membershipId = randomUUID();
    memberships.set(membershipId, {
      id: membershipId,
      configId: group.configId,
      userId,
      groupId,
      externalUserId: user.externalId,
      externalGroupId: group.externalId,
      type: 'direct',
      createdAt: new Date(),
    });

    group.memberCount++;
    groups.set(groupId, group);
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    for (const [membershipId, membership] of memberships) {
      if (membership.groupId === groupId && membership.userId === userId) {
        memberships.delete(membershipId);

        const group = groups.get(groupId);
        if (group) {
          group.memberCount = Math.max(0, group.memberCount - 1);
          groups.set(groupId, group);
        }

        return;
      }
    }
  }

  async getGroupMembers(groupId: string): Promise<DirectoryUser[]> {
    const memberUsers: DirectoryUser[] = [];

    for (const membership of memberships.values()) {
      if (membership.groupId === groupId) {
        const user = users.get(membership.userId);
        if (user) {
          memberUsers.push(user);
        }
      }
    }

    return memberUsers;
  }

  async getUserGroups(userId: string): Promise<DirectoryGroup[]> {
    const userGroups: DirectoryGroup[] = [];

    for (const membership of memberships.values()) {
      if (membership.userId === userId) {
        const group = groups.get(membership.groupId);
        if (group) {
          userGroups.push(group);
        }
      }
    }

    return userGroups;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private toSCIMUser(user: DirectoryUser): SCIMUser {
    const userGroups = Array.from(memberships.values())
      .filter(m => m.userId === user.id)
      .map(m => {
        const group = groups.get(m.groupId);
        return {
          value: m.groupId,
          $ref: `${this.baseUrl}/Groups/${m.groupId}`,
          display: group?.displayName || '',
          type: 'direct' as const,
        };
      });

    const scimUser: SCIMUser = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: user.id,
      externalId: user.externalId,
      userName: user.username,
      name: {
        formatted: user.displayName,
        givenName: user.firstName,
        familyName: user.lastName,
      },
      displayName: user.displayName,
      title: user.title,
      active: user.active,
      emails: user.email ? [
        {
          value: user.email,
          type: 'work',
          primary: true,
        },
      ] : [],
      groups: userGroups,
      meta: {
        resourceType: 'User',
        created: user.createdAt.toISOString(),
        lastModified: user.updatedAt.toISOString(),
        location: `${this.baseUrl}/Users/${user.id}`,
        version: `W/"${user.updatedAt.getTime()}"`,
      },
    };

    if (user.department) {
      scimUser['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'] = {
        department: user.department,
      };
      scimUser.schemas.push('urn:ietf:params:scim:schemas:extension:enterprise:2.0:User');
    }

    return scimUser;
  }

  private toSCIMGroup(group: DirectoryGroup): SCIMGroup {
    const groupMembers = Array.from(memberships.values())
      .filter(m => m.groupId === group.id)
      .map(m => {
        const user = users.get(m.userId);
        return {
          value: m.userId,
          $ref: `${this.baseUrl}/Users/${m.userId}`,
          display: user?.displayName || '',
          type: 'User' as const,
        };
      });

    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: group.id,
      externalId: group.externalId,
      displayName: group.displayName,
      members: groupMembers,
      meta: {
        resourceType: 'Group',
        created: group.createdAt.toISOString(),
        lastModified: group.updatedAt.toISOString(),
        location: `${this.baseUrl}/Groups/${group.id}`,
        version: `W/"${group.updatedAt.getTime()}"`,
      },
    };
  }

  private applyPatchOperation(user: DirectoryUser, operation: SCIMPatchOperation): void {
    const { op, path, value } = operation;

    if (!path) {
      // No path means value is an object to merge
      if (op === 'add' || op === 'replace') {
        const updates = value as Record<string, unknown>;
        if (updates.userName) user.username = updates.userName as string;
        if (updates.active !== undefined) user.active = updates.active as boolean;
        if (updates.displayName) user.displayName = updates.displayName as string;
        // ... handle other fields
      }
      return;
    }

    const pathLower = path.toLowerCase();

    switch (op) {
      case 'add':
      case 'replace':
        if (pathLower === 'username') user.username = value as string;
        else if (pathLower === 'active') user.active = value as boolean;
        else if (pathLower === 'displayname') user.displayName = value as string;
        else if (pathLower === 'title') user.title = value as string;
        else if (pathLower === 'name.givenname') user.firstName = value as string;
        else if (pathLower === 'name.familyname') user.lastName = value as string;
        break;

      case 'remove':
        if (pathLower === 'title') user.title = undefined;
        else if (pathLower === 'name.givenname') user.firstName = undefined;
        else if (pathLower === 'name.familyname') user.lastName = undefined;
        break;
    }
  }

  private async applyGroupPatchOperation(
    groupId: string,
    group: DirectoryGroup,
    operation: SCIMPatchOperation
  ): Promise<void> {
    const { op, path, value } = operation;

    if (!path) {
      if (op === 'add' || op === 'replace') {
        const updates = value as Record<string, unknown>;
        if (updates.displayName) {
          group.displayName = updates.displayName as string;
          group.name = updates.displayName as string;
        }
      }
      return;
    }

    const pathLower = path.toLowerCase();

    if (pathLower === 'displayname') {
      if (op === 'add' || op === 'replace') {
        group.displayName = value as string;
        group.name = value as string;
      }
    } else if (pathLower === 'members' || pathLower.startsWith('members[')) {
      if (op === 'add') {
        const members = Array.isArray(value) ? value : [value];
        for (const member of members) {
          const memberId = (member as { value: string }).value;
          await this.addGroupMember(groupId, memberId);
        }
      } else if (op === 'remove') {
        if (pathLower === 'members') {
          // Remove all members
          for (const [membershipId, membership] of memberships) {
            if (membership.groupId === groupId) {
              memberships.delete(membershipId);
            }
          }
          group.memberCount = 0;
        } else {
          // Remove specific member: members[value eq "userId"]
          const match = path.match(/members\[value eq "([^"]+)"\]/i);
          if (match) {
            await this.removeGroupMember(groupId, match[1]!);
          }
        }
      }
    }
  }

  private getSortValue(user: DirectoryUser, sortBy: string): string {
    const sortByLower = sortBy.toLowerCase();
    switch (sortByLower) {
      case 'username': return user.username;
      case 'displayname': return user.displayName || '';
      case 'name.givenname': return user.firstName || '';
      case 'name.familyname': return user.lastName || '';
      default: return '';
    }
  }

  private createError(status: string, scimType?: string, detail?: string): SCIMError {
    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      status,
      scimType: scimType as any,
      detail,
    };
  }
}

export const scimService = new SCIMService();
