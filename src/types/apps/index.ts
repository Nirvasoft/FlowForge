/**
 * FlowForge Apps & Portal Types
 * Complete type definitions for low-code app builder, portals, and components
 */

// ============================================================================
// Application Types
// ============================================================================

export interface Application {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  type: 'internal' | 'portal';
  pages: AppPage[];
  navigation: NavigationConfig;
  settings: AppSettings;
  theme: ThemeConfig;
  dataSources: DataSourceConfig[];
  accessRoles?: string[];
  isPublic?: boolean;
  version: number;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  publishedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AppSettings {
  defaultPage?: string;
  showNavigation: boolean;
  enableSearch: boolean;
  enableNotifications: boolean;
  enableOfflineMode: boolean;
  sessionTimeout: number;
  requireAuth: boolean;
  favicon?: string;
  logo?: string;
  appName?: string;
  metaTitle?: string;
  metaDescription?: string;
}

// ============================================================================
// Page Types
// ============================================================================

export interface AppPage {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  layout: PageLayout;
  components: PageComponent[];
  settings: PageSettings;
  pageVariables: PageVariable[];
  onLoad?: PageAction[];
  accessRoles?: string[];
  isHidden?: boolean;
}

export type PageLayout = 'single-column' | 'two-column' | 'sidebar-left' | 'sidebar-right' | 'dashboard' | 'form' | 'custom';

export interface PageSettings {
  fullWidth: boolean;
  padding: 'none' | 'small' | 'medium' | 'large';
  backgroundColor?: string;
  requireAuth: boolean;
  showInNavigation: boolean;
}

export interface PageVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: unknown;
  source?: 'url' | 'query' | 'state' | 'computed';
  expression?: string;
}

// ============================================================================
// Component Types
// ============================================================================

export interface PageComponent {
  id: string;
  type: ComponentType;
  name: string;
  position: ComponentPosition;
  props: Record<string, unknown>;
  dataBindings?: DataBinding[];
  events?: ComponentEvent[];
  visible?: boolean;
  visibilityCondition?: string;
  children?: PageComponent[];
  style?: ComponentStyle;
  className?: string;
}

export interface ComponentPosition {
  row: number;
  column: number;
  width: number;
  height?: number;
}

export interface ComponentStyle {
  margin?: string;
  padding?: string;
  backgroundColor?: string;
  borderRadius?: string;
  boxShadow?: string;
  custom?: Record<string, string>;
}

export type ComponentType =
  // Layout
  | 'container' | 'card' | 'tabs' | 'accordion' | 'modal' | 'drawer' | 'grid' | 'stack'
  // Data Display
  | 'table' | 'list' | 'detail-view' | 'tree' | 'kanban' | 'calendar' | 'timeline'
  // Input
  | 'form' | 'text-input' | 'number-input' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'switch' | 'date-picker' | 'file-upload' | 'rich-text'
  // Charts
  | 'bar-chart' | 'line-chart' | 'pie-chart' | 'area-chart' | 'gauge' | 'kpi-card' | 'sparkline'
  // Navigation
  | 'menu' | 'breadcrumb' | 'pagination' | 'stepper' | 'link' | 'button'
  // Feedback
  | 'alert' | 'badge' | 'progress' | 'skeleton' | 'spinner' | 'empty-state'
  // Media
  | 'image' | 'video' | 'icon' | 'avatar' | 'carousel'
  // Content
  | 'text' | 'heading' | 'markdown' | 'html' | 'iframe' | 'divider' | 'spacer'
  // Custom
  | 'custom-code' | 'workflow-trigger';

// ============================================================================
// Data Binding Types
// ============================================================================

export interface DataBinding {
  property: string;
  source: BindingSource;
  expression?: string;
  transform?: string;
}

export interface BindingSource {
  type: 'static' | 'variable' | 'datasource' | 'url' | 'component' | 'expression';
  path?: string;
  dataSourceId?: string;
  componentId?: string;
}

// ============================================================================
// Event & Action Types
// ============================================================================

export interface ComponentEvent {
  trigger: EventTrigger;
  actions: PageAction[];
}

