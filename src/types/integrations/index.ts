/**
 * FlowForge Integrations Types
 * Connectors, OAuth, Webhooks, and API Gateway
 */

// ============================================================================
// Connector Types
// ============================================================================

export interface Connector {
  id: string;
  name: string;
  slug: string;
  description?: string;
  
  // Connector type
  type: ConnectorType;
  provider?: ConnectorProvider;
  
  // Configuration
  config: ConnectorConfig;
  
  // Authentication
  auth: AuthConfig;
  
  // Operations
  operations: ConnectorOperation[];
  
  // Status
  status: 'active' | 'inactive' | 'error';
  lastTestedAt?: Date;
  lastError?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type ConnectorType = 'rest' | 'graphql' | 'soap' | 'database' | 'file' | 'custom';

export type ConnectorProvider = 
  | 'salesforce'
  | 'google'
  | 'microsoft'
  | 'slack'
  | 'hubspot'
  | 'zendesk'
  | 'jira'
  | 'github'
  | 'stripe'
  | 'twilio'
  | 'sendgrid'
  | 'aws'
  | 'custom';

export interface ConnectorConfig {
  // Base URL
  baseUrl: string;
  
  // Default headers
  headers?: Record<string, string>;
  
  // Timeout
  timeout?: number;
  
  // Retry
  retryEnabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  
  // Rate limiting
  rateLimitEnabled?: boolean;
  requestsPerSecond?: number;
  
  // SSL
  verifySsl?: boolean;
  
  // Provider-specific
  providerConfig?: Record<string, unknown>;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthConfig {
  type: AuthType;
  credentials: AuthCredentials;
  
  // Token storage
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  
  // OAuth specific
  oauth?: OAuthConfig;
}

export type AuthType = 
  | 'none'
  | 'api_key'
  | 'basic'
  | 'bearer'
  | 'oauth2'
  | 'oauth2_client_credentials'
  | 'custom';

export type AuthCredentials = 
  | { type: 'none' }
  | { type: 'api_key'; key: string; header?: string; prefix?: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'bearer'; token: string }
  | { type: 'oauth2'; clientId: string; clientSecret: string }
  | { type: 'custom'; config: Record<string, unknown> };

export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
  scopes: string[];
  redirectUri: string;
  
  // PKCE
  usePkce?: boolean;
  
  // State
  state?: string;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  scope?: string;
}

// ============================================================================
// Operation Types
// ============================================================================

export interface ConnectorOperation {
  id: string;
  name: string;
  description?: string;
  
  // HTTP
  method: HttpMethod;
  path: string;
  
  // Parameters
  parameters: OperationParameter[];
  
  // Request body
  requestBody?: RequestBodyConfig;
  
  // Response
  responseMapping?: ResponseMapping;
  
  // Pagination
  pagination?: PaginationConfig;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OperationParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  default?: unknown;
  description?: string;
}

export interface RequestBodyConfig {
  contentType: 'json' | 'form' | 'multipart' | 'xml';
  schema?: Record<string, unknown>;
}

export interface ResponseMapping {
  dataPath?: string;
  errorPath?: string;
  transforms?: Array<{
    source: string;
    target: string;
    transform?: string;
  }>;
}

export interface PaginationConfig {
  type: 'offset' | 'cursor' | 'page' | 'link';
  
  // Offset pagination
  limitParam?: string;
  offsetParam?: string;
  
  // Page pagination
  pageParam?: string;
  pageSizeParam?: string;
  
  // Cursor pagination
  cursorParam?: string;
  cursorPath?: string;
  
  // Link pagination
  nextLinkPath?: string;
  
