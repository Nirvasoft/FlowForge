/**
 * FlowForge Form Builder - Field Type Definitions
 * Supports 15+ field types with validation, conditional logic, and expressions
 */

// ============================================================================
// FIELD TYPES
// ============================================================================

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'url'
  | 'password'
  | 'date'
  | 'datetime'
  | 'time'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'toggle'
  | 'file'
  | 'image'
  | 'signature'
  | 'rating'
  | 'slider'
  | 'currency'
  | 'calculated'
  | 'lookup'
  | 'user'
  | 'group'
  | 'richtext'
  | 'section'
  | 'divider'
  | 'heading';

// ============================================================================
// BASE FIELD DEFINITION
// ============================================================================

export interface BaseFieldDefinition {
  id: string;
  type: FieldType;
  name: string; // Internal field name (used in expressions)
  label: string; // Display label
  description?: string;
  placeholder?: string;
  helpText?: string;

  // Layout
  width?: 'full' | 'half' | 'third' | 'quarter';
  order: number;
  sectionId?: string;

  // Behavior
  required?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  disabled?: boolean;

  // Default value
  defaultValue?: unknown;
  defaultExpression?: string; // Expression to compute default

  // Conditional logic
  conditions?: FieldCondition[];

  // Validation
  validationRules?: ValidationRule[];

  // Styling
  className?: string;
  style?: Record<string, string>;
}

// ============================================================================
// FIELD-SPECIFIC DEFINITIONS
// ============================================================================

export interface TextFieldDefinition extends BaseFieldDefinition {
  type: 'text';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  mask?: string; // Input mask pattern
  prefix?: string;
  suffix?: string;
}

export interface TextareaFieldDefinition extends BaseFieldDefinition {
  type: 'textarea';
  minLength?: number;
  maxLength?: number;
  rows?: number;
  autoResize?: boolean;
}

export interface NumberFieldDefinition extends BaseFieldDefinition {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  format?: 'decimal' | 'integer' | 'percentage';
  prefix?: string;
  suffix?: string;
  thousandsSeparator?: boolean;
}

export interface EmailFieldDefinition extends BaseFieldDefinition {
  type: 'email';
  allowMultiple?: boolean;
  domains?: string[]; // Allowed domains
  blockDomains?: string[]; // Blocked domains
}

export interface PhoneFieldDefinition extends BaseFieldDefinition {
  type: 'phone';
  format?: 'international' | 'national' | 'any';
  defaultCountry?: string;
  allowedCountries?: string[];
}

export interface UrlFieldDefinition extends BaseFieldDefinition {
  type: 'url';
  allowedProtocols?: string[];
}

export interface PasswordFieldDefinition extends BaseFieldDefinition {
  type: 'password';
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecial?: boolean;
  showStrengthIndicator?: boolean;
}

export interface DateFieldDefinition extends BaseFieldDefinition {
  type: 'date';
  minDate?: string; // ISO date or expression
  maxDate?: string;
  disabledDates?: string[];
  disabledDays?: number[]; // 0-6 for days of week
  format?: string; // Display format
}

export interface DateTimeFieldDefinition extends BaseFieldDefinition {
  type: 'datetime';
  minDate?: string;
  maxDate?: string;
  minuteStep?: number;
  timezone?: string;
  format?: string;
}

export interface TimeFieldDefinition extends BaseFieldDefinition {
  type: 'time';
  minTime?: string;
  maxTime?: string;
  minuteStep?: number;
  format?: '12h' | '24h';
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
  icon?: string;
  color?: string;
}

export interface SelectFieldDefinition extends BaseFieldDefinition {
  type: 'select';
  options: SelectOption[];
  optionsSource?: 'static' | 'dataset' | 'api' | 'expression';
  optionsDataset?: string;
  optionsApi?: string;
  optionsExpression?: string;
  searchable?: boolean;
  clearable?: boolean;
}

export interface MultiSelectFieldDefinition extends BaseFieldDefinition {
  type: 'multiselect';
  options: SelectOption[];
  optionsSource?: 'static' | 'dataset' | 'api' | 'expression';
  optionsDataset?: string;
  optionsApi?: string;
  optionsExpression?: string;
  minSelections?: number;
  maxSelections?: number;
  searchable?: boolean;
}

export interface RadioFieldDefinition extends BaseFieldDefinition {
  type: 'radio';
  options: SelectOption[];
  layout?: 'horizontal' | 'vertical';
}

export interface CheckboxFieldDefinition extends BaseFieldDefinition {
  type: 'checkbox';
  options?: SelectOption[]; // For checkbox group
  minChecked?: number;
  maxChecked?: number;
  layout?: 'horizontal' | 'vertical';
}

