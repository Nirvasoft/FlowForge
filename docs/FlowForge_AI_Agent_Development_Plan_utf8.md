
FLOWFORGE
Workflow Management Platform

AI Agent Development Plan
Building FlowForge with Claude & Gemini AI Coding Agents

??

Version 1.0 | February 2026

Estimated Duration: 4-6 Months
Human Team: 3-5 Engineers (Oversight & Review)
AI Agents: Claude Code, Gemini Code Assist, GitHub Copilot


Executive Summary
This implementation plan outlines a radically accelerated approach to building FlowForge using AI coding agents as the primary developers. Instead of a traditional 18-24 month timeline with 25-40 engineers, this plan leverages AI agents like Claude (via Claude Code / Cursor / Aider) and Google Gemini (via Gemini Code Assist) to compress development to 4-6 months with a small human oversight team.

AI coding agents will generate the majority of code, with human engineers focusing on architecture decisions, code review, quality assurance, and areas requiring deep domain expertise. This approach represents a paradigm shift in software development.

Traditional vs AI Agent Development
AspectTraditional ApproachAI Agent ApproachTimeline18-24 months4-6 monthsTeam Size25-40 engineers3-5 engineers + AI agentsCost$8-12M$500K-1.5MCode Generation100% human-written80-90% AI-generatedHuman RoleWrite all codeArchitecture, review, QA, edge casesIteration Speed2-week sprintsDaily/hourly iterationsDocumentationOften neglectedAI generates comprehensive docsTest CoverageVariable (60-80%)High (90%+) - AI generates tests
AI Coding Agents Used
AgentProviderPrimary Use CasesStrengthsClaude CodeAnthropicComplex features, architecture, full filesDeep reasoning, large context, qualityCursor (Claude/GPT)Cursor AIIDE integration, real-time codingFast iteration, codebase awarenessAiderOpen Source + ClaudeGit-aware coding, refactoringMulti-file edits, git integrationGemini Code AssistGoogleCode completion, explanationsSpeed, Google ecosystemGitHub CopilotGitHub/OpenAIInline completion, boilerplateIDE integration, speedDevin / OpenHandsCognition / Open SourceAutonomous task completionEnd-to-end feature development

Project Overview
Development Model
AttributeDetailsTotal Duration4-6 months (16-24 weeks)Phases8 phases (compressed from traditional plan)Human Team3-5 engineers (Tech Lead, 2-3 Full-stack, 1 DevOps)AI AgentsClaude Code, Cursor, Aider, Gemini, CopilotMethodologyAI-driven sprints with daily human reviewCode ReviewAll AI code reviewed by humans before mergeTestingAI generates tests, humans verify coverageBudget$500K-1.5M (including AI API costs)
Human Team Responsibilities
RoleCountResponsibilitiesTech Lead / Architect1Architecture decisions, AI prompt engineering, final code review, securitySenior Full-Stack Engineer1-2Complex integrations, AI output review, edge case handling, performanceFull-Stack Engineer1AI task delegation, code review, testing verification, documentation reviewDevOps Engineer1Infrastructure, CI/CD, deployment, monitoring, security scanning
AI Agent Task Allocation
Task CategoryAI ResponsibilityHuman ResponsibilityArchitecture DesignGenerate options, document patternsMake decisions, validate choicesDatabase SchemaGenerate migrations, models, indexesReview design, optimize queriesAPI DevelopmentGenerate endpoints, validation, docsReview security, edge casesFrontend ComponentsGenerate React components, stylesReview UX, accessibilityBusiness LogicImplement from specsVerify correctness, edge casesTestingGenerate unit, integration, e2e testsReview coverage, add edge casesDocumentationGenerate API docs, guides, commentsReview accuracy, add contextBug FixesDiagnose and fix from error logsVerify fixes, prevent regressionRefactoringImprove code quality, patternsApprove changes, verify behaviorSecurityImplement standard patternsSecurity audit, penetration testing

