
FLOWFORGE
Workflow Management Platform

Technical Specification Document
Version 1.0
February 2026

Tech Stack: Node.js | React | PostgreSQL


Table of Contents
1. Executive Summary
2. System Architecture
3. Account Management
4. Apps Module
5. Portal Module
6. Processes Module
7. Boards Module
8. Forms & Expressions
9. Integrations
10. Analytics
11. Decision Tables
12. Datasets
13. Database Schema
14. API Specifications
15. Security & Compliance
16. Non-Functional Requirements


1. Executive Summary
FlowForge is an enterprise-grade workflow management platform designed to streamline business processes through low-code development, visual workflow design, and comprehensive analytics. Built on a modern technology stack comprising Node.js, React, and PostgreSQL, the platform provides organizations with the tools to digitize, automate, and optimize their operational workflows.

1.1 Core Objectives
• Enable rapid application development through low-code tools and reusable components
• Provide visual workflow design capabilities for complex business process automation
• Deliver comprehensive analytics and reporting for data-driven decision making
• Ensure enterprise-grade security with robust access control and audit capabilities
• Support seamless integration with third-party systems through APIs and connectors

1.2 Technology Stack
LayerTechnologyPurposeFrontendReact 18+, TypeScript, TailwindCSSUser interface, component library, responsive designBackendNode.js 20+, Express/Fastify, TypeScriptAPI services, business logic, workflow engineDatabasePostgreSQL 16+Primary data store, JSONB for flexible schemasCacheRedis 7+Session management, caching, pub/subSearchElasticsearch 8+Full-text search, analytics indexingQueueBull/BullMQBackground jobs, workflow executionStorageS3-compatible (MinIO)File storage, attachments, exports

2. System Architecture
2.1 High-Level Architecture
The platform follows a microservices-oriented architecture with clear separation of concerns. Core services communicate through REST APIs and event-driven messaging for asynchronous operations.

ServiceResponsibilityScaling StrategyAPI GatewayRequest routing, rate limiting, authenticationHorizontal with load balancerAuth ServiceIdentity management, SSO, token issuanceHorizontal, statelessApp ServiceLow-code builder, page rendering, componentsHorizontal with cacheWorkflow EngineProcess execution, state management, SLAsHorizontal with partitioningForm ServiceForm rendering, validation, calculationsHorizontal, statelessIntegration ServiceConnectors, webhooks, external APIsHorizontal with circuit breakersAnalytics ServiceDashboards, reports, data aggregationVertical + read replicasNotification ServiceEmail, SMS, push, in-app alertsHorizontal with queue
2.2 Data Architecture
PostgreSQL serves as the primary database with JSONB columns enabling flexible schema design for dynamic forms and workflow definitions. The database design balances normalization for referential integrity with denormalization for query performance.

2.3 Multi-Tenancy Model
The platform implements a shared-database, shared-schema multi-tenancy model with row-level security (RLS) policies enforcing tenant isolation. Each tenant is identified by a unique account_id present in all tenant-scoped tables.


3. Account Management
3.1 My Settings
Personal user preferences and profile management functionality enabling users to customize their platform experience.
FeatureDescriptionData ModelProfile ManagementName, avatar, contact information, timezoneusers.profile JSONBNotification PreferencesEmail/SMS/push preferences per event typeuser_notification_prefsTheme SettingsLight/dark mode, accent colors, densityusers.preferences JSONBLanguage & LocaleUI language, date/number formatsusers.localeSession ManagementActive sessions, device history, logout alluser_sessionsSecurity SettingsPassword change, MFA enrollment, recoveryuser_credentials, user_mfa
3.2 Admin Settings
Account-wide configuration settings accessible to administrators for customizing platform behavior and policies.
Setting CategoryConfiguration OptionsStorageGeneralAccount name, logo, timezone, default languageaccountsSecurity PoliciesPassword requirements, session timeout, IP whitelistaccount_security_policiesEmail ConfigurationSMTP settings, email templates, sender addressesaccount_email_configAudit SettingsRetention period, export settings, compliance modeaccount_audit_configFeature FlagsEnable/disable platform features per accountaccount_featuresCustom DomainsBranded URLs, SSL certificate managementaccount_domains
3.3 User Management
Comprehensive user lifecycle management including provisioning, role assignment, and access control.
3.3.1 User Entity Model
FieldTypeDescriptionidUUIDPrimary identifieraccount_idUUID FKTenant referenceemailVARCHAR(255)Unique login identifierstatusENUMactive, inactive, pending, suspendedrole_idsUUID[]Assigned rolesprofileJSONBName, avatar, contact infopreferencesJSONBUI preferences, notificationslast_login_atTIMESTAMPLast authentication timecreated_atTIMESTAMPAccount creation timecreated_byUUID FKCreating administrator
3.3.2 User Operations
OperationEndpointAuthorizationList UsersGET /api/v1/usersusers:readCreate UserPOST /api/v1/usersusers:createGet UserGET /api/v1/users/:idusers:readUpdate UserPATCH /api/v1/users/:idusers:updateDelete UserDELETE /api/v1/users/:idusers:deleteBulk ImportPOST /api/v1/users/importusers:createResend InvitePOST /api/v1/users/:id/inviteusers:update
3.4 Group Management
Organizational grouping of users for simplified permission management and workflow assignments.
FeatureDescriptionImplementationGroup TypesStatic groups, dynamic groups (rule-based)groups.type ENUMNested GroupsHierarchical group structures with inheritancegroup_hierarchy adjacency listDynamic MembershipAuto-membership based on user attributesgroup_rules JSONBGroup RolesRole assignments at group levelgroup_roles junctionGroup SyncSync with external directory groupsdirectory_group_mappings
3.5 Directory Sync
Integration with enterprise identity providers for automated user provisioning and attribute synchronization.
ProviderProtocolSync CapabilitiesAzure ADMicrosoft Graph APIUsers, groups, attributes, photosOktaSCIM 2.0 + REST APIUsers, groups, custom attributesGoogle WorkspaceDirectory APIUsers, groups, org unitsActive DirectoryLDAP/LDAPSUsers, groups, OUsOneLoginSCIM 2.0Users, groups, rolesCustom LDAPLDAP v3Configurable attribute mapping
3.5.1 Sync Configuration
SettingDescriptionDefaultSync IntervalFrequency of incremental sync15 minutesFull Sync ScheduleComplete directory reconciliationDaily at 2 AMConflict ResolutionStrategy for sync conflictsDirectory winsDeprovisioningAction when user removed from directorySuspend accountAttribute MappingDirectory to platform field mappingConfigurable per provider
3.6 SCIM Provisioning
System for Cross-domain Identity Management (SCIM 2.0) support for standardized user lifecycle management.
3.6.1 SCIM Endpoints
ResourceEndpointOperationsUsers/scim/v2/UsersGET, POST, PUT, PATCH, DELETEGroups/scim/v2/GroupsGET, POST, PUT, PATCH, DELETESchemas/scim/v2/SchemasGETResourceTypes/scim/v2/ResourceTypesGETServiceProviderConfig/scim/v2/ServiceProviderConfigGETBulk/scim/v2/BulkPOST
3.6.2 SCIM Schema Extensions
Custom schema extension for platform-specific attributes:
• urn:ietf:params:scim:schemas:extension:flowforge:2.0:User
• Custom attributes: department, costCenter, employeeType, manager
• Platform roles and permissions mapping
• Notification preferences