export interface ToggleFieldDefinition extends BaseFieldDefinition {
  type: 'toggle';
  trueLabel?: string;
  falseLabel?: string;
  trueValue?: unknown;
  falseValue?: unknown;
}

export interface FileFieldDefinition extends BaseFieldDefinition {
  type: 'file';
  accept?: string[]; // MIME types or extensions
  maxSize?: number; // In bytes
  maxFiles?: number;
  multiple?: boolean;
}

export interface ImageFieldDefinition extends BaseFieldDefinition {
  type: 'image';
  accept?: string[];
  maxSize?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: string;
  allowCrop?: boolean;
}

export interface SignatureFieldDefinition extends Omit<BaseFieldDefinition, 'width'> {
  type: 'signature';
  penColor?: string;
  backgroundColor?: string;
  width?: 'full' | 'half' | 'third' | 'quarter' | number;
  height?: number;
}

export interface RatingFieldDefinition extends BaseFieldDefinition {
  type: 'rating';
  max?: number;
  icon?: 'star' | 'heart' | 'thumb';
  allowHalf?: boolean;
  showValue?: boolean;
}

export interface SliderFieldDefinition extends BaseFieldDefinition {
  type: 'slider';
  min: number;
  max: number;
  step?: number;
  showValue?: boolean;
  showLabels?: boolean;
  marks?: { value: number; label: string }[];
}

export interface CurrencyFieldDefinition extends BaseFieldDefinition {
  type: 'currency';
  currency?: string; // ISO currency code
  locale?: string;
  min?: number;
  max?: number;
  precision?: number;
}

export interface CalculatedFieldDefinition extends BaseFieldDefinition {
  type: 'calculated';
  expression: string; // Expression to compute value
  format?: 'number' | 'currency' | 'percentage' | 'date' | 'text';
  precision?: number;
}

export interface LookupFieldDefinition extends BaseFieldDefinition {
  type: 'lookup';
  datasetId: string;
  displayField: string;
  valueField: string;
  filterExpression?: string;
  searchFields?: string[];
}

export interface UserFieldDefinition extends BaseFieldDefinition {
  type: 'user';
  multiple?: boolean;
  filterByGroup?: string[];
  filterByRole?: string[];
  includeInactive?: boolean;
}

export interface GroupFieldDefinition extends BaseFieldDefinition {
  type: 'group';
  multiple?: boolean;
  parentGroup?: string;
}

export interface RichTextFieldDefinition extends BaseFieldDefinition {
  type: 'richtext';
  toolbar?: ('bold' | 'italic' | 'underline' | 'link' | 'list' | 'heading' | 'image')[];
  maxLength?: number;
  allowImages?: boolean;
}

export interface SectionFieldDefinition extends BaseFieldDefinition {
  type: 'section';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  columns?: 1 | 2 | 3 | 4;
}

export interface DividerFieldDefinition extends BaseFieldDefinition {
  type: 'divider';
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  spacing?: 'small' | 'medium' | 'large';
}

export interface HeadingFieldDefinition extends BaseFieldDefinition {
  type: 'heading';
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  alignment?: 'left' | 'center' | 'right';
}

// Union type for all field definitions
export type FieldDefinition =
  | TextFieldDefinition
  | TextareaFieldDefinition
  | NumberFieldDefinition
  | EmailFieldDefinition
  | PhoneFieldDefinition
  | UrlFieldDefinition
  | PasswordFieldDefinition
  | DateFieldDefinition
  | DateTimeFieldDefinition
  | TimeFieldDefinition
  | SelectFieldDefinition
  | MultiSelectFieldDefinition
  | RadioFieldDefinition
  | CheckboxFieldDefinition
  | ToggleFieldDefinition
  | FileFieldDefinition
  | ImageFieldDefinition
  | SignatureFieldDefinition
  | RatingFieldDefinition
  | SliderFieldDefinition
  | CurrencyFieldDefinition
  | CalculatedFieldDefinition
  | LookupFieldDefinition
  | UserFieldDefinition
  | GroupFieldDefinition
  | RichTextFieldDefinition
  | SectionFieldDefinition
  | DividerFieldDefinition
  | HeadingFieldDefinition;

// ============================================================================
// CONDITIONS & VALIDATION
// ============================================================================

export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterOrEqual'
  | 'lessOrEqual'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'in'
  | 'notIn'
  | 'between'
  | 'matches'; // Regex

export interface FieldCondition {
  id: string;
  field: string; // Field name to check
  operator: ConditionOperator;
  value?: unknown;
  values?: unknown[]; // For 'in', 'notIn', 'between'