Phase Summary
PhaseNameDurationAI Agent FocusHuman Focus1Foundation2-3 weeksScaffold, auth, DB schemaArchitecture, security review2Core Platform3-4 weeksUsers, forms, datasets, expressionsBusiness logic review3Workflow Engine3-4 weeksDesigner, execution, tasksState machine validation4Apps & Portal2-3 weeksLow-code builder, portalsUX review, performance5Analytics2-3 weeksDashboards, reports, chartsData accuracy, performance6Decision Tables1-2 weeksRule engine, evaluationLogic validation7Integrations2-3 weeksAPIs, connectors, webhooksSecurity, error handling8Launch Prep2-3 weeksTesting, docs, optimizationQA, security audit, deployment
Daily Development Workflow
TimeActivityParticipants9:00 AMMorning standup: Review AI output from overnight, prioritize tasksHuman team9:30 AMTask delegation: Break features into AI-executable promptsTech Lead10:00 AM - 12:00 PMAI coding session 1: Generate code with Cursor/Claude CodeEngineers + AI12:00 PM - 1:00 PMCode review: Review morning AI output, provide feedbackHuman team1:00 PM - 2:00 PMLunch + AI background tasks: Long-running generationsAI agents2:00 PM - 5:00 PMAI coding session 2: Iterate based on review, new featuresEngineers + AI5:00 PM - 6:00 PMIntegration: Merge approved code, run tests, deploy to stagingDevOps + AIOvernightAI background: Generate tests, docs, refactoring suggestionsAI agents

Phase 1: Foundation
Duration: 2-3 weeks | AI-Generated: ~90% | Human Review: ~10%

1.1 Objectives
• Scaffold complete project structure with Node.js, React, PostgreSQL
• Implement authentication (local + OAuth) and authorization (RBAC)
• Create database schema with multi-tenancy support
• Set up CI/CD pipeline and development infrastructure
• Establish coding standards and AI prompt templates

1.2 AI Agent Tasks
TaskAI AgentPrompt StrategyOutputProject scaffoldClaude Code"Create Node.js + React + PostgreSQL project with TypeScript, ESLint, Prettier, Docker"Complete repo structureDatabase schemaClaude Code"Design multi-tenant schema for workflow platform with users, roles, permissions, audit"Prisma schema + migrationsAuth systemClaude Code"Implement JWT auth with refresh tokens, OAuth (Google, Microsoft), password reset"Auth service + middlewareRBAC systemClaude Code"Create role-based access control with permissions, role hierarchy, policy enforcement"RBAC service + decoratorsAPI frameworkCursor"Set up Fastify with validation, error handling, rate limiting, OpenAPI docs"API foundationReact setupCursor"Create React 18 app with TypeScript, TailwindCSS, React Query, Zustand"Frontend foundationCI/CD pipelineClaude Code"Create GitHub Actions for test, lint, build, deploy to AWS/GCP with Terraform"Complete pipelineDocker setupCopilot"Dockerize all services with docker-compose for local dev"Docker configuration
1.3 Human Review Checklist
Review AreaCriteriaReviewerArchitectureFollows best practices, scalable, maintainableTech LeadSecurityNo hardcoded secrets, proper auth flow, SQL injection preventionTech LeadDatabase DesignProper normalization, indexes, RLS policiesSenior EngineerAPI DesignRESTful, consistent naming, proper status codesSenior EngineerCode QualityTypeScript strict, no any types, proper error handlingAll EngineersTestingUnit tests for critical paths, >80% coverageAll Engineers
1.4 Sample AI Prompt
Prompt for Claude Code to generate the authentication system:

"Create a complete authentication system for a Node.js/Fastify application with the following requirements:
• JWT-based authentication with access tokens (15 min) and refresh tokens (7 days)
• Local authentication with email/password, bcrypt hashing, password strength validation
• OAuth 2.0 integration for Google and Microsoft with Passport.js
• Password reset flow with secure tokens and email notifications
• Multi-tenant support with account_id in JWT claims
• Rate limiting on auth endpoints (5 attempts per minute)
• Audit logging for all auth events
• TypeScript with strict mode, Prisma for database
• Include unit tests with Jest, >90% coverage
• Include OpenAPI documentation for all endpoints"

1.5 Exit Criteria
• All AI-generated code passes human review
• Authentication flow working end-to-end (signup, login, OAuth, password reset)
• RBAC enforcing permissions on all endpoints
• CI/CD pipeline deploying to staging automatically
• Test coverage >80% with all tests passing
• API documentation auto-generated and accessible