3.7 Service Accounts
Non-interactive accounts for system integrations, API access, and automated processes.
FeatureDescriptionSecurity ControlAPI KeysLong-lived tokens for service authenticationScoped permissions, IP restrictionsOAuth ClientsOAuth 2.0 client credentials flowClient secret rotation, scope limitsWebhook SigningRequest signature for webhook deliveryHMAC-SHA256, key rotationRate LimitsPer-service-account rate limitingConfigurable limits per accountAudit TrailAll service account actions loggedImmutable audit logExpirationOptional key/token expirationConfigurable TTL
3.8 Account Governance
Policies and controls for managing account-wide security, compliance, and operational standards.
Governance AreaCapabilitiesImplementationRole-Based Access ControlHierarchical roles, custom permissions, least privilegeroles, permissions, role_permissionsData RetentionConfigurable retention policies, automated purgingretention_policies, scheduled jobsAudit LoggingComprehensive activity logging, tamper-proof storageaudit_logs, log shippingCompliance ReportsSOC 2, GDPR, HIPAA compliance reportingcompliance_reports generationAccess ReviewsPeriodic access certification campaignsaccess_reviews, review_tasksPolicy EnforcementAutomated policy checking and enforcementpolicy_rules, policy_violations

4. Apps Module
4.1 Low-Code App Builder
Visual development environment enabling rapid application creation without extensive coding knowledge.
4.1.1 App Definition Schema
FieldTypeDescriptionidUUIDUnique application identifieraccount_idUUID FKOwning tenantnameVARCHAR(100)Application display nameslugVARCHAR(50)URL-friendly identifierdescriptionTEXTApplication descriptioniconVARCHAR(50)Icon identifier or emojistatusENUMdraft, published, archivedversionINTEGERCurrent published versiondefinitionJSONBComplete app configurationpermissionsJSONBAccess control settingssettingsJSONBApp-specific settings
4.1.2 App Builder Features
FeatureDescriptionStorageVisual DesignerDrag-drop interface builder with live previewapp_pages.layout JSONBData ModelingDefine data entities with relationshipsapp_entities, entity_fieldsBusiness LogicEvent handlers, automations, calculationsapp_automations JSONBThemingCustom colors, fonts, branding per appapp_themes JSONBVersion ControlTrack changes, rollback, branchingapp_versions, app_changesDeploymentStaging/production environmentsapp_deployments
4.2 Custom Pages
Flexible page builder for creating custom interfaces within applications.
Page ElementDescriptionConfigurationLayout ContainersGrid, flex, stack layoutsrows, columns, gap, alignmentData ComponentsTables, lists, cards, detail viewsdata source, columns, actionsInput ComponentsForms, filters, search barsfields, validation, submissionChart ComponentsBar, line, pie, area chartsdata source, dimensions, measuresNavigationTabs, breadcrumbs, menus, linksitems, routes, conditionsMediaImages, videos, documents, embedssource, sizing, fallback
4.2.1 Page Configuration Schema
FieldTypeDescriptionidUUIDPage identifierapp_idUUID FKParent applicationnameVARCHAR(100)Page titlerouteVARCHAR(200)URL path patternlayoutJSONBComponent tree definitiondata_sourcesJSONBData queries and bindingspermissionsJSONBPage-level access controlseoJSONBTitle, description, meta tags
4.3 Reusable Components
Component library enabling creation and sharing of custom UI elements across applications.
Component TypeDescriptionReusability ScopeUI ComponentsButtons, inputs, cards with custom stylingAccount-wideComposite ComponentsPre-built combinations of elementsAccount-wideData ComponentsConnected components with data bindingApp-specific or sharedTemplate PagesFull page templates for common patternsAccount-wideSnippetsReusable code/expression blocksAccount-wide
4.3.1 Component Registry
FieldTypeDescriptionidUUIDComponent identifieraccount_idUUID FKOwning tenantnameVARCHAR(100)Component namecategoryVARCHAR(50)Component categorydefinitionJSONBComponent structure and propsschemaJSONBInput/output prop definitionspreviewTEXTBase64 preview imageusage_countINTEGERNumber of usages
4.4 External Data Objects
Connect applications to external data sources while maintaining referential integrity.
Data Source TypeConnection MethodSync OptionsREST APIHTTP/HTTPS with authReal-time, polling, webhookGraphQLGraphQL endpointReal-time with subscriptionsDatabaseDirect connection (read-only)Scheduled sync, CDCFile ImportCSV, Excel, JSON uploadManual, scheduledSalesforceSalesforce Connect APIReal-time, outbound messagesSAPOData / RFC connectorsScheduled batch sync
EDO ConfigurationTypeDescriptionidUUIDExternal data object identifierconnection_idUUID FKData source connectionnameVARCHAR(100)Object display nameexternal_entityVARCHAR(200)Source table/object namefield_mappingsJSONBLocal to external field mappingsync_configJSONBSync frequency, filters, transformscache_configJSONBCaching strategy and TTL

