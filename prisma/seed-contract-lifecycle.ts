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

    // 2. Reference Datasets (CMS Vendors, Departments, Contract Models)
    const vendorsDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'CMS Vendors' } },
        create: {
            accountId: account.id, name: 'CMS Vendors',
            description: 'Vendor master data for contract management',
            schema: [
                { name: 'Vendor Name', slug: 'vendor_name', type: 'text', required: true },
                { name: 'Vendor Code', slug: 'vendor_code', type: 'text', required: true },
                { name: 'Contact Email', slug: 'contact_email', type: 'text', required: false },
                { name: 'Category', slug: 'category', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const vendorRecords = [
        { vendor_name: 'AWS', vendor_code: 'VND-001', contact_email: 'contracts@aws.amazon.com', category: 'Cloud Services' },
        { vendor_name: 'Metro Properties LLC', vendor_code: 'VND-002', contact_email: 'leasing@metroproperties.com', category: 'Real Estate' },
        { vendor_name: 'SAP SE', vendor_code: 'VND-003', contact_email: 'licensing@sap.com', category: 'Software' },
        { vendor_name: 'Creative Spark Agency', vendor_code: 'VND-004', contact_email: 'contracts@creativespark.com', category: 'Marketing' },
        { vendor_name: 'TechCorp Inc.', vendor_code: 'VND-005', contact_email: 'legal@techcorp.com', category: 'Technology' },
        { vendor_name: 'Tableau Software', vendor_code: 'VND-006', contact_email: 'sales@tableau.com', category: 'Software' },
        { vendor_name: 'Accenture', vendor_code: 'VND-007', contact_email: 'proposals@accenture.com', category: 'Consulting' },
        { vendor_name: 'Pacific Trade Group', vendor_code: 'VND-008', contact_email: 'partnerships@pacifictrade.com', category: 'Distribution' },
        { vendor_name: 'CleanPro Services', vendor_code: 'VND-009', contact_email: 'info@cleanpro.com', category: 'Facilities' },
        { vendor_name: 'TechSupport Pro', vendor_code: 'VND-010', contact_email: 'support@techsupportpro.com', category: 'IT Services' },
        { vendor_name: 'BenefitWorks Inc.', vendor_code: 'VND-011', contact_email: 'hr@benefitworks.com', category: 'HR Services' },
    ];

    const existingVendors = await prisma.datasetRecord.count({ where: { datasetId: vendorsDataset.id } });
    if (existingVendors === 0) {
        for (const v of vendorRecords) {
            await prisma.datasetRecord.create({ data: { datasetId: vendorsDataset.id, data: v, createdBy: adminUser.id } });
        }
        await prisma.dataset.update({ where: { id: vendorsDataset.id }, data: { rowCount: vendorRecords.length } });
    }
    console.log(`✅ CMS Vendors dataset: ${vendorRecords.length} records\n`);

    const departmentsDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'CMS Departments' } },
        create: {
            accountId: account.id, name: 'CMS Departments',
            description: 'Department master data for contract assignments',
            schema: [
                { name: 'Department Name', slug: 'department_name', type: 'text', required: true },
                { name: 'Department Code', slug: 'department_code', type: 'text', required: true },
                { name: 'Head', slug: 'head', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const departmentRecords = [
        { department_name: 'Engineering', department_code: 'DEPT-ENG', head: 'Emily Davis' },
        { department_name: 'Operations', department_code: 'DEPT-OPS', head: 'Emily Davis' },
        { department_name: 'IT', department_code: 'DEPT-IT', head: 'Michael Ross' },
        { department_name: 'Marketing', department_code: 'DEPT-MKT', head: 'Rachel Green' },
        { department_name: 'Legal', department_code: 'DEPT-LEG', head: 'Sarah Chen' },
        { department_name: 'HR', department_code: 'DEPT-HR', head: 'Emily Davis' },
        { department_name: 'Sales', department_code: 'DEPT-SAL', head: 'Daniel Wright' },
        { department_name: 'Finance', department_code: 'DEPT-FIN', head: 'Robert Kim' },
    ];

    const existingDepts = await prisma.datasetRecord.count({ where: { datasetId: departmentsDataset.id } });
    if (existingDepts === 0) {
        for (const d of departmentRecords) {
            await prisma.datasetRecord.create({ data: { datasetId: departmentsDataset.id, data: d, createdBy: adminUser.id } });
        }
        await prisma.dataset.update({ where: { id: departmentsDataset.id }, data: { rowCount: departmentRecords.length } });
    }
    console.log(`✅ CMS Departments dataset: ${departmentRecords.length} records\n`);

    const contractModelsDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'CMS Contract Models' } },
        create: {
            accountId: account.id, name: 'CMS Contract Models',
            description: 'Contract model templates and categories',
            schema: [
                { name: 'Model Name', slug: 'model_name', type: 'text', required: true },
                { name: 'Model Code', slug: 'model_code', type: 'text', required: true },
                { name: 'Description', slug: 'description', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const contractModelRecords = [
        { model_name: 'Standard Vendor Agreement', model_code: 'CM-SVA', description: 'For vendor/supplier contracts' },
        { model_name: 'Software License', model_code: 'CM-SWL', description: 'For software licensing agreements' },
        { model_name: 'Service Level Agreement', model_code: 'CM-SLA', description: 'For service-level commitments' },
        { model_name: 'Non-Disclosure Agreement', model_code: 'CM-NDA', description: 'For confidentiality agreements' },
        { model_name: 'Employment Contract', model_code: 'CM-EMP', description: 'For employment terms' },
        { model_name: 'Lease Agreement', model_code: 'CM-LEA', description: 'For property and equipment leases' },
        { model_name: 'Partnership Agreement', model_code: 'CM-PAR', description: 'For strategic partnerships' },
    ];

    const existingModels = await prisma.datasetRecord.count({ where: { datasetId: contractModelsDataset.id } });
    if (existingModels === 0) {
        for (const m of contractModelRecords) {
            await prisma.datasetRecord.create({ data: { datasetId: contractModelsDataset.id, data: m, createdBy: adminUser.id } });
        }
        await prisma.dataset.update({ where: { id: contractModelsDataset.id }, data: { rowCount: contractModelRecords.length } });
    }
    console.log(`✅ CMS Contract Models dataset: ${contractModelRecords.length} records\n`);

    // 3. Contracts Dataset (expanded schema aligned with data matrix)
    const contractsDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Contracts' } },
        create: {
            accountId: account.id, name: 'Contracts',
            description: 'End-to-end contract lifecycle records with full state management',
            schema: [
                // Core identification
                { name: 'Contract Number', slug: 'contract_number', type: 'text', required: true },
                { name: 'Title', slug: 'title', type: 'text', required: true },
                { name: 'Short Description', slug: 'short_description', type: 'text', required: false },
                { name: 'Description', slug: 'description', type: 'textarea', required: false },
                // Vendor & department (lookups)
                { name: 'Vendor', slug: 'vendor_text', type: 'text', required: false, lookup: { source: 'CMS Vendors', field: 'vendor_name' } },
                { name: 'Department', slug: 'department_text', type: 'text', required: false, lookup: { source: 'CMS Departments', field: 'department_name' } },
                { name: 'Contract Model', slug: 'contract_model_text', type: 'text', required: false, lookup: { source: 'CMS Contract Models', field: 'model_name' } },
                { name: 'Counterparty', slug: 'counterparty_name', type: 'text', required: true },
                { name: 'Contracting Party', slug: 'contracting_party', type: 'text', required: false },
                { name: 'Nature of Contract', slug: 'nature_of_contract', type: 'select', required: false },
                // Dates
                { name: 'Signing Date', slug: 'signing_date', type: 'date', required: false },
                { name: 'Starts Effective Date', slug: 'starts_effective_date', type: 'date', required: true },
                { name: 'Ends Expiration Date', slug: 'ends_expiration_date', type: 'date', required: true },
                // Financial
                { name: 'Payment Terms', slug: 'payment_terms', type: 'text', required: false },
                { name: 'Payment Schedule', slug: 'payment_schedule', type: 'select', required: false },
                { name: 'Payment Amount', slug: 'payment_amount', type: 'number', required: false },
                { name: 'Tax Exempt', slug: 'tax_exempt', type: 'boolean', required: false },
                { name: 'Commercial Tax', slug: 'commercial_tax', type: 'number', required: false },
                { name: 'Commercial Tax Amount', slug: 'commercial_tax_amount', type: 'number', required: false },
                { name: 'Withholding Tax', slug: 'withholding_tax', type: 'number', required: false },
                { name: 'Withholding Tax Amount', slug: 'withholding_tax_amount', type: 'number', required: false },
                { name: 'Total Cost', slug: 'total_cost', type: 'number', required: false },
                { name: 'Cost Adjustment Type', slug: 'cost_adjustment_type', type: 'select', required: false },
                { name: 'Cost Adjustment Amount', slug: 'cost_adjustment_amount', type: 'number', required: false },
                { name: 'Cost Adjustment Percentage', slug: 'cost_adjustment_percentage', type: 'number', required: false },
                // State management (dual-state model from workflow)
                { name: 'State', slug: 'state', type: 'select', required: true },
                { name: 'Substate', slug: 'substate', type: 'select', required: false },
                { name: 'Current Step', slug: 'current_step', type: 'text', required: false },
                { name: 'Approving', slug: 'approving', type: 'select', required: false },
                { name: 'Approver State', slug: 'approver_state', type: 'select', required: false },
                // Renewal / Extension
                { name: 'Extend Btn', slug: 'extend_btn', type: 'boolean', required: false },
                { name: 'Renew Btn', slug: 'renew_btn', type: 'boolean', required: false },
                { name: 'Cancel Contract Btn', slug: 'cancel_contract_btn', type: 'boolean', required: false },
                { name: 'Extension Option', slug: 'extension_option', type: 'text', required: false },
                { name: 'Extension End Date', slug: 'extension_end_date', type: 'date', required: false },
                { name: 'Renewal Date', slug: 'renewal_date', type: 'date', required: false },
                { name: 'Renewal End Date', slug: 'renewal_end_date', type: 'date', required: false },
                { name: 'Renewal Extension Section', slug: 'renewal_extension_section', type: 'boolean', required: false },
                { name: 'Financial Section', slug: 'financial_section', type: 'boolean', required: false },
                // Approval
                { name: 'Approver Group', slug: 'approver_group', type: 'text', required: false },
                { name: 'Approver 1', slug: 'approver_1', type: 'text', required: false },
                { name: 'Comments', slug: 'comments', type: 'textarea', required: false },
                { name: 'Cancellation Reason', slug: 'cancellation_reason', type: 'textarea', required: false },
                // User context
                { name: 'Login User', slug: 'login_user', type: 'text', required: false },
                { name: 'Login User Email', slug: 'login_user_email', type: 'text', required: false },
                { name: 'Contract Attachment', slug: 'contract_attachment', type: 'text', required: false },
                { name: 'Work Notes', slug: 'work_notes', type: 'textarea', required: false },
                { name: 'Owner', slug: 'owner', type: 'text', required: true },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const contractRecords = [
        {
            contract_number: 'CNT-2026-00001', title: 'Cloud Infrastructure Services Agreement',
            counterparty_name: 'AWS', vendor_text: 'AWS', department_text: 'Engineering', contract_model_text: 'Standard Vendor Agreement',
            nature_of_contract: 'Recurring', signing_date: '2025-12-20', starts_effective_date: '2026-01-01', ends_expiration_date: '2028-12-31',
            payment_terms: 'Net 30', payment_schedule: 'Monthly', payment_amount: 23611, tax_exempt: false,
            commercial_tax: 5, commercial_tax_amount: 1180.55, withholding_tax: 2, withholding_tax_amount: 472.22, total_cost: 850000,
            state: 'Active', substate: 'None', current_step: 'Active', approving: 'Approve', approver_state: 'Approved',
            extend_btn: false, renew_btn: false, cancel_contract_btn: false, renewal_extension_section: true, financial_section: true,
            approver_group: 'Finance Approvers', approver_1: 'Robert Kim', owner: 'Michael Ross',
            login_user: 'michael.ross@demo.com', login_user_email: 'michael.ross@demo.com',
        },
        {
            contract_number: 'CNT-2026-00002', title: 'Office Space Lease - HQ Building',
            counterparty_name: 'Metro Properties LLC', vendor_text: 'Metro Properties LLC', department_text: 'Operations', contract_model_text: 'Lease Agreement',
            nature_of_contract: 'Fixed Term', signing_date: '2025-12-15', starts_effective_date: '2026-01-01', ends_expiration_date: '2029-12-31',
            payment_terms: 'Net 30', payment_schedule: 'Monthly', payment_amount: 33333, tax_exempt: true,
            total_cost: 1200000,
            state: 'Active', substate: 'None', current_step: 'Active', approver_state: 'Approved',
            extend_btn: false, renew_btn: false, cancel_contract_btn: false, renewal_extension_section: false, financial_section: true,
            approver_group: 'Executive Approvers', approver_1: 'Daniel Wright', owner: 'Emily Davis',
        },
        {
            contract_number: 'CNT-2026-00003', title: 'SAP ERP License Agreement',
            counterparty_name: 'SAP SE', vendor_text: 'SAP SE', department_text: 'IT', contract_model_text: 'Software License',
            nature_of_contract: 'Recurring', signing_date: '2026-01-25', starts_effective_date: '2026-02-01', ends_expiration_date: '2027-01-31',
            payment_terms: 'Net 60', payment_schedule: 'Annually', payment_amount: 425000, tax_exempt: false,
            commercial_tax: 5, commercial_tax_amount: 21250, withholding_tax: 2, withholding_tax_amount: 8500, total_cost: 425000,
            state: 'Active', substate: 'None', current_step: 'Active', approver_state: 'Approved',
            extend_btn: true, renew_btn: true, cancel_contract_btn: false, renewal_extension_section: true, financial_section: true,
            approver_group: 'IT Approvers', approver_1: 'Robert Kim', owner: 'Michael Ross',
        },
        {
            contract_number: 'CNT-2026-00004', title: 'Marketing Agency Retainer',
            counterparty_name: 'Creative Spark Agency', vendor_text: 'Creative Spark Agency', department_text: 'Marketing', contract_model_text: 'Standard Vendor Agreement',
            nature_of_contract: 'Recurring', starts_effective_date: '2026-03-01', ends_expiration_date: '2027-02-28',
            payment_terms: 'Net 30', payment_schedule: 'Monthly', payment_amount: 15000, tax_exempt: false,
            commercial_tax: 5, commercial_tax_amount: 750, total_cost: 180000,
            state: 'Active', substate: 'Approved', current_step: 'Active Step', approving: 'Approve', approver_state: 'Approved',
            extend_btn: false, renew_btn: false, cancel_contract_btn: false, financial_section: true,
            approver_group: 'Department Approvers', approver_1: 'Emily Davis', owner: 'Rachel Green',
        },
        {
            contract_number: 'CNT-2026-00005', title: 'Mutual NDA - TechCorp Partnership',
            counterparty_name: 'TechCorp Inc.', vendor_text: 'TechCorp Inc.', department_text: 'Legal', contract_model_text: 'Non-Disclosure Agreement',
            nature_of_contract: 'Fixed Term', signing_date: '2026-01-28', starts_effective_date: '2026-02-01', ends_expiration_date: '2028-01-31',
            payment_amount: 0, tax_exempt: true, total_cost: 0,
            state: 'Active', substate: 'None', current_step: 'Active',
            extend_btn: false, renew_btn: false, cancel_contract_btn: false, financial_section: false,
            owner: 'Sarah Chen',
        },
        {
            contract_number: 'CNT-2026-00006', title: 'Senior Developer Employment Contract',
            counterparty_name: 'Alex Johnson', department_text: 'Engineering', contract_model_text: 'Employment Contract',
            nature_of_contract: 'Fixed Term', starts_effective_date: '2026-02-15', ends_expiration_date: '2027-02-14',
            payment_terms: 'Monthly salary', payment_schedule: 'Monthly', payment_amount: 13750, total_cost: 165000,
            state: 'Draft', substate: 'Under Review', current_step: 'Submit For Review', approver_state: 'Requested',
            extend_btn: false, renew_btn: false, cancel_contract_btn: false, financial_section: true,
            approver_group: 'HR Approvers', approver_1: 'Emily Davis', owner: 'Emily Davis',
        },
        {
            contract_number: 'CNT-2026-00007', title: 'Data Analytics Platform License',
            counterparty_name: 'Tableau Software', vendor_text: 'Tableau Software', department_text: 'IT', contract_model_text: 'Software License',
            nature_of_contract: 'Recurring', starts_effective_date: '2026-04-01', ends_expiration_date: '2027-03-31',
            payment_terms: 'Net 60', payment_schedule: 'Annually', payment_amount: 95000, tax_exempt: false,
            commercial_tax: 5, commercial_tax_amount: 4750, total_cost: 95000,
            state: 'Draft', substate: 'Under Review', current_step: 'Submit For Review', approver_state: 'Requested',
            extend_btn: false, renew_btn: false, cancel_contract_btn: false, financial_section: true,
            approver_group: 'IT Approvers', approver_1: 'Sarah Chen', owner: 'Michael Ross',
        },
        {
            contract_number: 'CNT-2026-00008', title: 'Consulting Services - Digital Transformation',
            counterparty_name: 'Accenture', vendor_text: 'Accenture', department_text: 'Operations', contract_model_text: 'Standard Vendor Agreement',
            nature_of_contract: 'Project-based', starts_effective_date: '2026-04-01', ends_expiration_date: '2027-09-30',
            payment_terms: 'Milestone', payment_schedule: 'Milestone', payment_amount: 2500000, total_cost: 2500000,
            state: 'Draft', substate: 'None', current_step: 'Draft',
            extend_btn: false, renew_btn: false, cancel_contract_btn: false, financial_section: true,
            owner: 'Rachel Green',
        },
        {
            contract_number: 'CNT-2026-00009', title: 'Partnership Agreement - APAC Distribution',
            counterparty_name: 'Pacific Trade Group', vendor_text: 'Pacific Trade Group', department_text: 'Sales', contract_model_text: 'Partnership Agreement',
            nature_of_contract: 'Fixed Term', starts_effective_date: '2026-06-01', ends_expiration_date: '2029-05-31',
            payment_amount: 3200000, total_cost: 3200000,
            state: 'Draft', substate: 'None', current_step: 'Initiate',
            extend_btn: false, renew_btn: false, cancel_contract_btn: false, financial_section: true,
            owner: 'Daniel Wright',
        },
        {
            contract_number: 'CNT-2025-00045', title: 'Cleaning Services Agreement',
            counterparty_name: 'CleanPro Services', vendor_text: 'CleanPro Services', department_text: 'Operations', contract_model_text: 'Standard Vendor Agreement',
            nature_of_contract: 'Recurring', signing_date: '2025-05-20', starts_effective_date: '2025-06-01', ends_expiration_date: '2026-05-31',
            payment_terms: 'Net 30', payment_schedule: 'Monthly', payment_amount: 4000, total_cost: 48000,
            state: 'Active', substate: 'None', current_step: 'Active', approver_state: 'Approved',
            extend_btn: true, renew_btn: true, cancel_contract_btn: false, renewal_extension_section: true, financial_section: true,
            owner: 'Emily Davis',
        },
        {
            contract_number: 'CNT-2025-00038', title: 'IT Support Services',
            counterparty_name: 'TechSupport Pro', vendor_text: 'TechSupport Pro', department_text: 'IT', contract_model_text: 'Service Level Agreement',
            nature_of_contract: 'Recurring', signing_date: '2025-03-25', starts_effective_date: '2025-04-01', ends_expiration_date: '2026-03-31',
            payment_terms: 'Net 30', payment_schedule: 'Monthly', payment_amount: 6000, total_cost: 72000,
            state: 'Active', substate: 'Extend', current_step: 'Extend',
            extend_btn: true, renew_btn: false, cancel_contract_btn: false,
            extension_option: '6 months', extension_end_date: '2026-09-30',
            renewal_extension_section: true, financial_section: true,
            owner: 'Michael Ross',
        },
        {
            contract_number: 'CNT-2025-00022', title: 'Employee Benefits Provider',
            counterparty_name: 'BenefitWorks Inc.', vendor_text: 'BenefitWorks Inc.', department_text: 'HR', contract_model_text: 'Standard Vendor Agreement',
            nature_of_contract: 'Fixed Term', signing_date: '2024-12-10', starts_effective_date: '2025-01-01', ends_expiration_date: '2025-12-31',
            payment_terms: 'Net 30', payment_schedule: 'Monthly', payment_amount: 26667, total_cost: 320000,
            state: 'Expired', substate: 'None', current_step: 'Done',
            extend_btn: false, renew_btn: false, cancel_contract_btn: false, financial_section: true,
            owner: 'Emily Davis',
        },
    ];

    const existingContracts = await prisma.datasetRecord.count({ where: { datasetId: contractsDataset.id } });
    if (existingContracts === 0) {
        for (const c of contractRecords) {
            await prisma.datasetRecord.create({ data: { datasetId: contractsDataset.id, data: c, createdBy: adminUser.id } });
        }
        await prisma.dataset.update({ where: { id: contractsDataset.id }, data: { rowCount: contractRecords.length } });
    }
    console.log(`✅ Contracts dataset: ${contractRecords.length} records\n`);

    // 4. Purchase Orders Dataset
    const purchaseOrdersDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Purchase Orders' } },
        create: {
            accountId: account.id, name: 'Purchase Orders',
            description: 'Purchase orders linked to contracts',
            schema: [
                { name: 'PO Number', slug: 'po_number', type: 'text', required: true },
                { name: 'Contract Number', slug: 'contract_number', type: 'text', required: true },
                { name: 'Vendor', slug: 'vendor', type: 'text', required: true },
                { name: 'Description', slug: 'description', type: 'text', required: true },
                { name: 'Quantity', slug: 'quantity', type: 'number', required: false },
                { name: 'Unit Price', slug: 'unit_price', type: 'number', required: false },
                { name: 'Total Amount', slug: 'total_amount', type: 'number', required: true },
                { name: 'Status', slug: 'status', type: 'select', required: true },
                { name: 'Requested Date', slug: 'requested_date', type: 'date', required: true },
                { name: 'Approved Date', slug: 'approved_date', type: 'date', required: false },
                { name: 'PO Approver', slug: 'po_approver', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const poRecords = [
        { po_number: 'PO-2026-001', contract_number: 'CNT-2026-00001', vendor: 'AWS', description: 'Quarterly cloud compute reservation', quantity: 1, unit_price: 212500, total_amount: 212500, status: 'Approved', requested_date: '2026-01-05', approved_date: '2026-01-08', po_approver: 'Robert Kim' },
        { po_number: 'PO-2026-002', contract_number: 'CNT-2026-00001', vendor: 'AWS', description: 'Data storage tier upgrade', quantity: 1, unit_price: 45000, total_amount: 45000, status: 'Approved', requested_date: '2026-02-01', approved_date: '2026-02-03', po_approver: 'Robert Kim' },
        { po_number: 'PO-2026-003', contract_number: 'CNT-2026-00003', vendor: 'SAP SE', description: 'Annual ERP license renewal', quantity: 250, unit_price: 1700, total_amount: 425000, status: 'Approved', requested_date: '2026-01-20', approved_date: '2026-01-25', po_approver: 'Robert Kim' },
        { po_number: 'PO-2026-004', contract_number: 'CNT-2025-00038', vendor: 'TechSupport Pro', description: 'Monthly IT support - February', quantity: 1, unit_price: 6000, total_amount: 6000, status: 'Approved', requested_date: '2026-02-01', approved_date: '2026-02-01', po_approver: 'Michael Ross' },
        { po_number: 'PO-2026-005', contract_number: 'CNT-2026-00004', vendor: 'Creative Spark Agency', description: 'Q1 marketing campaign deliverables', quantity: 1, unit_price: 49500, total_amount: 49500, status: 'Pending', requested_date: '2026-02-20', po_approver: 'Rachel Green' },
    ];

    const existingPOs = await prisma.datasetRecord.count({ where: { datasetId: purchaseOrdersDataset.id } });
    if (existingPOs === 0) {
        for (const po of poRecords) {
            await prisma.datasetRecord.create({ data: { datasetId: purchaseOrdersDataset.id, data: po, createdBy: adminUser.id } });
        }
        await prisma.dataset.update({ where: { id: purchaseOrdersDataset.id }, data: { rowCount: poRecords.length } });
    }
    console.log(`✅ Purchase Orders dataset: ${poRecords.length} records\n`);

    // 5. Note History Dataset
    const noteHistoryDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Contract Note History' } },
        create: {
            accountId: account.id, name: 'Contract Note History',
            description: 'Audit trail of notes and comments on contracts',
            schema: [
                { name: 'Contract Number', slug: 'contract_number', type: 'text', required: true },
                { name: 'Note', slug: 'note', type: 'textarea', required: true },
                { name: 'Created By', slug: 'created_by', type: 'text', required: true },
                { name: 'Created At', slug: 'created_at', type: 'datetime', required: true },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const noteRecords = [
        { contract_number: 'CNT-2026-00001', note: 'Contract initiated and submitted for CFO review.', created_by: 'Michael Ross', created_at: '2025-12-10T09:00:00Z' },
        { contract_number: 'CNT-2026-00001', note: 'CFO approved. Forwarded to CEO for final sign-off.', created_by: 'Robert Kim', created_at: '2025-12-15T10:00:00Z' },
        { contract_number: 'CNT-2026-00001', note: 'CEO approved. Contract executed and active.', created_by: 'Daniel Wright', created_at: '2025-12-18T14:00:00Z' },
        { contract_number: 'CNT-2026-00004', note: 'Negotiation round 1: Counter-offer received at $16.5k/month.', created_by: 'Rachel Green', created_at: '2026-02-10T09:30:00Z' },
        { contract_number: 'CNT-2026-00004', note: 'Negotiation round 2: Agreed on 60-day notice period.', created_by: 'Rachel Green', created_at: '2026-02-14T11:30:00Z' },
        { contract_number: 'CNT-2026-00004', note: 'Department head approved. Proceeding to signature.', created_by: 'Emily Davis', created_at: '2026-02-16T11:00:00Z' },
        { contract_number: 'CNT-2026-00006', note: 'Employment contract submitted for HR director review.', created_by: 'Emily Davis', created_at: '2026-02-15T14:00:00Z' },
        { contract_number: 'CNT-2026-00007', note: 'Submitted to legal for review of IP and data handling clauses.', created_by: 'Michael Ross', created_at: '2026-02-12T10:00:00Z' },
        { contract_number: 'CNT-2025-00038', note: 'Contract nearing expiration. Extension requested for 6 months.', created_by: 'Michael Ross', created_at: '2026-02-18T09:00:00Z' },
        { contract_number: 'CNT-2025-00022', note: 'Contract expired. No renewal requested.', created_by: 'Emily Davis', created_at: '2025-12-31T17:00:00Z' },
    ];

    const existingNotes = await prisma.datasetRecord.count({ where: { datasetId: noteHistoryDataset.id } });
    if (existingNotes === 0) {
        for (const n of noteRecords) {
            await prisma.datasetRecord.create({ data: { datasetId: noteHistoryDataset.id, data: n, createdBy: adminUser.id } });
        }
        await prisma.dataset.update({ where: { id: noteHistoryDataset.id }, data: { rowCount: noteRecords.length } });
    }
    console.log(`✅ Note History dataset: ${noteRecords.length} records\n`);

    // 6. Contract Negotiations Dataset
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

    // 7. New Contract Request Form (aligned with data matrix)
    const contractForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-000000000010' },
        create: {
            id: '00000000-0000-0000-0000-000000000010',
            accountId: account.id,
            name: 'New Contract Request',
            description: 'Submit a new contract request with vendor, financial, and approval details',
            fields: [
                // Contract Details
                { id: 'field-title', name: 'title', type: 'text', label: 'Contract Title', required: true },
                { id: 'field-counterparty', name: 'counterpartyName', type: 'text', label: 'Counterparty Name', required: true },
                { id: 'field-vendor', name: 'vendorText', type: 'lookup', label: 'Vendor', lookup: { source: 'CMS Vendors', field: 'vendor_name' } },
                { id: 'field-department', name: 'departmentText', type: 'lookup', label: 'Department', lookup: { source: 'CMS Departments', field: 'department_name' } },
                { id: 'field-contract-model', name: 'contractModelText', type: 'lookup', label: 'Contract Model', lookup: { source: 'CMS Contract Models', field: 'model_name' } },
                { id: 'field-contracting-party', name: 'contractingParty', type: 'text', label: 'Contracting Party' },
                {
                    id: 'field-nature', name: 'natureOfContract', type: 'select', label: 'Nature of Contract',
                    options: [
                        { value: 'Recurring', label: 'Recurring' },
                        { value: 'Fixed Term', label: 'Fixed Term' },
                        { value: 'Project-based', label: 'Project-based' },
                    ],
                },
                { id: 'field-description', name: 'description', type: 'textarea', label: 'Scope of Work / Description', required: true },
                // Dates
                { id: 'field-signing-date', name: 'signingDate', type: 'date', label: 'Signing Date' },
                { id: 'field-start-date', name: 'startsEffectiveDate', type: 'date', label: 'Effective Start Date', required: true },
                { id: 'field-end-date', name: 'endsExpirationDate', type: 'date', label: 'Expiration Date', required: true },
                // Financial
                {
                    id: 'field-payment-terms', name: 'paymentTerms', type: 'select', label: 'Payment Terms',
                    options: [
                        { value: 'Net 30', label: 'Net 30' },
                        { value: 'Net 60', label: 'Net 60' },
                        { value: 'Milestone', label: 'Milestone-based' },
                        { value: 'Monthly salary', label: 'Monthly Salary' },
                    ],
                },
                {
                    id: 'field-payment-schedule', name: 'paymentSchedule', type: 'select', label: 'Payment Schedule',
                    options: [
                        { value: 'Monthly', label: 'Monthly' },
                        { value: 'Quarterly', label: 'Quarterly' },
                        { value: 'Annually', label: 'Annually' },
                        { value: 'Milestone', label: 'Milestone' },
                    ],
                },
                { id: 'field-payment-amount', name: 'paymentAmount', type: 'number', label: 'Payment Amount', required: true, min: 0 },
                { id: 'field-total-cost', name: 'totalCost', type: 'number', label: 'Total Contract Cost', min: 0 },
                { id: 'field-tax-exempt', name: 'taxExempt', type: 'checkbox', label: 'Tax Exempt' },
                { id: 'field-commercial-tax', name: 'commercialTax', type: 'number', label: 'Commercial Tax (%)', min: 0 },
                { id: 'field-withholding-tax', name: 'withholdingTax', type: 'number', label: 'Withholding Tax (%)', min: 0 },
                {
                    id: 'field-cost-adj-type', name: 'costAdjustmentType', type: 'select', label: 'Cost Adjustment Type',
                    options: [
                        { value: 'None', label: 'None' },
                        { value: 'Fixed', label: 'Fixed Amount' },
                        { value: 'Percentage', label: 'Percentage' },
                    ],
                },
                { id: 'field-cost-adj-amount', name: 'costAdjustmentAmount', type: 'number', label: 'Cost Adjustment Amount' },
                { id: 'field-cost-adj-pct', name: 'costAdjustmentPercentage', type: 'number', label: 'Cost Adjustment %' },
                // Approval & Processing
                { id: 'field-approver-group', name: 'approverGroup', type: 'text', label: 'Approver Group' },
                { id: 'field-approver-1', name: 'approver1', type: 'text', label: 'Approver' },
                { id: 'field-attachment', name: 'contractAttachment', type: 'file', label: 'Contract Attachment' },
                { id: 'field-notes', name: 'workNotes', type: 'textarea', label: 'Work Notes' },
            ],
            layout: {
                sections: [
                    { title: 'Contract Details', fields: ['field-title', 'field-counterparty', 'field-vendor', 'field-department', 'field-contract-model', 'field-contracting-party', 'field-nature', 'field-description'] },
                    { title: 'Contract Dates', fields: ['field-signing-date', 'field-start-date', 'field-end-date'] },
                    { title: 'Financial Terms', fields: ['field-payment-terms', 'field-payment-schedule', 'field-payment-amount', 'field-total-cost'] },
                    { title: 'Tax Information', fields: ['field-tax-exempt', 'field-commercial-tax', 'field-withholding-tax'] },
                    { title: 'Cost Adjustments', fields: ['field-cost-adj-type', 'field-cost-adj-amount', 'field-cost-adj-pct'] },
                    { title: 'Approval & Notes', fields: ['field-approver-group', 'field-approver-1', 'field-attachment', 'field-notes'] },
                ],
            },
            validationRules: [],
            conditionalLogic: [
                { field: 'field-commercial-tax', condition: 'taxExempt === false', action: 'show' },
                { field: 'field-withholding-tax', condition: 'taxExempt === false', action: 'show' },
                { field: 'field-cost-adj-amount', condition: "costAdjustmentType === 'Fixed'", action: 'show' },
                { field: 'field-cost-adj-pct', condition: "costAdjustmentType === 'Percentage'", action: 'show' },
            ],
            settings: { submitButtonText: 'Submit Contract Request', showProgressBar: true, allowDraft: true },
            permissions: {}, version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created form: ${contractForm.name} (${contractForm.id})\n`);

    // 8. Contract Approval Form (matches data matrix Approving field)
    const approvalForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-000000000011' },
        create: {
            id: '00000000-0000-0000-0000-000000000011',
            accountId: account.id,
            name: 'Contract Approval',
            description: 'Review and approve/reject contract requests with state transition support',
            fields: [
                {
                    id: 'field-approving', name: 'approving', type: 'select', label: 'Decision', required: true,
                    options: [
                        { value: 'Approve', label: '✅ Approve' },
                        { value: 'Reject', label: '❌ Reject' },
                    ],
                },
                { id: 'field-comments', name: 'comments', type: 'textarea', label: 'Comments', required: false },
                { id: 'field-cancellation-reason', name: 'cancellationReason', type: 'textarea', label: 'Rejection / Cancellation Reason' },
                {
                    id: 'field-select-option', name: 'selectOptionApproved', type: 'select', label: 'Next Action',
                    options: [
                        { value: 'Extend', label: 'Extend Contract' },
                        { value: 'Renew', label: 'Renew Contract' },
                        { value: 'Cancel', label: 'Cancel Contract' },
                        { value: 'None', label: 'No Action (keep active)' },
                    ],
                },
                { id: 'field-conditions', name: 'conditions', type: 'textarea', label: 'Conditions of Approval' },
            ],
            layout: { sections: [{ title: 'Approval Decision', fields: ['field-approving', 'field-comments', 'field-cancellation-reason', 'field-select-option', 'field-conditions'] }] },
            validationRules: [],
            conditionalLogic: [
                { field: 'field-cancellation-reason', condition: "approving === 'Reject'", action: 'require' },
                { field: 'field-select-option', condition: "approving === 'Approve'", action: 'show' },
                { field: 'field-conditions', condition: "approving === 'Approve'", action: 'show' },
            ],
            settings: { submitButtonText: 'Submit Decision', showProgressBar: false, allowDraft: false },
            permissions: {}, version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created form: ${approvalForm.name} (${approvalForm.id})\n`);

    // 9. Contract Lifecycle Workflow (aligned with documented state machine)
    const contractProcess = await prisma.process.upsert({
        where: { id: '00000000-0000-0000-0000-000000000060' },
        create: {
            id: '00000000-0000-0000-0000-000000000060',
            accountId: account.id,
            name: 'Contract Lifecycle Workflow',
            description: 'Full contract state machine: Start → Initiate → Draft → Submit For Review → Approved/Rejected → Active → Active Step → Extend/Renew/Cancel → Done → Completed',
            category: 'Legal & Contracts',
            definition: {
                nodes: [
                    // Phase 1: Contract Creation
                    { id: 'start', type: 'start', name: 'Start', description: 'New contract request triggered', position: { x: 50, y: 300 }, config: { trigger: 'form_submission', formId: contractForm.id } },
                    { id: 'initiate', type: 'userTask', name: 'Initiate', description: 'Initial contract data entry and vendor/department assignment', position: { x: 250, y: 300 }, config: { formId: contractForm.id }, expressions: ['Generated_Contract_Number="aaaaaaaaa1111"'] },
                    { id: 'draft', type: 'userTask', name: 'Draft', description: 'Prepare contract terms, financial details, and attachments', position: { x: 450, y: 300 }, config: { formId: contractForm.id } },
                    // Phase 2: Review & Approval
                    { id: 'decision-submit-type', type: 'decision', name: 'Review Path', description: 'Route to review or direct submission', position: { x: 650, y: 300 }, config: {} },
                    { id: 'submit-for-review', type: 'userTask', name: 'Submit For Review', description: 'Contract under formal review by approver group', position: { x: 900, y: 200 }, config: { formId: approvalForm.id } },
                    { id: 'submit-without-review', type: 'action', name: 'Submit Without Review', description: 'Direct submission bypassing formal review', position: { x: 900, y: 400 }, config: {} },
                    { id: 'decision-approval', type: 'decision', name: 'Approval Decision', description: 'Check approving field value', position: { x: 1150, y: 200 }, config: {}, condition: 'Approving === "Approve"' },
                    { id: 'approved', type: 'action', name: 'Approved', description: 'Contract approved, transition to active', position: { x: 1400, y: 150 }, config: { action: 'update_state', state: 'Active', substate: 'Approved', current_step: 'Active' } },
                    { id: 'rejected', type: 'action', name: 'Rejected', description: 'Contract rejected, return to draft or terminate', position: { x: 1400, y: 350 }, config: { action: 'update_state', state: 'Rejected', current_step: 'Rejected' } },
                    // Phase 3: Active Contract Management
                    { id: 'active', type: 'action', name: 'Active', description: 'Contract is active and executing', position: { x: 1650, y: 150 }, config: { action: 'update_state', state: 'Active', current_step: 'Active' } },
                    { id: 'active-step', type: 'userTask', name: 'Active Step', description: 'Monitor active contract, decide on extension/renewal/cancellation', position: { x: 1900, y: 150 }, config: {} },
                    // Phase 4: Extension / Renewal / Cancellation (parallel paths from Active Step)
                    { id: 'decision-action', type: 'decision', name: 'Action Decision', description: 'Determine next action: Extend, Renew, or Cancel', position: { x: 2150, y: 150 }, config: {} },
                    { id: 'extend', type: 'userTask', name: 'Extend', description: 'Process contract extension with new end date', position: { x: 2400, y: 50 }, config: { action: 'update_state', state: 'Active', substate: 'Extend', current_step: 'Extend' } },
                    { id: 'renew', type: 'userTask', name: 'Renew', description: 'Process contract renewal with new terms', position: { x: 2400, y: 150 }, config: { action: 'update_state', state: 'Active', substate: 'Renew', current_step: 'Renew' } },
                    { id: 'cancel', type: 'userTask', name: 'Cancel', description: 'Process contract cancellation with reason', position: { x: 2400, y: 250 }, config: { action: 'update_state', state: 'Active', substate: 'Cancel', current_step: 'Cancel' } },
                    // Phase 5: Completion
                    { id: 'done', type: 'action', name: 'Done', description: 'Contract lifecycle complete (expired, cancelled, or fully executed)', position: { x: 2650, y: 150 }, config: { action: 'update_state', state: 'Expired', current_step: 'Done' } },
                    { id: 'completed', type: 'end', name: 'Completed', description: 'Contract fully archived', position: { x: 2900, y: 150 }, config: {} },
                ],
                edges: [
                    // Creation flow
                    { id: 'e-start-initiate', source: 'start', target: 'initiate', label: '' },
                    { id: 'e-initiate-draft', source: 'initiate', target: 'draft', label: 'Contract initiated' },
                    { id: 'e-draft-decision', source: 'draft', target: 'decision-submit-type', label: 'Draft complete' },
                    // Review routing
                    { id: 'e-to-review', source: 'decision-submit-type', target: 'submit-for-review', label: 'Requires review', condition: 'Select_Option_Draft === "Submit For Review"' },
                    { id: 'e-skip-review', source: 'decision-submit-type', target: 'submit-without-review', label: 'No review needed', condition: 'Select_Option_Draft === "Submit Without Review"' },
                    // Approval routing
                    { id: 'e-review-decision', source: 'submit-for-review', target: 'decision-approval', label: '' },
                    { id: 'e-direct-approved', source: 'submit-without-review', target: 'approved', label: '' },
                    { id: 'e-approve', source: 'decision-approval', target: 'approved', label: 'Approved', condition: 'Approving === "Approve"' },
                    { id: 'e-reject', source: 'decision-approval', target: 'rejected', label: 'Rejected', condition: 'Approving === "Reject"' },
                    // Rejected → back to Submit For Review (GotoTask loop)
                    { id: 'e-reject-loop', source: 'rejected', target: 'submit-for-review', label: 'Resubmit for review' },
                    // Active contract management
                    { id: 'e-approved-active', source: 'approved', target: 'active', label: '' },
                    { id: 'e-active-step', source: 'active', target: 'active-step', label: '' },
                    { id: 'e-step-decision', source: 'active-step', target: 'decision-action', label: '' },
                    // Extension / Renewal / Cancellation paths
                    { id: 'e-to-extend', source: 'decision-action', target: 'extend', label: 'Extend', condition: 'Extend_Btn === true' },
                    { id: 'e-to-renew', source: 'decision-action', target: 'renew', label: 'Renew', condition: 'Renew_Btn === true' },
                    { id: 'e-to-cancel', source: 'decision-action', target: 'cancel', label: 'Cancel', condition: 'Cancel_Contract_Btn === true' },
                    { id: 'e-to-done-direct', source: 'decision-action', target: 'done', label: 'No action (expires)', condition: 'Extend_Btn === false && Renew_Btn === false && Cancel_Contract_Btn === false' },
                    // All paths converge to Done
                    { id: 'e-extend-done', source: 'extend', target: 'done', label: 'Extension processed' },
                    { id: 'e-renew-done', source: 'renew', target: 'done', label: 'Renewal processed' },
                    { id: 'e-cancel-done', source: 'cancel', target: 'done', label: 'Cancellation processed' },
                    // Completion
                    { id: 'e-done-completed', source: 'done', target: 'completed', label: '' },
                ],
            },
            variables: [
                { name: 'contractNumber', type: 'string', label: 'Contract Number' },
                { name: 'title', type: 'string', label: 'Contract Title' },
                { name: 'counterpartyName', type: 'string', label: 'Counterparty' },
                { name: 'vendorText', type: 'string', label: 'Vendor' },
                { name: 'departmentText', type: 'string', label: 'Department' },
                { name: 'contractModelText', type: 'string', label: 'Contract Model' },
                { name: 'paymentAmount', type: 'number', label: 'Payment Amount' },
                { name: 'totalCost', type: 'number', label: 'Total Cost' },
                { name: 'startsEffectiveDate', type: 'date', label: 'Effective Start Date' },
                { name: 'endsExpirationDate', type: 'date', label: 'Expiration Date' },
                { name: 'state', type: 'string', label: 'State' },
                { name: 'substate', type: 'string', label: 'Substate' },
                { name: 'currentStep', type: 'string', label: 'Current Step' },
                { name: 'approving', type: 'string', label: 'Approving Decision' },
                { name: 'approverState', type: 'string', label: 'Approver State' },
                { name: 'extendBtn', type: 'boolean', label: 'Extend Button' },
                { name: 'renewBtn', type: 'boolean', label: 'Renew Button' },
                { name: 'cancelContractBtn', type: 'boolean', label: 'Cancel Contract Button' },
                { name: 'selectOptionDraft', type: 'string', label: 'Submit Option (Draft)' },
                { name: 'selectOptionApproved', type: 'string', label: 'Next Action (Approved)' },
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

    // 10. Process Instances (aligned with new workflow node IDs)
    const instances: any[] = [];

    // CNT-00001: COMPLETED (fully active contract that went through full lifecycle)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: contractProcess.id, processVersion: 1, status: 'COMPLETED',
            currentNodes: ['completed'],
            variables: { contractNumber: 'CNT-2026-00001', title: 'Cloud Infrastructure Services Agreement', counterpartyName: 'AWS', vendorText: 'AWS', departmentText: 'Engineering', totalCost: 850000, state: 'Active', substate: 'None', currentStep: 'Active', approving: 'Approve', approverState: 'Approved' },
            startedBy: users[1].id, completedAt: new Date('2025-12-20T14:00:00Z'),
        },
    }));

    // CNT-00004: RUNNING (active, at Active Step — monitoring)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: contractProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['active-step'],
            variables: { contractNumber: 'CNT-2026-00004', title: 'Marketing Agency Retainer', counterpartyName: 'Creative Spark Agency', vendorText: 'Creative Spark Agency', departmentText: 'Marketing', totalCost: 180000, state: 'Active', substate: 'Approved', currentStep: 'Active Step', approving: 'Approve', approverState: 'Approved' },
            startedBy: users[2].id, dueAt: new Date('2026-03-15T17:00:00Z'),
        },
    }));

    // CNT-00006: RUNNING (pending approval — at Submit For Review)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: contractProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['submit-for-review'],
            variables: { contractNumber: 'CNT-2026-00006', title: 'Senior Developer Employment Contract', counterpartyName: 'Alex Johnson', departmentText: 'Engineering', totalCost: 165000, state: 'Draft', substate: 'Under Review', currentStep: 'Submit For Review', approverState: 'Requested' },
            startedBy: users[4].id, dueAt: new Date('2026-02-20T17:00:00Z'),
        },
    }));

    // CNT-00007: RUNNING (pending approval — at Submit For Review)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: contractProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['submit-for-review'],
            variables: { contractNumber: 'CNT-2026-00007', title: 'Data Analytics Platform License', counterpartyName: 'Tableau Software', vendorText: 'Tableau Software', departmentText: 'IT', totalCost: 95000, state: 'Draft', substate: 'Under Review', currentStep: 'Submit For Review', approverState: 'Requested' },
            startedBy: users[1].id, dueAt: new Date('2026-02-25T17:00:00Z'),
        },
    }));

    // CNT-00008: RUNNING (draft — at Draft stage)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: contractProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['draft'],
            variables: { contractNumber: 'CNT-2026-00008', title: 'Consulting Services - Digital Transformation', counterpartyName: 'Accenture', vendorText: 'Accenture', departmentText: 'Operations', totalCost: 2500000, state: 'Draft', substate: 'None', currentStep: 'Draft' },
            startedBy: users[2].id,
        },
    }));

    // CNT-00038: RUNNING (active, extension in progress — at Extend node)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: contractProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['extend'],
            variables: { contractNumber: 'CNT-2025-00038', title: 'IT Support Services', counterpartyName: 'TechSupport Pro', vendorText: 'TechSupport Pro', departmentText: 'IT', totalCost: 72000, state: 'Active', substate: 'Extend', currentStep: 'Extend', extendBtn: true },
            startedBy: users[1].id, dueAt: new Date('2026-03-31T17:00:00Z'),
        },
    }));

    console.log(`✅ Created ${instances.length} process instances\n`);

    // 11. Task Instances
    // Review for CNT-00007 (PENDING — at Submit For Review)
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[3].id, nodeId: 'submit-for-review', name: 'Review Contract: Tableau License - $95,000',
            description: 'Review licensing agreement terms, IP clauses, and data handling provisions',
            taskType: 'APPROVAL', assigneeId: users[0].id, assigneeType: 'USER',
            formData: { contractNumber: 'CNT-2026-00007', counterparty: 'Tableau Software', totalCost: 95000, state: 'Draft', substate: 'Under Review' },
            status: 'PENDING', priority: 1, dueAt: new Date('2026-02-18T17:00:00Z'),
        },
    });

    // Review for CNT-00006 (PENDING — at Submit For Review)
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[2].id, nodeId: 'submit-for-review', name: 'Review Employment Contract: Alex Johnson - $165,000',
            description: 'Review senior developer employment terms, compensation, and benefits',
            taskType: 'APPROVAL', assigneeId: users[4].id, assigneeType: 'USER',
            formData: { contractNumber: 'CNT-2026-00006', counterparty: 'Alex Johnson', totalCost: 165000, state: 'Draft', substate: 'Under Review' },
            status: 'PENDING', priority: 1, dueAt: new Date('2026-02-20T17:00:00Z'),
        },
    });

    // Approval for CNT-00001 (COMPLETED — went through decision-approval)
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[0].id, nodeId: 'decision-approval', name: 'Approval: AWS Cloud Services - $850,000',
            description: 'Review 3-year cloud infrastructure agreement', taskType: 'APPROVAL',
            assigneeId: users[3].id, assigneeType: 'USER',
            formData: { contractNumber: 'CNT-2026-00001', counterparty: 'AWS', totalCost: 850000, approving: 'Approve' },
            status: 'COMPLETED', priority: 0, outcome: 'approved',
            completedAt: new Date('2025-12-15T10:00:00Z'), completedBy: users[3].id,
            comments: 'Approved. Strong vendor, competitive pricing vs. Azure.',
        },
    });

    // Approval for CNT-00004 (COMPLETED — went through decision-approval)
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[1].id, nodeId: 'decision-approval', name: 'Approval: Marketing Retainer - $180,000',
            description: 'Department head review of marketing agency agreement', taskType: 'APPROVAL',
            assigneeId: users[4].id, assigneeType: 'USER',
            formData: { contractNumber: 'CNT-2026-00004', counterparty: 'Creative Spark Agency', totalCost: 180000, approving: 'Approve' },
            status: 'COMPLETED', priority: 1, outcome: 'approved',
            completedAt: new Date('2026-02-16T11:00:00Z'), completedBy: users[4].id,
            comments: 'Approved after negotiation on rate.',
        },
    });

    // Extension task for CNT-00038 (PENDING — at Extend node)
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[5].id, nodeId: 'extend', name: 'Process Extension: IT Support Services - $72,000',
            description: 'Review and process contract extension with updated end date',
            taskType: 'TASK', assigneeId: users[1].id, assigneeType: 'USER',
            formData: { contractNumber: 'CNT-2025-00038', counterparty: 'TechSupport Pro', totalCost: 72000, state: 'Active', substate: 'Extend' },
            status: 'PENDING', priority: 1, dueAt: new Date('2026-03-31T17:00:00Z'),
        },
    });

    console.log(`✅ Created 5 task instances\n`);

    // 12. Form Submissions (aligned with new form field names)
    const formSubmissions = [
        {
            title: 'Marketing Agency Retainer', counterpartyName: 'Creative Spark Agency',
            vendorText: 'Creative Spark Agency', departmentText: 'Marketing', natureOfContract: 'Recurring',
            description: 'Full-service digital marketing including social media, content creation, and campaign management',
            startsEffectiveDate: '2026-03-01', endsExpirationDate: '2027-02-28',
            paymentTerms: 'Net 30', paymentSchedule: 'Monthly', paymentAmount: 15000, totalCost: 180000,
            taxExempt: false, commercialTax: 5, withholdingTax: 0, costAdjustmentType: 'None',
            approverGroup: 'department_heads', approver1: 'department_head',
            workNotes: 'Replacing previous agency contract',
        },
        {
            title: 'Senior Developer Employment Contract', counterpartyName: 'Alex Johnson',
            departmentText: 'Engineering', natureOfContract: 'Fixed Term',
            description: 'Full-time senior software developer role in the platform engineering team',
            startsEffectiveDate: '2026-02-15', endsExpirationDate: '2027-02-14',
            paymentTerms: 'Monthly salary', paymentSchedule: 'Monthly', paymentAmount: 13750, totalCost: 165000,
            taxExempt: false, commercialTax: 0, withholdingTax: 10, costAdjustmentType: 'None',
            approverGroup: 'hr_directors', approver1: 'hr_director',
            workNotes: 'Critical hire - offer accepted verbally',
        },
        {
            title: 'Consulting Services - Digital Transformation', counterpartyName: 'Accenture',
            vendorText: 'Accenture', departmentText: 'Operations', natureOfContract: 'Project-based',
            description: 'Enterprise digital transformation program: Phase 1 - Assessment, Phase 2 - Implementation, Phase 3 - Optimization',
            startsEffectiveDate: '2026-04-01', endsExpirationDate: '2027-09-30',
            paymentTerms: 'Milestone', paymentSchedule: 'Milestone', paymentAmount: 500000, totalCost: 2500000,
            taxExempt: false, commercialTax: 5, withholdingTax: 2, costAdjustmentType: 'None',
            approverGroup: 'executive', approver1: 'cfo',
            workNotes: 'Board-approved initiative. CFO and CEO must sign off.',
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
    console.log('  📋 New Contract Request Form (26 fields, 6 sections)');
    console.log('  📋 Contract Approval Form (5 fields, state transitions)');
    console.log('  🔄 Contract Lifecycle Workflow (18 nodes, 22 edges) — full state machine');
    console.log('  📦 Contracts Dataset (12 records, ~45 fields)');
    console.log('  📦 Purchase Orders Dataset (schema)');
    console.log('  📦 Note History Dataset (schema)');
    console.log('  📦 Contract Negotiations Dataset (3 records)');
    console.log('  📦 CMS Vendors / Departments / Contract Models (reference datasets)');
    console.log('  📝 3 Form Submissions');
    console.log('  ⚙️  6 Process Instances (1 completed, 5 running)');
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