Phase 2: Core Platform
Duration: 3-4 weeks | AI-Generated: ~85% | Human Review: ~15%

2.1 Objectives
• Complete account management (users, groups, roles, directory sync)
• Build drag-and-drop form builder with all field types
• Implement expression engine with formula parser
• Create dataset management with import/export
• Deliver SCIM 2.0 provisioning endpoints

2.2 AI Agent Task Breakdown
FeatureAI AgentEst. TimeComplexityUser CRUD + UIClaude Code + Cursor2 daysMediumGroup managementClaude Code1 dayMediumDirectory sync (Azure AD)Claude Code2 daysHighSCIM 2.0 endpointsClaude Code2 daysHighForm builder backendClaude Code2 daysHighForm builder UI (drag-drop)Cursor + Claude3 daysHighField types library (15+ types)Claude Code2 daysMediumValidation engineClaude Code1 dayMediumConditional logic engineClaude Code2 daysHighExpression parser (PEG.js)Claude Code2 daysHighExpression functions (50+)Claude Code2 daysMediumDataset CRUD + UICursor + Claude2 daysMediumImport/Export (CSV, Excel)Claude Code1 dayMediumUnit tests for all aboveClaude Code3 daysMedium
2.3 Form Builder AI Generation Strategy
ComponentPrompt ApproachExpected OutputField type registry"Create extensible field type system with schema, renderer, validator for each type"Plugin architecture + 15 field typesDrag-drop canvas"Implement drag-drop form designer using dnd-kit with field palette, canvas, property panel"Complete designer UIForm renderer"Create dynamic form renderer from JSON schema with validation, conditional logic"Runtime form componentExpression parser"Build PEG.js grammar for formula language supporting math, text, date, logic functions"Parser + evaluator
2.4 Human Focus Areas
AreaWhy Human Review CriticalReview ApproachExpression ParserComplex grammar, edge cases, security (injection)Extensive test cases, fuzzingSCIM ComplianceMust match RFC 7643/7644 exactlyValidate against SCIM test suiteForm Conditional LogicComplex interdependencies, cyclesLogic verification, cycle detectionData ImportHandle malformed data, encoding issuesTest with real-world messy dataDirectory SyncOAuth flows, token refresh, error handlingTest with actual Azure AD tenant
2.5 Exit Criteria
• User management complete with all CRUD operations
• SCIM 2.0 passing compliance test suite
• Form builder creating forms with 15+ field types
• Expression engine evaluating 50+ functions correctly
• Datasets supporting import/export with error handling
• All features have >85% test coverage


Phase 3: Workflow Engine
Duration: 3-4 weeks | AI-Generated: ~80% | Human Review: ~20%

3.1 Objectives
• Build visual workflow designer with BPMN-like notation
• Implement state machine execution engine
• Create task management with assignment rules
• Develop approval workflows with routing logic
• Build SLA monitoring and escalation system

3.2 AI Agent Task Breakdown
FeatureAI AgentEst. TimeComplexityWorkflow designer canvasCursor + Claude3 daysHighNode type library (10 types)Claude Code2 daysMediumConnection/edge handlingClaude Code1 dayMediumProcess definition schemaClaude Code1 dayMediumState machine engineClaude Code3 daysVery HighToken-based executionClaude Code2 daysHighParallel path handlingClaude Code2 daysHighHuman task serviceClaude Code2 daysMediumTask inbox UICursor2 daysMediumAssignment rule engineClaude Code2 daysHighApproval routingClaude Code2 daysHighSLA monitoring serviceClaude Code2 daysMediumEscalation engineClaude Code1 dayMediumKanban board UICursor2 daysMediumIntegration testsClaude Code3 daysMedium
3.3 State Machine - Critical Human Review
The workflow execution engine is the most complex component. Human engineers must carefully review:

