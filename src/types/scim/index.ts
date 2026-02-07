/**
 * FlowForge SCIM 2.0 Type Definitions
 * Complete types for directory sync with Azure AD, Okta, etc.
 * Based on RFC 7643 and RFC 7644
 */

// ============================================================================
// SCIM Core Schema Types
// ============================================================================

export interface SCIMResource {
  schemas: string[];
  id: string;
  externalId?: string;
  meta: SCIMMeta;
}

export interface SCIMMeta {
  resourceType: 'User' | 'Group' | 'ServiceProviderConfig' | 'ResourceType' | 'Schema';
  created: string;
  lastModified: string;
  location: string;
  version?: string;
}

// ============================================================================
// SCIM User Types (RFC 7643 Section 4.1)
// ============================================================================

export interface SCIMUser extends SCIMResource {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:User', ...string[]];
  userName: string;
  name?: SCIMName;
  displayName?: string;
  nickName?: string;
  profileUrl?: string;
  title?: string;
  userType?: string;
  preferredLanguage?: string;
  locale?: string;
  timezone?: string;
  active: boolean;
  password?: string; // Write-only
  emails?: SCIMMultiValuedAttribute[];
  phoneNumbers?: SCIMMultiValuedAttribute[];
  ims?: SCIMMultiValuedAttribute[];
  photos?: SCIMMultiValuedAttribute[];
  addresses?: SCIMAddress[];
  groups?: SCIMGroupMembership[];
  entitlements?: SCIMMultiValuedAttribute[];
  roles?: SCIMMultiValuedAttribute[];
  x509Certificates?: SCIMMultiValuedAttribute[];
  
  // Enterprise extension
  'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'?: SCIMEnterpriseUser;
}

export interface SCIMName {
  formatted?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
}

export interface SCIMMultiValuedAttribute {
  value: string;
  display?: string;
  type?: string;
  primary?: boolean;
}

export interface SCIMAddress {
  formatted?: string;
  streetAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  type?: string;
  primary?: boolean;
}

export interface SCIMGroupMembership {
  value: string;
  $ref?: string;
  display?: string;
  type?: 'direct' | 'indirect';
}

export interface SCIMEnterpriseUser {
  employeeNumber?: string;
  costCenter?: string;
  organization?: string;
  division?: string;
  department?: string;
  manager?: {
    value?: string;
    $ref?: string;
    displayName?: string;
  };
}

// ============================================================================
// SCIM Group Types (RFC 7643 Section 4.2)
// ============================================================================

export interface SCIMGroup extends SCIMResource {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'];
  displayName: string;
  members?: SCIMGroupMember[];
}

export interface SCIMGroupMember {
  value: string;
  $ref?: string;
  display?: string;
  type?: 'User' | 'Group';
}

// ============================================================================
// SCIM Operations (RFC 7644)
// ============================================================================

export interface SCIMListResponse<T> {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}

export interface SCIMPatchRequest {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'];
  Operations: SCIMPatchOperation[];
}

export interface SCIMPatchOperation {
  op: 'add' | 'remove' | 'replace';
  path?: string;
  value?: unknown;
}

export interface SCIMBulkRequest {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:BulkRequest'];
  failOnErrors?: number;
  Operations: SCIMBulkOperation[];
}

export interface SCIMBulkOperation {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  bulkId?: string;
  version?: string;
  path: string;
  data?: unknown;
}

export interface SCIMBulkResponse {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:BulkResponse'];
  Operations: SCIMBulkOperationResponse[];
}

export interface SCIMBulkOperationResponse {
  method: string;
  bulkId?: string;
  version?: string;
  location?: string;
  status: string;
  response?: unknown;
}

// ============================================================================
// SCIM Error Types
// ============================================================================

export interface SCIMError {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'];
  status: string;
  scimType?: SCIMErrorType;
  detail?: string;
}

export type SCIMErrorType =
  | 'invalidFilter'
  | 'tooMany'
  | 'uniqueness'
  | 'mutability'
  | 'invalidSyntax'
  | 'invalidPath'
  | 'noTarget'
  | 'invalidValue'
  | 'invalidVers'
  | 'sensitive';

// ============================================================================
// SCIM Filter Types
// ============================================================================

export interface SCIMFilter {
  attribute: string;
  operator: SCIMFilterOperator;
  value: string | boolean | number | null;
}

export type SCIMFilterOperator =
  | 'eq'  // equal
  | 'ne'  // not equal
  | 'co'  // contains
  | 'sw'  // starts with
  | 'ew'  // ends with
  | 'pr'  // present (has value)
  | 'gt'  // greater than
  | 'ge'  // greater than or equal
  | 'lt'  // less than
  | 'le'; // less than or equal

