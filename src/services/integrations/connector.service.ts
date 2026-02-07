/**
 * FlowForge Connector Service
 * Manage connectors, connections, and execute operations
 */

import { randomUUID } from 'crypto';
import type {
  Connector,
  ConnectorConfig,
  ConnectorOperation,
  AuthConfig,
  AuthType,
  Connection,
  ConnectorExecution,
  OAuthToken,
  HttpMethod,
  ConnectorProvider,
} from '../../types/integrations';

// ============================================================================
// In-Memory Storage
// ============================================================================

const connectors = new Map<string, Connector>();
const connections = new Map<string, Connection>();
const executions = new Map<string, ConnectorExecution[]>();

// ============================================================================
// Connector Service
// ============================================================================

export class ConnectorService {

  // ============================================================================
  // Connector CRUD
  // ============================================================================

  async createConnector(input: {
    name: string;
    description?: string;
    type: Connector['type'];
    provider?: ConnectorProvider;
    config: ConnectorConfig;
    auth: AuthConfig;
    createdBy: string;
  }): Promise<Connector> {
    const id = randomUUID();
    const now = new Date();

    const connector: Connector = {
      id,
      name: input.name,
      slug: this.generateSlug(input.name),
      description: input.description,
      type: input.type,
      provider: input.provider,
      config: input.config,
      auth: input.auth,
      operations: [],
      status: 'inactive',
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    connectors.set(id, connector);
    executions.set(id, []);
    return connector;
  }

  async getConnector(id: string): Promise<Connector | null> {
    return connectors.get(id) || null;
  }

  async listConnectors(options: {
    type?: Connector['type'];
    provider?: ConnectorProvider;
    status?: Connector['status'];
    search?: string;
  } = {}): Promise<{ connectors: Connector[]; total: number }> {
    let items = Array.from(connectors.values());

    if (options.type) items = items.filter(c => c.type === options.type);
    if (options.provider) items = items.filter(c => c.provider === options.provider);
    if (options.status) items = items.filter(c => c.status === options.status);
    if (options.search) {
      const search = options.search.toLowerCase();
      items = items.filter(c =>
        c.name.toLowerCase().includes(search) ||
        c.description?.toLowerCase().includes(search)
      );
    }

    return { connectors: items, total: items.length };
  }

  async updateConnector(
    id: string,
    input: Partial<Pick<Connector, 'name' | 'description' | 'config' | 'auth'>>
  ): Promise<Connector | null> {
    const connector = connectors.get(id);
    if (!connector) return null;

    if (input.name) {
      connector.name = input.name;
      connector.slug = this.generateSlug(input.name);
    }
    if (input.description !== undefined) connector.description = input.description;
    if (input.config) connector.config = { ...connector.config, ...input.config };
    if (input.auth) connector.auth = { ...connector.auth, ...input.auth };

    connector.updatedAt = new Date();
    connectors.set(id, connector);
    return connector;
  }

  async deleteConnector(id: string): Promise<boolean> {
    // Delete associated connections
    for (const [connId, conn] of connections) {
      if (conn.connectorId === id) {
        connections.delete(connId);
      }
    }
    executions.delete(id);
    return connectors.delete(id);
  }

  // ============================================================================
  // Operation Management
  // ============================================================================

  async addOperation(connectorId: string, operation: Omit<ConnectorOperation, 'id'>): Promise<ConnectorOperation | null> {
    const connector = connectors.get(connectorId);
    if (!connector) return null;

    const newOp: ConnectorOperation = {
      ...operation,
      id: randomUUID(),
    };

    connector.operations.push(newOp);
    connector.updatedAt = new Date();
    connectors.set(connectorId, connector);
    return newOp;
  }

  async updateOperation(
    connectorId: string,
    operationId: string,
    updates: Partial<Omit<ConnectorOperation, 'id'>>
  ): Promise<ConnectorOperation | null> {
    const connector = connectors.get(connectorId);
    if (!connector) return null;

    const operation = connector.operations.find(o => o.id === operationId);
    if (!operation) return null;

    Object.assign(operation, updates);
    connector.updatedAt = new Date();
    connectors.set(connectorId, connector);
    return operation;
  }

  async deleteOperation(connectorId: string, operationId: string): Promise<boolean> {
    const connector = connectors.get(connectorId);
    if (!connector) return false;

    const index = connector.operations.findIndex(o => o.id === operationId);
    if (index === -1) return false;

    connector.operations.splice(index, 1);
    connector.updatedAt = new Date();
    connectors.set(connectorId, connector);
    return true;
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async createConnection(input: {
    name: string;
    connectorId: string;
    config?: Record<string, unknown>;
    auth: AuthConfig;
    createdBy: string;
  }): Promise<Connection> {
    const connector = connectors.get(input.connectorId);
    if (!connector) throw new Error('Connector not found');

    const id = randomUUID();
    const now = new Date();

    const connection: Connection = {
      id,
      name: input.name,
      connectorId: input.connectorId,
      config: input.config || {},
      auth: input.auth,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    connections.set(id, connection);
    return connection;
  }

  async getConnection(id: string): Promise<Connection | null> {
    return connections.get(id) || null;
  }

  async listConnections(connectorId?: string): Promise<Connection[]> {
    let items = Array.from(connections.values());
    if (connectorId) {
      items = items.filter(c => c.connectorId === connectorId);
    }
    return items;
  }

  async updateConnection(
    id: string,
    input: Partial<Pick<Connection, 'name' | 'config' | 'auth'>>
  ): Promise<Connection | null> {
    const connection = connections.get(id);
    if (!connection) return null;

    if (input.name) connection.name = input.name;
    if (input.config) connection.config = { ...connection.config, ...input.config };
    if (input.auth) connection.auth = { ...connection.auth, ...input.auth };

    connection.updatedAt = new Date();
    connections.set(id, connection);
    return connection;
  }

  async deleteConnection(id: string): Promise<boolean> {
    return connections.delete(id);
  }

  // ============================================================================
  // OAuth Flow
  // ============================================================================

  async getOAuthAuthorizationUrl(connectorId: string, redirectUri: string): Promise<string> {
    const connector = connectors.get(connectorId);
    if (!connector) throw new Error('Connector not found');
    if (connector.auth.type !== 'oauth2') throw new Error('Connector does not use OAuth');

    const oauth = connector.auth.oauth;
    if (!oauth) throw new Error('OAuth config not found');

    const state = randomUUID();
    const params = new URLSearchParams({
      client_id: (connector.auth.credentials as any).clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: oauth.scopes.join(' '),
      state,
    });

    return `${oauth.authorizationUrl}?${params.toString()}`;
  }

  async exchangeOAuthCode(
    connectionId: string,
    code: string,
    redirectUri: string
  ): Promise<OAuthToken> {
    const connection = connections.get(connectionId);
    if (!connection) throw new Error('Connection not found');

    const connector = connectors.get(connection.connectorId);
    if (!connector) throw new Error('Connector not found');

    const oauth = connector.auth.oauth;
    if (!oauth) throw new Error('OAuth config not found');

    // In production, make actual HTTP request to token endpoint
    // Simulated token response
    const token: OAuthToken = {
      accessToken: `access_${randomUUID()}`,
      refreshToken: `refresh_${randomUUID()}`,
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600000),
      scope: oauth.scopes.join(' '),
    };

    // Store tokens
    connection.auth.accessToken = token.accessToken;
    connection.auth.refreshToken = token.refreshToken;
    connection.auth.tokenExpiresAt = token.expiresAt;
    connection.status = 'connected';
    connection.lastConnectedAt = new Date();
    connections.set(connectionId, connection);

    return token;
  }

  async refreshOAuthToken(connectionId: string): Promise<OAuthToken> {
    const connection = connections.get(connectionId);
    if (!connection) throw new Error('Connection not found');

    if (!connection.auth.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Simulated refresh
    const token: OAuthToken = {
      accessToken: `access_${randomUUID()}`,
      refreshToken: connection.auth.refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600000),
    };

    connection.auth.accessToken = token.accessToken;
    connection.auth.tokenExpiresAt = token.expiresAt;
    connections.set(connectionId, connection);

    return token;
  }

  // ============================================================================
  // Execution
  // ============================================================================

  async executeOperation(
    connectionId: string,
    operationId: string,
    parameters: Record<string, unknown> = {},
    body?: unknown
  ): Promise<ConnectorExecution> {
    const connection = connections.get(connectionId);
    if (!connection) throw new Error('Connection not found');

    const connector = connectors.get(connection.connectorId);
    if (!connector) throw new Error('Connector not found');

    const operation = connector.operations.find(o => o.id === operationId);
    if (!operation) throw new Error('Operation not found');

    // Check token expiration
    if (connection.auth.tokenExpiresAt && connection.auth.tokenExpiresAt < new Date()) {
      await this.refreshOAuthToken(connectionId);
    }

    const execution: ConnectorExecution = {
      id: randomUUID(),
      connectionId,
      operationId,
      request: {
        method: operation.method,
        url: this.buildUrl(connector.config.baseUrl, operation.path, parameters),
        headers: this.buildHeaders(connector, connection),
        body,
      },
      success: false,
      startedAt: new Date(),
    };

    try {
      // In production, make actual HTTP request
      // Simulated response
      execution.response = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: { success: true, data: { id: randomUUID() } },
      };
      execution.success = true;
      execution.data = execution.response.body;
    } catch (error) {
      execution.success = false;
      execution.error = error instanceof Error ? error.message : 'Unknown error';
    }

    execution.completedAt = new Date();
    execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

    // Store execution
    const connectorExecutions = executions.get(connector.id) || [];
    connectorExecutions.push(execution);
    if (connectorExecutions.length > 100) connectorExecutions.shift();
    executions.set(connector.id, connectorExecutions);

    return execution;
  }

  private buildUrl(baseUrl: string, path: string, parameters: Record<string, unknown>): string {
    let url = `${baseUrl}${path}`;
    
    // Replace path parameters
    for (const [key, value] of Object.entries(parameters)) {
      url = url.replace(`{${key}}`, String(value));
    }

    return url;
  }

  private buildHeaders(connector: Connector, connection: Connection): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...connector.config.headers,
    };

