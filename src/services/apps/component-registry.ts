/**
 * FlowForge Component Registry
 * Pre-built component library with 25+ components
 */

import type { ComponentDefinition, ComponentType, ComponentCategory, PropDefinition } from '../../types/apps';

// ============================================================================
// Component Registry
// ============================================================================

const componentDefinitions: ComponentDefinition[] = [
  // ============================================================================
  // Layout Components
  // ============================================================================
  {
    type: 'container',
    name: 'Container',
    category: 'layout',
    icon: 'box',
    description: 'A flexible container for grouping components',
    defaultProps: { direction: 'column', gap: 'md', padding: 'md' },
    propDefinitions: [
      { name: 'direction', label: 'Direction', type: 'select', options: [{ label: 'Row', value: 'row' }, { label: 'Column', value: 'column' }] },
      { name: 'gap', label: 'Gap', type: 'select', options: [{ label: 'None', value: 'none' }, { label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' }] },
      { name: 'padding', label: 'Padding', type: 'select', options: [{ label: 'None', value: 'none' }, { label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' }] },
      { name: 'backgroundColor', label: 'Background', type: 'color', group: 'Style' },
    ],
    eventDefinitions: [],
    isContainer: true,
  },
  {
    type: 'card',
    name: 'Card',
    category: 'layout',
    icon: 'credit-card',
    description: 'A card container with optional header and footer',
    defaultProps: { title: 'Card Title', showHeader: true, showFooter: false, padding: 'md', shadow: 'md' },
    propDefinitions: [
      { name: 'title', label: 'Title', type: 'string', bindable: true },
      { name: 'subtitle', label: 'Subtitle', type: 'string', bindable: true },
      { name: 'showHeader', label: 'Show Header', type: 'boolean' },
      { name: 'showFooter', label: 'Show Footer', type: 'boolean' },
      { name: 'padding', label: 'Padding', type: 'select', options: [{ label: 'None', value: 'none' }, { label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' }] },
      { name: 'shadow', label: 'Shadow', type: 'select', options: [{ label: 'None', value: 'none' }, { label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' }] },
    ],
    eventDefinitions: [{ name: 'click', label: 'On Click', description: 'Triggered when card is clicked' }],
    isContainer: true,
  },
  {
    type: 'tabs',
    name: 'Tabs',
    category: 'layout',
    icon: 'folder',
    description: 'Tabbed content panels',
    defaultProps: { tabs: [{ id: '1', label: 'Tab 1' }, { id: '2', label: 'Tab 2' }], activeTab: '1' },
    propDefinitions: [
      { name: 'tabs', label: 'Tabs', type: 'json' },
      { name: 'activeTab', label: 'Active Tab', type: 'string', bindable: true },
      { name: 'variant', label: 'Variant', type: 'select', options: [{ label: 'Default', value: 'default' }, { label: 'Boxed', value: 'boxed' }, { label: 'Pills', value: 'pills' }] },
    ],
    eventDefinitions: [{ name: 'change', label: 'On Tab Change', description: 'Triggered when active tab changes' }],
    isContainer: true,
  },
  {
    type: 'modal',
    name: 'Modal',
    category: 'layout',
    icon: 'maximize-2',
    description: 'A modal dialog overlay',
    defaultProps: { title: 'Modal Title', isOpen: false, size: 'md', showClose: true },
    propDefinitions: [
      { name: 'title', label: 'Title', type: 'string', bindable: true },
      { name: 'isOpen', label: 'Is Open', type: 'boolean', bindable: true },
      { name: 'size', label: 'Size', type: 'select', options: [{ label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' }, { label: 'Full', value: 'full' }] },
      { name: 'showClose', label: 'Show Close Button', type: 'boolean' },
      { name: 'closeOnOverlay', label: 'Close on Overlay Click', type: 'boolean' },
    ],
    eventDefinitions: [{ name: 'close', label: 'On Close', description: 'Triggered when modal is closed' }],
    isContainer: true,
  },
  {
    type: 'grid',
    name: 'Grid',
    category: 'layout',
    icon: 'grid',
    description: 'A responsive grid layout',
    defaultProps: { columns: 3, gap: 'md' },
    propDefinitions: [
      { name: 'columns', label: 'Columns', type: 'number' },
      { name: 'gap', label: 'Gap', type: 'select', options: [{ label: 'None', value: 'none' }, { label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' }] },
    ],
    eventDefinitions: [],
    isContainer: true,
  },

  // ============================================================================
  // Data Display Components
  // ============================================================================
  {
    type: 'table',
    name: 'Table',
    category: 'data-display',
    icon: 'table',
    description: 'A data table with sorting, filtering, and pagination',
    defaultProps: { columns: [], data: [], pageSize: 10, showPagination: true, showSearch: true, selectable: false },
    propDefinitions: [
      { name: 'columns', label: 'Columns', type: 'json', description: 'Array of column definitions' },
      { name: 'data', label: 'Data', type: 'datasource', bindable: true },
      { name: 'pageSize', label: 'Page Size', type: 'number' },
      { name: 'showPagination', label: 'Show Pagination', type: 'boolean' },
      { name: 'showSearch', label: 'Show Search', type: 'boolean' },
      { name: 'selectable', label: 'Selectable Rows', type: 'boolean' },
      { name: 'striped', label: 'Striped Rows', type: 'boolean' },
    ],
    eventDefinitions: [
      { name: 'rowClick', label: 'On Row Click', description: 'Triggered when a row is clicked' },
      { name: 'rowSelect', label: 'On Row Select', description: 'Triggered when rows are selected' },
    ],
    isContainer: false,
  },
  {
    type: 'list',
    name: 'List',
    category: 'data-display',
    icon: 'list',
    description: 'A customizable list view',
    defaultProps: { data: [], itemTemplate: 'default', showDividers: true },
    propDefinitions: [
      { name: 'data', label: 'Data', type: 'datasource', bindable: true },
      { name: 'itemTemplate', label: 'Item Template', type: 'select', options: [{ label: 'Default', value: 'default' }, { label: 'Card', value: 'card' }, { label: 'Compact', value: 'compact' }] },
      { name: 'showDividers', label: 'Show Dividers', type: 'boolean' },
      { name: 'emptyMessage', label: 'Empty Message', type: 'string' },
    ],
    eventDefinitions: [{ name: 'rowClick', label: 'On Item Click', description: 'Triggered when an item is clicked' }],
    isContainer: false,
  },
  {
    type: 'detail-view',
    name: 'Detail View',
    category: 'data-display',
    icon: 'file-text',
    description: 'Display record details in a structured layout',
    defaultProps: { data: {}, layout: 'vertical', columns: 2 },
    propDefinitions: [
      { name: 'data', label: 'Data', type: 'datasource', bindable: true },
      { name: 'fields', label: 'Fields', type: 'json' },
      { name: 'layout', label: 'Layout', type: 'select', options: [{ label: 'Vertical', value: 'vertical' }, { label: 'Horizontal', value: 'horizontal' }, { label: 'Grid', value: 'grid' }] },
      { name: 'columns', label: 'Columns', type: 'number' },
    ],
    eventDefinitions: [],
    isContainer: false,
  },
  {
    type: 'kanban',
    name: 'Kanban Board',
    category: 'data-display',
    icon: 'columns',
    description: 'A drag-and-drop kanban board',
    defaultProps: { columns: [], data: [], columnField: 'status' },
    propDefinitions: [
      { name: 'columns', label: 'Columns', type: 'json' },
      { name: 'data', label: 'Data', type: 'datasource', bindable: true },
      { name: 'columnField', label: 'Column Field', type: 'string' },
      { name: 'titleField', label: 'Title Field', type: 'string' },
      { name: 'descriptionField', label: 'Description Field', type: 'string' },
    ],
    eventDefinitions: [
      { name: 'rowClick', label: 'On Card Click', description: 'Triggered when a card is clicked' },
      { name: 'change', label: 'On Card Move', description: 'Triggered when a card is moved' },
    ],
    isContainer: false,
  },

  // ============================================================================
  // Input Components
  // ============================================================================
  {
    type: 'form',
    name: 'Form',
    category: 'input',
    icon: 'edit-3',
    description: 'A form container with validation',
    defaultProps: { showSubmit: true, submitLabel: 'Submit', resetOnSubmit: false },
    propDefinitions: [
      { name: 'showSubmit', label: 'Show Submit Button', type: 'boolean' },
      { name: 'submitLabel', label: 'Submit Label', type: 'string' },
      { name: 'resetOnSubmit', label: 'Reset on Submit', type: 'boolean' },
      { name: 'layout', label: 'Layout', type: 'select', options: [{ label: 'Vertical', value: 'vertical' }, { label: 'Horizontal', value: 'horizontal' }, { label: 'Inline', value: 'inline' }] },
    ],
    eventDefinitions: [{ name: 'submit', label: 'On Submit', description: 'Triggered when form is submitted' }],
    isContainer: true,
  },
  {
    type: 'text-input',
    name: 'Text Input',
    category: 'input',
    icon: 'type',
    description: 'A text input field',
    defaultProps: { label: 'Label', placeholder: 'Enter text...', required: false },
    propDefinitions: [
      { name: 'label', label: 'Label', type: 'string' },
      { name: 'placeholder', label: 'Placeholder', type: 'string' },
      { name: 'value', label: 'Value', type: 'string', bindable: true },
      { name: 'required', label: 'Required', type: 'boolean' },
      { name: 'disabled', label: 'Disabled', type: 'boolean' },
      { name: 'type', label: 'Type', type: 'select', options: [{ label: 'Text', value: 'text' }, { label: 'Email', value: 'email' }, { label: 'Password', value: 'password' }, { label: 'URL', value: 'url' }] },
      { name: 'maxLength', label: 'Max Length', type: 'number' },
    ],
    eventDefinitions: [
      { name: 'change', label: 'On Change', description: 'Triggered when value changes' },
      { name: 'blur', label: 'On Blur', description: 'Triggered when input loses focus' },
    ],
    isContainer: false,
  },
  {
    type: 'select',
    name: 'Select',
    category: 'input',
    icon: 'chevron-down',
    description: 'A dropdown select field',
    defaultProps: { label: 'Label', placeholder: 'Select...', options: [], required: false },
    propDefinitions: [
      { name: 'label', label: 'Label', type: 'string' },
      { name: 'placeholder', label: 'Placeholder', type: 'string' },
      { name: 'value', label: 'Value', type: 'string', bindable: true },
      { name: 'options', label: 'Options', type: 'json' },
      { name: 'optionsDataSource', label: 'Options Data Source', type: 'datasource' },
      { name: 'labelField', label: 'Label Field', type: 'string' },
      { name: 'valueField', label: 'Value Field', type: 'string' },
      { name: 'required', label: 'Required', type: 'boolean' },
      { name: 'searchable', label: 'Searchable', type: 'boolean' },
    ],
    eventDefinitions: [{ name: 'change', label: 'On Change', description: 'Triggered when selection changes' }],
    isContainer: false,
  },
  {
    type: 'date-picker',
    name: 'Date Picker',
    category: 'input',
    icon: 'calendar',
    description: 'A date picker field',
    defaultProps: { label: 'Date', placeholder: 'Select date...', format: 'YYYY-MM-DD' },
    propDefinitions: [
      { name: 'label', label: 'Label', type: 'string' },
      { name: 'placeholder', label: 'Placeholder', type: 'string' },
      { name: 'value', label: 'Value', type: 'string', bindable: true },
      { name: 'format', label: 'Format', type: 'string' },
      { name: 'minDate', label: 'Min Date', type: 'string' },
      { name: 'maxDate', label: 'Max Date', type: 'string' },
      { name: 'required', label: 'Required', type: 'boolean' },
    ],
    eventDefinitions: [{ name: 'change', label: 'On Change', description: 'Triggered when date changes' }],
    isContainer: false,
  },
  {
    type: 'checkbox',
    name: 'Checkbox',
    category: 'input',
    icon: 'check-square',
    description: 'A checkbox input',
    defaultProps: { label: 'Checkbox', checked: false },
    propDefinitions: [
      { name: 'label', label: 'Label', type: 'string' },
      { name: 'checked', label: 'Checked', type: 'boolean', bindable: true },
      { name: 'disabled', label: 'Disabled', type: 'boolean' },
    ],
    eventDefinitions: [{ name: 'change', label: 'On Change', description: 'Triggered when checked state changes' }],
    isContainer: false,
  },
  {
    type: 'button',
    name: 'Button',
    category: 'navigation',
    icon: 'mouse-pointer',
    description: 'A clickable button',
    defaultProps: { label: 'Button', variant: 'primary', size: 'md' },
    propDefinitions: [
      { name: 'label', label: 'Label', type: 'string', bindable: true },
      { name: 'variant', label: 'Variant', type: 'select', options: [{ label: 'Primary', value: 'primary' }, { label: 'Secondary', value: 'secondary' }, { label: 'Outline', value: 'outline' }, { label: 'Ghost', value: 'ghost' }, { label: 'Danger', value: 'danger' }] },
      { name: 'size', label: 'Size', type: 'select', options: [{ label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' }] },
      { name: 'icon', label: 'Icon', type: 'icon' },
      { name: 'iconPosition', label: 'Icon Position', type: 'select', options: [{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }] },
      { name: 'disabled', label: 'Disabled', type: 'boolean' },
      { name: 'loading', label: 'Loading', type: 'boolean', bindable: true },
      { name: 'fullWidth', label: 'Full Width', type: 'boolean' },
    ],
    eventDefinitions: [{ name: 'click', label: 'On Click', description: 'Triggered when button is clicked' }],
    isContainer: false,
  },

  // ============================================================================
  // Chart Components
  // ============================================================================
  {
    type: 'bar-chart',
    name: 'Bar Chart',
    category: 'charts',
    icon: 'bar-chart-2',
    description: 'A bar chart visualization',
    defaultProps: { data: [], xField: 'name', yField: 'value', horizontal: false },
    propDefinitions: [
      { name: 'data', label: 'Data', type: 'datasource', bindable: true },
      { name: 'xField', label: 'X Axis Field', type: 'string' },
      { name: 'yField', label: 'Y Axis Field', type: 'string' },
      { name: 'horizontal', label: 'Horizontal', type: 'boolean' },
      { name: 'stacked', label: 'Stacked', type: 'boolean' },
      { name: 'showLegend', label: 'Show Legend', type: 'boolean' },
      { name: 'showGrid', label: 'Show Grid', type: 'boolean' },
      { name: 'color', label: 'Color', type: 'color' },
    ],
    eventDefinitions: [{ name: 'click', label: 'On Bar Click', description: 'Triggered when a bar is clicked' }],
    isContainer: false,
  },
  {
    type: 'line-chart',
    name: 'Line Chart',
    category: 'charts',
    icon: 'trending-up',
    description: 'A line chart visualization',
    defaultProps: { data: [], xField: 'date', yField: 'value', smooth: true },
    propDefinitions: [
      { name: 'data', label: 'Data', type: 'datasource', bindable: true },
      { name: 'xField', label: 'X Axis Field', type: 'string' },
      { name: 'yField', label: 'Y Axis Field', type: 'string' },
      { name: 'smooth', label: 'Smooth Line', type: 'boolean' },
      { name: 'showDots', label: 'Show Dots', type: 'boolean' },
      { name: 'showArea', label: 'Show Area', type: 'boolean' },
      { name: 'showLegend', label: 'Show Legend', type: 'boolean' },
      { name: 'color', label: 'Color', type: 'color' },
    ],
    eventDefinitions: [{ name: 'click', label: 'On Point Click', description: 'Triggered when a point is clicked' }],
    isContainer: false,
  },
  {
    type: 'pie-chart',
    name: 'Pie Chart',
    category: 'charts',
    icon: 'pie-chart',
    description: 'A pie/donut chart visualization',
    defaultProps: { data: [], nameField: 'name', valueField: 'value', donut: false },
    propDefinitions: [
      { name: 'data', label: 'Data', type: 'datasource', bindable: true },
      { name: 'nameField', label: 'Name Field', type: 'string' },
      { name: 'valueField', label: 'Value Field', type: 'string' },
      { name: 'donut', label: 'Donut Style', type: 'boolean' },
      { name: 'showLabels', label: 'Show Labels', type: 'boolean' },
      { name: 'showLegend', label: 'Show Legend', type: 'boolean' },
    ],
    eventDefinitions: [{ name: 'click', label: 'On Slice Click', description: 'Triggered when a slice is clicked' }],
    isContainer: false,
  },
  {
    type: 'kpi-card',
    name: 'KPI Card',
    category: 'charts',
    icon: 'hash',
    description: 'A KPI metric card with trend indicator',
    defaultProps: { title: 'KPI Title', value: 0, prefix: '', suffix: '', trend: 0, trendLabel: 'vs last period' },
    propDefinitions: [
      { name: 'title', label: 'Title', type: 'string', bindable: true },
      { name: 'value', label: 'Value', type: 'number', bindable: true },
      { name: 'prefix', label: 'Prefix', type: 'string' },
      { name: 'suffix', label: 'Suffix', type: 'string' },
      { name: 'trend', label: 'Trend %', type: 'number', bindable: true },
      { name: 'trendLabel', label: 'Trend Label', type: 'string' },
      { name: 'icon', label: 'Icon', type: 'icon' },
      { name: 'color', label: 'Color', type: 'color' },
    ],
    eventDefinitions: [{ name: 'click', label: 'On Click', description: 'Triggered when card is clicked' }],
    isContainer: false,
  },

  // ============================================================================
  // Content Components
  // ============================================================================
  {
    type: 'text',
    name: 'Text',
    category: 'content',
    icon: 'align-left',
    description: 'A text block',
    defaultProps: { content: 'Text content', variant: 'body', align: 'left' },
    propDefinitions: [
      { name: 'content', label: 'Content', type: 'string', bindable: true },
      { name: 'variant', label: 'Variant', type: 'select', options: [{ label: 'Body', value: 'body' }, { label: 'Caption', value: 'caption' }, { label: 'Small', value: 'small' }] },
      { name: 'align', label: 'Align', type: 'select', options: [{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }] },
      { name: 'color', label: 'Color', type: 'color' },
    ],
    eventDefinitions: [],
    isContainer: false,
  },
  {
    type: 'heading',
    name: 'Heading',
    category: 'content',
    icon: 'type',
    description: 'A heading/title',
    defaultProps: { content: 'Heading', level: 'h2', align: 'left' },
    propDefinitions: [
      { name: 'content', label: 'Content', type: 'string', bindable: true },
      { name: 'level', label: 'Level', type: 'select', options: [{ label: 'H1', value: 'h1' }, { label: 'H2', value: 'h2' }, { label: 'H3', value: 'h3' }, { label: 'H4', value: 'h4' }] },
      { name: 'align', label: 'Align', type: 'select', options: [{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }] },
    ],
    eventDefinitions: [],
    isContainer: false,
  },
  {
    type: 'image',
    name: 'Image',
    category: 'media',
    icon: 'image',
    description: 'An image component',
    defaultProps: { src: '', alt: '', fit: 'contain' },
    propDefinitions: [
      { name: 'src', label: 'Source URL', type: 'string', bindable: true },
      { name: 'alt', label: 'Alt Text', type: 'string' },
      { name: 'fit', label: 'Fit', type: 'select', options: [{ label: 'Contain', value: 'contain' }, { label: 'Cover', value: 'cover' }, { label: 'Fill', value: 'fill' }] },
      { name: 'width', label: 'Width', type: 'string' },
      { name: 'height', label: 'Height', type: 'string' },
      { name: 'rounded', label: 'Rounded', type: 'boolean' },
    ],
    eventDefinitions: [{ name: 'click', label: 'On Click', description: 'Triggered when image is clicked' }],
    isContainer: false,
  },
  {
    type: 'alert',
    name: 'Alert',
    category: 'feedback',
    icon: 'alert-circle',
    description: 'An alert/notification box',
    defaultProps: { title: 'Alert', message: 'Alert message', variant: 'info', dismissible: false },
    propDefinitions: [
      { name: 'title', label: 'Title', type: 'string', bindable: true },
      { name: 'message', label: 'Message', type: 'string', bindable: true },
      { name: 'variant', label: 'Variant', type: 'select', options: [{ label: 'Info', value: 'info' }, { label: 'Success', value: 'success' }, { label: 'Warning', value: 'warning' }, { label: 'Error', value: 'error' }] },
      { name: 'dismissible', label: 'Dismissible', type: 'boolean' },
      { name: 'icon', label: 'Icon', type: 'icon' },
    ],
    eventDefinitions: [{ name: 'close', label: 'On Close', description: 'Triggered when alert is dismissed' }],
    isContainer: false,
  },
  {
    type: 'divider',
    name: 'Divider',
    category: 'content',
    icon: 'minus',
    description: 'A horizontal divider line',
    defaultProps: { variant: 'solid', spacing: 'md' },
    propDefinitions: [
      { name: 'variant', label: 'Variant', type: 'select', options: [{ label: 'Solid', value: 'solid' }, { label: 'Dashed', value: 'dashed' }, { label: 'Dotted', value: 'dotted' }] },
      { name: 'spacing', label: 'Spacing', type: 'select', options: [{ label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' }] },
      { name: 'label', label: 'Label', type: 'string' },
    ],
    eventDefinitions: [],
    isContainer: false,
  },

  // ============================================================================
  // Workflow Components
  // ============================================================================
  {
    type: 'task-inbox',
    name: 'Task Inbox',
    category: 'workflow',
    icon: 'inbox',
    description: 'Displays pending and active tasks with claim, approve, reject, and complete actions',
    defaultProps: { compact: false, autoRefresh: true, refreshInterval: 15000 },
    propDefinitions: [
      { name: 'compact', label: 'Compact Mode', type: 'boolean', description: 'Use compact layout for embedding' },
      { name: 'autoRefresh', label: 'Auto Refresh', type: 'boolean' },
      { name: 'refreshInterval', label: 'Refresh Interval (ms)', type: 'number' },
      {
        name: 'filterType', label: 'Filter by Type', type: 'select', options: [
          { label: 'All', value: '' },
          { label: 'Approval', value: 'APPROVAL' },
          { label: 'Form', value: 'FORM' },
          { label: 'Review', value: 'REVIEW' },
          { label: 'Assignment', value: 'ASSIGNMENT' },
        ]
      },
      { name: 'filterWorkflowId', label: 'Filter by Workflow', type: 'string', bindable: true },
    ],
    eventDefinitions: [
      { name: 'rowClick', label: 'On Task Action', description: 'Triggered when a task action (claim, complete, etc.) is performed' },
    ],
    isContainer: false,
  },
  {
    type: 'process-starter',
    name: 'Process Starter',
    category: 'workflow',
    icon: 'play',
    description: 'A button/form that starts a new workflow execution',
    defaultProps: { workflowId: '', label: 'Start Process', variant: 'primary', showInputForm: false },
    propDefinitions: [
      { name: 'workflowId', label: 'Workflow ID', type: 'string', bindable: true, required: true },
      { name: 'label', label: 'Button Label', type: 'string', bindable: true },
      {
        name: 'variant', label: 'Variant', type: 'select', options: [
          { label: 'Primary', value: 'primary' },
          { label: 'Secondary', value: 'secondary' },
          { label: 'Outline', value: 'outline' },
        ]
      },
      { name: 'showInputForm', label: 'Show Input Form', type: 'boolean', description: 'Show a form for initial workflow variables' },
      { name: 'inputFields', label: 'Input Fields', type: 'json', description: 'Define fields for the input form' },
      { name: 'successMessage', label: 'Success Message', type: 'string' },
    ],
    eventDefinitions: [
      { name: 'submit', label: 'On Process Started', description: 'Triggered when a new process instance is created' },
    ],
    isContainer: false,
  },
  {
    type: 'instance-viewer',
    name: 'Instance Viewer',
    category: 'workflow',
    icon: 'activity',
    description: 'Displays workflow execution instances with status, timeline, and progress',
    defaultProps: { workflowId: '', showTimeline: true, pageSize: 10 },
    propDefinitions: [
      { name: 'workflowId', label: 'Filter by Workflow', type: 'string', bindable: true },
      { name: 'showTimeline', label: 'Show Timeline', type: 'boolean' },
      { name: 'pageSize', label: 'Page Size', type: 'number' },
      {
        name: 'statusFilter', label: 'Status Filter', type: 'select', options: [
          { label: 'All', value: '' },
          { label: 'Running', value: 'RUNNING' },
          { label: 'Completed', value: 'COMPLETED' },
          { label: 'Failed', value: 'FAILED' },
        ]
      },
    ],
    eventDefinitions: [
      { name: 'rowClick', label: 'On Instance Click', description: 'Triggered when an instance is clicked' },
    ],
    isContainer: false,
  },
];


// ============================================================================
// Component Registry Service
// ============================================================================

export class ComponentRegistry {
  private components: Map<ComponentType, ComponentDefinition>;

  constructor() {
    this.components = new Map();
    componentDefinitions.forEach(def => {
      this.components.set(def.type, def);
    });
  }

  getComponent(type: ComponentType): ComponentDefinition | undefined {
    return this.components.get(type);
  }

  getAllComponents(): ComponentDefinition[] {
    return Array.from(this.components.values());
  }

  getComponentsByCategory(category: ComponentCategory): ComponentDefinition[] {
    return this.getAllComponents().filter(c => c.category === category);
  }

  getCategories(): ComponentCategory[] {
    const categories = new Set<ComponentCategory>();
    this.getAllComponents().forEach(c => categories.add(c.category));
    return Array.from(categories);
  }

  getContainerComponents(): ComponentDefinition[] {
    return this.getAllComponents().filter(c => c.isContainer);
  }
}

export const componentRegistry = new ComponentRegistry();