ConcernRiskValidation ApproachState transitionsInvalid states, lost tokensState transition diagram review, property-based testingParallel executionRace conditions, deadlocksConcurrent execution tests, lock analysisError handlingStuck processes, data lossChaos testing, failure injectionPersistenceState not saved, recovery failsKill process tests, transaction verificationPerformanceSlow at scaleLoad testing with 10K+ concurrent instancesIdempotencyDuplicate executionReplay tests, unique constraints
3.4 Sample AI Prompt for Execution Engine
"Implement a workflow execution engine with the following requirements:
• Token-based execution model where tokens represent execution position
• Support node types: Start, End, Task, Approval, XOR Gateway, AND Gateway (split/join), Service, Timer
• Persist state to PostgreSQL with JSONB for flexibility
• Handle parallel paths with proper synchronization at join gateways
• Implement retry logic for service tasks with exponential backoff
• Use BullMQ for async task execution with job persistence
• Support process variables with scoping (global, local)
• Include comprehensive error handling with process-level error events
• Emit events for all state transitions for audit logging
• Ensure idempotent execution for crash recovery
• TypeScript with strict types, include state machine diagram in comments"

3.5 Exit Criteria
• Workflow designer creating valid process definitions
• Execution engine running linear, branching, and parallel workflows
• Task assignment working with all rule types
• Approval workflows routing correctly
• SLA monitoring triggering escalations
• Load test passing with 1000+ concurrent instances


Phase 4: Apps & Portal
Duration: 2-3 weeks | AI-Generated: ~85% | Human Review: ~15%

4.1 AI Agent Task Breakdown
FeatureAI AgentEst. TimeComplexityApp builder shellClaude Code1 dayMediumNavigation builderCursor1 dayMediumPage designer canvasCursor + Claude2 daysHighComponent library (20+ components)Claude Code3 daysMediumData binding systemClaude Code2 daysHighApp publishing/versioningClaude Code1 dayMediumPortal site builderCursor2 daysMediumBranding/theming systemClaude Code1 dayMediumUser registration flowClaude Code1 dayMediumExternal data connectionsClaude Code2 daysHighPortal access controlClaude Code1 dayMedium
4.2 Component Library Generation
AI generates complete React component library with single prompt:

Component CategoryComponents GeneratedAI Prompt FocusData DisplayTable, List, Card, Detail View, TreeData binding, sorting, filtering, paginationInputForm, Filter Bar, Search, Inline EditValidation, submission, controlled inputsChartsBar, Line, Pie, Area, Gauge, KPI CardRecharts integration, responsive sizingNavigationTabs, Breadcrumb, Menu, SidebarRouting integration, active statesLayoutGrid, Stack, Split Panel, Modal, DrawerResponsive breakpoints, nestingFeedbackAlert, Toast, Progress, SkeletonAccessibility, animations
4.3 Exit Criteria
• App builder creating functional multi-page applications
• 20+ reusable components working with data binding
• Portal sites deployable with custom branding
• External data connections syncing correctly
• All components accessible (WCAG 2.1 AA)


Phase 5: Analytics
Duration: 2-3 weeks | AI-Generated: ~85% | Human Review: ~15%

5.1 AI Agent Task Breakdown
FeatureAI AgentEst. TimeComplexityDashboard designerCursor + Claude2 daysHighWidget library (10 types)Claude Code2 daysMediumChart componentsClaude Code2 daysMediumQuery builder backendClaude Code2 daysHighReport builder UICursor2 daysMediumReport schedulingClaude Code1 dayMediumExport (PDF, Excel)Claude Code1 dayMediumProcess analyticsClaude Code2 daysMediumReal-time updates (WebSocket)Claude Code1 dayMedium
5.2 Human Review Focus
AreaConcernReview ApproachQuery PerformanceSlow queries on large datasetsEXPLAIN ANALYZE on generated queriesData AccuracyIncorrect aggregationsVerify calculations manuallySQL InjectionDynamic query building risksSecurity review, parameterization checkMemory UsageLarge report generationMemory profiling, streaming
5.3 Exit Criteria
• Dashboard designer with 10+ widget types
• Report builder with grouping, aggregation, filters
• Charts rendering accurately with drill-down
• Process analytics showing cycle time, SLA metrics
• Queries performing well on 1M+ row datasets


Phase 6: Decision Tables & Datasets
Duration: 1-2 weeks | AI-Generated: ~90% | Human Review: ~10%

