// User types
export interface User {
    id: string;
    accountId: string;
    email: string;
    firstName: string;
    lastName: string;
    status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    roles: string[];
    permissions: string[];
    profile?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

// Auth types
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    accountName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

// API Types
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: Record<string, string>;
    };
}

// Form types
export interface Form {
    id: string;
    accountId: string;
    name: string;
    description?: string;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    fields: FormField[];
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface FormField {
    id: string;
    name: string;
    label: string;
    type: string;
    required: boolean;
    order: number;
    config?: Record<string, unknown>;
}

// Dataset types
export interface Dataset {
    id: string;
    accountId: string;
    name: string;
    description?: string;
    schema: Record<string, unknown>;
    rowCount: number;
    createdAt: string;
    updatedAt: string;
}

// Workflow types
export interface Process {
    id: string;
    accountId: string;
    name: string;
    description?: string;
    status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface ProcessInstance {
    id: string;
    processId: string;
    status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'SUSPENDED';
    startedAt: string;
    completedAt?: string;
}

export interface Task {
    id: string;
    instanceId: string;
    name: string;
    description?: string;
    type: 'TASK' | 'APPROVAL' | 'REVIEW' | 'NOTIFICATION';
    status: 'PENDING' | 'CLAIMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED';
    assigneeId?: string;
    dueAt?: string;
    createdAt: string;
}

// Dashboard stats
export interface DashboardStats {
    totalUsers: number;
    activeWorkflows: number;
    formsCreated: number;
    tasksPending: number;
}

// Workflow Designer Types
export type NodeType =
    | 'start'
    | 'end'
    | 'decision'
    | 'parallel'
    | 'join'
    | 'action'
    | 'http'
    | 'email'
    | 'script'
    | 'approval'
    | 'form'
    | 'delay'
    | 'setVariable'
    | 'subworkflow';

export interface WorkflowNode {
    id: string;
    type: NodeType;
    name: string;
    description?: string;
    position: { x: number; y: number };
    config: Record<string, unknown>;
    condition?: string;
    onError?: 'stop' | 'continue' | 'goto';
    errorTargetNodeId?: string;
    disabled?: boolean;
}

export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
    condition?: string;
}

export interface Workflow {
    id: string;
    name: string;
    slug: string;
    description?: string;
    version: number;
    status: 'draft' | 'published' | 'archived' | 'disabled';
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    createdAt: string;
    updatedAt: string;
}

// App Builder Types
export type AppStatus = 'draft' | 'published' | 'archived';
export type AppType = 'internal' | 'portal';
export type ComponentCategory = 'layout' | 'data-display' | 'input' | 'charts' | 'content' | 'media' | 'feedback' | 'navigation';

export interface PageComponent {
    id: string;
    type: string;
    name: string;
    position: { row: number; column: number; width: number };
    props: Record<string, unknown>;
    visible?: boolean;
    children?: PageComponent[];
}

export interface PageSettings {
    fullWidth?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    requireAuth?: boolean;
    showInNavigation?: boolean;
}

export interface AppPage {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    layout: 'single-column' | 'two-column' | 'three-column' | 'sidebar-left' | 'sidebar-right';
    components: PageComponent[];
    settings: PageSettings;
}

export interface NavigationItem {
    id: string;
    type: 'page' | 'link' | 'divider' | 'group';
    label?: string;
    icon?: string;
    pageId?: string;
    url?: string;
    children?: NavigationItem[];
}

export interface ThemeColors {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
}

export interface ThemeConfig {
    name: string;
    mode: 'light' | 'dark';
    colors: ThemeColors;
}

export interface AppSettings {
    showNavigation?: boolean;
    enableSearch?: boolean;
    enableNotifications?: boolean;
    defaultPage?: string;
    requireAuth?: boolean;
}

export interface Application {
    id: string;
    name: string;
    slug: string;
    description?: string;
    type: AppType;
    status: AppStatus;
    version: number;
    pages: AppPage[];
    navigation: {
        type: 'sidebar' | 'topbar' | 'none';
        position: 'left' | 'right' | 'top';
        collapsed: boolean;
        items: NavigationItem[];
    };
    settings: AppSettings;
    theme: ThemeConfig;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
}

export interface ComponentDefinition {
    type: string;
    name: string;
    category: ComponentCategory;
    icon: string;
    description: string;
    defaultProps: Record<string, unknown>;
    propDefinitions: PropDefinition[];
    isContainer: boolean;
}

export interface PropDefinition {
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'json' | 'datasource' | 'icon';
    options?: { label: string; value: string }[];
    bindable?: boolean;
    group?: string;
}

// ============================================================================
// Decision Table Types (Phase 6)
// ============================================================================

export type HitPolicy = 'first' | 'unique' | 'any' | 'priority' | 'collect' | 'collect-sum' | 'collect-min' | 'collect-max' | 'collect-count';
export type TableStatus = 'draft' | 'published' | 'archived';

export interface RuleCondition {
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in' | 'contains' | 'starts' | 'ends' | 'regex' | 'empty' | 'any';
    value?: unknown;
    expression?: string;
}

export interface RuleOutput {
    value: unknown;
    expression?: string;
}

export interface TableInput {
    id: string;
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'list';
    required: boolean;
    allowedValues?: unknown[];
    defaultValue?: unknown;
}

export interface TableOutput {
    id: string;
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'list';
    defaultValue?: unknown;
}

export interface TableRule {
    id: string;
    priority: number;
    description?: string;
    conditions: Record<string, RuleCondition>;
    outputs: Record<string, RuleOutput>;
    enabled: boolean;
}

export interface TestCase {
    id: string;
    name: string;
    inputs: Record<string, unknown>;
    expectedOutputs: Record<string, unknown>;
    lastRun?: string;
    passed?: boolean;
}

export interface DecisionTable {
    id: string;
    name: string;
    slug: string;
    description?: string;
    hitPolicy: HitPolicy;
    status: TableStatus;
    version: number;
    inputs: TableInput[];
    outputs: TableOutput[];
    rules: TableRule[];
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
}

// ============================================================================
// Integration Types (Phase 7)
// ============================================================================

export type ConnectorType = 'rest' | 'graphql' | 'soap' | 'database' | 'file' | 'email' | 'custom';
export type AuthType = 'none' | 'api_key' | 'basic' | 'oauth2' | 'jwt' | 'custom';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OperationParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    location: 'path' | 'query' | 'header' | 'body';
    required: boolean;
    defaultValue?: unknown;
    description?: string;
}

