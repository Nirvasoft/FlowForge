/**
 * Expense Claim Flow Seed Script
 * Creates a complete Expense Claim workflow with:
 * - Expense Claim Form (claim title, date, category, line items, total, project code, justification)
 * - Expense Claim Workflow (Submit → Validate → Route → Approve → Finance → Payment → Notify)
 * - Expense Approval Decision Table (routing based on category and amount)
 * - Expense Records Dataset with sample records
 * - Sample process instances and task instances
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedExpenseClaimFlow() {
    console.log('💰 Seeding Expense Claim Flow...\n');

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

    // Find or create expense-related users
    const bcryptModule = await import('bcryptjs');
    const bcryptLib = bcryptModule.default || bcryptModule;
    const passwordHash = await bcryptLib.hash('Demo123!@#', 12);

    const expenseUsers = [];
    const userProfiles = [
        { email: 'john.doe@demo.com', firstName: 'John', lastName: 'Doe' },
        { email: 'jane.smith@demo.com', firstName: 'Jane', lastName: 'Smith' },
        { email: 'mike.wilson@demo.com', firstName: 'Mike', lastName: 'Wilson' },
        { email: 'sarah.chen@demo.com', firstName: 'Sarah', lastName: 'Chen' },
        { email: 'alex.kumar@demo.com', firstName: 'Alex', lastName: 'Kumar' },
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
        expenseUsers.push(user);
    }

    console.log(`✅ Found/created ${expenseUsers.length} users\n`);

    // ==========================================================================
    // 2. Create Expense Claim Form
    // ==========================================================================
    const expenseClaimForm = await prisma.form.upsert({
        where: {
            id: '00000000-0000-0000-0000-000000000002',
        },
        create: {
            id: '00000000-0000-0000-0000-000000000002',
            accountId: account.id,
            name: 'Expense Claim Form',
            description: 'Submit expense claims for approval and reimbursement',
            fields: [
                {
                    id: 'field-claim-title',
                    name: 'claimTitle',
                    label: 'Claim Title',
                    type: 'text',
                    required: true,
                    order: 1,
                    config: { placeholder: 'e.g., Client Meeting - ABC Corp' },
                },
                {
                    id: 'field-expense-date',
                    name: 'expenseDate',
                    label: 'Expense Date',
                    type: 'date',
                    required: true,
                    order: 2,
                    config: { maxDate: 'today' },
                },
                {
                    id: 'field-category',
                    name: 'category',
                    label: 'Category',
                    type: 'select',
                    required: true,
                    order: 3,
                    config: {
                        options: [
                            { label: 'Travel', value: 'travel' },
                            { label: 'Meals & Entertainment', value: 'meals' },
                            { label: 'Accommodation', value: 'accommodation' },
                            { label: 'Office Supplies', value: 'supplies' },
                            { label: 'Software & Subscriptions', value: 'software' },
                            { label: 'Other', value: 'other' },
                        ],
                    },
                },
                {
                    id: 'field-line-items',
                    name: 'lineItems',
                    label: 'Expense Items',
                    type: 'repeater',
                    required: true,
                    order: 4,
                    config: {
                        minItems: 1,
                        maxItems: 20,
                        fields: [
                            { name: 'description', type: 'text', label: 'Description', required: true },
                            { name: 'amount', type: 'number', label: 'Amount ($)', required: true, min: 0.01 },
                            { name: 'receipt', type: 'file', label: 'Receipt', accept: '.pdf,.jpg,.png', required: true },
                        ],
                    },
                },
                {
                    id: 'field-total-amount',
                    name: 'totalAmount',
                    label: 'Total Amount',
                    type: 'number',
                    required: false,
                    order: 5,
                    config: { readonly: true, computed: 'SUM(lineItems.amount)', prefix: '$' },
                },
                {
                    id: 'field-project-code',
                    name: 'projectCode',
                    label: 'Project Code',
                    type: 'lookup',
                    required: false,
                    order: 6,
                    config: {
                        datasetId: 'projects',
                        displayField: 'name',
                        valueField: 'code',
                    },
                },
                {
                    id: 'field-justification',
                    name: 'justification',
                    label: 'Business Justification',
                    type: 'textarea',
                    required: false,
                    order: 7,
                    config: {
                        placeholder: 'Required for expenses over $500...',
                        minLength: 10,
                        maxLength: 1000,
                        showWhen: 'totalAmount > 500',
                    },
                },
            ],
            layout: {
                columns: 2,
                sections: [
                    { title: 'Claim Details', fields: ['field-claim-title', 'field-expense-date', 'field-category'] },
                    { title: 'Expense Items', fields: ['field-line-items'] },
                    { title: 'Summary', fields: ['field-total-amount', 'field-project-code', 'field-justification'] },
                ],
            },
            validationRules: [
                { field: 'totalAmount', rule: 'min', value: 0.01, message: 'Total amount must be greater than zero' },
                { field: 'justification', rule: 'requiredIf', condition: 'totalAmount > 500', message: 'Business justification is required for expenses over $500' },
            ],
            conditionalLogic: [
                {
                    field: 'justification',
                    condition: { field: 'totalAmount', operator: 'greaterThan', value: 500 },
                    action: { type: 'show' },
                },
            ],
            settings: {
                submitButtonText: 'Submit Expense Claim',
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

    console.log(`✅ Created form: ${expenseClaimForm.name} (${expenseClaimForm.id})\n`);

    // ==========================================================================
    // 3. Create Expense Claim Workflow
    // ==========================================================================
    const expenseProcess = await prisma.process.upsert({
        where: {
            id: '00000000-0000-0000-0000-000000000020',
        },
        create: {
            id: '00000000-0000-0000-0000-000000000020',
            accountId: account.id,
            name: 'Expense Claim Workflow',
            description: 'Expense claim submission, approval routing, finance review, and payment processing',
            category: 'Finance',
            definition: {
                nodes: [
                    {
                        id: 'start-1',
                        type: 'start',
                        name: 'Submit Expense Claim',
                        description: 'Employee submits an expense claim form',
                        position: { x: 100, y: 300 },
                        config: { trigger: 'form_submission', formId: expenseClaimForm.id },
                    },
                    {
                        id: 'action-validate',
                        type: 'action',
                        name: 'Validate Receipts',
                        description: 'Validate that all line items have required receipts attached',
                        position: { x: 350, y: 300 },
                        config: {
                            action: 'validate',
                            rules: [
                                { check: 'receipts_attached', message: 'All expense items must have receipts' },
                                { check: 'amount_positive', message: 'All amounts must be positive' },
                            ],
                        },
                    },
                    {
                        id: 'decision-route',
                        type: 'decision',
                        name: 'Route Approval',
                        description: 'Route to appropriate approver based on category and amount',
                        position: { x: 600, y: 300 },
                        config: {
                            decisionTableId: 'expense-approval-routing',
                            inputs: { category: 'variables.category', amount: 'variables.totalAmount' },
                        },
                    },
                    {
                        id: 'decision-auto',
                        type: 'decision',
                        name: 'Auto-Approve Check',
                        description: 'Check if expense qualifies for auto-approval (≤ $100)',
                        position: { x: 850, y: 150 },
                        config: {},
                        condition: 'variables.totalAmount <= 100',
                    },
                    {
                        id: 'approval-manager',
                        type: 'approval',
                        name: 'Manager Approval',
                        description: 'Direct manager reviews and approves the expense claim',
                        position: { x: 850, y: 300 },
                        config: {
                            assignTo: 'manager',
                            approvalType: 'single',
                            timeoutDays: 5,
                            escalateTo: 'director',
                        },
                    },
                    {
                        id: 'approval-director',
                        type: 'approval',
                        name: 'Director Approval',
                        description: 'Director reviews high-value travel/software expenses ($1,001-$5,000)',
                        position: { x: 850, y: 500 },
                        config: {
                            assignTo: 'role:director',
                            approvalType: 'single',
                            timeoutDays: 3,
                            escalateTo: 'vp',
                        },
                    },
                    {
                        id: 'approval-vp',
                        type: 'approval',
                        name: 'VP Approval',
                        description: 'VP reviews very high-value expenses (> $5,000)',
                        position: { x: 850, y: 650 },
                        config: {
                            assignTo: 'role:vp',
                            approvalType: 'single',
                            timeoutDays: 3,
                        },
                    },
                    {
                        id: 'decision-finance',
                        type: 'decision',
                        name: 'Finance Review Required?',
                        description: 'Check if finance review is required based on routing decision',
                        position: { x: 1100, y: 300 },
                        config: {},
                        condition: 'variables.financeReview === true',
                    },
                    {
                        id: 'approval-finance',
                        type: 'approval',
                        name: 'Finance Review',
                        description: 'Finance team reviews and validates the expense claim',
                        position: { x: 1350, y: 200 },
                        config: {
                            assignTo: 'role:finance',
                            approvalType: 'single',
                            timeoutDays: 5,
                        },
                    },
                    {
                        id: 'action-payment',
                        type: 'action',
                        name: 'Payment Queue',
                        description: 'Add approved expense to payment processing queue',
                        position: { x: 1600, y: 300 },
                        config: {
                            action: 'queue_payment',
                            paymentMethod: 'reimbursement',
                            dataset: 'Expense Records',
                        },
                    },
                    {
                        id: 'action-process',
                        type: 'action',
                        name: 'Process Payment',
                        description: 'Process the reimbursement payment',
                        position: { x: 1850, y: 300 },
                        config: {
                            action: 'process_payment',
                        },
                    },
                    {
                        id: 'email-notify',
                        type: 'email',
                        name: 'Notify Employee',
                        description: 'Send notification to employee about claim status',
                        position: { x: 2100, y: 300 },
                        config: {
                            to: '{{initiator.email}}',
                            subject: 'Expense Claim {{variables.status}} - {{variables.claimTitle}}',
                            template: 'expense_status',
                        },
                    },
                    {
                        id: 'email-reject',
                        type: 'email',
                        name: 'Rejection Notification',
                        description: 'Notify employee that expense claim was rejected',
                        position: { x: 1100, y: 550 },
                        config: {
                            to: '{{initiator.email}}',
                            subject: 'Expense Claim Rejected - {{variables.claimTitle}}',
                            template: 'expense_rejected',
                        },
                    },
                    {
                        id: 'end-approved',
                        type: 'end',
                        name: 'Claim Processed',
                        description: 'Expense claim processed and payment completed',
                        position: { x: 2350, y: 300 },
                        config: {},
                    },
                    {
                        id: 'end-rejected',
                        type: 'end',
                        name: 'Claim Rejected',
                        description: 'Expense claim rejected',
                        position: { x: 1350, y: 550 },
                        config: {},
                    },
                ],
                edges: [
                    { id: 'e1', source: 'start-1', target: 'action-validate', label: '' },
                    { id: 'e2', source: 'action-validate', target: 'decision-route', label: 'Validated' },
                    { id: 'e3', source: 'decision-route', target: 'decision-auto', label: 'Route determined' },
                    { id: 'e4', source: 'decision-auto', target: 'action-payment', label: '≤ $100 (Auto-Approve)', condition: 'variables.totalAmount <= 100' },
                    { id: 'e5', source: 'decision-auto', target: 'approval-manager', label: 'Manager route', condition: 'variables.approver === "manager"' },
                    { id: 'e6', source: 'decision-auto', target: 'approval-director', label: 'Director route', condition: 'variables.approver === "director" || variables.approver === "it_director"' },
                    { id: 'e7', source: 'decision-auto', target: 'approval-vp', label: 'VP route', condition: 'variables.approver === "vp"' },
                    { id: 'e8', source: 'approval-manager', target: 'decision-finance', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e9', source: 'approval-director', target: 'decision-finance', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e10', source: 'approval-vp', target: 'decision-finance', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e11', source: 'approval-manager', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e12', source: 'approval-director', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e13', source: 'approval-vp', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e14', source: 'decision-finance', target: 'approval-finance', label: 'Review required', condition: 'variables.financeReview === true' },
                    { id: 'e15', source: 'decision-finance', target: 'action-payment', label: 'No review needed', condition: 'variables.financeReview === false' },
                    { id: 'e16', source: 'approval-finance', target: 'action-payment', label: 'Finance approved', condition: 'outcome === "approved"' },
                    { id: 'e17', source: 'approval-finance', target: 'email-reject', label: 'Finance rejected', condition: 'outcome === "rejected"' },
                    { id: 'e18', source: 'action-payment', target: 'action-process', label: '' },
                    { id: 'e19', source: 'action-process', target: 'email-notify', label: '' },
                    { id: 'e20', source: 'email-notify', target: 'end-approved', label: '' },
                    { id: 'e21', source: 'email-reject', target: 'end-rejected', label: '' },
                ],
            },
            variables: [
                { name: 'claimTitle', type: 'string', label: 'Claim Title' },
                { name: 'expenseDate', type: 'date', label: 'Expense Date' },
                { name: 'category', type: 'string', label: 'Category' },
                { name: 'lineItems', type: 'array', label: 'Expense Items' },
                { name: 'totalAmount', type: 'number', label: 'Total Amount' },
                { name: 'projectCode', type: 'string', label: 'Project Code' },
                { name: 'justification', type: 'string', label: 'Business Justification' },
                { name: 'approver', type: 'string', label: 'Approver Role' },
                { name: 'financeReview', type: 'boolean', label: 'Finance Review Required' },
                { name: 'status', type: 'string', label: 'Claim Status' },
            ],
            triggers: [
                { type: 'form_submission', formId: expenseClaimForm.id },
                { type: 'manual', label: 'Submit Expense Claim' },
            ],
            settings: {
                allowCancel: true,
                trackSLA: true,
                notification: { onStart: true, onComplete: true, onError: true },
            },
            permissions: {},
            slaConfig: {
                defaultDueHours: 120,
                escalationPolicy: 'notify_admin',
            },
            version: 1,
            status: 'ACTIVE',
            publishedAt: new Date(),
            createdBy: adminUser.id,
        },
        update: {},
    });

    console.log(`✅ Created process: ${expenseProcess.name} (${expenseProcess.id})\n`);

    // ==========================================================================
    // 4. Create Expense Records Dataset
    // ==========================================================================
    const expenseDataset = await prisma.dataset.upsert({
        where: {
            accountId_name: { accountId: account.id, name: 'Expense Records' },
        },
        create: {
            accountId: account.id,
            name: 'Expense Records',
            description: 'All expense claim records with approval status, routing, and payment tracking',
            schema: [
                { name: 'Claim Title', slug: 'claim_title', type: 'text', required: true },
                { name: 'Claimant', slug: 'claimant', type: 'text', required: true },
                { name: 'Category', slug: 'category', type: 'select', required: true },
                { name: 'Expense Date', slug: 'expense_date', type: 'date', required: true },
                { name: 'Total Amount', slug: 'total_amount', type: 'number', required: true },
                { name: 'Project Code', slug: 'project_code', type: 'text', required: false },
                { name: 'Approver', slug: 'approver', type: 'text', required: false },
                { name: 'Status', slug: 'status', type: 'select', required: true },
                { name: 'Finance Reviewed', slug: 'finance_reviewed', type: 'boolean', required: false },
                { name: 'Payment Date', slug: 'payment_date', type: 'date', required: false },
                { name: 'Comments', slug: 'comments', type: 'text', required: false },
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

    console.log(`✅ Created dataset: ${expenseDataset.name} (${expenseDataset.id})\n`);

    // ==========================================================================
    // 5. Create Sample Expense Records
    // ==========================================================================
    const sampleExpenseRecords = [
        {
            claim_title: 'Q1 Sales Conference - Chicago',
            claimant: 'John Doe', category: 'Travel',
            expense_date: '2026-01-25', total_amount: 1090.50,
            project_code: 'PROJ-2026-001', approver: 'Director',
            status: 'Approved', finance_reviewed: true,
            payment_date: '2026-02-01', comments: 'All receipts verified. Payment processed.',
        },
        {
            claim_title: 'Team Lunch - Sprint Retrospective',
            claimant: 'Sarah Chen', category: 'Meals & Entertainment',
            expense_date: '2026-01-30', total_amount: 185.00,
            project_code: 'PROJ-2026-003', approver: 'Manager',
            status: 'Approved', finance_reviewed: false,
            payment_date: '2026-02-03', comments: 'Approved for team event.',
        },
        {
            claim_title: 'AWS Annual Subscription',
            claimant: 'Mike Wilson', category: 'Software & Subscriptions',
            expense_date: '2026-02-01', total_amount: 2400.00,
            project_code: 'PROJ-2026-002', approver: 'IT Director',
            status: 'Pending Finance Review', finance_reviewed: false,
            payment_date: '', comments: 'IT Director approved. Awaiting finance validation.',
        },
        {
            claim_title: 'Office Supplies - Q1 Restock',
            claimant: 'Jane Smith', category: 'Office Supplies',
            expense_date: '2026-02-05', total_amount: 75.00,
            project_code: '', approver: 'Auto-Approved',
            status: 'Approved', finance_reviewed: false,
            payment_date: '2026-02-05', comments: 'Auto-approved (≤ $100).',
        },
        {
            claim_title: 'Client Dinner - Acme Corp Deal',
            claimant: 'Alex Kumar', category: 'Meals & Entertainment',
            expense_date: '2026-02-04', total_amount: 320.00,
            project_code: 'PROJ-2026-005', approver: 'Manager',
            status: 'Pending Manager Approval', finance_reviewed: false,
            payment_date: '', comments: '',
        },
        {
            claim_title: 'Flight & Hotel - NYC Client Visit',
            claimant: 'John Doe', category: 'Travel',
            expense_date: '2026-02-06', total_amount: 3200.00,
            project_code: 'PROJ-2026-001', approver: 'Director',
            status: 'Pending Director Approval', finance_reviewed: false,
            payment_date: '', comments: '',
        },
        {
            claim_title: 'Uber Rides - January',
            claimant: 'Sarah Chen', category: 'Travel',
            expense_date: '2026-01-31', total_amount: 95.50,
            project_code: '', approver: 'Auto-Approved',
            status: 'Approved', finance_reviewed: false,
            payment_date: '2026-01-31', comments: 'Auto-approved (≤ $100).',
        },
        {
            claim_title: 'Conference Registration - DevSummit 2026',
            claimant: 'Mike Wilson', category: 'Other',
            expense_date: '2026-02-07', total_amount: 599.00,
            project_code: 'PROJ-2026-002', approver: 'Manager',
            status: 'Rejected', finance_reviewed: false,
            payment_date: '', comments: 'Rejected: Budget for conferences exhausted for Q1.',
        },
    ];

    let recordsCreated = 0;
    for (const record of sampleExpenseRecords) {
        await prisma.datasetRecord.create({
            data: {
                datasetId: expenseDataset.id,
                data: record,
                createdBy: expenseUsers.find(u => u.firstName === record.claimant.split(' ')[0])?.id || adminUser.id,
            },
        });
        recordsCreated++;
    }

    await prisma.dataset.update({
        where: { id: expenseDataset.id },
        data: { rowCount: recordsCreated },
    });

    console.log(`✅ Created ${recordsCreated} expense records\n`);

    // ==========================================================================
    // 6. Create Form Submissions
    // ==========================================================================
    const formSubmissions = [
        {
            claimTitle: 'Q1 Sales Conference - Chicago',
            expenseDate: '2026-01-25',
            category: 'travel',
            lineItems: [
                { description: 'Flight - SFO to ORD', amount: 450.00, receipt: 'receipt-flight.pdf' },
                { description: 'Hotel - 2 nights at Hilton', amount: 380.00, receipt: 'receipt-hotel.pdf' },
                { description: 'Uber rides', amount: 85.50, receipt: 'receipt-uber.pdf' },
                { description: 'Client dinner', amount: 175.00, receipt: 'receipt-dinner.pdf' },
            ],
            totalAmount: 1090.50,
            projectCode: 'PROJ-2026-001',
            justification: 'Attended Q1 Sales Conference to present new product line to key accounts',
            submittedBy: 'John Doe',
        },
        {
            claimTitle: 'Team Lunch - Sprint Retrospective',
            expenseDate: '2026-01-30',
            category: 'meals',
            lineItems: [
                { description: 'Team lunch at Italian Restaurant', amount: 185.00, receipt: 'receipt-lunch.pdf' },
            ],
            totalAmount: 185.00,
            projectCode: 'PROJ-2026-003',
            justification: '',
            submittedBy: 'Sarah Chen',
        },
        {
            claimTitle: 'AWS Annual Subscription',
            expenseDate: '2026-02-01',
            category: 'software',
            lineItems: [
                { description: 'AWS Reserved Instances - Annual', amount: 2400.00, receipt: 'receipt-aws.pdf' },
            ],
            totalAmount: 2400.00,
            projectCode: 'PROJ-2026-002',
            justification: 'Annual AWS infrastructure costs for production environment. Required for service continuity.',
            submittedBy: 'Mike Wilson',
        },
        {
            claimTitle: 'Client Dinner - Acme Corp Deal',
            expenseDate: '2026-02-04',
            category: 'meals',
            lineItems: [
                { description: 'Dinner at Steakhouse with Acme Corp executives', amount: 280.00, receipt: 'receipt-steakhouse.pdf' },
                { description: 'Wine & beverages', amount: 40.00, receipt: 'receipt-drinks.pdf' },
            ],
            totalAmount: 320.00,
            projectCode: 'PROJ-2026-005',
            justification: '',
            submittedBy: 'Alex Kumar',
        },
    ];

    for (const submission of formSubmissions) {
        await prisma.formSubmission.create({
            data: {
                formId: expenseClaimForm.id,
                data: submission,
                createdBy: expenseUsers.find(u => u.firstName === submission.submittedBy.split(' ')[0])?.id || adminUser.id,
            },
        });
    }

    console.log(`✅ Created ${formSubmissions.length} form submissions\n`);

    // ==========================================================================
    // 7. Create Process Instances
    // ==========================================================================
    const processInstances = [];

    // Instance 1: COMPLETED - Q1 Sales Conference (Travel, $1,090.50 → Director → Finance → Paid)
    const instance1 = await prisma.processInstance.create({
        data: {
            processId: expenseProcess.id,
            processVersion: 1,
            status: 'COMPLETED',
            currentNodes: ['end-approved'],
            variables: {
                claimTitle: 'Q1 Sales Conference - Chicago',
                expenseDate: '2026-01-25', category: 'travel',
                totalAmount: 1090.50, projectCode: 'PROJ-2026-001',
                justification: 'Attended Q1 Sales Conference to present new product line to key accounts',
                approver: 'director', financeReview: true, status: 'Paid',
            },
            startedBy: expenseUsers[0].id, // John Doe
            completedAt: new Date('2026-02-01T16:00:00Z'),
        },
    });
    processInstances.push(instance1);

    // Instance 2: COMPLETED - Team Lunch (Meals, $185 → Manager → Paid)
    const instance2 = await prisma.processInstance.create({
        data: {
            processId: expenseProcess.id,
            processVersion: 1,
            status: 'COMPLETED',
            currentNodes: ['end-approved'],
            variables: {
                claimTitle: 'Team Lunch - Sprint Retrospective',
                expenseDate: '2026-01-30', category: 'meals',
                totalAmount: 185.00, projectCode: 'PROJ-2026-003',
                approver: 'manager', financeReview: false, status: 'Paid',
            },
            startedBy: expenseUsers[3].id, // Sarah Chen
            completedAt: new Date('2026-02-03T10:00:00Z'),
        },
    });
    processInstances.push(instance2);

    // Instance 3: RUNNING - AWS Subscription (Software, $2,400 → IT Director → Pending Finance)
    const instance3 = await prisma.processInstance.create({
        data: {
            processId: expenseProcess.id,
            processVersion: 1,
            status: 'RUNNING',
            currentNodes: ['approval-finance'],
            variables: {
                claimTitle: 'AWS Annual Subscription',
                expenseDate: '2026-02-01', category: 'software',
                totalAmount: 2400.00, projectCode: 'PROJ-2026-002',
                justification: 'Annual AWS infrastructure costs for production environment.',
                approver: 'it_director', financeReview: true, status: 'Pending Finance Review',
            },
            startedBy: expenseUsers[2].id, // Mike Wilson
            dueAt: new Date('2026-02-12T17:00:00Z'),
        },
    });
    processInstances.push(instance3);

    // Instance 4: COMPLETED - Office Supplies (≤$100, Auto-Approved)
    const instance4 = await prisma.processInstance.create({
        data: {
            processId: expenseProcess.id,
            processVersion: 1,
            status: 'COMPLETED',
            currentNodes: ['end-approved'],
            variables: {
                claimTitle: 'Office Supplies - Q1 Restock',
                expenseDate: '2026-02-05', category: 'supplies',
                totalAmount: 75.00, approver: 'auto', financeReview: false, status: 'Paid',
            },
            startedBy: expenseUsers[1].id, // Jane Smith
            completedAt: new Date('2026-02-05T09:00:00Z'),
        },
    });
    processInstances.push(instance4);

    // Instance 5: RUNNING - Client Dinner (Meals, $320 → Pending Manager)
    const instance5 = await prisma.processInstance.create({
        data: {
            processId: expenseProcess.id,
            processVersion: 1,
            status: 'RUNNING',
            currentNodes: ['approval-manager'],
            variables: {
                claimTitle: 'Client Dinner - Acme Corp Deal',
                expenseDate: '2026-02-04', category: 'meals',
                totalAmount: 320.00, projectCode: 'PROJ-2026-005',
                approver: 'manager', financeReview: true, status: 'Pending Manager Approval',
            },
            startedBy: expenseUsers[4].id, // Alex Kumar
            dueAt: new Date('2026-02-09T17:00:00Z'),
        },
    });
    processInstances.push(instance5);

    // Instance 6: RUNNING - NYC Trip (Travel, $3,200 → Pending Director)
    const instance6 = await prisma.processInstance.create({
        data: {
            processId: expenseProcess.id,
            processVersion: 1,
            status: 'RUNNING',
            currentNodes: ['approval-director'],
            variables: {
                claimTitle: 'Flight & Hotel - NYC Client Visit',
                expenseDate: '2026-02-06', category: 'travel',
                totalAmount: 3200.00, projectCode: 'PROJ-2026-001',
                justification: 'Critical client visit to close enterprise deal with Fortune 500 company',
                approver: 'director', financeReview: true, status: 'Pending Director Approval',
            },
            startedBy: expenseUsers[0].id, // John Doe
            dueAt: new Date('2026-02-11T17:00:00Z'),
        },
    });
    processInstances.push(instance6);

    // Instance 7: COMPLETED - Rejected (Conference registration)
    const instance7 = await prisma.processInstance.create({
        data: {
            processId: expenseProcess.id,
            processVersion: 1,
            status: 'COMPLETED',
            currentNodes: ['end-rejected'],
            variables: {
                claimTitle: 'Conference Registration - DevSummit 2026',
                expenseDate: '2026-02-07', category: 'other',
                totalAmount: 599.00, projectCode: 'PROJ-2026-002',
                justification: 'DevSummit 2026 registration for engineering knowledge sharing',
                approver: 'manager', financeReview: false, status: 'Rejected',
            },
            startedBy: expenseUsers[2].id, // Mike Wilson
            completedAt: new Date('2026-02-07T15:00:00Z'),
        },
    });
    processInstances.push(instance7);

    console.log(`✅ Created ${processInstances.length} process instances\n`);

    // ==========================================================================
    // 8. Create Task Instances
    // ==========================================================================

    // Task 1: Director Approval for Q1 Sales Conference (COMPLETED)
    await prisma.taskInstance.create({
        data: {
            instanceId: instance1.id,
            nodeId: 'approval-director',
            name: 'Approve Expense: Q1 Sales Conference - $1,090.50',
            description: 'Review travel expense claim from John Doe for Q1 Sales Conference in Chicago',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'USER',
            formData: {
                claimTitle: 'Q1 Sales Conference - Chicago', category: 'Travel',
                totalAmount: 1090.50, lineItems: 4, projectCode: 'PROJ-2026-001',
            },
            status: 'COMPLETED',
            priority: 1,
            outcome: 'approved',
            completedAt: new Date('2026-01-28T14:00:00Z'),
            completedBy: adminUser.id,
            comments: 'Approved. Valid business travel for key account presentations.',
        },
    });

    // Task 2: Finance Review for Q1 Sales Conference (COMPLETED)
    await prisma.taskInstance.create({
        data: {
            instanceId: instance1.id,
            nodeId: 'approval-finance',
            name: 'Finance Review: Q1 Sales Conference - $1,090.50',
            description: 'Finance validation of travel expense > $1,000',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'ROLE',
            formData: {
                claimTitle: 'Q1 Sales Conference - Chicago', totalAmount: 1090.50,
                approvedBy: 'Director', receiptsCount: 4,
            },
            status: 'COMPLETED',
            priority: 1,
            outcome: 'approved',
            completedAt: new Date('2026-01-30T11:00:00Z'),
            completedBy: adminUser.id,
            comments: 'All receipts verified. Amounts match. Cleared for payment.',
        },
    });

    // Task 3: Manager Approval for Team Lunch (COMPLETED)
    await prisma.taskInstance.create({
        data: {
            instanceId: instance2.id,
            nodeId: 'approval-manager',
            name: 'Approve Expense: Team Lunch - $185.00',
            description: 'Review meals expense from Sarah Chen for sprint retrospective lunch',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'USER',
            formData: {
                claimTitle: 'Team Lunch - Sprint Retrospective', category: 'Meals & Entertainment',
                totalAmount: 185.00, projectCode: 'PROJ-2026-003',
            },
            status: 'COMPLETED',
            priority: 2,
            outcome: 'approved',
            completedAt: new Date('2026-02-01T09:30:00Z'),
            completedBy: adminUser.id,
            comments: 'Approved. Team event expense.',
        },
    });

    // Task 4: Finance Review for AWS Subscription (PENDING - Active)
    await prisma.taskInstance.create({
        data: {
            instanceId: instance3.id,
            nodeId: 'approval-finance',
            name: 'Finance Review: AWS Annual Subscription - $2,400.00',
            description: 'Finance review for software expense > $500. IT Director already approved.',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'ROLE',
            formData: {
                claimTitle: 'AWS Annual Subscription', category: 'Software & Subscriptions',
                totalAmount: 2400.00, approvedBy: 'IT Director', projectCode: 'PROJ-2026-002',
            },
            status: 'PENDING',
            priority: 1,
            dueAt: new Date('2026-02-12T17:00:00Z'),
        },
    });

    // Task 5: Manager Approval for Client Dinner (PENDING - Active)
    await prisma.taskInstance.create({
        data: {
            instanceId: instance5.id,
            nodeId: 'approval-manager',
            name: 'Approve Expense: Client Dinner - $320.00',
            description: 'Review meals expense from Alex Kumar for Acme Corp client dinner',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'USER',
            formData: {
                claimTitle: 'Client Dinner - Acme Corp Deal', category: 'Meals & Entertainment',
                totalAmount: 320.00, projectCode: 'PROJ-2026-005',
            },
            status: 'PENDING',
            priority: 1,
            dueAt: new Date('2026-02-09T17:00:00Z'),
        },
    });

    // Task 6: Director Approval for NYC Trip (PENDING - Active)
    await prisma.taskInstance.create({
        data: {
            instanceId: instance6.id,
            nodeId: 'approval-director',
            name: 'Approve Expense: NYC Client Visit - $3,200.00',
            description: 'Review high-value travel expense from John Doe for NYC client visit',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'USER',
            formData: {
                claimTitle: 'Flight & Hotel - NYC Client Visit', category: 'Travel',
                totalAmount: 3200.00, projectCode: 'PROJ-2026-001',
                justification: 'Critical client visit to close enterprise deal with Fortune 500 company',
            },
            status: 'PENDING',
            priority: 1,
            dueAt: new Date('2026-02-11T17:00:00Z'),
        },
    });

    // Task 7: Manager Approval for Conference (COMPLETED - Rejected)
    await prisma.taskInstance.create({
        data: {
            instanceId: instance7.id,
            nodeId: 'approval-manager',
            name: 'Approve Expense: DevSummit 2026 Registration - $599.00',
            description: 'Review conference registration expense from Mike Wilson',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'USER',
            formData: {
                claimTitle: 'Conference Registration - DevSummit 2026', category: 'Other',
                totalAmount: 599.00, projectCode: 'PROJ-2026-002',
            },
            status: 'COMPLETED',
            priority: 2,
            outcome: 'rejected',
            completedAt: new Date('2026-02-07T15:00:00Z'),
            completedBy: adminUser.id,
            comments: 'Rejected: Budget for conferences exhausted for Q1. Try again in Q2.',
        },
    });

    console.log(`✅ Created 7 task instances\n`);

    // ==========================================================================
    // 9. Seed Decision Table (in-memory via service)
    // ==========================================================================
    // Note: Decision tables are stored in-memory, so they need to be seeded on
    // server startup. We'll create a seed function the service can call.
    console.log(`ℹ️  Decision Table "Expense Approval Routing" will be seeded on server startup.\n`);

    // ==========================================================================
    // Done!
    // ==========================================================================
    console.log('─'.repeat(60));
    console.log('🎉 Expense Claim Flow seeding completed!');
    console.log('');
    console.log('Created:');
    console.log('  📋 Expense Claim Form');
    console.log('  🔄 Expense Claim Workflow (15 nodes, 21 edges)');
    console.log('  📊 Expense Records Dataset (8 records)');
    console.log('  📝 4 Form Submissions');
    console.log('  ⚙️  7 Process Instances (4 completed, 3 running)');
    console.log('  ✅ 7 Task Instances (4 completed, 3 pending)');
    console.log('');
    console.log('Note: Run the server to also seed the Decision Table in-memory.');
}

seedExpenseClaimFlow()
    .catch((e) => {
        console.error('❌ Expense Claim seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