5. Portal Module
5.1 External User Portals
Dedicated interfaces for external stakeholders including customers, vendors, and partners.
Portal FeatureDescriptionConfigurationPortal DefinitionStandalone branded entry pointportal_sites tableUser RegistrationSelf-service registration with approvalportal_registration_configGuest AccessAnonymous access to selected contentportal_guest_configCustom DomainBranded URL with SSLportal_domainsMobile ResponsiveAdaptive layouts for all devicesAutomatic via CSSOffline SupportPWA capabilities for offline accessService worker config
5.1.1 Portal User Model
FieldTypeDescriptionidUUIDPortal user identifierportal_idUUID FKAssociated portalemailVARCHAR(255)Login emailstatusENUMpending, active, suspendedprofileJSONBName, company, contact infopermissionsJSONBPortal-specific permissionslast_login_atTIMESTAMPLast access timestampregistration_dataJSONBOriginal registration info
5.2 Branding
Complete visual customization capabilities for portal white-labeling.
Branding ElementCustomization OptionsStorageLogoPrimary logo, favicon, loading animationS3 + portal_brandingColorsPrimary, secondary, accent, surface colorsportal_branding.colors JSONBTypographyFont family, sizes, weightsportal_branding.typography JSONBLayoutHeader, footer, sidebar configurationportal_branding.layout JSONBEmail TemplatesBranded email headers, footers, stylesportal_email_templatesCustom CSSAdvanced CSS overridesportal_branding.custom_css TEXT
5.3 Access Control
Granular permission management for portal users and content visibility.
Access Control FeatureDescriptionImplementationContent PermissionsPage/section visibility by user typeportal_content_permissionsData FilteringRow-level security for portal dataportal_data_policiesAction PermissionsSubmit, edit, delete capabilitiesportal_action_permissionsIP RestrictionsWhitelist allowed IP rangesportal_ip_rulesTime-based AccessAccess windows for contentportal_time_rulesSession ControlsConcurrent sessions, timeout settingsportal_session_config