6.1 AI Agent Task Breakdown
FeatureAI AgentEst. TimeComplexityDecision table editor UICursor + Claude2 daysMediumRule evaluation engineClaude Code2 daysHighHit policy implementationsClaude Code1 dayMediumRule testing interfaceCursor1 dayLowDataset governanceClaude Code1 dayMediumRow-level securityClaude Code1 dayMediumData quality rulesClaude Code1 dayMedium
6.2 Exit Criteria
• Decision tables evaluating all hit policies correctly
• Rule evaluation performant (<10ms for typical tables)
• Dataset governance with audit trail
• Row-level security enforced consistently


Phase 7: Integrations
Duration: 2-3 weeks | AI-Generated: ~85% | Human Review: ~15%

7.1 AI Agent Task Breakdown
FeatureAI AgentEst. TimeComplexityREST API completionClaude Code2 daysMediumAPI documentation (OpenAPI)Claude Code1 dayLowWebhook systemClaude Code2 daysMediumConnector frameworkClaude Code2 daysHighSalesforce connectorClaude Code2 daysHighGoogle Workspace connectorClaude Code2 daysHighMicrosoft 365 connectorClaude Code2 daysHighSlack connectorClaude Code1 dayMediumGeneric REST connectorClaude Code1 dayMediumIntegration builder UICursor2 daysMedium
7.2 Connector Generation Pattern
Each connector follows same pattern, enabling rapid AI generation:

Connector ComponentAI Prompt TemplateAuthentication"Implement OAuth 2.0 flow for {service} with token refresh, secure storage"Operations"Create CRUD operations for {service} {objects} with pagination, filtering"Field Mapping"Generate type definitions and mappers for {service} to FlowForge schema"Error Handling"Implement retry logic, rate limit handling, error translation for {service}"Tests"Generate integration tests for {service} connector with mocked responses"
7.3 Exit Criteria
• REST API 100% complete with OpenAPI documentation
• Webhooks delivering reliably with retry logic
• 6+ pre-built connectors working (Salesforce, Google, Microsoft, Slack, etc.)
• Integration builder creating custom connections
• All connectors have integration tests


Phase 8: Launch Preparation
Duration: 2-3 weeks | AI-Generated: ~70% | Human Review: ~30%

8.1 Objectives
• Comprehensive testing (unit, integration, e2e, load, security)
• Performance optimization and caching
• Complete documentation (user, admin, API, developer)
• Security audit and penetration testing
• Production deployment and monitoring

8.2 AI Agent Tasks
TaskAI AgentEst. TimeGenerate missing unit tests to reach 90% coverageClaude Code3 daysGenerate e2e tests with PlaywrightClaude Code2 daysGenerate load tests with k6Claude Code1 dayIdentify and fix performance bottlenecksClaude Code2 daysGenerate user documentationClaude Code2 daysGenerate API documentation examplesClaude Code1 dayGenerate admin guideClaude Code1 dayImplement security fixes from auditClaude Code2 daysGenerate runbooks for operationsClaude Code1 day
8.3 Human-Led Activities
ActivityOwnerDurationSecurity penetration testingExternal firm + Tech Lead1 weekPerformance testing analysisDevOps + Senior Engineer3 daysFinal code review sweepAll engineers2 daysProduction environment setupDevOps2 daysMonitoring and alerting configurationDevOps1 dayUser acceptance testingProduct + Engineers3 daysDocumentation review and polishTech Lead2 daysGo-live checklist verificationAll1 day
8.4 Launch Checklist
• All tests passing (unit >90%, integration >85%, e2e critical paths)
• Load test passing (1000 concurrent users, <500ms p95 response time)
• Security audit passed with no critical/high findings
• Documentation complete and reviewed
• Monitoring dashboards operational
• Alerting configured for critical metrics
• Backup and disaster recovery tested
• Runbooks complete for common operations