export interface ConnectorOperation {
    id: string;
    name: string;
    description?: string;
    method: HttpMethod;
    path: string;
    parameters: OperationParameter[];
    requestMapping?: Record<string, string>;
    responseMapping?: Record<string, string>;
}

export interface Connector {
    id: string;
    name: string;
    description?: string;
    type: ConnectorType;
    provider: string;
    baseUrl?: string;
    authType: AuthType;
    authConfig?: Record<string, unknown>;
    operations: ConnectorOperation[];
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ConnectorTemplate {
    id: string;
    name: string;
    description: string;
    provider: string;
    type: ConnectorType;
    icon?: string;
    category: string;
    authType: AuthType;
    baseUrl?: string;
    operations: ConnectorOperation[];
}

export interface Connection {
    id: string;
    name: string;
    connectorId: string;
    status: 'active' | 'inactive' | 'error';
    credentials: Record<string, unknown>;
    lastUsed?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Webhook {
    id: string;
    name: string;
    description?: string;
    url: string;
    secret: string;
    enabled: boolean;
    targetType: 'workflow' | 'form' | 'app' | 'custom';
    targetId?: string;
    events: string[];
    headers?: Record<string, string>;
    createdAt: string;
    updatedAt: string;
}

export interface WebhookEvent {
    id: string;
    webhookId: string;
    receivedAt: string;
    method: string;
    headers: Record<string, string>;
    body: unknown;
    status: 'pending' | 'processed' | 'failed';
    responseCode?: number;
    error?: string;
}