6. Processes Module
6.1 Visual Workflow Designer
Drag-and-drop workflow builder for creating complex business processes without coding.
6.1.1 Process Definition Schema
FieldTypeDescriptionidUUIDProcess definition identifieraccount_idUUID FKOwning tenantnameVARCHAR(200)Process namedescriptionTEXTProcess descriptioncategoryVARCHAR(100)Process categoryversionINTEGERPublished version numberstatusENUMdraft, active, deprecateddefinitionJSONBComplete workflow graphvariablesJSONBProcess variable definitionstriggersJSONBStart trigger configurationspermissionsJSONBAccess control settings
6.1.2 Workflow Node Types
Node TypeDescriptionConfiguration OptionsStartProcess entry pointTrigger type, input formEndProcess terminationOutput mapping, statusTaskHuman task assignmentAssignee rules, form, SLAApprovalApproval/rejection decisionApprovers, escalation, delegationGatewayBranching and mergingCondition type, expressionsServiceExternal service callConnector, mapping, retryScriptCustom code executionJavaScript/Python codeSubprocessNested process invocationProcess reference, mappingTimerDelay or scheduleDuration, cron expressionNotificationSend notificationsChannel, template, recipients
6.1.3 Process Instance Model
FieldTypeDescriptionidUUIDProcess instance identifierdefinition_idUUID FKProcess definition referencedefinition_versionINTEGERVersion at start timestatusENUMrunning, completed, failed, cancelledcurrent_nodesUUID[]Active node instancesvariablesJSONBCurrent variable valuesstarted_atTIMESTAMPProcess start timestarted_byUUID FKInitiating usercompleted_atTIMESTAMPProcess completion timeparent_instance_idUUID FKParent process (if subprocess)
6.2 Approvals & Conditions
Flexible approval workflow configuration with conditional routing and parallel approvals.
Approval FeatureDescriptionConfigurationSequential ApprovalOrdered chain of approversapprover_sequence arrayParallel ApprovalConcurrent approval requestsall, any, percentage thresholdHierarchical ApprovalManager chain approvallevels, skip rulesConditional RoutingRoute based on data valuesCondition expressionsDelegationTemporary delegation to another userdelegate_to, date_rangeEscalationAuto-escalate on SLA breachescalation_rulesBulk ApprovalApprove multiple items at oncebatch_approval_config
6.2.1 Approval Assignment Rules
Assignment TypeDescriptionExampleStatic UserFixed user IDuser:uuidRole-basedAny user with rolerole:finance_approverGroup-basedAny user in groupgroup:department_headsExpressionDynamic evaluation${record.amount > 10000 ? 'cfo' : 'manager'}Manager LookupOrg hierarchymanager:${initiator.id}:2Round RobinLoad-balanced assignmentpool:sales_team:round_robin
6.3 SLA & Notifications
Service Level Agreement monitoring and comprehensive notification system.
SLA FeatureDescriptionConfigurationDue Date CalculationStatic or dynamic durationduration, business_hours, calendarWarning ThresholdsAlerts before breachwarning_at percentagesBreach ActionsAutomatic actions on breachescalate, reassign, notifyBusiness CalendarsWorking hours and holidayscalendar_id referenceSLA ReportingCompliance metrics and trendsAnalytics dashboard
6.3.1 Notification Channels
ChannelConfigurationTemplate SupportEmailSMTP/SendGrid/SES configHTML templates with variablesSMSTwilio/MessageBird configShort text templatesPushFCM/APNs configurationTitle, body, actionsIn-AppReal-time websocket deliveryRich notificationsSlackWebhook/Bot integrationBlock Kit templatesMS TeamsWebhook/Graph APIAdaptive CardsWebhookCustom HTTP endpointJSON payload template
6.4 Process Governance
Controls and policies for managing process lifecycle, compliance, and quality.
Governance FeatureDescriptionImplementationVersion ControlTrack all process changes with historyprocess_versions tableApproval WorkflowRequire approval for process changesprocess_change_requestsTesting ModeTest processes before publishingSandbox instancesImpact AnalysisAnalyze effects of changesdependency_graphRollbackRevert to previous versionsVersion restorationUsage AnalyticsTrack process usage and performanceprocess_metricsCompliance TaggingTag processes for complianceprocess_compliance_tags

7. Boards Module
7.1 Kanban Boards
Visual work management with customizable Kanban boards for tracking items across stages.
7.1.1 Board Definition Schema
FieldTypeDescriptionidUUIDBoard identifieraccount_idUUID FKOwning tenantnameVARCHAR(200)Board namedescriptionTEXTBoard descriptiondata_sourceJSONBSource entity/dataset configcolumnsJSONBColumn definitions and ordercard_templateJSONBCard display configurationfiltersJSONBDefault filter configurationpermissionsJSONBAccess control settingssettingsJSONBWIP limits, automation rules
7.1.2 Kanban Features
FeatureDescriptionConfigurationDrag & DropMove cards between columnsstatus_field mappingWIP LimitsLimit items per columncolumn.wip_limit integerSwimlanesHorizontal grouping of cardsswimlane_field, collapsibleCard TemplatesCustomizable card appearancefields, colors, badgesQuick FiltersPredefined filter buttonsfilter_presets arrayBulk ActionsMulti-select operationsallowed_actions arrayAutomationRules triggered on card movementautomation_rules JSONB
7.2 List & Timeline Views
Alternative board visualizations for different work management needs.
View TypeDescriptionSpecific FeaturesList ViewTabular display with sorting/groupingColumn configuration, inline editingTimeline ViewGantt-style temporal visualizationDate fields, dependencies, milestonesCalendar ViewMonth/week/day calendar layoutDate fields, drag to rescheduleGrid ViewSpreadsheet-like interfaceCell editing, formulas, freeze columnsGallery ViewVisual card grid layoutImage field, card sizing
7.2.1 Timeline-Specific Features
FeatureDescriptionConfigurationDependenciesTask predecessor/successor linksdependency_field, line stylesCritical PathHighlight critical path itemsauto_calculate booleanMilestonesDiamond markers for key datesmilestone_fieldProgress TrackingVisual completion percentageprogress_fieldResource ViewGroup by assigneeresource_fieldZoom LevelsDay, week, month, quarter viewsdefault_zoom setting
7.3 Sub-items
Hierarchical item structure enabling parent-child relationships within boards.
Sub-item FeatureDescriptionImplementationNested HierarchyMultiple levels of sub-itemsparent_item_id FK, max 5 levelsInherited FieldsAuto-populate from parentfield_inheritance_rulesRollup CalculationsAggregate child values to parentrollup_fields configurationDependency LinkingCross-hierarchy dependenciesitem_dependencies tableBulk CreationCreate multiple sub-items at oncetemplate_items arrayProgress RollupParent progress from childrenauto_progress boolean