    // Add auth headers
    switch (connection.auth.type) {
      case 'api_key': {
        const creds = connection.auth.credentials as { key: string; header?: string; prefix?: string };
        const header = creds.header || 'X-API-Key';
        headers[header] = creds.prefix ? `${creds.prefix} ${creds.key}` : creds.key;
        break;
      }
      case 'basic': {
        const creds = connection.auth.credentials as { username: string; password: string };
        const token = Buffer.from(`${creds.username}:${creds.password}`).toString('base64');
        headers['Authorization'] = `Basic ${token}`;
        break;
      }
      case 'bearer': {
        const creds = connection.auth.credentials as { token: string };
        headers['Authorization'] = `Bearer ${creds.token}`;
        break;
      }
      case 'oauth2':
      case 'oauth2_client_credentials': {
        if (connection.auth.accessToken) {
          headers['Authorization'] = `Bearer ${connection.auth.accessToken}`;
        }
        break;
      }
    }

    return headers;
  }

  // ============================================================================
  // Testing
  // ============================================================================

  async testConnector(id: string): Promise<{ success: boolean; message: string; details?: unknown }> {
    const connector = connectors.get(id);
    if (!connector) throw new Error('Connector not found');

    try {
      // In production, make actual test request
      connector.status = 'active';
      connector.lastTestedAt = new Date();
      connector.lastError = undefined;
      connectors.set(id, connector);

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      connector.status = 'error';
      connector.lastTestedAt = new Date();
      connector.lastError = message;
      connectors.set(id, connector);

      return { success: false, message };
    }
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const connection = connections.get(id);
    if (!connection) throw new Error('Connection not found');

    try {
      connection.status = 'connected';
      connection.lastConnectedAt = new Date();
      connection.lastError = undefined;
      connections.set(id, connection);

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      connection.status = 'error';
      connection.lastError = message;
      connections.set(id, connection);

      return { success: false, message };
    }
  }

  // ============================================================================
  // Execution History
  // ============================================================================

  async getExecutions(connectorId: string, limit = 50): Promise<ConnectorExecution[]> {
    const items = executions.get(connectorId) || [];
    return items.slice(-limit).reverse();
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}

export const connectorService = new ConnectorService();
