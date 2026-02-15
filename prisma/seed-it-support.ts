/**
 * IT Support Ticket Flow Seed Script
 * Creates a complete IT Support workflow with:
 * - IT Support Request Form (requestType, category, priority, subject, description, etc.)
 * - IT Support Workflow (ticket intake → SLA routing → assignment → escalation → resolution)
 * - Ticket Routing & SLA Decision Table (routed in-memory via decision-table.service.ts)
 * - IT Tickets Dataset with sample records
 * - IT Knowledge Base Dataset
 * - Sample process instances and task instances
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedITSupportFlow() {
    console.log('🎫 Seeding IT Support Ticket Flow...\n');

    // ==========================================================================
    // 1. Get the demo account and users
    // ==========================================================================
    const account = await prisma.account.findUnique({ where: { slug: 'demo' } });
    if (!account) {
        throw new Error('Demo account not found. Run the main seed first: npx prisma db seed');
    }

    const adminUser = await prisma.user.findUnique({
        where: { accountId_email: { accountId: account.id, email: 'admin@demo.com' } },
    });
    if (!adminUser) {
        throw new Error('Demo admin user not found.');
    }

    // Find or create IT support users
    const bcryptModule = await import('bcryptjs');
    const bcryptLib = bcryptModule.default || bcryptModule;
    const passwordHash = await bcryptLib.hash('Demo123!@#', 12);

    const itUsers = [];
    const userProfiles = [
        { email: 'bob.martinez@demo.com', firstName: 'Bob', lastName: 'Martinez' },
        { email: 'lisa.wong@demo.com', firstName: 'Lisa', lastName: 'Wong' },
        { email: 'david.park@demo.com', firstName: 'David', lastName: 'Park' },
        { email: 'rachel.green@demo.com', firstName: 'Rachel', lastName: 'Green' },
        { email: 'tom.harris@demo.com', firstName: 'Tom', lastName: 'Harris' },
        { email: 'nina.patel@demo.com', firstName: 'Nina', lastName: 'Patel' },
    ];

    for (const profile of userProfiles) {
        const user = await prisma.user.upsert({
            where: { accountId_email: { accountId: account.id, email: profile.email } },
            create: {
                accountId: account.id,
                email: profile.email,
                passwordHash,
                firstName: profile.firstName,
                lastName: profile.lastName,
                status: 'ACTIVE',
                emailVerified: true,
            },
            update: {},
        });
        itUsers.push(user);
    }

    console.log(`✅ Found/created ${itUsers.length} IT support users\n`);

    // ==========================================================================
    // 2. Create IT Support Request Form
    // ==========================================================================
    const itSupportForm = await prisma.form.upsert({
        where: {
            id: '00000000-0000-0000-0000-000000000004',
        },
        create: {
            id: '00000000-0000-0000-0000-000000000004',
            accountId: account.id,
            name: 'IT Support Request',
            description: 'Submit IT support tickets for incidents, service requests, and questions',
            fields: [
                {
                    id: 'field-request-type',
                    name: 'requestType',
                    label: 'Request Type',
                    type: 'select',
                    required: true,
                    order: 1,
                    config: {
                        options: [
                            { value: 'incident', label: '🔴 Incident - Something is broken' },
                            { value: 'service', label: '🟡 Service Request - I need something' },
                            { value: 'question', label: '🟢 Question - I need help' },
                        ],
                    },
                },
                {
                    id: 'field-category',
                    name: 'category',
                    label: 'Category',
                    type: 'select',
                    required: true,
                    order: 2,
                    config: {
                        options: [
                            { value: 'hardware', label: 'Hardware' },
                            { value: 'software', label: 'Software' },
                            { value: 'network', label: 'Network & Connectivity' },
                            { value: 'email', label: 'Email & Calendar' },
                            { value: 'access', label: 'Access & Permissions' },
                            { value: 'security', label: 'Security' },
                            { value: 'other', label: 'Other' },
                        ],
                    },
                },
                {
                    id: 'field-priority',
                    name: 'priority',
                    label: 'Priority',
                    type: 'radio',
                    required: true,
                    order: 3,
                    config: {
                        options: [
                            { value: 'low', label: 'Low - Can wait a few days' },
                            { value: 'medium', label: 'Medium - Need within 24 hours' },
                            { value: 'high', label: 'High - Urgent, blocking work' },
                            { value: 'critical', label: 'Critical - Complete outage' },
                        ],
                    },
                },
                {
                    id: 'field-affected-users',
                    name: 'affectedUsers',
                    label: 'Number of Affected Users',
                    type: 'number',
                    required: false,
                    order: 4,
                    config: { min: 1, defaultValue: 1 },
                },
                {
                    id: 'field-subject',
                    name: 'subject',
                    label: 'Subject',
                    type: 'text',
                    required: true,
                    order: 5,
                    config: { maxLength: 100 },
                },
                {
                    id: 'field-description',
                    name: 'description',
                    label: 'Description',
                    type: 'richtext',
                    required: true,
                    order: 6,
                    config: { placeholder: 'Please describe your issue in detail...' },
                },
                {
                    id: 'field-screenshots',
                    name: 'screenshots',
                    label: 'Screenshots',
                    type: 'file',
                    required: false,
                    order: 7,
                    config: { accept: '.png,.jpg,.gif', maxFiles: 5 },
                },
                {
                    id: 'field-asset-tag',
                    name: 'assetTag',
                    label: 'Asset Tag (if applicable)',
                    type: 'text',
                    required: false,
                    order: 8,
                    config: { pattern: '^AST-[0-9]{6}$', placeholder: 'AST-000000' },
                },
                {
                    id: 'field-availability',
                    name: 'availabilityWindow',
                    label: 'Best times to contact',
                    type: 'multiselect',
                    required: false,
                    order: 9,
                    config: {
                        options: [
                            { value: 'morning', label: 'Morning (9am-12pm)' },
                            { value: 'afternoon', label: 'Afternoon (12pm-5pm)' },
                            { value: 'anytime', label: 'Anytime' },
                        ],
                    },
                },
            ],
            layout: {
                columns: 2,
                sections: [
                    { title: 'Ticket Classification', fields: ['field-request-type', 'field-category', 'field-priority'] },
                    { title: 'Issue Details', fields: ['field-affected-users', 'field-subject', 'field-description', 'field-screenshots'] },
                    { title: 'Additional Info', fields: ['field-asset-tag', 'field-availability'] },
                ],
            },
            validationRules: [
                { field: 'subject', rule: 'maxLength', value: 100, message: 'Subject must be 100 characters or less' },
                { field: 'assetTag', rule: 'pattern', value: '^AST-[0-9]{6}$', message: 'Asset tag must be in format AST-000000' },
            ],
            conditionalLogic: [
                {
                    field: 'assetTag',
                    condition: { field: 'category', operator: 'in', value: ['hardware', 'software'] },
                    action: { type: 'show' },
                },
            ],
            settings: {
                submitButtonText: 'Submit Support Request',
                showProgressBar: false,
                allowDraft: true,
            },
            permissions: {},
            version: 1,
            status: 'ACTIVE',
            createdBy: adminUser.id,
        },
        update: {},
    });

    console.log(`✅ Created form: ${itSupportForm.name} (${itSupportForm.id})\n`);

    // ==========================================================================
    // 3. Create IT Support Workflow
    // ==========================================================================
    const itProcess = await prisma.process.upsert({
        where: {
            id: '00000000-0000-0000-0000-000000000040',
        },
        create: {
            id: '00000000-0000-0000-0000-000000000040',
            accountId: account.id,
            name: 'IT Support Workflow',
            description: 'IT ticket intake, SLA-based routing, agent assignment, escalation, and resolution tracking',
            category: 'IT',
            definition: {
                nodes: [
                    {
                        id: 'receive',
                        type: 'start',
                        name: 'Receive Support Request',
                        description: 'Employee submits an IT support request form',
                        position: { x: 100, y: 300 },
                        config: { trigger: 'form_submission', formId: itSupportForm.id },
                    },
                    {
                        id: 'auto-categorize',
                        type: 'action',
                        name: 'Auto-Categorize Ticket',
                        description: 'AI analyzes ticket content to suggest category and priority',
                        position: { x: 350, y: 300 },
                        config: {
                            action: 'ai_classify',
                            prompt: 'Categorize this IT ticket based on the description and suggest priority',
                            outputVars: ['suggestedCategory', 'suggestedPriority'],
                        },
                    },
                    {
                        id: 'get-sla',
                        type: 'decision',
                        name: 'Determine SLA & Assignment',
                        description: 'Route ticket using the Ticket Routing & SLA decision table',
                        position: { x: 600, y: 300 },
                        config: {
                            decisionTableId: 'ticket-routing-sla',
                            inputs: {
                                requestType: 'variables.requestType',
                                priority: 'variables.priority',
                                category: 'variables.category',
                            },
                        },
                    },
                    {
                        id: 'create-ticket',
                        type: 'action',
                        name: 'Create Ticket Record',
                        description: 'Create a new ticket record in the IT Tickets dataset',
                        position: { x: 850, y: 300 },
                        config: {
                            action: 'dataset_create',
                            datasetId: 'it-tickets',
                            data: {
                                subject: '{{variables.subject}}',
                                status: 'open',
                                assignedTo: '{{get-sla.assignTo}}',
                                responseTimeSLA: '{{get-sla.responseTime}}',
                                resolveTimeSLA: '{{get-sla.resolveTime}}',
                            },
                        },
                    },
                    {
                        id: 'assign-agent',
                        type: 'approval',
                        name: 'Assign to Agent',
                        description: 'Create task for the assigned support team/agent',
                        position: { x: 1100, y: 300 },
                        config: {
                            assignTo: '{{get-sla.assignTo}}',
                            approvalType: 'task',
                            taskType: 'it_support',
                        },
                    },
                    {
                        id: 'sla-timer',
                        type: 'action',
                        name: 'SLA Response Timer',
                        description: 'Start SLA timer for initial response',
                        position: { x: 1100, y: 100 },
                        config: {
                            action: 'timer',
                            duration: '{{get-sla.responseTime}}',
                            timerType: 'sla_response',
                        },
                    },
                    {
                        id: 'check-responded',
                        type: 'decision',
                        name: 'Response Received?',
                        description: 'Check if the agent has responded within SLA',
                        position: { x: 1350, y: 100 },
                        config: {},
                        condition: "variables.ticketStatus !== 'new'",
                    },
                    {
                        id: 'escalate-response',
                        type: 'email',
                        name: 'SLA Breach Warning',
                        description: 'Send escalation notification to IT manager for SLA breach',
                        position: { x: 1600, y: 100 },
                        config: {
                            to: 'it-manager@demo.com',
                            subject: '⚠️ SLA Breach Warning - Ticket {{variables.ticketId}}',
                            template: 'sla_breach_warning',
                        },
                    },
                    {
                        id: 'wait-resolution',
                        type: 'action',
                        name: 'Wait for Resolution',
                        description: 'Wait for agent to complete the support task',
                        position: { x: 1350, y: 300 },
                        config: { action: 'wait', waitFor: 'task_complete' },
                    },
                    {
                        id: 'customer-survey',
                        type: 'action',
                        name: 'Send Satisfaction Survey',
                        description: 'Send customer satisfaction survey to the requester',
                        position: { x: 1600, y: 300 },
                        config: {
                            action: 'send_form',
                            formId: 'satisfaction-survey',
                            to: '{{variables.submittedBy}}',
                        },
                    },
                    {
                        id: 'close-ticket',
                        type: 'action',
                        name: 'Close Ticket',
                        description: 'Update ticket status to closed in the dataset',
                        position: { x: 1850, y: 300 },
                        config: {
                            action: 'dataset_update',
                            datasetId: 'it-tickets',
                            data: { status: 'closed', closedAt: '{{now}}' },
                        },
                    },
                    {
                        id: 'end-resolved',
                        type: 'end',
                        name: 'Ticket Resolved',
                        description: 'IT support ticket fully resolved and closed',
                        position: { x: 2100, y: 300 },
                        config: {},
                    },
                ],
                edges: [
                    { id: 'e1', source: 'receive', target: 'auto-categorize', label: '' },
                    { id: 'e2', source: 'auto-categorize', target: 'get-sla', label: 'Classified' },
                    { id: 'e3', source: 'get-sla', target: 'create-ticket', label: 'SLA determined' },
                    { id: 'e4', source: 'create-ticket', target: 'assign-agent', label: 'Ticket created' },
                    { id: 'e5', source: 'create-ticket', target: 'sla-timer', label: 'Start SLA timer' },
                    { id: 'e6', source: 'sla-timer', target: 'check-responded', label: 'Timer expired' },
                    { id: 'e7', source: 'check-responded', target: 'escalate-response', label: 'No response', condition: "variables.ticketStatus === 'new'" },
                    { id: 'e8', source: 'check-responded', target: 'wait-resolution', label: 'Responded', condition: "variables.ticketStatus !== 'new'" },
                    { id: 'e9', source: 'escalate-response', target: 'wait-resolution', label: '' },
                    { id: 'e10', source: 'assign-agent', target: 'wait-resolution', label: '' },
                    { id: 'e11', source: 'wait-resolution', target: 'customer-survey', label: 'Task completed' },
                    { id: 'e12', source: 'customer-survey', target: 'close-ticket', label: '' },
                    { id: 'e13', source: 'close-ticket', target: 'end-resolved', label: '' },
                ],
            },
            variables: [
                { name: 'requestType', type: 'string', label: 'Request Type' },
                { name: 'category', type: 'string', label: 'Category' },
                { name: 'priority', type: 'string', label: 'Priority' },
                { name: 'affectedUsers', type: 'number', label: 'Affected Users' },
                { name: 'subject', type: 'string', label: 'Subject' },
                { name: 'description', type: 'string', label: 'Description' },
                { name: 'assetTag', type: 'string', label: 'Asset Tag' },
                { name: 'ticketId', type: 'string', label: 'Ticket ID' },
                { name: 'ticketStatus', type: 'string', label: 'Ticket Status' },
                { name: 'assignedTo', type: 'string', label: 'Assigned Team' },
                { name: 'responseTimeSLA', type: 'string', label: 'Response SLA' },
                { name: 'resolveTimeSLA', type: 'string', label: 'Resolve SLA' },
            ],
            triggers: [
                { type: 'form_submission', formId: itSupportForm.id },
                { type: 'manual', label: 'Create IT Ticket' },
            ],
            settings: {
                allowCancel: true,
                trackSLA: true,
                notification: { onStart: true, onComplete: true, onError: true },
            },
            permissions: {},
            slaConfig: {
                defaultDueHours: 48,
                escalationPolicy: 'notify_manager',
            },
            version: 1,
            status: 'ACTIVE',
            publishedAt: new Date(),
            createdBy: adminUser.id,
        },
        update: {},
    });

    console.log(`✅ Created process: ${itProcess.name} (${itProcess.id})\n`);

    // ==========================================================================
    // 4. Create IT Tickets Dataset
    // ==========================================================================
    const ticketsDataset = await prisma.dataset.upsert({
        where: {
            accountId_name: { accountId: account.id, name: 'IT Tickets' },
        },
        create: {
            accountId: account.id,
            name: 'IT Tickets',
            description: 'All IT support tickets with status, SLA tracking, assignment, and resolution details',
            schema: [
                { name: 'Ticket ID', slug: 'ticket_id', type: 'text', required: true },
                { name: 'Subject', slug: 'subject', type: 'text', required: true },
                { name: 'Request Type', slug: 'request_type', type: 'select', required: true },
                { name: 'Category', slug: 'category', type: 'select', required: true },
                { name: 'Priority', slug: 'priority', type: 'select', required: true },
                { name: 'Status', slug: 'status', type: 'select', required: true },
                { name: 'Requester', slug: 'requester', type: 'text', required: true },
                { name: 'Assigned To', slug: 'assigned_to', type: 'text', required: false },
                { name: 'Affected Users', slug: 'affected_users', type: 'number', required: false },
                { name: 'Asset Tag', slug: 'asset_tag', type: 'text', required: false },
                { name: 'Response SLA', slug: 'response_sla', type: 'text', required: false },
                { name: 'Resolve SLA', slug: 'resolve_sla', type: 'text', required: false },
                { name: 'First Response At', slug: 'first_response_at', type: 'date', required: false },
                { name: 'Resolved At', slug: 'resolved_at', type: 'date', required: false },
                { name: 'SLA Breached', slug: 'sla_breached', type: 'boolean', required: false },
                { name: 'Resolution Notes', slug: 'resolution_notes', type: 'text', required: false },
            ],
            indexes: [],
            constraints: [],
            settings: {},
            permissions: {},
            rowCount: 0,
            createdBy: adminUser.id,
        },
        update: {},
    });

    console.log(`✅ Created dataset: ${ticketsDataset.name} (${ticketsDataset.id})\n`);

    // ==========================================================================
    // 5. Create IT Knowledge Base Dataset
    // ==========================================================================
    const kbDataset = await prisma.dataset.upsert({
        where: {
            accountId_name: { accountId: account.id, name: 'IT Knowledge Base' },
        },
        create: {
            accountId: account.id,
            name: 'IT Knowledge Base',
            description: 'Common IT solutions and troubleshooting articles for self-service and agent reference',
            schema: [
                { name: 'Article ID', slug: 'article_id', type: 'text', required: true },
                { name: 'Title', slug: 'title', type: 'text', required: true },
                { name: 'Category', slug: 'category', type: 'select', required: true },
                { name: 'Content', slug: 'content', type: 'text', required: true },
                { name: 'Tags', slug: 'tags', type: 'text', required: false },
                { name: 'Views', slug: 'views', type: 'number', required: false },
                { name: 'Helpful Votes', slug: 'helpful_votes', type: 'number', required: false },
            ],
            indexes: [],
            constraints: [],
            settings: {},
            permissions: {},
            rowCount: 0,
            createdBy: adminUser.id,
        },
        update: {},
    });

    console.log(`✅ Created dataset: ${kbDataset.name} (${kbDataset.id})\n`);

    // ==========================================================================
    // 6. Create Sample IT Ticket Records
    // ==========================================================================
    const sampleTickets = [
        {
            ticket_id: 'TKT-001',
            subject: 'Outlook keeps crashing when opening large attachments',
            request_type: 'Incident', category: 'Software', priority: 'High',
            status: 'In Progress', requester: 'Bob Martinez', assigned_to: 'Tier-2 Support',
            affected_users: 1, asset_tag: 'AST-042891',
            response_sla: '30 min', resolve_sla: '4 hours',
            first_response_at: '2026-02-07T10:30:00Z', resolved_at: '',
            sla_breached: false, resolution_notes: 'Investigating Outlook crash with large attachments after Windows update.',
        },
        {
            ticket_id: 'TKT-002',
            subject: 'VPN connection dropping every 10 minutes',
            request_type: 'Incident', category: 'Network & Connectivity', priority: 'High',
            status: 'In Progress', requester: 'Lisa Wong', assigned_to: 'Tier-2 Support',
            affected_users: 3, asset_tag: 'AST-038712',
            response_sla: '30 min', resolve_sla: '4 hours',
            first_response_at: '2026-02-07T09:15:00Z', resolved_at: '',
            sla_breached: false, resolution_notes: 'VPN client needs update. Applying patch.',
        },
        {
            ticket_id: 'TKT-003',
            subject: 'Production database server unresponsive',
            request_type: 'Incident', category: 'Software', priority: 'Critical',
            status: 'Resolved', requester: 'David Park', assigned_to: 'Senior Team',
            affected_users: 50, asset_tag: '',
            response_sla: '15 min', resolve_sla: '2 hours',
            first_response_at: '2026-02-06T14:05:00Z', resolved_at: '2026-02-06T15:30:00Z',
            sla_breached: false, resolution_notes: 'Disk space exhaustion on DB server. Cleaned old logs and increased disk allocation.',
        },
        {
            ticket_id: 'TKT-004',
            subject: 'Need access to Jira project PLATFORM-2026',
            request_type: 'Service Request', category: 'Access & Permissions', priority: 'Medium',
            status: 'Closed', requester: 'Rachel Green', assigned_to: 'Tier-1 Support',
            affected_users: 1, asset_tag: '',
            response_sla: '4 hours', resolve_sla: '1 day',
            first_response_at: '2026-02-06T11:00:00Z', resolved_at: '2026-02-06T14:30:00Z',
            sla_breached: false, resolution_notes: 'Access granted to PLATFORM-2026 project. Verified with requester.',
        },
        {
            ticket_id: 'TKT-005',
            subject: 'Request new laptop for new hire starting Feb 15',
            request_type: 'Service Request', category: 'Hardware', priority: 'Medium',
            status: 'Open', requester: 'Tom Harris', assigned_to: 'Hardware Team',
            affected_users: 1, asset_tag: '',
            response_sla: '4 hours', resolve_sla: '2 days',
            first_response_at: '', resolved_at: '',
            sla_breached: false, resolution_notes: '',
        },
        {
            ticket_id: 'TKT-006',
            subject: 'Suspicious phishing email received from ceo@company-notice.com',
            request_type: 'Incident', category: 'Security', priority: 'Critical',
            status: 'Resolved', requester: 'Nina Patel', assigned_to: 'Security Team',
            affected_users: 1, asset_tag: '',
            response_sla: '5 min', resolve_sla: '1 hour',
            first_response_at: '2026-02-07T08:03:00Z', resolved_at: '2026-02-07T08:45:00Z',
            sla_breached: false, resolution_notes: 'Phishing email blocked. Domain added to blocklist. Company-wide alert sent.',
        },
        {
            ticket_id: 'TKT-007',
            subject: 'How do I set up two-factor authentication?',
            request_type: 'Question', category: 'Security', priority: 'Low',
            status: 'Closed', requester: 'Bob Martinez', assigned_to: 'Helpdesk',
            affected_users: 1, asset_tag: '',
            response_sla: '8 hours', resolve_sla: '2 days',
            first_response_at: '2026-02-05T15:00:00Z', resolved_at: '2026-02-05T15:20:00Z',
            sla_breached: false, resolution_notes: 'Provided KB article link for 2FA setup. User confirmed successful setup.',
        },
        {
            ticket_id: 'TKT-008',
            subject: 'WiFi not connecting in Building B, Floor 3',
            request_type: 'Incident', category: 'Network & Connectivity', priority: 'Medium',
            status: 'Escalated', requester: 'Lisa Wong', assigned_to: 'Tier-2 Support',
            affected_users: 15, asset_tag: '',
            response_sla: '2 hours', resolve_sla: '1 day',
            first_response_at: '2026-02-07T11:00:00Z', resolved_at: '',
            sla_breached: true, resolution_notes: 'Access point AP-B3-02 failed. Replacement ordered. Escalated to network infrastructure team.',
        },
        {
            ticket_id: 'TKT-009',
            subject: 'Printer on 2nd floor keeps jamming',
            request_type: 'Incident', category: 'Hardware', priority: 'Low',
            status: 'Open', requester: 'Rachel Green', assigned_to: 'Tier-1 Support',
            affected_users: 8, asset_tag: 'AST-015234',
            response_sla: '8 hours', resolve_sla: '3 days',
            first_response_at: '', resolved_at: '',
            sla_breached: false, resolution_notes: '',
        },
        {
            ticket_id: 'TKT-010',
            subject: 'Calendar invites not syncing between Outlook and mobile',
            request_type: 'Incident', category: 'Email & Calendar', priority: 'Medium',
            status: 'In Progress', requester: 'Tom Harris', assigned_to: 'Tier-1 Support',
            affected_users: 1, asset_tag: 'AST-029847',
            response_sla: '2 hours', resolve_sla: '1 day',
            first_response_at: '2026-02-07T13:30:00Z', resolved_at: '',
            sla_breached: false, resolution_notes: 'Checking Exchange ActiveSync settings and mobile device configuration.',
        },
    ];

    const existingTickets = await prisma.datasetRecord.count({ where: { datasetId: ticketsDataset.id } });
    let ticketsCreated = 0;
    if (existingTickets === 0) {
        for (const record of sampleTickets) {
            await prisma.datasetRecord.create({
                data: {
                    datasetId: ticketsDataset.id,
                    data: record,
                    createdBy: itUsers.find(u => u.firstName === record.requester.split(' ')[0])?.id || adminUser.id,
                },
            });
            ticketsCreated++;
        }

        await prisma.dataset.update({
            where: { id: ticketsDataset.id },
            data: { rowCount: ticketsCreated },
        });
    } else {
        ticketsCreated = existingTickets;
    }

    console.log(`✅ IT ticket records: ${ticketsCreated}\n`);

    // ==========================================================================
    // 7. Create Knowledge Base Articles
    // ==========================================================================
    const kbArticles = [
        {
            article_id: 'KB-001',
            title: 'How to Set Up Two-Factor Authentication (2FA)',
            category: 'Security',
            content: 'Step-by-step guide to enable 2FA on your company account using Microsoft Authenticator or Google Authenticator.',
            tags: '2fa, security, authentication, mfa',
            views: 342, helpful_votes: 89,
        },
        {
            article_id: 'KB-002',
            title: 'VPN Connection Troubleshooting Guide',
            category: 'Network & Connectivity',
            content: 'Common VPN issues and their solutions: connection drops, slow speeds, authentication failures, and client update instructions.',
            tags: 'vpn, network, connectivity, remote',
            views: 567, helpful_votes: 134,
        },
        {
            article_id: 'KB-003',
            title: 'Requesting Access to Company Applications',
            category: 'Access & Permissions',
            content: 'How to request access to Jira, Confluence, GitHub, AWS Console, and other company applications through the IT portal.',
            tags: 'access, permissions, jira, github, aws',
            views: 891, helpful_votes: 201,
        },
        {
            article_id: 'KB-004',
            title: 'Outlook Performance & Crash Fixes',
            category: 'Software',
            content: 'Solutions for common Outlook issues: crashes with large attachments, slow startup, corrupted profiles, and PST file repair.',
            tags: 'outlook, email, crash, performance',
            views: 445, helpful_votes: 112,
        },
        {
            article_id: 'KB-005',
            title: 'Reporting Phishing & Suspicious Emails',
            category: 'Security',
            content: 'How to identify and report phishing emails. Use the Report Phishing button in Outlook or forward suspicious emails to security@company.com.',
            tags: 'phishing, security, email, reporting',
            views: 723, helpful_votes: 187,
        },
    ];

    const existingKB = await prisma.datasetRecord.count({ where: { datasetId: kbDataset.id } });
    if (existingKB === 0) {
        for (const article of kbArticles) {
            await prisma.datasetRecord.create({
                data: {
                    datasetId: kbDataset.id,
                    data: article,
                    createdBy: adminUser.id,
                },
            });
        }

        await prisma.dataset.update({
            where: { id: kbDataset.id },
            data: { rowCount: kbArticles.length },
        });
    }

    console.log(`✅ Knowledge base articles: ${kbArticles.length}\n`);

    // ==========================================================================
    // 8. Create Form Submissions
    // ==========================================================================
    const formSubmissions = [
        {
            requestType: 'incident',
            category: 'software',
            priority: 'high',
            affectedUsers: 1,
            subject: 'Outlook keeps crashing when opening large attachments',
            description: '<p>Every time I try to open an email with attachments larger than 5MB, Outlook freezes and then crashes. This started happening after the latest Windows update.</p><p>Error message: "Microsoft Outlook has stopped working"</p>',
            screenshots: ['screenshot1.png', 'error-log.png'],
            assetTag: 'AST-042891',
            availabilityWindow: ['morning', 'afternoon'],
            submittedBy: 'Bob Martinez',
        },
        {
            requestType: 'incident',
            category: 'network',
            priority: 'high',
            affectedUsers: 3,
            subject: 'VPN connection dropping every 10 minutes',
            description: '<p>VPN connection keeps dropping approximately every 10 minutes. Affects both GlobalProtect and the backup Cisco AnyConnect client. Multiple team members experiencing the same issue.</p>',
            screenshots: ['vpn-error.png'],
            assetTag: 'AST-038712',
            availabilityWindow: ['anytime'],
            submittedBy: 'Lisa Wong',
        },
        {
            requestType: 'incident',
            category: 'security',
            priority: 'critical',
            affectedUsers: 1,
            subject: 'Suspicious phishing email received from ceo@company-notice.com',
            description: '<p>Received an email claiming to be from our CEO asking me to urgently purchase gift cards. The sender email "ceo@company-notice.com" looks suspicious. I have NOT clicked any links.</p>',
            screenshots: ['phishing-email.png'],
            assetTag: '',
            availabilityWindow: ['morning'],
            submittedBy: 'Nina Patel',
        },
        {
            requestType: 'service',
            category: 'access',
            priority: 'medium',
            affectedUsers: 1,
            subject: 'Need access to Jira project PLATFORM-2026',
            description: '<p>I have been assigned to the Platform team starting this week. I need access to the PLATFORM-2026 project in Jira for sprint planning and ticket management.</p>',
            screenshots: [],
            assetTag: '',
            availabilityWindow: ['anytime'],
            submittedBy: 'Rachel Green',
        },
        {
            requestType: 'question',
            category: 'security',
            priority: 'low',
            affectedUsers: 1,
            subject: 'How do I set up two-factor authentication?',
            description: '<p>I received an email from IT saying we need to enable 2FA by end of month. Can someone walk me through the setup process? I have an iPhone.</p>',
            screenshots: [],
            assetTag: '',
            availabilityWindow: ['afternoon'],
            submittedBy: 'Bob Martinez',
        },
    ];

    const existingSubmissions = await prisma.formSubmission.count({ where: { formId: itSupportForm.id } });
    if (existingSubmissions === 0) {
        for (const submission of formSubmissions) {
            await prisma.formSubmission.create({
                data: {
                    formId: itSupportForm.id,
                    data: submission,
                    createdBy: itUsers.find(u => u.firstName === submission.submittedBy.split(' ')[0])?.id || adminUser.id,
                },
            });
        }
    }

    console.log(`✅ Form submissions: ${Math.max(existingSubmissions, formSubmissions.length)}\n`);

    // ==========================================================================
    // 9. Create Process Instances & Tasks (idempotent)
    // ==========================================================================
    const existingInstances = await prisma.processInstance.count({ where: { processId: itProcess.id } });
    if (existingInstances === 0) {

        // Instance 1: ACTIVE - Outlook crash (High, Tier-2, in progress)
        const instance1 = await prisma.processInstance.create({
            data: {
                processId: itProcess.id,
                processVersion: 1,
                status: 'RUNNING',
                currentNodes: ['assign-agent'],
                variables: {
                    requestType: 'incident', category: 'software', priority: 'high',
                    subject: 'Outlook keeps crashing when opening large attachments',
                    affectedUsers: 1, assetTag: 'AST-042891',
                    ticketId: 'TKT-001', ticketStatus: 'in_progress',
                    assignedTo: 'tier-2', responseTimeSLA: '30 min', resolveTimeSLA: '4 hours',
                },
                startedBy: itUsers[0].id,
            },
        });

        // Instance 2: ACTIVE - VPN dropping (High, Tier-2, in progress)
        const instance2 = await prisma.processInstance.create({
            data: {
                processId: itProcess.id,
                processVersion: 1,
                status: 'RUNNING',
                currentNodes: ['assign-agent'],
                variables: {
                    requestType: 'incident', category: 'network', priority: 'high',
                    subject: 'VPN connection dropping every 10 minutes',
                    affectedUsers: 3, assetTag: 'AST-038712',
                    ticketId: 'TKT-002', ticketStatus: 'in_progress',
                    assignedTo: 'tier-2', responseTimeSLA: '30 min', resolveTimeSLA: '4 hours',
                },
                startedBy: itUsers[1].id,
            },
        });

        // Instance 3: COMPLETED - Database server outage (Critical, Senior Team, resolved)
        const instance3 = await prisma.processInstance.create({
            data: {
                processId: itProcess.id,
                processVersion: 1,
                status: 'COMPLETED',
                currentNodes: ['end-resolved'],
                variables: {
                    requestType: 'incident', category: 'software', priority: 'critical',
                    subject: 'Production database server unresponsive',
                    affectedUsers: 50,
                    ticketId: 'TKT-003', ticketStatus: 'resolved',
                    assignedTo: 'senior-team', responseTimeSLA: '15 min', resolveTimeSLA: '2 hours',
                },
                completedAt: new Date('2026-02-06T15:30:00Z'),
                startedBy: itUsers[2].id,
            },
        });

        // Instance 4: COMPLETED - Jira access request (Service, Tier-1, closed)
        const instance4 = await prisma.processInstance.create({
            data: {
                processId: itProcess.id,
                processVersion: 1,
                status: 'COMPLETED',
                currentNodes: ['end-resolved'],
                variables: {
                    requestType: 'service', category: 'access', priority: 'medium',
                    subject: 'Need access to Jira project PLATFORM-2026',
                    affectedUsers: 1,
                    ticketId: 'TKT-004', ticketStatus: 'closed',
                    assignedTo: 'tier-1', responseTimeSLA: '4 hours', resolveTimeSLA: '1 day',
                },
                completedAt: new Date('2026-02-06T14:30:00Z'),
                startedBy: itUsers[3].id,
            },
        });

        // Instance 5: COMPLETED - Phishing email (Critical Security, resolved)
        const instance5 = await prisma.processInstance.create({
            data: {
                processId: itProcess.id,
                processVersion: 1,
                status: 'COMPLETED',
                currentNodes: ['end-resolved'],
                variables: {
                    requestType: 'incident', category: 'security', priority: 'critical',
                    subject: 'Suspicious phishing email received',
                    affectedUsers: 1,
                    ticketId: 'TKT-006', ticketStatus: 'resolved',
                    assignedTo: 'security', responseTimeSLA: '5 min', resolveTimeSLA: '1 hour',
                },
                completedAt: new Date('2026-02-07T08:45:00Z'),
                startedBy: itUsers[5].id,
            },
        });

        // Instance 6: ACTIVE - WiFi outage Building B (Medium, escalated, SLA breached)
        const instance6 = await prisma.processInstance.create({
            data: {
                processId: itProcess.id,
                processVersion: 1,
                status: 'RUNNING',
                currentNodes: ['escalate-response'],
                variables: {
                    requestType: 'incident', category: 'network', priority: 'medium',
                    subject: 'WiFi not connecting in Building B, Floor 3',
                    affectedUsers: 15,
                    ticketId: 'TKT-008', ticketStatus: 'escalated',
                    assignedTo: 'tier-2', responseTimeSLA: '2 hours', resolveTimeSLA: '1 day',
                    slaBreach: true,
                },
                startedBy: itUsers[1].id,
            },
        });

        console.log(`✅ Created 6 process instances\n`);

        // ==========================================================================
        // 10. Create Task Instances
        // ==========================================================================
        // Task 1: Investigate Outlook crash (PENDING - Active)
        await prisma.taskInstance.create({
            data: {
                instanceId: instance1.id,
                nodeId: 'assign-agent',
                name: 'Investigate Outlook crash - TKT-001',
                description: 'Investigate and resolve Outlook crashing when opening large attachments. Asset: AST-042891',
                taskType: 'TASK',
                assigneeId: itUsers[2].id, // David Park (Tier-2)
                assigneeType: 'USER',
                formData: {
                    ticketId: 'TKT-001', subject: 'Outlook crash with large attachments',
                    category: 'Software', priority: 'High', assetTag: 'AST-042891',
                },
                status: 'PENDING',
                priority: 0,
                dueAt: new Date('2026-02-07T14:15:00Z'),
            },
        });

        // Task 2: Fix VPN connection drops (PENDING - Active)
        await prisma.taskInstance.create({
            data: {
                instanceId: instance2.id,
                nodeId: 'assign-agent',
                name: 'Fix VPN connection drops - TKT-002',
                description: 'VPN connection drops every 10 minutes for 3 users. Check GlobalProtect and Cisco AnyConnect clients.',
                taskType: 'TASK',
                assigneeId: itUsers[2].id, // David Park (Tier-2)
                assigneeType: 'USER',
                formData: {
                    ticketId: 'TKT-002', subject: 'VPN connection drops',
                    category: 'Network', priority: 'High',
                },
                status: 'PENDING',
                priority: 0,
                dueAt: new Date('2026-02-07T13:00:00Z'),
            },
        });

        // Task 3: Fix WiFi outage (PENDING - Active, SLA breached)
        await prisma.taskInstance.create({
            data: {
                instanceId: instance6.id,
                nodeId: 'assign-agent',
                name: 'Fix WiFi outage Building B Floor 3 - TKT-008',
                description: 'Access point AP-B3-02 failed. 15 users affected. SLA breached - escalated to IT Manager.',
                taskType: 'TASK',
                assigneeId: itUsers[4].id, // Tom Harris
                assigneeType: 'USER',
                formData: {
                    ticketId: 'TKT-008', subject: 'WiFi outage Building B Floor 3',
                    category: 'Network', priority: 'Medium', affectedUsers: 15,
                },
                status: 'PENDING',
                priority: 1,
                dueAt: new Date('2026-02-08T09:00:00Z'),
                slaBreached: true,
            },
        });

        // Task 4: Satisfaction survey for DB outage (COMPLETED)
        await prisma.taskInstance.create({
            data: {
                instanceId: instance3.id,
                nodeId: 'customer-survey',
                name: 'Satisfaction survey - Database server outage - TKT-003',
                description: 'Send satisfaction survey to David Park for resolved critical incident.',
                taskType: 'TASK',
                assigneeId: itUsers[2].id,
                assigneeType: 'USER',
                formData: {
                    ticketId: 'TKT-003', subject: 'Database server unresponsive',
                },
                status: 'COMPLETED',
                priority: 2,
                dueAt: new Date('2026-02-07T15:30:00Z'),
                outcome: 'completed',
                completedAt: new Date('2026-02-07T16:00:00Z'),
                completedBy: itUsers[2].id,
            },
        });

        // Task 5: Handle phishing report (COMPLETED)
        await prisma.taskInstance.create({
            data: {
                instanceId: instance5.id,
                nodeId: 'assign-agent',
                name: 'Handle phishing report - TKT-006',
                description: 'Investigate phishing email from ceo@company-notice.com. Block domain and send company alert.',
                taskType: 'TASK',
                assigneeId: itUsers[5].id, // Nina Patel (Security)
                assigneeType: 'USER',
                formData: {
                    ticketId: 'TKT-006', subject: 'Phishing email from ceo@company-notice.com',
                    category: 'Security', priority: 'Critical',
                },
                status: 'COMPLETED',
                priority: 0,
                dueAt: new Date('2026-02-07T09:00:00Z'),
                outcome: 'completed',
                completedAt: new Date('2026-02-07T08:45:00Z'),
                completedBy: itUsers[5].id,
                comments: 'Phishing email blocked. Domain added to blocklist. Company-wide alert sent.',
            },
        });

        console.log(`✅ Created 5 task instances\n`);

    } else {
        console.log(`✅ Process instances already exist: ${existingInstances} (skipped)\n`);
    }

    // ==========================================================================
    // Summary
    // ==========================================================================
    console.log('🎉 IT Support Ticket Flow seeding complete!');
    console.log('   📋 Form: IT Support Request (9 fields)');
    console.log('   🔄 Workflow: IT Support Workflow (12 nodes)');
    console.log('   📊 Datasets: IT Tickets (10 records), IT Knowledge Base (5 articles)');
    console.log('   📝 Form Submissions: 5');
    console.log('   🏃 Process Instances: 6 (3 completed, 3 active)');
    console.log('   ✅ Task Instances: 5 (3 active, 2 completed)');
    console.log('\n   ⚡ Decision Table "Ticket Routing & SLA" is seeded in-memory via server startup.\n');
}

seedITSupportFlow()
    .catch((e) => {
        console.error('❌ IT Support seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