8. Forms & Expressions
8.1 Drag & Drop Form Builder
Visual form designer enabling rapid creation of data collection interfaces.
8.1.1 Form Definition Schema
FieldTypeDescriptionidUUIDForm identifieraccount_idUUID FKOwning tenantnameVARCHAR(200)Form namedescriptionTEXTForm descriptionlayoutJSONBField arrangement and sectionsfieldsJSONBField definitions arrayvalidation_rulesJSONBForm-level validationssubmission_configJSONBSubmit behavior configurationpermissionsJSONBAccess control settingsversionINTEGERForm version number
8.1.2 Field Types
CategoryField TypesSpecial FeaturesTextShort text, Long text, Rich text, Email, URL, PhoneMasking, formattingNumberInteger, Decimal, Currency, PercentageMin/max, precisionSelectionDropdown, Radio, Checkbox, Multi-selectStatic/dynamic optionsDate/TimeDate, Time, DateTime, Date rangeCalendars, time zonesFileSingle file, Multiple files, ImageSize limits, type restrictionsReferenceLookup, User picker, Record linkFilters, display fieldsCompositeAddress, Name, Rating, SignatureSub-field configurationLayoutSection, Tabs, Columns, DividerCollapsible, conditional
8.2 Field Validations
Comprehensive validation framework ensuring data quality at input time.
Validation TypeDescriptionConfiguration ExampleRequiredField must have a value{ required: true }PatternRegex pattern matching{ pattern: '^[A-Z]{3}[0-9]{4}$' }LengthMin/max character count{ minLength: 5, maxLength: 100 }RangeNumeric bounds{ min: 0, max: 999999 }CustomExpression-based validation{ expression: '${age} >= 18' }UniqueValue uniqueness check{ unique: true, scope: 'form' }AsyncServer-side validation{ endpoint: '/validate/email' }
8.3 Conditional Logic
Dynamic form behavior based on user input and context.
Condition TypeDescriptionUse CaseShow/HideToggle field visibilityShow address if 'shipping required' checkedEnable/DisableToggle field editabilityDisable discount field if not managerRequiredConditional requirementRequire reason if status is 'rejected'Options FilterFilter dropdown optionsShow departments for selected divisionValue SetAuto-populate valuesSet due date to +7 days from startValidationConditional validation rulesRequire approval if amount > threshold
8.3.1 Condition Expression Syntax
OperatorDescriptionExample==, !=Equality comparison${status} == 'active'>, <, >=, <=Numeric comparison${amount} >= 10000&&, ||Logical operators${type} == 'A' && ${priority} == 'high'IN, NOT INList membership${category} IN ['sales', 'marketing']CONTAINSString/array contains${tags} CONTAINS 'urgent'EMPTY, NOT EMPTYNull/empty check${notes} NOT EMPTYMATCHESRegex matching${code} MATCHES '^PRJ-[0-9]+$'
8.4 Expressions & Calculations
Formula engine for computed fields, default values, and dynamic content.
Expression CategoryFunctionsExampleMathSUM, AVG, MIN, MAX, ROUND, ABSSUM(${lineItems}.amount)TextCONCAT, UPPER, LOWER, TRIM, SUBSTRINGCONCAT(${firstName}, ' ', ${lastName})DateNOW, TODAY, DATEADD, DATEDIFF, FORMATDATEADD(${startDate}, 30, 'days')LogicIF, SWITCH, AND, OR, NOT, COALESCEIF(${type}=='A', 0.1, 0.15)LookupLOOKUP, VLOOKUP, RELATEDLOOKUP('products', ${productId}, 'price')AggregateCOUNT, COUNTIF, SUMIF, AVGIFSUMIF(${items}, 'status', 'approved', 'amount')UserCURRENTUSER, USERPROP, INROLEUSERPROP(CURRENTUSER(), 'department')
8.4.1 Expression Engine Architecture
ComponentTechnologyPurposeParserPEG.js / ChevrotainParse expression syntax to ASTValidatorCustom TypeScriptType checking and validationEvaluatorCustom interpreterRuntime expression evaluationOptimizerAST transformerConstant folding, cachingSandboxIsolated V8 contextSafe execution of custom code

9. Integrations
9.1 Pre-built Connectors
Ready-to-use integrations with popular enterprise applications.
CategoryConnectorsCapabilitiesCRMSalesforce, HubSpot, Dynamics 365Contacts, accounts, opportunities syncERPSAP, Oracle, NetSuiteOrders, inventory, financial dataHRISWorkday, BambooHR, ADPEmployee data, org structureProductivityGoogle Workspace, Microsoft 365Calendar, drive, email integrationCommunicationSlack, Teams, ZoomNotifications, meeting schedulingStorageBox, Dropbox, SharePointFile storage and retrievalPaymentStripe, PayPal, SquarePayment processingMarketingMailchimp, Marketo, PardotCampaign and lead management
9.1.1 Connector Configuration Schema
FieldTypeDescriptionidUUIDConnector instance identifieraccount_idUUID FKOwning tenantconnector_typeVARCHAR(50)Connector template referencenameVARCHAR(200)Instance display namecredentialsJSONB (encrypted)Authentication credentialsconfigJSONBConnector-specific settingsstatusENUMconnected, error, disabledlast_sync_atTIMESTAMPLast successful syncerror_detailsJSONBLast error information
9.2 REST APIs
Comprehensive API for programmatic access to all platform capabilities.
9.2.1 API Design Principles
• RESTful design with consistent resource naming
• JSON request/response format with JSON:API specification
• OAuth 2.0 and API key authentication
• Rate limiting with token bucket algorithm
• Pagination using cursor-based navigation
• Filtering, sorting, and field selection via query parameters
• Comprehensive error responses with error codes