export interface SCIMSearchRequest {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:SearchRequest'];
  attributes?: string[];
  excludedAttributes?: string[];
  filter?: string;
  sortBy?: string;
  sortOrder?: 'ascending' | 'descending';
  startIndex?: number;
  count?: number;
}

// ============================================================================
// Service Provider Configuration
// ============================================================================

export interface SCIMServiceProviderConfig {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'];
  documentationUri?: string;
  patch: SCIMSupported;
  bulk: SCIMBulkSupported;
  filter: SCIMFilterSupported;
  changePassword: SCIMSupported;
  sort: SCIMSupported;
  etag: SCIMSupported;
  authenticationSchemes: SCIMAuthenticationScheme[];
  meta: SCIMMeta;
}

export interface SCIMSupported {
  supported: boolean;
}

export interface SCIMBulkSupported extends SCIMSupported {
  maxOperations: number;
  maxPayloadSize: number;
}

export interface SCIMFilterSupported extends SCIMSupported {
  maxResults: number;
}

export interface SCIMAuthenticationScheme {
  type: 'oauth' | 'oauth2' | 'oauthbearertoken' | 'httpbasic' | 'httpdigest';
  name: string;
  description: string;
  specUri?: string;
  documentationUri?: string;
  primary?: boolean;
}

// ============================================================================
// Resource Type Configuration
// ============================================================================

export interface SCIMResourceType {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'];
  id: string;
  name: string;
  description?: string;
  endpoint: string;
  schema: string;
  schemaExtensions?: SCIMSchemaExtension[];
  meta: SCIMMeta;
}

export interface SCIMSchemaExtension {
  schema: string;
  required: boolean;
}

// ============================================================================
// Directory Sync Configuration
// ============================================================================

export interface DirectorySyncConfig {
  id: string;
  name: string;
  provider: 'azure_ad' | 'okta' | 'google' | 'onelogin' | 'custom';
  enabled: boolean;
  
  // SCIM endpoint configuration
  baseUrl: string;
  bearerToken: string;
  
  // Sync settings
  syncInterval: number; // minutes
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'partial' | 'failed';
  lastSyncError?: string;
  
  // Mapping configuration
  userMapping: AttributeMapping[];
  groupMapping: AttributeMapping[];
  
  // Sync options
  syncUsers: boolean;
  syncGroups: boolean;
  provisionUsers: boolean;
  deprovisionUsers: boolean;
  provisionGroups: boolean;
  deprovisionGroups: boolean;
  
  // Filters
  userFilter?: string;
  groupFilter?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AttributeMapping {
  source: string;      // SCIM attribute path
  target: string;      // FlowForge attribute
  transform?: 'lowercase' | 'uppercase' | 'trim' | 'default';
  defaultValue?: string;
  required?: boolean;
}

// ============================================================================
// Sync Events and Logs
// ============================================================================

export interface SyncEvent {
  id: string;
  configId: string;
  type: 'full' | 'incremental' | 'webhook';
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  
  // Statistics
  usersCreated: number;
  usersUpdated: number;
  usersDeactivated: number;
  usersSkipped: number;
  userErrors: number;
  
  groupsCreated: number;
  groupsUpdated: number;
  groupsDeleted: number;
  groupsSkipped: number;
  groupErrors: number;
  
  // Membership changes
  membershipsAdded: number;
  membershipsRemoved: number;
  
  // Error details
  errors: SyncError[];
}

export interface SyncError {
  resourceType: 'User' | 'Group' | 'Membership';
  resourceId?: string;
  externalId?: string;
  operation: 'create' | 'update' | 'delete' | 'read';
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Internal User/Group Mapping
// ============================================================================

export interface DirectoryUser {
  id: string;
  externalId: string;
  configId: string;
  
  // Identity
  username: string;
  email: string;
  emailVerified: boolean;
  
  // Profile
  firstName?: string;
  lastName?: string;
  displayName?: string;
  title?: string;
  department?: string;
  
  // Status
  active: boolean;
  suspended: boolean;
  
  // Metadata
  rawData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt: Date;
}

export interface DirectoryGroup {
  id: string;
  externalId: string;
  configId: string;
  
  // Identity
  name: string;
  displayName: string;
  description?: string;
  
  // Membership
  memberCount: number;
  
  // Metadata
  rawData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt: Date;
}

export interface DirectoryMembership {
  id: string;
  configId: string;
  userId: string;
  groupId: string;
  externalUserId: string;
  externalGroupId: string;
  type: 'direct' | 'indirect';
  createdAt: Date;
}