export type EventTrigger = 'click' | 'doubleClick' | 'change' | 'submit' | 'focus' | 'blur' | 'hover' | 'load' | 'rowClick' | 'rowSelect' | 'close';

export interface PageAction {
  type: ActionType;
  config: Record<string, unknown>;
  condition?: string;
}

export type ActionType = 'navigate' | 'openModal' | 'closeModal' | 'setVariable' | 'refreshData' | 'submitForm' | 'callApi' | 'triggerWorkflow' | 'showNotification' | 'downloadFile' | 'copyToClipboard' | 'openUrl' | 'runScript';

// ============================================================================
// Navigation Types
// ============================================================================

export interface NavigationConfig {
  type: 'sidebar' | 'topbar' | 'both' | 'none';
  position?: 'left' | 'right';
  collapsed?: boolean;
  items: NavigationItem[];
}

export interface NavigationItem {
  id: string;
  type: 'page' | 'group' | 'link' | 'divider';
  label?: string;
  icon?: string;
  pageId?: string;
  url?: string;
  children?: NavigationItem[];
  badge?: string;
  accessRoles?: string[];
}

// ============================================================================
// Data Source Types
// ============================================================================

export interface DataSourceConfig {
  id: string;
  name: string;
  type: 'dataset' | 'api' | 'workflow' | 'static';
  config: Record<string, unknown>;
  cacheEnabled: boolean;
  cacheDuration?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  transform?: string;
}

// ============================================================================
// Theme Types
// ============================================================================

export interface ThemeConfig {
  id?: string;
  name: string;
  mode: 'light' | 'dark' | 'system';
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borders: ThemeBorders;
  customCss?: string;
}

export interface ThemeColors {
  primary: string;
  primaryLight?: string;
  primaryDark?: string;
  secondary: string;
  accent?: string;
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

export interface ThemeTypography {
  fontFamily: string;
  fontFamilyMono?: string;
  fontSizeBase: string;
  fontSizeSmall: string;
  fontSizeLarge: string;
  fontWeightNormal: number;
  fontWeightMedium: number;
  fontWeightBold: number;
  lineHeight: number;
}

export interface ThemeSpacing {
  unit: number;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeBorders {
  radiusSmall: string;
  radiusMedium: string;
  radiusLarge: string;
  radiusFull: string;
  width: string;
}

// ============================================================================
// Portal Types
// ============================================================================

export interface Portal extends Application {
  type: 'portal';
  portalSettings: PortalSettings;
  customDomain?: string;
  registrationEnabled: boolean;
  registrationSettings?: RegistrationSettings;
}

export interface PortalSettings {
  landingPageId?: string;
  showFooter: boolean;
  footerContent?: string;
  footerLinks?: Array<{ label: string; url: string }>;
  showHeader: boolean;
  headerContent?: string;
  socialLinks?: Record<string, string>;
  privacyPolicyUrl?: string;
  termsUrl?: string;
}

export interface RegistrationSettings {
  requireEmailVerification: boolean;
  requireApproval: boolean;
  defaultRole?: string;
  allowedDomains?: string[];
  blockedDomains?: string[];
  captchaEnabled: boolean;
  customFields?: Array<{ name: string; label: string; type: string; required: boolean }>;
}

// ============================================================================
// Component Registry Types
// ============================================================================

export interface ComponentDefinition {
  type: ComponentType;
  name: string;
  category: ComponentCategory;
  icon: string;
  description: string;
  defaultProps: Record<string, unknown>;
  propDefinitions: PropDefinition[];
  eventDefinitions: EventDefinition[];
  isContainer: boolean;
  allowedChildren?: ComponentType[];
}

export type ComponentCategory = 'layout' | 'data-display' | 'input' | 'charts' | 'navigation' | 'feedback' | 'media' | 'content' | 'custom';

export interface PropDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'icon' | 'expression' | 'datasource' | 'json';
  defaultValue?: unknown;
  required?: boolean;
  options?: Array<{ label: string; value: unknown }>;
  group?: string;
  description?: string;
  bindable?: boolean;
}

export interface EventDefinition {
  name: EventTrigger;
  label: string;
  description: string;
}