Budget Summary
Cost Breakdown
CategoryMonthly Cost6-Month TotalNotesHuman Team (4 engineers)$80,000-120,000$480,000-720,000Fully loaded costAI API Costs (Claude, GPT-4)$5,000-15,000$30,000-90,000Heavy usage during devAI Coding Tools (Cursor, Copilot)$500-1,000$3,000-6,000Per-seat licensesCloud Infrastructure (Dev/Staging)$3,000-8,000$18,000-48,000AWS/GCPThird-party Services$1,000-2,000$6,000-12,000Auth0, SendGrid, etc.Security Audit-$20,000-40,000One-timeContingency (15%)-$83,000-137,000BufferTotal-$640,000-1,053,000
AI API Cost Estimation
AI Usage TypeEst. Tokens/DayCost/DayMonthly CostClaude Code (complex generation)500K-1M input, 200K output$20-50$600-1,500Cursor (iterative coding)1M-2M input, 500K output$30-80$900-2,400Code review/explanation200K input, 50K output$5-15$150-450Documentation generation100K input, 200K output$10-25$300-750Test generation300K input, 150K output$10-30$300-900Total2-4M input, 1M output/day$75-200$2,250-6,000
ROI Comparison
MetricTraditionalAI AgentSavingsTimeline18-24 months4-6 months12-18 months fasterTotal Cost$8-12M$0.6-1.1M$7-11M (85-90%)Time to MarketQ4 2027Q3 202615+ months earlierTeam Size25-40 engineers4 engineers85% fewer peopleCode QualityVariableConsistent (AI patterns)More uniformDocumentationOften incompleteComprehensive (AI-generated)Better coverage

Risks and Mitigations
RiskProbabilityImpactMitigationAI generates buggy codeHighMediumMandatory human review, comprehensive testsAI hallucinates incorrect patternsMediumHighSenior review, reference implementationsComplex features beyond AI capabilityMediumMediumHuman fallback, break into smaller tasksAI API costs exceed budgetLowMediumMonitor usage, caching, use smaller modelsSecurity vulnerabilities in AI codeMediumHighSecurity audit, SAST tools, pen testingAI context limits for large codebaseMediumMediumModular architecture, focused promptsKey human engineer leavesLowHighDocument everything, cross-train, AI docsAI service outagesLowMediumMultiple AI providers, local fallbacks
Quality Assurance Strategy
QA LayerApproachToolsAI Output ReviewEvery AI-generated code block reviewed by humanPR reviews, pair programmingAutomated TestingAI generates tests, humans verify completenessJest, Playwright, k6Static AnalysisAutomated code quality checksESLint, TypeScript strict, SonarQubeSecurity ScanningAutomated vulnerability detectionSnyk, OWASP ZAP, npm auditIntegration TestingTest all module interactionsTestcontainers, docker-composeManual TestingHuman exploratory testingTest plans, edge case huntingPerformance TestingLoad and stress testingk6, Artillery

AI Agent Best Practices
Effective Prompting Strategies
StrategyDescriptionExampleBe SpecificInclude all requirements, constraints, tech stack"Using Fastify, Prisma, TypeScript strict..."Provide ContextShare relevant existing code, schemas"Given this schema: {...}, create..."Request TestsAlways ask for tests with the code"Include Jest unit tests with >90% coverage"Specify PatternsReference design patterns to use"Use repository pattern, dependency injection"Include ExamplesShow expected input/output"Example: input {x:1} should return {y:2}"Request DocumentationAsk for inline comments, JSDoc"Include JSDoc comments for all public functions"Break Down TasksSplit complex features into smaller promptsFirst schema, then service, then controllerIterateRefine output with follow-up prompts"Good, now add error handling for..."
Code Review Checklist for AI Output
• Does the code actually solve the problem as specified?
• Are there any obvious bugs or logic errors?
• Is error handling comprehensive and appropriate?
• Are edge cases considered?
• Is the code secure (no injection, proper auth, etc.)?
• Does it follow our coding standards and patterns?
• Is the code efficient (no N+1 queries, proper indexes)?
• Are tests meaningful and covering critical paths?
• Is the code readable and maintainable?
• Are there any hardcoded values that should be configurable?

When to Use Human Instead of AI
ScenarioReasonApproachNovel algorithmsAI may not have training dataHuman designs, AI implementsSecurity-critical codeToo risky to trust AI aloneHuman writes, AI reviewsComplex state machinesSubtle bugs hard to catchHuman designs states, AI implementsPerformance-critical codeRequires deep optimizationHuman optimizes, AI helps profileDomain-specific logicRequires business knowledgeHuman specifies, AI implementsDebugging complex issuesRequires system understandingHuman debugs with AI assistance

- End of Implementation Plan -
FlowForge - AI Agent Development Plan

Page 1 | Confidential