  // Common
  totalPath?: string;
  dataPath?: string;
  defaultPageSize?: number;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface Webhook {
  id: string;
  name: string;
  description?: string;
  
  // Endpoint
  path: string;
  method: 'GET' | 'POST' | 'PUT';
  
  // Security
  secret?: string;
  signatureHeader?: string;
  signatureAlgorithm?: 'sha256' | 'sha1' | 'md5';
  
  // Authentication
  authType: 'none' | 'secret' | 'basic' | 'bearer' | 'signature';
  authConfig?: Record<string, unknown>;
  
  // Validation
  validatePayload?: boolean;
  payloadSchema?: Record<string, unknown>;
  
  // Processing
  targetType: 'workflow' | 'connector' | 'script';
  targetId: string;
  inputMapping?: Record<string, string>;
  
  // Status
  enabled: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Stats
  callCount: number;
  lastCalledAt?: Date;
  lastError?: string;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  
  // Request
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  
  // Response
  status: 'received' | 'processing' | 'completed' | 'failed';
  responseCode?: number;
  responseBody?: unknown;
  error?: string;
  
  // Timing
  receivedAt: Date;
  processedAt?: Date;
  duration?: number;
}

// ============================================================================
// Connection Instance Types
// ============================================================================

export interface Connection {
  id: string;
  name: string;
  connectorId: string;
  
  // Instance-specific config
  config: Record<string, unknown>;
  
  // Instance-specific auth
  auth: AuthConfig;
  
  // Status
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastConnectedAt?: Date;
  lastError?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ============================================================================
// Execution Types
// ============================================================================

export interface ConnectorExecution {
  id: string;
  connectionId: string;
  operationId: string;
  
  // Request
  request: {
    method: HttpMethod;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
  };
  
  // Response
  response?: {
    status: number;
    headers: Record<string, string>;
    body: unknown;
  };
  
  // Result
  success: boolean;
  error?: string;
  data?: unknown;
  
  // Timing
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  
  // Context
  triggeredBy?: string;
  workflowExecutionId?: string;
}

// ============================================================================
// Pre-built Connector Templates
// ============================================================================

export interface ConnectorTemplate {
  id: string;
  provider: ConnectorProvider;
  name: string;
  description: string;
  icon: string;
  
  // Default config
  defaultConfig: Partial<ConnectorConfig>;
  
  // Auth requirements
  authType: AuthType;
  oauthConfig?: Partial<OAuthConfig>;
  requiredCredentials: string[];
  
  // Pre-defined operations
  operations: ConnectorOperation[];
  
  // Setup instructions
  setupGuide?: string;
  documentationUrl?: string;
}

// ============================================================================
// API Gateway Types
// ============================================================================

export interface ApiEndpoint {
  id: string;
  name: string;
  description?: string;
  
  // Endpoint
  path: string;
  method: HttpMethod;
  
  // Target
  targetType: 'workflow' | 'connector' | 'function';
  targetId: string;
  targetOperation?: string;
  
  // Request processing
  requestTransform?: TransformConfig;
  responseTransform?: TransformConfig;
  
  // Authentication
  authRequired: boolean;
  authMethods?: ('api_key' | 'bearer' | 'oauth2')[];
  
  // Rate limiting
  rateLimit?: {
    enabled: boolean;
    requests: number;
    window: number; // seconds
  };
  
  // Caching
  cache?: {
    enabled: boolean;
    ttl: number;
    varyBy?: string[];
  };
  
  // CORS
  cors?: CorsConfig;
  
  // Status
  enabled: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface TransformConfig {
  type: 'jmespath' | 'jsonata' | 'template' | 'script';
  expression: string;
}

export interface CorsConfig {
  enabled: boolean;
  origins: string[];
  methods: HttpMethod[];
  headers: string[];
  credentials: boolean;
  maxAge?: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type IntegrationEventType =
  | 'connector.created'
  | 'connector.updated'
  | 'connector.deleted'
  | 'connector.tested'
  | 'connection.created'
  | 'connection.connected'
  | 'connection.disconnected'
  | 'connection.error'
  | 'webhook.received'
  | 'webhook.processed'
  | 'webhook.failed'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed';

export interface IntegrationEvent {
  type: IntegrationEventType;
  timestamp: Date;
  connectorId?: string;
  connectionId?: string;
  webhookId?: string;
  executionId?: string;
  data?: Record<string, unknown>;
}