  // Action when condition is true
  action: 'show' | 'hide' | 'require' | 'optional' | 'enable' | 'disable';

  // Combine with other conditions
  logic?: 'and' | 'or';
}

export type ValidationType =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'pattern'
  | 'email'
  | 'url'
  | 'phone'
  | 'date'
  | 'custom'
  | 'unique'
  | 'expression';

export interface ValidationRule {
  id: string;
  type: ValidationType;
  value?: unknown; // e.g., min value, regex pattern
  expression?: string; // Custom expression that returns boolean
  message: string; // Error message
  severity?: 'error' | 'warning';
}

// ============================================================================
// FORM DEFINITION
// ============================================================================

export interface FormLayout {
  type: 'default' | 'wizard' | 'tabs' | 'accordion';
  columns?: 1 | 2 | 3 | 4;
  labelPosition?: 'top' | 'left' | 'inline';
  labelWidth?: string;
  spacing?: 'compact' | 'normal' | 'relaxed';
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  fields: string[]; // Field IDs in this step
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
}

export interface FormSettings {
  submitLabel?: string;
  resetLabel?: string;
  showReset?: boolean;
  autosave?: boolean;
  autosaveInterval?: number; // seconds
  submitOnEnter?: boolean;
  scrollToError?: boolean;
  showProgressBar?: boolean;
  confirmOnLeave?: boolean;
}

export interface FormDefinition {
  id: string;
  accountId: string;
  name: string;
  description?: string;
  version: number;
  status: 'draft' | 'active' | 'archived';

  // Fields
  fields: FieldDefinition[];

  // Layout
  layout: FormLayout;
  steps?: FormStep[];

  // Settings
  settings: FormSettings;

  // Validation
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';

