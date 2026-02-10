/**
 * Contract Lifecycle Management Seed Script
 * Creates: Contracts Dataset, Negotiations Dataset, Contract Request Form,
 *          Contract Approval Form, Contract Lifecycle Workflow, App, Sample Data
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedContractLifecycle() {
    console.log('\n📄 Seeding Contract Lifecycle Management...\n');

    // 1. Get account & admin user
    const account = await prisma.account.findFirst({ where: { slug: 'demo' } });
    if (!account) throw new Error('Demo account not found. Run main seed first.');

    const adminUser = await prisma.user.findFirst({ where: { accountId: account.id, email: 'admin@demo.com' } });
    if (!adminUser) throw new Error('Admin user not found. Run main seed first.');

    // Ensure contract users exist
    const contractUserData = [
        { firstName: 'Sarah', lastName: 'Chen', email: 'sarah.chen@demo.com', role: 'Legal Counsel' },
        { firstName: 'Michael', lastName: 'Ross', email: 'michael.ross@demo.com', role: 'Contract Manager' },
        { firstName: 'Rachel', lastName: 'Green', email: 'rachel.green@demo.com', role: 'Procurement Lead' },
        { firstName: 'Robert', lastName: 'Kim', email: 'robert.kim@demo.com', role: 'CFO' },
        { firstName: 'Emily', lastName: 'Davis', email: 'emily.davis@demo.com', role: 'Department Head' },
        { firstName: 'Daniel', lastName: 'Wright', email: 'daniel.wright@demo.com', role: 'CEO' },
    ];

    const users: any[] = [];
    for (const u of contractUserData) {
        const user = await prisma.user.upsert({
            where: { accountId_email: { accountId: account.id, email: u.email } },
            create: {
                accountId: account.id, email: u.email,
                firstName: u.firstName, lastName: u.lastName,
                passwordHash: await bcrypt.hash('Demo123!@#', 12),
                status: 'ACTIVE',
            },
            update: {},
        });
        users.push(user);
    }
    console.log(`✅ Found/created ${users.length} contract users\n`);

    // 2. Contracts Dataset
    const contractsDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Contracts' } },
        create: {
            accountId: account.id, name: 'Contracts',
            description: 'End-to-end contract lifecycle records',
            schema: [
                { name: 'Contract Number', slug: 'contract_number', type: 'text', required: true },
                { name: 'Title', slug: 'title', type: 'text', required: true },
                { name: 'Type', slug: 'type', type: 'text', required: true },
                { name: 'Counterparty', slug: 'counterparty_name', type: 'text', required: true },
                { name: 'Value', slug: 'value', type: 'number', required: true },
                { name: 'Currency', slug: 'currency', type: 'text', required: false },
                { name: 'Start Date', slug: 'start_date', type: 'date', required: true },
                { name: 'End Date', slug: 'end_date', type: 'date', required: true },
                { name: 'Auto Renew', slug: 'auto_renew', type: 'boolean', required: false },
                { name: 'Renewal Notice Days', slug: 'renewal_notice_days', type: 'number', required: false },
                { name: 'Status', slug: 'status', type: 'select', required: true },
                { name: 'Stage', slug: 'stage', type: 'text', required: true },
                { name: 'Owner', slug: 'owner', type: 'text', required: true },
                { name: 'Department', slug: 'department', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const contractRecords = [
        { contract_number: 'CNT-2026-00001', title: 'Cloud Infrastructure Services Agreement', type: 'vendor', counterparty_name: 'AWS', value: 850000, currency: 'USD', start_date: '2026-01-01', end_date: '2028-12-31', auto_renew: true, renewal_notice_days: 90, status: 'active', stage: 'active', owner: 'Michael Ross', department: 'Engineering' },
        { contract_number: 'CNT-2026-00002', title: 'Office Space Lease - HQ Building', type: 'lease', counterparty_name: 'Metro Properties LLC', value: 1200000, currency: 'USD', start_date: '2026-01-01', end_date: '2029-12-31', auto_renew: false, renewal_notice_days: 180, status: 'active', stage: 'active', owner: 'Emily Davis', department: 'Operations' },
        { contract_number: 'CNT-2026-00003', title: 'SAP ERP License Agreement', type: 'licensing', counterparty_name: 'SAP SE', value: 425000, currency: 'USD', start_date: '2026-02-01', end_date: '2027-01-31', auto_renew: true, renewal_notice_days: 60, status: 'active', stage: 'active', owner: 'Michael Ross', department: 'IT' },
        { contract_number: 'CNT-2026-00004', title: 'Marketing Agency Retainer', type: 'vendor', counterparty_name: 'Creative Spark Agency', value: 180000, currency: 'USD', start_date: '2026-03-01', end_date: '2027-02-28', auto_renew: true, renewal_notice_days: 30, status: 'approved', stage: 'signature', owner: 'Rachel Green', department: 'Marketing' },
        { contract_number: 'CNT-2026-00005', title: 'Mutual NDA - TechCorp Partnership', type: 'nda', counterparty_name: 'TechCorp Inc.', value: 0, currency: 'USD', start_date: '2026-02-01', end_date: '2028-01-31', auto_renew: false, renewal_notice_days: 0, status: 'active', stage: 'active', owner: 'Sarah Chen', department: 'Legal' },
        { contract_number: 'CNT-2026-00006', title: 'Senior Developer Employment Contract', type: 'employment', counterparty_name: 'Alex Johnson', value: 165000, currency: 'USD', start_date: '2026-02-15', end_date: '2027-02-14', auto_renew: true, renewal_notice_days: 30, status: 'pending_approval', stage: 'review', owner: 'Emily Davis', department: 'Engineering' },
        { contract_number: 'CNT-2026-00007', title: 'Data Analytics Platform License', type: 'licensing', counterparty_name: 'Tableau Software', value: 95000, currency: 'USD', start_date: '2026-04-01', end_date: '2027-03-31', auto_renew: true, renewal_notice_days: 60, status: 'pending_approval', stage: 'review', owner: 'Michael Ross', department: 'IT' },
        { contract_number: 'CNT-2026-00008', title: 'Consulting Services - Digital Transformation', type: 'vendor', counterparty_name: 'Accenture', value: 2500000, currency: 'USD', start_date: '2026-04-01', end_date: '2027-09-30', auto_renew: false, renewal_notice_days: 90, status: 'draft', stage: 'drafting', owner: 'Rachel Green', department: 'Operations' },
        { contract_number: 'CNT-2026-00009', title: 'Partnership Agreement - APAC Distribution', type: 'partnership', counterparty_name: 'Pacific Trade Group', value: 3200000, currency: 'USD', start_date: '2026-06-01', end_date: '2029-05-31', auto_renew: false, renewal_notice_days: 120, status: 'draft', stage: 'drafting', owner: 'Daniel Wright', department: 'Sales' },
        { contract_number: 'CNT-2025-00045', title: 'Cleaning Services Agreement', type: 'vendor', counterparty_name: 'CleanPro Services', value: 48000, currency: 'USD', start_date: '2025-06-01', end_date: '2026-05-31', auto_renew: true, renewal_notice_days: 30, status: 'active', stage: 'active', owner: 'Emily Davis', department: 'Operations' },
        { contract_number: 'CNT-2025-00038', title: 'IT Support Services', type: 'vendor', counterparty_name: 'TechSupport Pro', value: 72000, currency: 'USD', start_date: '2025-04-01', end_date: '2026-03-31', auto_renew: true, renewal_notice_days: 60, status: 'active', stage: 'active', owner: 'Michael Ross', department: 'IT' },
        { contract_number: 'CNT-2025-00022', title: 'Employee Benefits Provider', type: 'vendor', counterparty_name: 'BenefitWorks Inc.', value: 320000, currency: 'USD', start_date: '2025-01-01', end_date: '2025-12-31', auto_renew: false, renewal_notice_days: 90, status: 'expired', stage: 'closed', owner: 'Emily Davis', department: 'HR' },
    ];

    const existingContracts = await prisma.datasetRecord.count({ where: { datasetId: contractsDataset.id } });
    if (existingContracts === 0) {
        for (const c of contractRecords) {
            await prisma.datasetRecord.create({ data: { datasetId: contractsDataset.id, data: c, createdBy: adminUser.id } });
        }
        await prisma.dataset.update({ where: { id: contractsDataset.id }, data: { rowCount: contractRecords.length } });
    }
    console.log(`✅ Contracts dataset: ${contractRecords.length} records\n`);

    // 3. Contract Negotiations Dataset
    const negotiationsDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Contract Negotiations' } },
        create: {
            accountId: account.id, name: 'Contract Negotiations',
            description: 'Negotiation history and change requests for contracts',
            schema: [
                { name: 'Contract Number', slug: 'contract_number', type: 'text', required: true },
                { name: 'Version', slug: 'version', type: 'number', required: true },
                { name: 'Changes Requested', slug: 'changes_requested', type: 'text', required: true },
                { name: 'Requested By', slug: 'requested_by', type: 'text', required: true },
                { name: 'Requested At', slug: 'requested_at', type: 'datetime', required: true },
                { name: 'Responded By', slug: 'responded_by', type: 'text', required: false },
                { name: 'Response', slug: 'response', type: 'text', required: false },
                { name: 'Status', slug: 'status', type: 'select', required: true },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const negotiations = [
        { contract_number: 'CNT-2026-00004', version: 1, changes_requested: 'Reduce monthly retainer from $18k to $15k; add performance bonus clause', requested_by: 'Rachel Green', requested_at: '2026-02-10T09:00:00Z', responded_by: 'Creative Spark Agency', response: 'Counter: $16.5k/month with quarterly performance review', status: 'resolved' },
        { contract_number: 'CNT-2026-00004', version: 2, changes_requested: 'Accept $16.5k; add 30-day termination clause', requested_by: 'Rachel Green', requested_at: '2026-02-14T11:00:00Z', responded_by: 'Creative Spark Agency', response: 'Accepted with 60-day notice instead of 30', status: 'resolved' },
        { contract_number: 'CNT-2026-00008', version: 1, changes_requested: 'Reduce scope phase 1 to $800k; milestone-based payments', requested_by: 'Robert Kim', requested_at: '2026-02-20T14:00:00Z', responded_by: null, response: null, status: 'pending' },
    ];

    const existingNeg = await prisma.datasetRecord.count({ where: { datasetId: negotiationsDataset.id } });
    if (existingNeg === 0) {
        for (const n of negotiations) {
            await prisma.datasetRecord.create({ data: { datasetId: negotiationsDataset.id, data: n, createdBy: adminUser.id } });
        }
        await prisma.dataset.update({ where: { id: negotiationsDataset.id }, data: { rowCount: negotiations.length } });
    }
    console.log(`✅ Negotiations dataset: ${negotiations.length} records\n`);

    // 4. New Contract Request Form
    const contractForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-000000000010' },
        create: {
            id: '00000000-0000-0000-0000-000000000010',
            accountId: account.id,
            name: 'New Contract Request',
            description: 'Submit a new contract request with counterparty details, terms, and approval routing',
            fields: [
                {
                    id: 'field-contract-type', name: 'contractType', type: 'select', label: 'Contract Type',
                    required: true, placeholder: 'Select contract type...',
                    options: [
                        { value: 'vendor', label: 'Vendor/Supplier Agreement' },
                        { value: 'customer', label: 'Customer Agreement' },
                        { value: 'nda', label: 'Non-Disclosure Agreement' },
                        { value: 'employment', label: 'Employment Contract' },
                        { value: 'partnership', label: 'Partnership Agreement' },
                        { value: 'licensing', label: 'Licensing Agreement' },
                        { value: 'lease', label: 'Lease Agreement' },
                    ],
                },
                { id: 'field-title', name: 'title', type: 'text', label: 'Contract Title', required: true, placeholder: 'e.g., Software Development Services Agreement' },
                { id: 'field-counterparty', name: 'counterpartyName', type: 'text', label: 'Counterparty Name', required: true, placeholder: 'Company or individual name' },
                { id: 'field-contact-email', name: 'contactEmail', type: 'text', label: 'Contact Email', required: true },
                { id: 'field-value', name: 'value', type: 'number', label: 'Contract Value ($)', required: true, min: 0 },
                {
                    id: 'field-currency', name: 'currency', type: 'select', label: 'Currency', defaultValue: 'USD',
                    options: [
                        { value: 'USD', label: 'USD - US Dollar' },
                        { value: 'EUR', label: 'EUR - Euro' },
                        { value: 'GBP', label: 'GBP - British Pound' },
                    ],
                },
                {
                    id: 'field-payment-terms', name: 'paymentTerms', type: 'select', label: 'Payment Terms',
                    options: [
                        { value: 'net30', label: 'Net 30' },
                        { value: 'net60', label: 'Net 60' },
                        { value: 'milestone', label: 'Milestone-based' },
                        { value: 'upfront', label: '100% Upfront' },
                    ],
                },
                { id: 'field-start-date', name: 'startDate', type: 'date', label: 'Contract Start Date', required: true },
                { id: 'field-end-date', name: 'endDate', type: 'date', label: 'Contract End Date', required: true },
                { id: 'field-auto-renew', name: 'autoRenew', type: 'checkbox', label: 'Auto-Renewal Enabled' },
                { id: 'field-notice-days', name: 'renewalNoticeDays', type: 'number', label: 'Renewal Notice Days', defaultValue: 90 },
                { id: 'field-scope', name: 'scopeOfWork', type: 'textarea', label: 'Scope of Work / Description', required: true },
                {
                    id: 'field-key-terms', name: 'keyTerms', type: 'repeater', label: 'Key Terms & Conditions',
                    fields: [
                        { name: 'term', type: 'text', label: 'Term' },
                        { name: 'value', type: 'text', label: 'Value/Condition' },
                        { name: 'negotiable', type: 'checkbox', label: 'Negotiable' },
                    ],
                },
                {
                    id: 'field-urgency', name: 'urgency', type: 'radio', label: 'Urgency',
                    options: [
                        { value: 'standard', label: 'Standard (5-7 business days)' },
                        { value: 'expedited', label: 'Expedited (2-3 business days)' },
                        { value: 'urgent', label: 'Urgent (24 hours)' },
                    ],
                },
                { id: 'field-legal-review', name: 'legalReviewRequired', type: 'checkbox', label: 'Legal Review Required', defaultValue: true },
                { id: 'field-notes', name: 'notes', type: 'textarea', label: 'Additional Notes' },
            ],
            layout: {
                sections: [
                    { title: 'Contract Details', fields: ['field-contract-type', 'field-title', 'field-counterparty', 'field-contact-email'] },
                    { title: 'Financial Terms', fields: ['field-value', 'field-currency', 'field-payment-terms'] },
                    { title: 'Duration', fields: ['field-start-date', 'field-end-date', 'field-auto-renew', 'field-notice-days'] },
                    { title: 'Scope & Terms', fields: ['field-scope', 'field-key-terms'] },
                    { title: 'Processing', fields: ['field-urgency', 'field-legal-review', 'field-notes'] },
                ],
            },
            validationRules: [],
            conditionalLogic: [
                { field: 'field-notice-days', condition: 'autoRenew === true', action: 'show' },
            ],
            settings: { submitButtonText: 'Submit Contract Request', showProgressBar: true, allowDraft: true },
            permissions: {}, version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created form: ${contractForm.name} (${contractForm.id})\n`);

    // 5. Contract Approval Form
    const approvalForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-000000000011' },
        create: {
            id: '00000000-0000-0000-0000-000000000011',
            accountId: account.id,
            name: 'Contract Approval',
            description: 'Review and approve/reject contract requests',
            fields: [
                {
                    id: 'field-decision', name: 'decision', type: 'radio', label: 'Decision', required: true,
                    options: [
                        { value: 'approve', label: '✅ Approve' },
                        { value: 'reject', label: '❌ Reject' },
                        { value: 'request_changes', label: '🔄 Request Changes' },
                    ],
                },
                { id: 'field-comments', name: 'comments', type: 'textarea', label: 'Comments', required: false },
                {
                    id: 'field-requested-changes', name: 'requestedChanges', type: 'repeater', label: 'Requested Changes',
                    fields: [
                        { name: 'section', type: 'text', label: 'Section/Clause' },
                        { name: 'currentText', type: 'textarea', label: 'Current Text' },
                        { name: 'requestedText', type: 'textarea', label: 'Requested Change' },
                        { name: 'reason', type: 'text', label: 'Reason' },
                    ],
                },
                { id: 'field-conditions', name: 'conditions', type: 'textarea', label: 'Conditions of Approval' },
            ],
            layout: { sections: [{ title: 'Approval Decision', fields: ['field-decision', 'field-comments', 'field-requested-changes', 'field-conditions'] }] },
            validationRules: [],
            conditionalLogic: [
                { field: 'field-comments', condition: "decision !== 'approve'", action: 'require' },
                { field: 'field-requested-changes', condition: "decision === 'request_changes'", action: 'show' },
                { field: 'field-conditions', condition: "decision === 'approve'", action: 'show' },
            ],
            settings: { submitButtonText: 'Submit Decision', showProgressBar: false, allowDraft: false },
            permissions: {}, version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created form: ${approvalForm.name} (${approvalForm.id})\n`);

    // 6. Contract Lifecycle Workflow
    const contractProcess = await prisma.process.upsert({
        where: { id: '00000000-0000-0000-0000-000000000060' },
        create: {
            id: '00000000-0000-0000-0000-000000000060',
            accountId: account.id,
            name: 'Contract Lifecycle Workflow',
            description: 'End-to-end contract management from request through approval, e-signature, and renewal tracking',
            category: 'Legal & Contracts',
            definition: {
                nodes: [
                    { id: 'start-1', type: 'start', name: 'Contract Request', description: 'New contract request submitted', position: { x: 100, y: 300 }, config: { trigger: 'form_submission', formId: contractForm.id } },
                    { id: 'action-create', type: 'action', name: 'Create Contract Record', description: 'Create record in contracts dataset', position: { x: 350, y: 300 }, config: { action: 'create_record', datasetId: 'contracts' } },
                    { id: 'decision-legal', type: 'decision', name: 'Legal Review Required?', description: 'Check if legal review is needed', position: { x: 600, y: 300 }, config: {}, condition: 'variables.legalReviewRequired === true || variables.value > 100000' },
                    { id: 'task-legal', type: 'approval', name: 'Legal Review', description: 'Legal team reviews contract terms', position: { x: 850, y: 150 }, config: { assignTo: 'role:legal', timeoutDays: 5 } },
                    { id: 'action-generate-doc', type: 'action', name: 'Generate Contract Document', description: 'Generate PDF contract from template', position: { x: 850, y: 450 }, config: { action: 'generate_document', template: 'contract-template' } },
                    { id: 'decision-route', type: 'decision', name: 'Determine Approvers', description: 'Route to approvers based on contract type and value', position: { x: 1100, y: 300 }, config: { decisionTableId: 'contract-approval-matrix' } },
                    { id: 'approval-1', type: 'approval', name: 'Primary Approval', description: 'First-level approval based on contract type/value', position: { x: 1350, y: 200 }, config: { assignTo: 'variables.approver1', timeoutDays: 3 } },
                    { id: 'decision-2nd', type: 'decision', name: 'Second Approver?', description: 'Check if additional approval needed', position: { x: 1600, y: 200 }, config: {}, condition: 'variables.approver2 !== null' },
                    { id: 'approval-2', type: 'approval', name: 'Secondary Approval', description: 'Senior/executive approval for high-value contracts', position: { x: 1850, y: 100 }, config: { assignTo: 'variables.approver2', timeoutDays: 2 } },
                    { id: 'action-signature', type: 'action', name: 'Send for E-Signature', description: 'Send contract to counterparty for digital signature via DocuSign', position: { x: 2100, y: 300 }, config: { connector: 'docusign', operation: 'create-envelope' } },
                    { id: 'wait-signature', type: 'action', name: 'Wait for Signatures', description: 'Wait for all parties to sign', position: { x: 2350, y: 300 }, config: { waitFor: 'webhook', timeout: '30d' } },
                    { id: 'action-finalize', type: 'action', name: 'Finalize Contract', description: 'Update contract status to active', position: { x: 2600, y: 300 }, config: { action: 'update_record', status: 'active' } },
                    { id: 'action-schedule', type: 'action', name: 'Schedule Renewal Reminder', description: 'Set reminder before contract expiry', position: { x: 2850, y: 300 }, config: { action: 'schedule_reminder' } },
                    { id: 'email-notify', type: 'email', name: 'Notify Stakeholders', description: 'Send executed contract to all parties', position: { x: 3100, y: 300 }, config: { template: 'contract-executed' } },
                    { id: 'email-rejected', type: 'email', name: 'Contract Rejected', description: 'Notify requestor of rejection', position: { x: 1600, y: 500 }, config: { template: 'contract-rejected' } },
                    { id: 'end-active', type: 'end', name: 'Contract Active', description: 'Contract fully executed and active', position: { x: 3350, y: 300 }, config: {} },
                    { id: 'end-rejected', type: 'end', name: 'Contract Rejected', description: 'Contract was rejected', position: { x: 1850, y: 500 }, config: {} },
                ],
                edges: [
                    { id: 'e1', source: 'start-1', target: 'action-create', label: '' },
                    { id: 'e2', source: 'action-create', target: 'decision-legal', label: '' },
                    { id: 'e3', source: 'decision-legal', target: 'task-legal', label: 'Yes', condition: 'true' },
                    { id: 'e4', source: 'decision-legal', target: 'action-generate-doc', label: 'No', condition: 'false' },
                    { id: 'e5', source: 'task-legal', target: 'action-generate-doc', label: 'Reviewed' },
                    { id: 'e6', source: 'action-generate-doc', target: 'decision-route', label: '' },
                    { id: 'e7', source: 'decision-route', target: 'approval-1', label: 'Routed' },
                    { id: 'e8', source: 'approval-1', target: 'decision-2nd', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e9', source: 'approval-1', target: 'email-rejected', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e10', source: 'decision-2nd', target: 'approval-2', label: 'Yes', condition: 'variables.approver2 !== null' },
                    { id: 'e11', source: 'decision-2nd', target: 'action-signature', label: 'No', condition: 'variables.approver2 === null' },
                    { id: 'e12', source: 'approval-2', target: 'action-signature', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e13', source: 'approval-2', target: 'email-rejected', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e14', source: 'action-signature', target: 'wait-signature', label: '' },
                    { id: 'e15', source: 'wait-signature', target: 'action-finalize', label: 'Signed' },
                    { id: 'e16', source: 'action-finalize', target: 'action-schedule', label: '' },
                    { id: 'e17', source: 'action-schedule', target: 'email-notify', label: '' },
                    { id: 'e18', source: 'email-notify', target: 'end-active', label: '' },
                    { id: 'e19', source: 'email-rejected', target: 'end-rejected', label: '' },
                ],
            },
            variables: [
                { name: 'contractType', type: 'string', label: 'Contract Type' },
                { name: 'title', type: 'string', label: 'Contract Title' },
                { name: 'counterpartyName', type: 'string', label: 'Counterparty' },
                { name: 'value', type: 'number', label: 'Contract Value' },
                { name: 'currency', type: 'string', label: 'Currency' },
                { name: 'startDate', type: 'date', label: 'Start Date' },
                { name: 'endDate', type: 'date', label: 'End Date' },
                { name: 'autoRenew', type: 'boolean', label: 'Auto Renew' },
                { name: 'legalReviewRequired', type: 'boolean', label: 'Legal Review Required' },
                { name: 'approver1', type: 'string', label: 'Primary Approver' },
                { name: 'approver2', type: 'string', label: 'Secondary Approver' },
                { name: 'contractNumber', type: 'string', label: 'Contract Number' },
                { name: 'status', type: 'string', label: 'Status' },
                { name: 'stage', type: 'string', label: 'Stage' },
            ],
            triggers: [
                { type: 'form_submission', formId: contractForm.id },
                { type: 'manual', label: 'Create Contract' },
            ],
            settings: { allowCancel: true, trackSLA: true, notification: { onStart: true, onComplete: true, onError: true } },
            permissions: {},
            slaConfig: { defaultDueHours: 120, escalationPolicy: 'notify_admin' },
            version: 1, status: 'ACTIVE', publishedAt: new Date(), createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created process: ${contractProcess.name} (${contractProcess.id})\n`);

    // 7. Process Instances
    const instances: any[] = [];

    // CNT-00001: COMPLETED (active contract)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: contractProcess.id, processVersion: 1, status: 'COMPLETED',
            currentNodes: ['end-active'],
            variables: { contractNumber: 'CNT-2026-00001', contractType: 'vendor', title: 'Cloud Infrastructure Services Agreement', counterpartyName: 'AWS', value: 850000, approver1: 'cfo', approver2: 'ceo', status: 'active', stage: 'active' },
            startedBy: users[1].id, completedAt: new Date('2025-12-20T14:00:00Z'),
        },
    }));

    // CNT-00004: RUNNING (awaiting signature)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: contractProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['action-signature'],
            variables: { contractNumber: 'CNT-2026-00004', contractType: 'vendor', title: 'Marketing Agency Retainer', counterpartyName: 'Creative Spark Agency', value: 180000, approver1: 'department_head', approver2: 'legal', status: 'approved', stage: 'signature' },
            startedBy: users[2].id, dueAt: new Date('2026-03-15T17:00:00Z'),
        },
    }));

    // CNT-00006: RUNNING (pending approval - employment)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: contractProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['approval-1'],
            variables: { contractNumber: 'CNT-2026-00006', contractType: 'employment', title: 'Senior Developer Employment Contract', counterpartyName: 'Alex Johnson', value: 165000, approver1: 'hr_director', approver2: null, status: 'pending_approval', stage: 'review' },
            startedBy: users[4].id, dueAt: new Date('2026-02-20T17:00:00Z'),
        },
    }));

    // CNT-00007: RUNNING (pending legal + approval)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: contractProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['task-legal'],
            variables: { contractNumber: 'CNT-2026-00007', contractType: 'licensing', title: 'Data Analytics Platform License', counterpartyName: 'Tableau Software', value: 95000, approver1: 'legal', approver2: 'it_director', status: 'pending_approval', stage: 'review' },
            startedBy: users[1].id, dueAt: new Date('2026-02-25T17:00:00Z'),
        },
    }));

    // CNT-00008: RUNNING (draft - just started)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: contractProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['action-create'],
            variables: { contractNumber: 'CNT-2026-00008', contractType: 'vendor', title: 'Consulting Services - Digital Transformation', counterpartyName: 'Accenture', value: 2500000, status: 'draft', stage: 'drafting' },
            startedBy: users[2].id,
        },
    }));

    console.log(`✅ Created ${instances.length} process instances\n`);

    // 8. Task Instances
    // Legal review for CNT-00007 (PENDING)
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[3].id, nodeId: 'task-legal', name: 'Legal Review: Tableau License - $95,000',
            description: 'Review licensing agreement terms, IP clauses, and data handling provisions',
            taskType: 'APPROVAL', assigneeId: users[0].id, assigneeType: 'USER',
            formData: { contractNumber: 'CNT-2026-00007', counterparty: 'Tableau Software', value: 95000, type: 'licensing' },
            status: 'PENDING', priority: 1, dueAt: new Date('2026-02-18T17:00:00Z'),
        },
    });

    // HR Director approval for CNT-00006 (PENDING)
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[2].id, nodeId: 'approval-1', name: 'Approve Employment Contract: Alex Johnson - $165,000',
            description: 'Review senior developer employment terms, compensation, and benefits',
            taskType: 'APPROVAL', assigneeId: users[4].id, assigneeType: 'USER',
            formData: { contractNumber: 'CNT-2026-00006', counterparty: 'Alex Johnson', value: 165000, type: 'employment' },
            status: 'PENDING', priority: 1, dueAt: new Date('2026-02-20T17:00:00Z'),
        },
    });

    // CFO approval for CNT-00001 (COMPLETED)
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[0].id, nodeId: 'approval-1', name: 'CFO Approval: AWS Cloud Services - $850,000',
            description: 'Review 3-year cloud infrastructure agreement', taskType: 'APPROVAL',
            assigneeId: users[3].id, assigneeType: 'USER',
            formData: { contractNumber: 'CNT-2026-00001', counterparty: 'AWS', value: 850000 },
            status: 'COMPLETED', priority: 0, outcome: 'approved',
            completedAt: new Date('2025-12-15T10:00:00Z'), completedBy: users[3].id,
            comments: 'Approved. Strong vendor, competitive pricing vs. Azure.',
        },
    });

    // CEO approval for CNT-00001 (COMPLETED)
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[0].id, nodeId: 'approval-2', name: 'CEO Approval: AWS Cloud Services - $850,000',
            description: 'Final executive approval for high-value infrastructure contract', taskType: 'APPROVAL',
            assigneeId: users[5].id, assigneeType: 'USER',
            formData: { contractNumber: 'CNT-2026-00001', counterparty: 'AWS', value: 850000 },
            status: 'COMPLETED', priority: 0, outcome: 'approved',
            completedAt: new Date('2025-12-18T14:00:00Z'), completedBy: users[5].id,
            comments: 'Approved. Strategic investment.',
        },
    });

    // Dept head approved CNT-00004 (COMPLETED)
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[1].id, nodeId: 'approval-1', name: 'Approve Marketing Retainer: Creative Spark - $180,000',
            description: 'Department head review of marketing agency agreement', taskType: 'APPROVAL',
            assigneeId: users[4].id, assigneeType: 'USER',
            formData: { contractNumber: 'CNT-2026-00004', counterparty: 'Creative Spark Agency', value: 180000 },
            status: 'COMPLETED', priority: 1, outcome: 'approved',
            completedAt: new Date('2026-02-16T11:00:00Z'), completedBy: users[4].id,
            comments: 'Approved after negotiation on rate.',
        },
    });

    console.log(`✅ Created 5 task instances\n`);

    // 9. Form Submissions
    const formSubmissions = [
        {
            contractType: 'vendor', title: 'Marketing Agency Retainer', counterpartyName: 'Creative Spark Agency',
            contactEmail: 'contracts@creativespark.com', value: 180000, currency: 'USD', paymentTerms: 'net30',
            startDate: '2026-03-01', endDate: '2027-02-28', autoRenew: true, renewalNoticeDays: 30,
            scopeOfWork: 'Full-service digital marketing including social media, content creation, and campaign management',
            urgency: 'standard', legalReviewRequired: true, notes: 'Replacing previous agency contract',
        },
        {
            contractType: 'employment', title: 'Senior Developer Employment Contract', counterpartyName: 'Alex Johnson',
            contactEmail: 'alex.johnson@email.com', value: 165000, currency: 'USD', paymentTerms: 'net30',
            startDate: '2026-02-15', endDate: '2027-02-14', autoRenew: true, renewalNoticeDays: 30,
            scopeOfWork: 'Full-time senior software developer role in the platform engineering team',
            urgency: 'expedited', legalReviewRequired: false, notes: 'Critical hire - offer accepted verbally',
        },
        {
            contractType: 'vendor', title: 'Consulting Services - Digital Transformation', counterpartyName: 'Accenture',
            contactEmail: 'proposals@accenture.com', value: 2500000, currency: 'USD', paymentTerms: 'milestone',
            startDate: '2026-04-01', endDate: '2027-09-30', autoRenew: false, renewalNoticeDays: 90,
            scopeOfWork: 'Enterprise digital transformation program: Phase 1 - Assessment, Phase 2 - Implementation, Phase 3 - Optimization',
            urgency: 'standard', legalReviewRequired: true, notes: 'Board-approved initiative. CFO and CEO must sign off.',
        },
    ];

    for (const s of formSubmissions) {
        await prisma.formSubmission.create({
            data: { formId: contractForm.id, data: s, createdBy: adminUser.id },
        });
    }
    console.log(`✅ Created ${formSubmissions.length} form submissions\n`);

    // 10. App Configuration
    const contractApp = await prisma.app.upsert({
        where: { accountId_slug: { accountId: account.id, slug: 'contracts' } },
        create: {
            accountId: account.id,
            name: 'Contract Management',
            slug: 'contracts',
            description: 'End-to-end contract lifecycle management with negotiation tracking, approvals, and renewal alerts',
            icon: 'FileText',
            definition: {
                type: 'INTERNAL',
                theme: { colors: { primary: '#2563EB', secondary: '#1E40AF' } },
                navigation: [
                    { id: 'nav-dashboard', label: 'Dashboard', icon: 'LayoutDashboard', pageId: 'dashboard' },
                    { id: 'nav-my-contracts', label: 'My Contracts', icon: 'Folder', pageId: 'my-contracts' },
                    { id: 'nav-pending', label: 'Pending Approvals', icon: 'Clock', pageId: 'pending-approvals' },
                    { id: 'nav-expiring', label: 'Expiring Soon', icon: 'AlertTriangle', pageId: 'expiring' },
                    { id: 'nav-divider', type: 'divider' },
                    { id: 'nav-all', label: 'All Contracts', icon: 'List', pageId: 'all-contracts' },
                    { id: 'nav-reports', label: 'Reports', icon: 'BarChart3', pageId: 'reports' },
                ],
                pages: [
                    {
                        id: 'dashboard', name: 'Dashboard', slug: 'dashboard', layout: 'dashboard',
                        components: [
                            { id: 'kpi-total', type: 'kpi-card', position: { x: 0, y: 0, w: 3, h: 2 }, props: { title: 'Total Contracts', icon: 'FileText', color: '#2563EB', value: '12' } },
                            { id: 'kpi-active-value', type: 'kpi-card', position: { x: 3, y: 0, w: 3, h: 2 }, props: { title: 'Active Value', icon: 'DollarSign', color: '#10B981', value: '$3.01M', prefix: '$' } },
                            { id: 'kpi-pending', type: 'kpi-card', position: { x: 6, y: 0, w: 3, h: 2 }, props: { title: 'Pending Approval', icon: 'Clock', color: '#F59E0B', value: '2' } },
                            { id: 'kpi-expiring', type: 'kpi-card', position: { x: 9, y: 0, w: 3, h: 2 }, props: { title: 'Expiring in 90 Days', icon: 'AlertTriangle', color: '#EF4444', value: '1' } },
                            { id: 'chart-status', type: 'pie-chart', position: { x: 0, y: 2, w: 4, h: 4 }, props: { title: 'Contracts by Status', donut: true, data: [{ name: 'Active', value: 7 }, { name: 'Pending', value: 2 }, { name: 'Draft', value: 2 }, { name: 'Expired', value: 1 }] } },
                            { id: 'chart-type', type: 'bar-chart', position: { x: 4, y: 2, w: 4, h: 4 }, props: { title: 'Contracts by Type', data: [{ category: 'Vendor', count: 5 }, { category: 'Licensing', count: 2 }, { category: 'Lease', count: 1 }, { category: 'NDA', count: 1 }, { category: 'Employment', count: 1 }, { category: 'Partnership', count: 1 }] } },
                            { id: 'chart-value', type: 'line-chart', position: { x: 8, y: 2, w: 4, h: 4 }, props: { title: 'Contract Value Trend', showArea: true } },
                            { id: 'recent-table', type: 'table', position: { x: 0, y: 6, w: 12, h: 4 }, props: { title: 'Recent Contracts', columns: [{ field: 'contract_number', header: 'Contract #' }, { field: 'title', header: 'Title' }, { field: 'counterparty_name', header: 'Counterparty' }, { field: 'value', header: 'Value', format: 'currency' }, { field: 'status', header: 'Status' }] } },
                        ],
                    },
                    {
                        id: 'my-contracts', name: 'My Contracts', slug: 'my-contracts', layout: 'single-column',
                        components: [
                            { id: 'header', type: 'heading', position: { x: 0, y: 0, w: 12, h: 1 }, props: { content: 'My Contracts', level: 'h1' } },
                            { id: 'contracts-table', type: 'table', position: { x: 0, y: 1, w: 12, h: 10 }, props: { columns: [{ field: 'contract_number', header: 'Contract #', width: 130 }, { field: 'title', header: 'Title' }, { field: 'counterparty_name', header: 'Counterparty' }, { field: 'type', header: 'Type' }, { field: 'value', header: 'Value', format: 'currency' }, { field: 'end_date', header: 'End Date', format: 'date' }, { field: 'status', header: 'Status' }], pageSize: 20 } },
                        ],
                    },
                    {
                        id: 'pending-approvals', name: 'Pending Approvals', slug: 'pending-approvals', layout: 'single-column',
                        components: [
                            { id: 'header', type: 'heading', position: { x: 0, y: 0, w: 12, h: 1 }, props: { content: 'Contracts Pending My Approval', level: 'h1' } },
                            { id: 'pending-list', type: 'table', position: { x: 0, y: 1, w: 12, h: 10 }, props: { columns: [{ field: 'contract_number', header: 'Contract #' }, { field: 'title', header: 'Title' }, { field: 'counterparty', header: 'Counterparty' }, { field: 'value', header: 'Value', format: 'currency' }, { field: 'type', header: 'Type' }, { field: 'dueAt', header: 'Due', format: 'date' }] } },
                        ],
                    },
                    {
                        id: 'reports', name: 'Reports', slug: 'reports', layout: 'dashboard',
                        components: [
                            { id: 'dept-chart', type: 'bar-chart', position: { x: 0, y: 0, w: 6, h: 4 }, props: { title: 'Contract Value by Department', data: [{ category: 'Engineering', value: 1015000 }, { category: 'Operations', value: 1248000 }, { category: 'IT', value: 520000 }, { category: 'Marketing', value: 180000 }, { category: 'Sales', value: 3200000 }] } },
                            { id: 'vendor-chart', type: 'pie-chart', position: { x: 6, y: 0, w: 6, h: 4 }, props: { title: 'Spend by Counterparty', donut: true, data: [{ name: 'Accenture', value: 2500000 }, { name: 'Metro Properties', value: 1200000 }, { name: 'AWS', value: 850000 }, { name: 'SAP SE', value: 425000 }, { name: 'Others', value: 505000 }] } },
                        ],
                    },
                ],
            },
            settings: {},
            permissions: {},
            status: 'PUBLISHED',
            version: 1,
            publishedAt: new Date(),
            createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created app: ${contractApp.name} (${contractApp.id})\n`);

    // Summary
    console.log('─'.repeat(60));
    console.log('🎉 Contract Lifecycle Management seeding complete!');
    console.log('');
    console.log('Created:');
    console.log('  📋 New Contract Request Form (16 fields)');
    console.log('  📋 Contract Approval Form (4 fields)');
    console.log('  🔄 Contract Lifecycle Workflow (17 nodes, 19 edges)');
    console.log('  📦 Contracts Dataset (12 records)');
    console.log('  📦 Contract Negotiations Dataset (3 records)');
    console.log('  📝 3 Form Submissions');
    console.log('  ⚙️  5 Process Instances (1 completed, 4 running)');
    console.log('  ✅ 5 Task Instances (3 completed, 2 pending)');
    console.log('  📱 Contract Management App (4 pages)');
    console.log('');
    console.log('   ⚡ Decision Table "Contract Approval Matrix" should be seeded in-memory via server startup.\n');
}

seedContractLifecycle()
    .catch((e) => {
        console.error('❌ Contract Lifecycle seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