9.2.2 Core API Endpoints
ResourceBase EndpointOperationsUsers/api/v1/usersCRUD, bulk, searchGroups/api/v1/groupsCRUD, membershipApps/api/v1/appsCRUD, publish, exportProcesses/api/v1/processesCRUD, start, actionsTasks/api/v1/tasksList, complete, reassignForms/api/v1/formsCRUD, submit, validateDatasets/api/v1/datasetsCRUD, query, importFiles/api/v1/filesUpload, download, metadata
9.3 Webhooks
Event-driven notifications for real-time integration with external systems.
Webhook FeatureDescriptionConfigurationEvent SelectionSubscribe to specific eventsevent_types arrayFilteringFilter events by conditionsfilter_expressionPayload TemplateCustom payload structurepayload_template JSONBRetry PolicyAutomatic retry on failuremax_retries, backoff_strategySignatureHMAC signature verificationsigning_secretDelivery LogTrack delivery statuswebhook_deliveries table
9.3.1 Webhook Events
CategoryEventsPayload ContentsProcessstarted, completed, failed, task.createdInstance ID, status, variablesTaskassigned, completed, escalated, delegatedTask ID, assignee, outcomeRecordcreated, updated, deletedRecord data, changed fieldsUsercreated, updated, deactivatedUser profile, changesFormsubmitted, approved, rejectedSubmission data, outcomeIntegrationsync.completed, sync.failed, errorSync details, error info
9.4 Integration Builder
Visual tool for creating custom integrations without coding.
Builder FeatureDescriptionImplementationConnection WizardStep-by-step connection setupOAuth flow, credential entryObject MappingMap external to internal fieldsVisual field mapperTransformationData transformation rulesExpression-based transformsSync RulesDefine sync behaviorDirection, frequency, conflict resolutionError HandlingConfigure error responsesRetry, skip, alert optionsTestingTest connections and mappingsPreview with sample data
9.4.1 Custom Connector Schema
FieldTypeDescriptionidUUIDCustom connector identifieraccount_idUUID FKOwning tenantnameVARCHAR(200)Connector namebase_urlVARCHAR(500)API base URLauth_configJSONBAuthentication configurationoperationsJSONBAvailable operations definitionsobject_schemasJSONBData object schemasmappingsJSONBField mapping configurations

10. Analytics
10.1 Dashboards
Customizable analytics dashboards providing real-time visibility into operations.
10.1.1 Dashboard Definition Schema
FieldTypeDescriptionidUUIDDashboard identifieraccount_idUUID FKOwning tenantnameVARCHAR(200)Dashboard namedescriptionTEXTDashboard descriptionlayoutJSONBWidget positions and sizeswidgetsJSONBWidget configurationsfiltersJSONBGlobal filter definitionsrefresh_intervalINTEGERAuto-refresh secondspermissionsJSONBAccess control settingsis_defaultBOOLEANDefault dashboard for role
10.1.2 Dashboard Features
FeatureDescriptionImplementationWidget LibraryPre-built visualization componentsReact component libraryDrag & Drop LayoutFlexible grid-based arrangementReact-grid-layoutGlobal FiltersCross-widget filteringFilter context providerDrill-downClick to explore detailsParameterized navigationExportPDF, PNG, scheduled emailPuppeteer renderingEmbeddingEmbed in external sitesSigned iframe URLs
10.2 Charts & Reports
Comprehensive visualization and reporting capabilities.
Chart TypeUse CaseConfiguration OptionsBar/ColumnCategory comparisonStacked, grouped, horizontalLine/AreaTrends over timeMulti-series, smooth, steppedPie/DonutPart-to-whole relationshipsLegend, labels, drill-downScatter/BubbleCorrelation analysisSize dimension, trend lineFunnelConversion trackingStages, percentage labelsGaugeKPI against targetThresholds, colorsTable/PivotDetailed data viewSorting, grouping, totalsMapGeographic distributionChoropleth, markers, regions
10.2.1 Report Builder
FeatureDescriptionConfigurationData SourceSelect tables/datasetsMulti-source joinsDimensionsGrouping fieldsHierarchy supportMeasuresAggregation calculationsSUM, AVG, COUNT, customFiltersData filteringStatic and dynamic filtersCalculated FieldsCustom expressionsFormula builderFormattingDisplay optionsNumber formats, colorsSchedulingAutomated deliveryCron schedule, recipients
10.3 Process Analytics
Specialized analytics for workflow performance monitoring and optimization.
Metric CategoryMetricsVisualizationVolumeStarted, completed, active instancesTrend line, countersDurationAvg cycle time, lead time, wait timeDistribution histogramSLASLA compliance %, breaches by typeGauge, breach trendBottlenecksTime per step, queue lengthsHeat map, funnelUsersTasks per user, completion rateLeaderboard, bar chartOutcomesCompletion vs cancellation vs errorPie chart, trend
10.3.1 Process Mining Features
FeatureDescriptionImplementationProcess DiscoveryAuto-discover actual process flowsEvent log analysisConformanceCompare actual vs designed processDeviation highlightingVariant AnalysisIdentify process variationsPath clusteringRoot CauseAnalyze bottleneck causesCorrelation analysisPredictionPredict completion, outcomesML models
10.4 External BI Support
Integration capabilities for enterprise business intelligence tools.
Integration TypeSupported ToolsImplementationDirect ConnectTableau, Power BI, LookerPostgreSQL connectorODBC/JDBCAny ODBC-compatible toolRead replica connectionData ExportCSV, Excel scheduled exportsExport jobsAPI AccessCustom BI toolsAnalytics API endpointsSemantic LayerPre-built data modelsdbt models, views

