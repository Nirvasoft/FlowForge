/**
 * Purchase Order Seed Script
 * Creates: PO Form, Workflow, Datasets (Vendors + Catalog), Decision Table, Sample Data
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedPurchaseOrder() {
    console.log('\n📦 Seeding Purchase Order Flow...\n');

    // 1. Get or create account & admin user
    const account = await prisma.account.findFirst({ where: { slug: 'demo' } });
    if (!account) throw new Error('Demo account not found. Run main seed first.');

    const adminUser = await prisma.user.findFirst({ where: { accountId: account.id, email: 'admin@demo.com' } });
    if (!adminUser) throw new Error('Admin user not found. Run main seed first.');

    // Ensure PO users exist
    const poUserData = [
        { firstName: 'David', lastName: 'Park', email: 'david.park@demo.com', role: 'Procurement Manager' },
        { firstName: 'Lisa', lastName: 'Wang', email: 'lisa.wang@demo.com', role: 'Finance Controller' },
        { firstName: 'Tom', lastName: 'Harris', email: 'tom.harris@demo.com', role: 'Engineering Lead' },
        { firstName: 'Nina', lastName: 'Patel', email: 'nina.patel@demo.com', role: 'Operations Manager' },
        { firstName: 'James', lastName: 'Miller', email: 'james.miller@demo.com', role: 'VP Operations' },
    ];

    const poUsers = [];
    for (const u of poUserData) {
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
        poUsers.push(user);
    }
    console.log(`✅ Found/created ${poUsers.length} users\n`);

    // 2. Vendors Dataset
    const vendorsDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Vendors' } },
        create: {
            accountId: account.id, name: 'Vendors',
            description: 'Approved vendor directory',
            schema: [
                { name: 'Vendor ID', slug: 'vendor_id', type: 'text', required: true },
                { name: 'Name', slug: 'name', type: 'text', required: true },
                { name: 'Email', slug: 'email', type: 'text', required: true },
                { name: 'Category', slug: 'category', type: 'text', required: false },
                { name: 'Rating', slug: 'rating', type: 'number', required: false },
                { name: 'Status', slug: 'status', type: 'select', required: true },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const vendors = [
        { vendor_id: 'VEND-001', name: 'Office Depot', email: 'orders@officedepot.com', category: 'Office Supplies', rating: 4.5, status: 'Active' },
        { vendor_id: 'VEND-002', name: 'Dell Technologies', email: 'enterprise@dell.com', category: 'IT Hardware', rating: 4.8, status: 'Active' },
        { vendor_id: 'VEND-003', name: 'AWS', email: 'billing@aws.amazon.com', category: 'Cloud Services', rating: 4.9, status: 'Active' },
        { vendor_id: 'VEND-004', name: 'Staples', email: 'business@staples.com', category: 'Office Supplies', rating: 4.2, status: 'Active' },
        { vendor_id: 'VEND-005', name: 'CDW', email: 'orders@cdw.com', category: 'IT Hardware', rating: 4.6, status: 'Active' },
    ];
    const existingVendors = await prisma.datasetRecord.count({ where: { datasetId: vendorsDataset.id } });
    if (existingVendors === 0) {
        for (const v of vendors) {
            await prisma.datasetRecord.create({ data: { datasetId: vendorsDataset.id, data: v, createdBy: adminUser.id } });
        }
        await prisma.dataset.update({ where: { id: vendorsDataset.id }, data: { rowCount: vendors.length } });
    }
    console.log(`✅ Vendors dataset: ${vendors.length} records\n`);

    // 3. Product Catalog Dataset
    const catalogDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Product Catalog' } },
        create: {
            accountId: account.id, name: 'Product Catalog',
            description: 'Internal product/item catalog for purchasing',
            schema: [
                { name: 'Item Code', slug: 'item_code', type: 'text', required: true },
                { name: 'Description', slug: 'description', type: 'text', required: true },
                { name: 'Category', slug: 'category', type: 'text', required: true },
                { name: 'Unit Price', slug: 'unit_price', type: 'number', required: true },
                { name: 'Unit', slug: 'unit', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const catalogItems = [
        { item_code: 'ITEM-1001', description: '27" Monitor - Dell UltraSharp', category: 'IT Hardware', unit_price: 450.00, unit: 'each' },
        { item_code: 'ITEM-1002', description: 'Laptop - Dell Latitude 7440', category: 'IT Hardware', unit_price: 1450.00, unit: 'each' },
        { item_code: 'ITEM-2001', description: 'Standing Desk - Electric', category: 'Furniture', unit_price: 680.00, unit: 'each' },
        { item_code: 'ITEM-2002', description: 'Mechanical Keyboard', category: 'Peripherals', unit_price: 120.00, unit: 'each' },
        { item_code: 'ITEM-3003', description: 'USB-C Hub', category: 'Peripherals', unit_price: 65.00, unit: 'each' },
        { item_code: 'ITEM-4001', description: 'A4 Printer Paper (Box)', category: 'Office Supplies', unit_price: 35.00, unit: 'box' },
        { item_code: 'ITEM-5001', description: 'AWS Reserved Instance - m5.xlarge', category: 'Cloud Services', unit_price: 8500.00, unit: 'annual' },
    ];
    const existingCatalog = await prisma.datasetRecord.count({ where: { datasetId: catalogDataset.id } });
    if (existingCatalog === 0) {
        for (const item of catalogItems) {
            await prisma.datasetRecord.create({ data: { datasetId: catalogDataset.id, data: item, createdBy: adminUser.id } });
        }
        await prisma.dataset.update({ where: { id: catalogDataset.id }, data: { rowCount: catalogItems.length } });
    }
    console.log(`✅ Product Catalog dataset: ${catalogItems.length} records\n`);

    // 4. Purchase Order Request Form
    const poForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-000000000003' },
        create: {
            id: '00000000-0000-0000-0000-000000000003',
            accountId: account.id,
            name: 'Purchase Order Request',
            description: 'Submit a purchase order for goods or services with vendor selection, line items, and approval routing',
            fields: [
                {
                    id: 'field-vendor', name: 'vendor', type: 'lookup', label: 'Vendor',
                    required: true, placeholder: 'Select vendor...',
                    datasetId: 'vendors', displayField: 'name', valueField: 'vendor_id',
                },
                {
                    id: 'field-department', name: 'department', type: 'select', label: 'Department',
                    required: true, placeholder: 'Select department...',
                    options: [
                        { value: 'engineering', label: 'Engineering' },
                        { value: 'marketing', label: 'Marketing' },
                        { value: 'operations', label: 'Operations' },
                        { value: 'hr', label: 'Human Resources' },
                    ],
                },
                {
                    id: 'field-urgency', name: 'urgency', type: 'radio', label: 'Urgency',
                    required: true,
                    options: [
                        { value: 'normal', label: 'Normal (5-7 days)' },
                        { value: 'urgent', label: 'Urgent (2-3 days)' },
                        { value: 'critical', label: 'Critical (Next day)' },
                    ],
                },
                {
                    id: 'field-line-items', name: 'lineItems', type: 'repeater', label: 'Items',
                    required: true, minItems: 1,
                    fields: [
                        { name: 'itemCode', type: 'lookup', label: 'Item', datasetId: 'catalog', displayField: 'description', valueField: 'item_code', required: true },
                        { name: 'description', type: 'text', label: 'Description' },
                        { name: 'quantity', type: 'number', label: 'Qty', required: true, min: 1 },
                        { name: 'unitPrice', type: 'number', label: 'Unit Price', required: true },
                        { name: 'lineTotal', type: 'number', label: 'Total', computed: 'quantity * unitPrice', readonly: true },
                    ],
                },
                {
                    id: 'field-subtotal', name: 'subtotal', type: 'number', label: 'Subtotal',
                    computed: 'SUM(lineItems.lineTotal)', readonly: true,
                },
                {
                    id: 'field-tax-rate', name: 'taxRate', type: 'number', label: 'Tax Rate (%)',
                    defaultValue: 8.5,
                },
                {
                    id: 'field-tax-amount', name: 'taxAmount', type: 'number', label: 'Tax',
                    computed: 'subtotal * (taxRate / 100)', readonly: true,
                },
                {
                    id: 'field-total', name: 'total', type: 'number', label: 'Total',
                    computed: 'subtotal + taxAmount', readonly: true,
                },
                {
                    id: 'field-delivery-address', name: 'deliveryAddress', type: 'textarea', label: 'Delivery Address',
                    required: true, placeholder: 'Enter delivery address...',
                },
                {
                    id: 'field-required-by', name: 'requiredByDate', type: 'date', label: 'Required By',
                    validation: { minDate: 'today' },
                },
                {
                    id: 'field-notes', name: 'notes', type: 'textarea', label: 'Special Instructions',
                    placeholder: 'Any special delivery or handling instructions...',
                },
            ],
            layout: {
                sections: [
                    { title: 'Order Details', fields: ['field-vendor', 'field-department', 'field-urgency'] },
                    { title: 'Line Items', fields: ['field-line-items'] },
                    { title: 'Totals', fields: ['field-subtotal', 'field-tax-rate', 'field-tax-amount', 'field-total'] },
                    { title: 'Delivery', fields: ['field-delivery-address', 'field-required-by', 'field-notes'] },
                ],
            },
            validationRules: [
                { field: 'subtotal', rule: 'min', value: 0.01, message: 'Order must have at least one item' },
            ],
            conditionalLogic: [],
            settings: { submitButtonText: 'Submit Purchase Order', showProgressBar: false, allowDraft: true },
            permissions: {}, version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created form: ${poForm.name} (${poForm.id})\n`);

    // 5. Purchase Order Workflow
    const poProcess = await prisma.process.upsert({
        where: { id: '00000000-0000-0000-0000-000000000030' },
        create: {
            id: '00000000-0000-0000-0000-000000000030',
            accountId: account.id,
            name: 'Purchase Order Workflow',
            description: 'PO submission, budget validation, multi-level approval, ERP integration, and vendor notification',
            category: 'Procurement',
            definition: {
                nodes: [
                    { id: 'start-1', type: 'start', name: 'Submit PO', description: 'Employee submits a purchase order request', position: { x: 100, y: 300 }, config: { trigger: 'form_submission', formId: poForm.id } },
                    { id: 'action-validate', type: 'action', name: 'Validate Order', description: 'Validate line items, vendor status, and totals', position: { x: 350, y: 300 }, config: { action: 'validate', rules: [{ check: 'vendor_active', message: 'Vendor must be active' }, { check: 'items_valid', message: 'All items must have valid codes and prices' }] } },
                    { id: 'action-budget', type: 'action', name: 'Budget Check', description: 'Check department budget availability via ERP', position: { x: 600, y: 300 }, config: { connector: 'erp-system', operation: 'check-budget', inputs: { department: '{{trigger.department}}', amount: '{{trigger.total}}' } } },
                    { id: 'decision-budget', type: 'decision', name: 'Budget Available?', description: 'Check if department has sufficient budget', position: { x: 850, y: 300 }, config: {}, condition: 'variables.budgetAvailable === true' },
                    { id: 'decision-route', type: 'decision', name: 'Route Approval', description: 'Route to appropriate approvers based on amount and department', position: { x: 1100, y: 300 }, config: { decisionTableId: 'po-approval-matrix', inputs: { department: 'variables.department', amount: 'variables.total', urgency: 'variables.urgency' } } },
                    { id: 'approval-1', type: 'approval', name: 'Primary Approval', description: 'First-level approver reviews the purchase order', position: { x: 1350, y: 200 }, config: { assignTo: 'variables.approver1', approvalType: 'single', timeoutDays: 3 } },
                    { id: 'decision-approver2', type: 'decision', name: 'Second Approver?', description: 'Check if a second approver is required', position: { x: 1600, y: 200 }, config: {}, condition: 'variables.approver2 !== null' },
                    { id: 'approval-2', type: 'approval', name: 'Secondary Approval', description: 'Second-level approver reviews (finance/CFO/board)', position: { x: 1850, y: 100 }, config: { assignTo: 'variables.approver2', approvalType: 'single', timeoutDays: 2 } },
                    { id: 'action-create-po', type: 'action', name: 'Create PO in ERP', description: 'Create official purchase order in the ERP system', position: { x: 2100, y: 300 }, config: { connector: 'erp-system', operation: 'create-purchase-order', inputs: { vendorId: '{{trigger.vendor}}', lineItems: '{{trigger.lineItems}}', total: '{{trigger.total}}' } } },
                    { id: 'email-vendor', type: 'email', name: 'Send to Vendor', description: 'Email the PO to the vendor', position: { x: 2350, y: 300 }, config: { to: '{{lookup("vendors", trigger.vendor).email}}', subject: 'Purchase Order #{{variables.poNumber}}', template: 'po-to-vendor' } },
                    { id: 'email-requester', type: 'email', name: 'Notify Requester', description: 'Notify the requester of PO status', position: { x: 2600, y: 300 }, config: { to: '{{initiator.email}}', subject: 'PO {{variables.status}} - {{variables.poNumber}}', template: 'po-status' } },
                    { id: 'email-budget-fail', type: 'email', name: 'Budget Exceeded Notice', description: 'Notify requester that budget is insufficient', position: { x: 850, y: 500 }, config: { to: '{{initiator.email}}', subject: 'PO Rejected - Insufficient Budget', template: 'po-budget-fail' } },
                    { id: 'email-rejected', type: 'email', name: 'PO Rejected', description: 'Notify requester that PO was rejected by approver', position: { x: 1600, y: 500 }, config: { to: '{{initiator.email}}', subject: 'PO Rejected by Approver', template: 'po-rejected' } },
                    { id: 'end-approved', type: 'end', name: 'PO Sent', description: 'Purchase order approved and sent to vendor', position: { x: 2850, y: 300 }, config: {} },
                    { id: 'end-rejected', type: 'end', name: 'PO Rejected', description: 'Purchase order rejected', position: { x: 1600, y: 650 }, config: {} },
                ],
                edges: [
                    { id: 'e1', source: 'start-1', target: 'action-validate', label: '' },
                    { id: 'e2', source: 'action-validate', target: 'action-budget', label: 'Valid' },
                    { id: 'e3', source: 'action-budget', target: 'decision-budget', label: '' },
                    { id: 'e4', source: 'decision-budget', target: 'decision-route', label: 'Budget OK', condition: 'variables.budgetAvailable === true' },
                    { id: 'e5', source: 'decision-budget', target: 'email-budget-fail', label: 'Over budget', condition: 'variables.budgetAvailable === false' },
                    { id: 'e6', source: 'decision-route', target: 'approval-1', label: 'Routed' },
                    { id: 'e7', source: 'approval-1', target: 'decision-approver2', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e8', source: 'approval-1', target: 'email-rejected', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e9', source: 'decision-approver2', target: 'approval-2', label: 'Yes', condition: 'variables.approver2 !== null' },
                    { id: 'e10', source: 'decision-approver2', target: 'action-create-po', label: 'No second approver', condition: 'variables.approver2 === null' },
                    { id: 'e11', source: 'approval-2', target: 'action-create-po', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e12', source: 'approval-2', target: 'email-rejected', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e13', source: 'action-create-po', target: 'email-vendor', label: '' },
                    { id: 'e14', source: 'email-vendor', target: 'email-requester', label: '' },
                    { id: 'e15', source: 'email-requester', target: 'end-approved', label: '' },
                    { id: 'e16', source: 'email-budget-fail', target: 'end-rejected', label: '' },
                    { id: 'e17', source: 'email-rejected', target: 'end-rejected', label: '' },
                ],
            },
            variables: [
                { name: 'vendor', type: 'string', label: 'Vendor ID' },
                { name: 'vendorName', type: 'string', label: 'Vendor Name' },
                { name: 'department', type: 'string', label: 'Department' },
                { name: 'urgency', type: 'string', label: 'Urgency' },
                { name: 'lineItems', type: 'array', label: 'Line Items' },
                { name: 'subtotal', type: 'number', label: 'Subtotal' },
                { name: 'taxRate', type: 'number', label: 'Tax Rate' },
                { name: 'taxAmount', type: 'number', label: 'Tax Amount' },
                { name: 'total', type: 'number', label: 'Total' },
                { name: 'deliveryAddress', type: 'string', label: 'Delivery Address' },
                { name: 'requiredByDate', type: 'date', label: 'Required By' },
                { name: 'notes', type: 'string', label: 'Notes' },
                { name: 'budgetAvailable', type: 'boolean', label: 'Budget Available' },
                { name: 'approver1', type: 'string', label: 'Approver 1' },
                { name: 'approver2', type: 'string', label: 'Approver 2' },
                { name: 'poNumber', type: 'string', label: 'PO Number' },
                { name: 'status', type: 'string', label: 'Status' },
            ],
            triggers: [
                { type: 'form_submission', formId: poForm.id },
                { type: 'manual', label: 'Create Purchase Order' },
            ],
            settings: { allowCancel: true, trackSLA: true, notification: { onStart: true, onComplete: true, onError: true } },
            permissions: {},
            slaConfig: { defaultDueHours: 72, escalationPolicy: 'notify_admin' },
            version: 1, status: 'ACTIVE', publishedAt: new Date(), createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created process: ${poProcess.name} (${poProcess.id})\n`);

    // 6. PO Records Dataset
    const poDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Purchase Orders' } },
        create: {
            accountId: account.id, name: 'Purchase Orders',
            description: 'All purchase order records with approval and fulfillment status',
            schema: [
                { name: 'PO Number', slug: 'po_number', type: 'text', required: true },
                { name: 'Vendor', slug: 'vendor', type: 'text', required: true },
                { name: 'Department', slug: 'department', type: 'text', required: true },
                { name: 'Urgency', slug: 'urgency', type: 'text', required: true },
                { name: 'Items Count', slug: 'items_count', type: 'number', required: true },
                { name: 'Subtotal', slug: 'subtotal', type: 'number', required: true },
                { name: 'Tax', slug: 'tax_amount', type: 'number', required: true },
                { name: 'Total', slug: 'total', type: 'number', required: true },
                { name: 'Status', slug: 'status', type: 'select', required: true },
                { name: 'Approver', slug: 'approver', type: 'text', required: false },
                { name: 'Required By', slug: 'required_by', type: 'date', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const poRecords = [
        { po_number: 'PO-2026-001', vendor: 'Office Depot', department: 'Engineering', urgency: 'Normal', items_count: 3, subtotal: 3175.00, tax_amount: 269.88, total: 3444.88, status: 'Approved', approver: 'Manager', required_by: '2026-02-15' },
        { po_number: 'PO-2026-002', vendor: 'Dell Technologies', department: 'Engineering', urgency: 'Urgent', items_count: 2, subtotal: 12900.00, tax_amount: 1096.50, total: 13996.50, status: 'Approved', approver: 'CTO + Finance', required_by: '2026-02-10' },
        { po_number: 'PO-2026-003', vendor: 'AWS', department: 'Engineering', urgency: 'Normal', items_count: 1, subtotal: 8500.00, tax_amount: 722.50, total: 9222.50, status: 'Pending Finance Review', approver: 'CTO', required_by: '2026-03-01' },
        { po_number: 'PO-2026-004', vendor: 'Staples', department: 'Operations', urgency: 'Normal', items_count: 4, subtotal: 245.00, tax_amount: 20.83, total: 265.83, status: 'Approved', approver: 'Auto (≤$500)', required_by: '2026-02-20' },
        { po_number: 'PO-2026-005', vendor: 'CDW', department: 'Marketing', urgency: 'Critical', items_count: 1, subtotal: 2800.00, tax_amount: 238.00, total: 3038.00, status: 'Pending Approval', approver: 'Manager + Finance', required_by: '2026-02-08' },
        { po_number: 'PO-2026-006', vendor: 'Dell Technologies', department: 'HR', urgency: 'Normal', items_count: 5, subtotal: 7250.00, tax_amount: 616.25, total: 7866.25, status: 'Pending Director Approval', approver: 'Director', required_by: '2026-02-28' },
        { po_number: 'PO-2026-007', vendor: 'Office Depot', department: 'Operations', urgency: 'Normal', items_count: 2, subtotal: 150.00, tax_amount: 12.75, total: 162.75, status: 'Approved', approver: 'Auto (≤$500)', required_by: '2026-02-12' },
        { po_number: 'PO-2026-008', vendor: 'CDW', department: 'Engineering', urgency: 'Urgent', items_count: 3, subtotal: 28500.00, tax_amount: 2422.50, total: 30922.50, status: 'Rejected', approver: 'VP', required_by: '2026-02-10' },
    ];
    const existingPO = await prisma.datasetRecord.count({ where: { datasetId: poDataset.id } });
    if (existingPO === 0) {
        for (const r of poRecords) {
            await prisma.datasetRecord.create({ data: { datasetId: poDataset.id, data: r, createdBy: adminUser.id } });
        }
        await prisma.dataset.update({ where: { id: poDataset.id }, data: { rowCount: poRecords.length } });
    }
    console.log(`✅ Created ${poRecords.length} PO records\n`);

    // 7. Form Submissions
    const submissions = [
        {
            vendor: 'VEND-001', vendorName: 'Office Depot', department: 'engineering', urgency: 'normal',
            lineItems: [
                { itemCode: 'ITEM-1001', description: '27" Monitor - Dell UltraSharp', quantity: 5, unitPrice: 450.00, lineTotal: 2250.00 },
                { itemCode: 'ITEM-2002', description: 'Mechanical Keyboard', quantity: 5, unitPrice: 120.00, lineTotal: 600.00 },
                { itemCode: 'ITEM-3003', description: 'USB-C Hub', quantity: 5, unitPrice: 65.00, lineTotal: 325.00 },
            ],
            subtotal: 3175.00, taxRate: 8.5, taxAmount: 269.88, total: 3444.88,
            deliveryAddress: '123 Tech Park Drive, Building A, San Francisco, CA 94105',
            requiredByDate: '2026-02-15', notes: 'New hire equipment setup - please deliver to IT receiving',
            submittedBy: 'Tom',
        },
        {
            vendor: 'VEND-002', vendorName: 'Dell Technologies', department: 'engineering', urgency: 'urgent',
            lineItems: [
                { itemCode: 'ITEM-1002', description: 'Laptop - Dell Latitude 7440', quantity: 8, unitPrice: 1450.00, lineTotal: 11600.00 },
                { itemCode: 'ITEM-1001', description: '27" Monitor - Dell UltraSharp', quantity: 4, unitPrice: 450.00, lineTotal: 1800.00 },
            ],
            subtotal: 13400.00, taxRate: 8.5, taxAmount: 1139.00, total: 14539.00,
            deliveryAddress: '123 Tech Park Drive, Building A, San Francisco, CA 94105',
            requiredByDate: '2026-02-10', notes: 'Q2 engineering team expansion - critical path',
            submittedBy: 'Tom',
        },
        {
            vendor: 'VEND-005', vendorName: 'CDW', department: 'marketing', urgency: 'critical',
            lineItems: [
                { itemCode: 'ITEM-1002', description: 'Laptop - Dell Latitude 7440', quantity: 2, unitPrice: 1400.00, lineTotal: 2800.00 },
            ],
            subtotal: 2800.00, taxRate: 8.5, taxAmount: 238.00, total: 3038.00,
            deliveryAddress: '456 Market Street, Floor 5, San Francisco, CA 94103',
            requiredByDate: '2026-02-08', notes: 'Replacement laptops needed for marketing event',
            submittedBy: 'David',
        },
    ];

    for (const s of submissions) {
        const user = poUsers.find(u => u.firstName === s.submittedBy);
        await prisma.formSubmission.create({
            data: { formId: poForm.id, data: s, createdBy: user?.id || adminUser.id },
        });
    }
    console.log(`✅ Created ${submissions.length} form submissions\n`);

    // 8. Process Instances
    const instances = [];

    // PO-001: COMPLETED (approved, sent to vendor)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: poProcess.id, processVersion: 1, status: 'COMPLETED',
            currentNodes: ['end-approved'],
            variables: { poNumber: 'PO-2026-001', vendor: 'VEND-001', vendorName: 'Office Depot', department: 'engineering', urgency: 'normal', total: 3444.88, approver1: 'manager', approver2: null, budgetAvailable: true, status: 'Sent to Vendor' },
            startedBy: poUsers[2].id, completedAt: new Date('2026-02-03T14:00:00Z'),
        },
    }));

    // PO-002: COMPLETED (CTO + Finance approved)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: poProcess.id, processVersion: 1, status: 'COMPLETED',
            currentNodes: ['end-approved'],
            variables: { poNumber: 'PO-2026-002', vendor: 'VEND-002', vendorName: 'Dell Technologies', department: 'engineering', urgency: 'urgent', total: 13996.50, approver1: 'cto', approver2: 'finance', budgetAvailable: true, status: 'Sent to Vendor' },
            startedBy: poUsers[2].id, completedAt: new Date('2026-02-05T11:00:00Z'),
        },
    }));

    // PO-003: RUNNING (pending finance after CTO approved)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: poProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['approval-2'],
            variables: { poNumber: 'PO-2026-003', vendor: 'VEND-003', vendorName: 'AWS', department: 'engineering', urgency: 'normal', total: 9222.50, approver1: 'cto', approver2: 'finance', budgetAvailable: true, status: 'Pending Finance Approval' },
            startedBy: poUsers[2].id, dueAt: new Date('2026-02-12T17:00:00Z'),
        },
    }));

    // PO-004: COMPLETED (auto-approved: ≤$500)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: poProcess.id, processVersion: 1, status: 'COMPLETED',
            currentNodes: ['end-approved'],
            variables: { poNumber: 'PO-2026-004', vendor: 'VEND-004', vendorName: 'Staples', department: 'operations', urgency: 'normal', total: 265.83, approver1: 'manager', approver2: null, budgetAvailable: true, status: 'Sent to Vendor' },
            startedBy: poUsers[3].id, completedAt: new Date('2026-02-06T09:00:00Z'),
        },
    }));

    // PO-005: RUNNING (pending manager approval, critical urgency)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: poProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['approval-1'],
            variables: { poNumber: 'PO-2026-005', vendor: 'VEND-005', vendorName: 'CDW', department: 'marketing', urgency: 'critical', total: 3038.00, approver1: 'manager', approver2: 'finance', budgetAvailable: true, status: 'Pending Manager Approval' },
            startedBy: poUsers[0].id, dueAt: new Date('2026-02-09T17:00:00Z'),
        },
    }));

    // PO-006: RUNNING (pending director approval)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: poProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['approval-1'],
            variables: { poNumber: 'PO-2026-006', vendor: 'VEND-002', vendorName: 'Dell Technologies', department: 'hr', urgency: 'normal', total: 7866.25, approver1: 'director', approver2: 'finance', budgetAvailable: true, status: 'Pending Director Approval' },
            startedBy: poUsers[0].id, dueAt: new Date('2026-02-14T17:00:00Z'),
        },
    }));

    // PO-008: COMPLETED (rejected by VP)
    instances.push(await prisma.processInstance.create({
        data: {
            processId: poProcess.id, processVersion: 1, status: 'COMPLETED',
            currentNodes: ['end-rejected'],
            variables: { poNumber: 'PO-2026-008', vendor: 'VEND-005', vendorName: 'CDW', department: 'engineering', urgency: 'urgent', total: 30922.50, approver1: 'vp', approver2: 'cfo', budgetAvailable: true, status: 'Rejected' },
            startedBy: poUsers[2].id, completedAt: new Date('2026-02-07T16:00:00Z'),
        },
    }));
    console.log(`✅ Created ${instances.length} process instances\n`);

    // 9. Task Instances
    // Task 1: Manager approved PO-001
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[0].id, nodeId: 'approval-1', name: 'Approve PO: Office Depot - $3,444.88',
            description: 'Review purchase order for monitors, keyboards, and USB hubs', taskType: 'APPROVAL',
            assigneeId: adminUser.id, assigneeType: 'USER',
            formData: { poNumber: 'PO-2026-001', vendor: 'Office Depot', total: 3444.88, items: 3 },
            status: 'COMPLETED', priority: 2, outcome: 'approved',
            completedAt: new Date('2026-02-02T10:00:00Z'), completedBy: adminUser.id,
            comments: 'Approved. Standard equipment refresh.',
        }
    });

    // Task 2: CTO approved PO-002
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[1].id, nodeId: 'approval-1', name: 'Approve PO: Dell Technologies - $13,996.50',
            description: 'CTO review for engineering laptops and monitors', taskType: 'APPROVAL',
            assigneeId: adminUser.id, assigneeType: 'USER',
            formData: { poNumber: 'PO-2026-002', vendor: 'Dell Technologies', total: 13996.50, items: 2, urgency: 'urgent' },
            status: 'COMPLETED', priority: 1, outcome: 'approved',
            completedAt: new Date('2026-02-04T14:00:00Z'), completedBy: adminUser.id,
            comments: 'Approved. Critical for Q2 hiring.',
        }
    });

    // Task 3: Finance approved PO-002
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[1].id, nodeId: 'approval-2', name: 'Finance Review: Dell Technologies - $13,996.50',
            description: 'Finance review for engineering hardware > $10,000', taskType: 'APPROVAL',
            assigneeId: poUsers[1].id, assigneeType: 'ROLE',
            formData: { poNumber: 'PO-2026-002', vendor: 'Dell Technologies', total: 13996.50, approvedBy: 'CTO' },
            status: 'COMPLETED', priority: 1, outcome: 'approved',
            completedAt: new Date('2026-02-05T09:00:00Z'), completedBy: poUsers[1].id,
            comments: 'Budget verified. Approved.',
        }
    });

    // Task 4: Finance Review for PO-003 (PENDING)
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[2].id, nodeId: 'approval-2', name: 'Finance Review: AWS - $9,222.50',
            description: 'Finance review for cloud services annual subscription', taskType: 'APPROVAL',
            assigneeId: poUsers[1].id, assigneeType: 'ROLE',
            formData: { poNumber: 'PO-2026-003', vendor: 'AWS', total: 9222.50, approvedBy: 'CTO', department: 'Engineering' },
            status: 'PENDING', priority: 1, dueAt: new Date('2026-02-12T17:00:00Z'),
        }
    });

    // Task 5: Manager approval for PO-005 (PENDING - critical)
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[4].id, nodeId: 'approval-1', name: 'Approve PO: CDW - $3,038.00 (CRITICAL)',
            description: 'Urgent: Marketing laptop replacement needed for event', taskType: 'APPROVAL',
            assigneeId: adminUser.id, assigneeType: 'USER',
            formData: { poNumber: 'PO-2026-005', vendor: 'CDW', total: 3038.00, urgency: 'critical', department: 'Marketing' },
            status: 'PENDING', priority: 0, dueAt: new Date('2026-02-09T17:00:00Z'),
        }
    });

    // Task 6: Director approval for PO-006 (PENDING)
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[5].id, nodeId: 'approval-1', name: 'Approve PO: Dell Technologies - $7,866.25',
            description: 'Director review for HR department hardware purchase', taskType: 'APPROVAL',
            assigneeId: poUsers[4].id, assigneeType: 'USER',
            formData: { poNumber: 'PO-2026-006', vendor: 'Dell Technologies', total: 7866.25, department: 'HR' },
            status: 'PENDING', priority: 1, dueAt: new Date('2026-02-14T17:00:00Z'),
        }
    });

    // Task 7: VP rejected PO-008
    await prisma.taskInstance.create({
        data: {
            instanceId: instances[6].id, nodeId: 'approval-1', name: 'Approve PO: CDW - $30,922.50',
            description: 'VP review for high-value engineering hardware order', taskType: 'APPROVAL',
            assigneeId: poUsers[4].id, assigneeType: 'USER',
            formData: { poNumber: 'PO-2026-008', vendor: 'CDW', total: 30922.50, urgency: 'urgent' },
            status: 'COMPLETED', priority: 1, outcome: 'rejected',
            completedAt: new Date('2026-02-07T16:00:00Z'), completedBy: poUsers[4].id,
            comments: 'Rejected: Exceeds quarterly hardware budget. Resubmit with reduced scope in Q2.',
        }
    });

    console.log(`✅ Created 7 task instances\n`);

    // Summary
    console.log('─'.repeat(60));
    console.log('🎉 Purchase Order Flow seeding completed!');
    console.log('');
    console.log('Created:');
    console.log('  📋 Purchase Order Request Form (12 fields)');
    console.log('  🔄 Purchase Order Workflow (15 nodes, 17 edges)');
    console.log('  📦 Vendors Dataset (5 vendors)');
    console.log('  📦 Product Catalog Dataset (7 items)');
    console.log('  📊 Purchase Orders Dataset (8 records)');
    console.log('  📝 3 Form Submissions');
    console.log('  ⚙️  7 Process Instances (4 completed, 3 running)');
    console.log('  ✅ 7 Task Instances (4 completed, 3 pending)');
    console.log('');
    console.log('Note: Run the server to also seed the PO Approval Matrix Decision Table in-memory.');
}

seedPurchaseOrder()
    .catch((e) => {
        console.error('❌ Purchase Order seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