  // Submission
  onSubmit?: {
    type: 'api' | 'workflow' | 'dataset' | 'email';
    config: Record<string, unknown>;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ============================================================================
// FORM SUBMISSION
// ============================================================================

export interface FormSubmissionData {
  [fieldName: string]: unknown;
}

export interface FormValidationError {
  field: string;
  message: string;
  type: ValidationType;
  severity: 'error' | 'warning';
}

export interface FormValidationResult {
  valid: boolean;
  errors: FormValidationError[];
  warnings: FormValidationError[];
}

// ============================================================================
// FIELD TYPE REGISTRY
// ============================================================================

export interface FieldTypeConfig {
  type: FieldType;
  label: string;
  icon: string;
  category: 'input' | 'selection' | 'date' | 'file' | 'advanced' | 'layout';
  defaultConfig: Partial<FieldDefinition>;
  validationTypes: ValidationType[];
  supportsConditions: boolean;
  supportsCalculation: boolean;
}

export const FIELD_TYPE_REGISTRY: Record<FieldType, FieldTypeConfig> = {
  text: {
    type: 'text',
    label: 'Text',
    icon: 'type',
    category: 'input',
    defaultConfig: { width: 'full' },
    validationTypes: ['required', 'minLength', 'maxLength', 'pattern'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  textarea: {
    type: 'textarea',
    label: 'Text Area',
    icon: 'align-left',
    category: 'input',
    defaultConfig: { width: 'full', rows: 4 },
    validationTypes: ['required', 'minLength', 'maxLength'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  number: {
    type: 'number',
    label: 'Number',
    icon: 'hash',
    category: 'input',
    defaultConfig: { width: 'half' },
    validationTypes: ['required', 'min', 'max'],
    supportsConditions: true,
    supportsCalculation: true,
  },
  email: {
    type: 'email',
    label: 'Email',
    icon: 'mail',
    category: 'input',
    defaultConfig: { width: 'full' },
    validationTypes: ['required', 'email', 'pattern'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  phone: {
    type: 'phone',
    label: 'Phone',
    icon: 'phone',
    category: 'input',
    defaultConfig: { width: 'half' },
    validationTypes: ['required', 'phone'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  url: {
    type: 'url',
    label: 'URL',
    icon: 'link',
    category: 'input',
    defaultConfig: { width: 'full' },
    validationTypes: ['required', 'url'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  password: {
    type: 'password',
    label: 'Password',
    icon: 'lock',
    category: 'input',
    defaultConfig: { width: 'full' },
    validationTypes: ['required', 'minLength', 'maxLength', 'pattern'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  date: {
    type: 'date',
    label: 'Date',
    icon: 'calendar',
    category: 'date',
    defaultConfig: { width: 'half' },
    validationTypes: ['required', 'date'],
    supportsConditions: true,
    supportsCalculation: true,
  },
  datetime: {
    type: 'datetime',
    label: 'Date & Time',
    icon: 'clock',
    category: 'date',
    defaultConfig: { width: 'half' },
    validationTypes: ['required', 'date'],
    supportsConditions: true,
    supportsCalculation: true,
  },
  time: {
    type: 'time',
    label: 'Time',
    icon: 'clock',
    category: 'date',
    defaultConfig: { width: 'third' },
    validationTypes: ['required'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  select: {
    type: 'select',
    label: 'Dropdown',
    icon: 'chevron-down',
    category: 'selection',
    defaultConfig: { width: 'half', options: [] },
    validationTypes: ['required'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  multiselect: {
    type: 'multiselect',
    label: 'Multi-Select',
    icon: 'list',
    category: 'selection',
    defaultConfig: { width: 'full', options: [] },
    validationTypes: ['required', 'min', 'max'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  radio: {
    type: 'radio',
    label: 'Radio Buttons',
    icon: 'circle',
    category: 'selection',
    defaultConfig: { width: 'full', options: [], layout: 'vertical' },
    validationTypes: ['required'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  checkbox: {
    type: 'checkbox',
    label: 'Checkbox',
    icon: 'check-square',
    category: 'selection',
    defaultConfig: { width: 'full' },
    validationTypes: ['required'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  toggle: {
    type: 'toggle',
    label: 'Toggle',
    icon: 'toggle-left',
    category: 'selection',
    defaultConfig: { width: 'half' },
    validationTypes: ['required'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  file: {
    type: 'file',
    label: 'File Upload',
    icon: 'upload',
    category: 'file',
    defaultConfig: { width: 'full', maxFiles: 1 },
    validationTypes: ['required'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  image: {
    type: 'image',
    label: 'Image Upload',
    icon: 'image',
    category: 'file',
    defaultConfig: { width: 'full' },
    validationTypes: ['required'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  signature: {
    type: 'signature',
    label: 'Signature',
    icon: 'edit-3',
    category: 'file',
    defaultConfig: { width: 'full' },
    validationTypes: ['required'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  rating: {
    type: 'rating',
    label: 'Rating',
    icon: 'star',
    category: 'input',
    defaultConfig: { width: 'half', max: 5 },
    validationTypes: ['required', 'min'],
    supportsConditions: true,
    supportsCalculation: true,
  },
  slider: {
    type: 'slider',
    label: 'Slider',
    icon: 'sliders',
    category: 'input',
    defaultConfig: { width: 'full', min: 0, max: 100 },
    validationTypes: ['required', 'min', 'max'],
    supportsConditions: true,
    supportsCalculation: true,
  },
  currency: {
    type: 'currency',
    label: 'Currency',
    icon: 'dollar-sign',
    category: 'input',
    defaultConfig: { width: 'half', currency: 'USD' },
    validationTypes: ['required', 'min', 'max'],
    supportsConditions: true,
    supportsCalculation: true,
  },
  calculated: {
    type: 'calculated',
    label: 'Calculated',
    icon: 'activity',
    category: 'advanced',
    defaultConfig: { width: 'half', expression: '' },
    validationTypes: [],
    supportsConditions: true,
    supportsCalculation: true,
  },
  lookup: {
    type: 'lookup',
    label: 'Lookup',
    icon: 'search',
    category: 'advanced',
    defaultConfig: { width: 'full' },
    validationTypes: ['required'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  user: {
    type: 'user',
    label: 'User Picker',
    icon: 'user',
    category: 'advanced',
    defaultConfig: { width: 'half' },
    validationTypes: ['required'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  group: {
    type: 'group',
    label: 'Group Picker',
    icon: 'users',
    category: 'advanced',
    defaultConfig: { width: 'half' },
    validationTypes: ['required'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  richtext: {
    type: 'richtext',
    label: 'Rich Text',
    icon: 'file-text',
    category: 'input',
    defaultConfig: { width: 'full' },
    validationTypes: ['required', 'maxLength'],
    supportsConditions: true,
    supportsCalculation: false,
  },
  section: {
    type: 'section',
    label: 'Section',
    icon: 'layout',
    category: 'layout',
    defaultConfig: { width: 'full', columns: 1 },
    validationTypes: [],
    supportsConditions: true,
    supportsCalculation: false,
  },
  divider: {
    type: 'divider',
    label: 'Divider',
    icon: 'minus',
    category: 'layout',
    defaultConfig: { width: 'full' },
    validationTypes: [],
    supportsConditions: true,
    supportsCalculation: false,
  },
  heading: {
    type: 'heading',
    label: 'Heading',
    icon: 'type',
    category: 'layout',
    defaultConfig: { width: 'full', level: 2 },
    validationTypes: [],
    supportsConditions: true,
    supportsCalculation: false,
  },
};