11. Decision Tables
11.1 Centralized Business Rules
Visual decision table editor for managing complex business rules without code.
11.1.1 Decision Table Schema
FieldTypeDescriptionidUUIDDecision table identifieraccount_idUUID FKOwning tenantnameVARCHAR(200)Table namedescriptionTEXTBusiness rule descriptioninput_schemaJSONBInput parameter definitionsoutput_schemaJSONBOutput field definitionsrulesJSONBRule rows with conditions/actionshit_policyENUMfirst, all, collect, priorityversionINTEGERPublished version numberstatusENUMdraft, active, deprecated
11.1.2 Hit Policies
PolicyBehaviorUse CaseFirst (F)Return first matching ruleSimple lookup tablesAny (A)Return any match (must agree)Validation rulesCollect (C)Return all matching outputsMulti-result calculationsPriority (P)Return highest priority matchTiered pricing, discountsUnique (U)Exactly one rule must matchDeterministic decisionsOutput Order (O)Return matches in table orderOrdered recommendations
11.2 Reusable Logic
Decision tables as shared resources across processes, forms, and integrations.
Usage ContextIntegration MethodExampleProcess NodesDecision node typeRoute approval based on amountForm DefaultsExpression functionCalculate insurance premiumValidationCustom validation ruleValidate eligibility criteriaAPI EndpointDirect API invocationReal-time pricing engineBatch ProcessingJob executionBulk classification
11.2.1 Decision Table API
EndpointMethodDescription/api/v1/decisionsGETList decision tables/api/v1/decisions/:idGETGet decision table details/api/v1/decisions/:id/evaluatePOSTEvaluate with inputs/api/v1/decisions/:id/batchPOSTBulk evaluation/api/v1/decisions/:id/testPOSTTest with scenarios
11.3 Rule Prioritization
Mechanisms for handling rule conflicts and establishing execution order.
FeatureDescriptionConfigurationExplicit PriorityNumeric priority columnpriority INTEGER per ruleSpecificityMore specific rules take precedenceAuto-calculated specificityEffective DatesTime-bounded rule activationvalid_from, valid_to datesOverride RulesRules that supersede othersoverride_ids arrayConflict DetectionIdentify overlapping rulesValidation warningsSimulationTest rule interactionsWhat-if analysis

12. Datasets
12.1 Reusable Data Tables
Centralized data storage for reference data, lookup tables, and shared datasets.
12.1.1 Dataset Schema
FieldTypeDescriptionidUUIDDataset identifieraccount_idUUID FKOwning tenantnameVARCHAR(200)Dataset namedescriptionTEXTDataset descriptionschemaJSONBField definitionsindexesJSONBIndex configurationsconstraintsJSONBUnique, foreign key rulesrow_countBIGINTCached record countstorage_typeENUMtable, view, externalpermissionsJSONBAccess control settings
12.1.2 Dataset Operations
OperationEndpointDescriptionQueryPOST /api/v1/datasets/:id/queryFilter, sort, paginate recordsCreate RecordPOST /api/v1/datasets/:id/recordsInsert single recordBulk ImportPOST /api/v1/datasets/:id/importCSV/Excel bulk importUpdate RecordPATCH /api/v1/datasets/:id/records/:ridUpdate existing recordDelete RecordDELETE /api/v1/datasets/:id/records/:ridRemove recordExportGET /api/v1/datasets/:id/exportExport to CSV/ExcelSchema UpdatePATCH /api/v1/datasets/:id/schemaModify field definitions
12.2 Dataset Governance
Controls and policies for managing dataset access, quality, and lifecycle.
Governance FeatureDescriptionImplementationAccess ControlRow and column level securityRLS policies, field permissionsData ClassificationPII, confidential, public taggingclassification_tags JSONBAudit TrailTrack all data changesdataset_audit_log tableData QualityValidation rules, completeness checksquality_rules JSONBRetention PolicyAutomated data archival/deletionretention_configVersion HistoryTrack schema changesdataset_versions tableLineageTrack data flow and dependenciesdataset_lineage graph
12.2.1 Row-Level Security
Policy TypeDescriptionExampleUser FilterFilter by current userowner_id = current_user()Role FilterFilter by user roleregion IN user_regions()Group FilterFilter by group membershipdepartment IN user_groups()ExpressionCustom filter expressionclassification != 'secret' OR has_clearance()
12.3 Analytics Data Sources
Dataset configuration for analytics consumption and BI integration.
FeatureDescriptionConfigurationSemantic LayerBusiness-friendly field namesdisplay_name, descriptionCalculated MeasuresPre-defined aggregationsmeasures JSONB arrayDimensionsGrouping hierarchiesdimensions JSONB arrayRelationshipsJoin definitions for multi-tablerelationships arrayMaterialized ViewsPre-aggregated summariesmaterialization_configIncremental RefreshEfficient data updatesrefresh_strategy

13. Database Schema
13.1 Core Tables
Primary database tables supporting platform functionality. All tables include account_id for multi-tenancy and standard audit columns (created_at, updated_at, created_by, updated_by).

TablePurposeKey RelationshipsaccountsTenant accountsParent of all tenant datausersUser accountsaccounts, groups, rolesgroupsUser groupsaccounts, users (junction)rolesPermission rolesaccounts, permissionspermissionsGranular permissionsroles (junction)appsApplication definitionsaccounts, app_pagesapp_pagesPage definitionsapps, componentsprocessesWorkflow definitionsaccounts, process_nodesprocess_instancesRunning workflowsprocesses, task_instancestask_instancesHuman tasksprocess_instances, usersformsForm definitionsaccounts, form_fieldsdatasetsData tablesaccounts, dataset_recordsconnectorsIntegration connectionsaccountsdecision_tablesBusiness rulesaccountsdashboardsAnalytics dashboardsaccounts, widgets
13.2 Index Strategy
Index TypeUsageExampleB-treeEquality, range queriesidx_users_emailGINJSONB containment, arraysidx_apps_definition_ginGiSTFull-text searchidx_datasets_searchPartialFiltered queriesidx_active_users WHERE status='active'CompositeMulti-column queriesidx_tasks_assignee_status
13.3 Partitioning Strategy
TablePartition KeyStrategyaudit_logscreated_atMonthly range partitionsprocess_instancesaccount_idHash partitions (16)dataset_recordsdataset_idList partitions per datasetwebhook_deliveriescreated_atWeekly range partitions

14. API Specifications
14.1 Authentication
MethodUse CaseImplementationOAuth 2.0User authentication, SSOAuthorization code, PKCEAPI KeysService integrationsHeader: X-API-KeyJWTSession tokensRS256 signed, 1hr expirySCIM BearerIdentity provider syncOAuth bearer token
14.2 Rate Limiting
TierRequests/MinuteBurst LimitFree6010Professional30050Enterprise1000100CustomConfigurableConfigurable
14.3 Error Response Format
Standardized error responses following RFC 7807 Problem Details specification.
FieldTypeDescriptiontypeURIError type identifiertitleStringHuman-readable summarystatusIntegerHTTP status codedetailStringDetailed explanationinstanceURISpecific occurrence identifiererrorsArrayField-level validation errors

15. Security & Compliance
15.1 Authentication & Authorization
FeatureImplementationStandardSSOSAML 2.0, OIDCEnterprise IdP integrationMFATOTP, SMS, WebAuthnFIDO2 compliancePassword PolicyConfigurable complexityNIST 800-63BSession ManagementSecure cookies, token rotationOWASP guidelinesRBACHierarchical rolesPrinciple of least privilege
15.2 Data Protection
ProtectionImplementationScopeEncryption at RestAES-256All stored dataEncryption in TransitTLS 1.3All network trafficField EncryptionApplication-level AESSensitive fields (PII)Key ManagementAWS KMS / HashiCorp VaultAutomated rotationData MaskingDynamic maskingNon-production environments
15.3 Compliance Certifications
CertificationScopeRenewalSOC 2 Type IISecurity, availabilityAnnualISO 27001Information security3-year cycleGDPREU data protectionOngoingHIPAAHealthcare data (optional)Annual assessmentCCPACalifornia privacyOngoing
15.4 Audit Logging
Event CategoryEvents LoggedRetentionAuthenticationLogin, logout, MFA, password changes2 yearsAuthorizationPermission changes, role assignments2 yearsData AccessCreate, read, update, delete operations1 yearConfigurationSettings changes, integrations2 yearsAdmin ActionsUser management, system config7 years

16. Non-Functional Requirements
16.1 Performance
MetricTargetMeasurementAPI Response Time (p95)< 200msApplication Performance MonitoringPage Load Time< 2 secondsCore Web VitalsWorkflow Step Execution< 500msInternal metricsSearch Query Time< 100msElasticsearch metricsReport Generation< 10 secondsJob duration tracking
16.2 Scalability
DimensionTarget CapacityScaling StrategyConcurrent Users100,000+Horizontal API scalingAccounts10,000+Multi-tenant partitioningProcesses/Day1,000,000+Workflow engine clusteringData Volume100TB+PostgreSQL partitioning, archivalIntegrations1000+ concurrent webhooksQueue-based processing
16.3 Availability
RequirementTargetImplementationUptime SLA99.9%Multi-AZ deploymentRTO< 1 hourAutomated failoverRPO< 5 minutesStreaming replicationMaintenance WindowsZero downtimeRolling deploymentsDisaster RecoveryCross-regionAsync replication
16.4 Accessibility
StandardTarget LevelVerificationWCAG2.1 AAAutomated + manual testingKeyboard NavigationFull supportTab order, focus managementScreen ReadersARIA complianceNVDA, JAWS, VoiceOver testingColor Contrast4.5:1 minimumAutomated contrast checkingMotionReduced motion supportprefers-reduced-motion
16.5 Browser Support
BrowserMinimum VersionNotesChromeLast 2 major versionsPrimary development targetFirefoxLast 2 major versionsFull supportSafariLast 2 major versionsmacOS and iOSEdgeLast 2 major versionsChromium-basedMobile SafariiOS 14+PWA supportMobile ChromeAndroid 8+PWA support

- End of Specification Document -
FlowForge Platform - Technical Specification

Page 1 | Confidential


