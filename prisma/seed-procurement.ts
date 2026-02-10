/**
 * Multi-Level Procurement System Seed Script
 * Datasets: Requisitions, POs, Goods Receipts, Invoices, Vendors
 * Forms: Purchase Requisition, Invoice Verification (Three-Way Match)
 * Workflow: Full procurement lifecycle (21 nodes, 24 edges)
 * App: Procurement Hub (4 pages)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function seedProcurement() {
    console.log('\n🛒 Seeding Multi-Level Procurement System...\n');
    const account = await prisma.account.findFirst({ where: { slug: 'demo' } });
    if (!account) throw new Error('Demo account not found. Run main seed first.');
    const adminUser = await prisma.user.findFirst({ where: { accountId: account.id, email: 'admin@demo.com' } });
    if (!adminUser) throw new Error('Admin user not found. Run main seed first.');

    // 1. Users
    const userData = [
        { firstName: 'Kevin', lastName: 'Zhang', email: 'kevin.zhang@demo.com' },
        { firstName: 'Maria', lastName: 'Santos', email: 'maria.santos@demo.com' },
        { firstName: 'Chris', lastName: 'Taylor', email: 'chris.taylor@demo.com' },
        { firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@demo.com' },
        { firstName: 'Alex', lastName: 'Morgan', email: 'alex.morgan@demo.com' },
    ];
    const users: any[] = [];
    for (const u of userData) {
        const user = await prisma.user.upsert({
            where: { accountId_email: { accountId: account.id, email: u.email } },
            create: { accountId: account.id, email: u.email, firstName: u.firstName, lastName: u.lastName, passwordHash: await bcrypt.hash('Demo123!@#', 12), status: 'ACTIVE' },
            update: {},
        });
        users.push(user);
    }
    console.log(`✅ Found/created ${users.length} procurement users\n`);

    // 2. Vendors Dataset
    const vendorsDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Procurement Vendors' } },
        create: {
            accountId: account.id, name: 'Procurement Vendors',
            description: 'Approved vendor directory for procurement',
            schema: [
                { name: 'Vendor Code', slug: 'vendor_code', type: 'text', required: true },
                { name: 'Name', slug: 'name', type: 'text', required: true },
                { name: 'Category', slug: 'category', type: 'text', required: true },
                { name: 'Contact', slug: 'contact_name', type: 'text' },
                { name: 'Email', slug: 'email', type: 'text', required: true },
                { name: 'Payment Terms', slug: 'payment_terms', type: 'text' },
                { name: 'Rating', slug: 'rating', type: 'number' },
                { name: 'Status', slug: 'status', type: 'select', required: true },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });
    const vendorRecords = [
        { vendor_code: 'V-1001', name: 'Global Office Supply Co.', category: 'Office Supplies', contact_name: 'John Baker', email: 'orders@globaloffice.com', payment_terms: 'Net 30', rating: 4.5, status: 'Active' },
        { vendor_code: 'V-1002', name: 'TechDirect Solutions', category: 'IT Hardware', contact_name: 'Amy Lin', email: 'sales@techdirect.com', payment_terms: 'Net 45', rating: 4.8, status: 'Active' },
        { vendor_code: 'V-1003', name: 'CloudScale Hosting', category: 'Cloud Services', contact_name: 'Mark Chen', email: 'enterprise@cloudscale.io', payment_terms: 'Net 30', rating: 4.9, status: 'Active' },
        { vendor_code: 'V-1004', name: 'Industrial Parts Inc.', category: 'MRO Supplies', contact_name: 'Bob Wilson', email: 'orders@industrialparts.com', payment_terms: 'Net 60', rating: 4.1, status: 'Active' },
        { vendor_code: 'V-1005', name: 'Premier Furniture Group', category: 'Furniture', contact_name: 'Diana Ross', email: 'business@premierfurn.com', payment_terms: 'Net 30', rating: 4.3, status: 'Active' },
        { vendor_code: 'V-1006', name: 'SafeGuard Security', category: 'Security Services', contact_name: 'Tom Hardy', email: 'contracts@safeguard.com', payment_terms: 'Net 30', rating: 4.6, status: 'Active' },
    ];
    const existV = await prisma.datasetRecord.count({ where: { datasetId: vendorsDs.id } });
    if (existV === 0) {
        for (const v of vendorRecords) await prisma.datasetRecord.create({ data: { datasetId: vendorsDs.id, data: v, createdBy: adminUser.id } });
        await prisma.dataset.update({ where: { id: vendorsDs.id }, data: { rowCount: vendorRecords.length } });
    }
    console.log(`✅ Procurement Vendors: ${vendorRecords.length} records\n`);

    // 3. Requisitions Dataset
    const reqDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Requisitions' } },
        create: {
            accountId: account.id, name: 'Requisitions',
            description: 'Purchase requisition records',
            schema: [
                { name: 'Req Number', slug: 'req_number', type: 'text', required: true },
                { name: 'Title', slug: 'title', type: 'text', required: true },
                { name: 'Requestor', slug: 'requestor', type: 'text', required: true },
                { name: 'Department', slug: 'department', type: 'text', required: true },
                { name: 'Cost Center', slug: 'cost_center', type: 'text' },
                { name: 'Priority', slug: 'priority', type: 'text', required: true },
                { name: 'Total Amount', slug: 'total_amount', type: 'number', required: true },
                { name: 'Required Date', slug: 'required_date', type: 'date' },
                { name: 'Status', slug: 'status', type: 'select', required: true },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });
    const reqRecords = [
        { req_number: 'REQ-202602-0001', title: 'Q1 Office Supplies Replenishment', requestor: 'Kevin Zhang', department: 'Operations', cost_center: 'CC-OPS-100', priority: 'medium', total_amount: 2450.00, required_date: '2026-02-28', status: 'Approved' },
        { req_number: 'REQ-202602-0002', title: 'Engineering Laptop Refresh (10 units)', requestor: 'Chris Taylor', department: 'Engineering', cost_center: 'CC-ENG-200', priority: 'high', total_amount: 29000.00, required_date: '2026-02-15', status: 'Approved' },
        { req_number: 'REQ-202602-0003', title: 'Server Room UPS Replacement', requestor: 'Alex Morgan', department: 'IT', cost_center: 'CC-IT-300', priority: 'urgent', total_amount: 18500.00, required_date: '2026-02-12', status: 'PO Created' },
        { req_number: 'REQ-202602-0004', title: 'Marketing Event Materials', requestor: 'Maria Santos', department: 'Marketing', cost_center: 'CC-MKT-400', priority: 'medium', total_amount: 8750.00, required_date: '2026-03-15', status: 'Pending Approval' },
        { req_number: 'REQ-202602-0005', title: 'Annual Security Audit Service', requestor: 'Alex Morgan', department: 'IT', cost_center: 'CC-IT-300', priority: 'low', total_amount: 45000.00, required_date: '2026-04-01', status: 'Pending Finance' },
        { req_number: 'REQ-202602-0006', title: 'Breakroom Furniture Upgrade', requestor: 'Kevin Zhang', department: 'Operations', cost_center: 'CC-OPS-100', priority: 'low', total_amount: 6200.00, required_date: '2026-03-31', status: 'Pending Approval' },
        { req_number: 'REQ-202602-0007', title: 'Cloud Infrastructure Expansion', requestor: 'Chris Taylor', department: 'Engineering', cost_center: 'CC-ENG-200', priority: 'high', total_amount: 125000.00, required_date: '2026-03-01', status: 'Pending CEO' },
        { req_number: 'REQ-202601-0015', title: 'January Office Supplies', requestor: 'Kevin Zhang', department: 'Operations', cost_center: 'CC-OPS-100', priority: 'low', total_amount: 380.00, required_date: '2026-01-20', status: 'Completed' },
    ];
    const existR = await prisma.datasetRecord.count({ where: { datasetId: reqDs.id } });
    if (existR === 0) {
        for (const r of reqRecords) await prisma.datasetRecord.create({ data: { datasetId: reqDs.id, data: r, createdBy: adminUser.id } });
        await prisma.dataset.update({ where: { id: reqDs.id }, data: { rowCount: reqRecords.length } });
    }
    console.log(`✅ Requisitions: ${reqRecords.length} records\n`);

    // 4. Purchase Orders Dataset
    const poDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Procurement POs' } },
        create: {
            accountId: account.id, name: 'Procurement POs',
            description: 'Purchase order records with delivery and payment tracking',
            schema: [
                { name: 'PO Number', slug: 'po_number', type: 'text', required: true },
                { name: 'Requisition', slug: 'requisition', type: 'text' },
                { name: 'Vendor', slug: 'vendor_name', type: 'text', required: true },
                { name: 'Subtotal', slug: 'subtotal', type: 'number', required: true },
                { name: 'Tax', slug: 'tax', type: 'number', required: true },
                { name: 'Shipping', slug: 'shipping', type: 'number' },
                { name: 'Total', slug: 'total', type: 'number', required: true },
                { name: 'Payment Terms', slug: 'payment_terms', type: 'text' },
                { name: 'Expected Delivery', slug: 'expected_delivery', type: 'date' },
                { name: 'Status', slug: 'status', type: 'select', required: true },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });
    const poRecords = [
        { po_number: 'PO-202602-00001', requisition: 'REQ-202602-0001', vendor_name: 'Global Office Supply Co.', subtotal: 2450.00, tax: 208.25, shipping: 25.00, total: 2683.25, payment_terms: 'Net 30', expected_delivery: '2026-02-20', status: 'Delivered' },
        { po_number: 'PO-202602-00002', requisition: 'REQ-202602-0002', vendor_name: 'TechDirect Solutions', subtotal: 29000.00, tax: 2465.00, shipping: 0, total: 31465.00, payment_terms: 'Net 45', expected_delivery: '2026-02-18', status: 'Shipped' },
        { po_number: 'PO-202602-00003', requisition: 'REQ-202602-0003', vendor_name: 'TechDirect Solutions', subtotal: 18500.00, tax: 1572.50, shipping: 150.00, total: 20222.50, payment_terms: 'Net 30', expected_delivery: '2026-02-14', status: 'Acknowledged' },
        { po_number: 'PO-202601-00012', requisition: 'REQ-202601-0015', vendor_name: 'Global Office Supply Co.', subtotal: 380.00, tax: 32.30, shipping: 0, total: 412.30, payment_terms: 'Net 30', expected_delivery: '2026-01-25', status: 'Paid' },
        { po_number: 'PO-202602-00004', requisition: 'REQ-202602-0004', vendor_name: 'Premier Furniture Group', subtotal: 8750.00, tax: 743.75, shipping: 350.00, total: 9843.75, payment_terms: 'Net 30', expected_delivery: '2026-03-10', status: 'Draft' },
    ];
    const existPO = await prisma.datasetRecord.count({ where: { datasetId: poDs.id } });
    if (existPO === 0) {
        for (const p of poRecords) await prisma.datasetRecord.create({ data: { datasetId: poDs.id, data: p, createdBy: adminUser.id } });
        await prisma.dataset.update({ where: { id: poDs.id }, data: { rowCount: poRecords.length } });
    }
    console.log(`✅ Procurement POs: ${poRecords.length} records\n`);

    // 5. Goods Receipts Dataset
    const grDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Goods Receipts' } },
        create: {
            accountId: account.id, name: 'Goods Receipts',
            description: 'Goods receipt and inspection records',
            schema: [
                { name: 'GR Number', slug: 'gr_number', type: 'text', required: true },
                { name: 'PO Number', slug: 'po_number', type: 'text', required: true },
                { name: 'Received Date', slug: 'received_date', type: 'date', required: true },
                { name: 'Received By', slug: 'received_by', type: 'text', required: true },
                { name: 'Items Received', slug: 'items_received', type: 'number', required: true },
                { name: 'Status', slug: 'status', type: 'select', required: true },
                { name: 'Notes', slug: 'notes', type: 'text' },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });
    const grRecords = [
        { gr_number: 'GR-202602-00001', po_number: 'PO-202602-00001', received_date: '2026-02-19', received_by: 'Kevin Zhang', items_received: 12, status: 'Complete', notes: 'All items received in good condition' },
        { gr_number: 'GR-202601-00008', po_number: 'PO-202601-00012', received_date: '2026-01-24', received_by: 'Kevin Zhang', items_received: 5, status: 'Complete', notes: 'Standard office supplies delivery' },
    ];
    const existGR = await prisma.datasetRecord.count({ where: { datasetId: grDs.id } });
    if (existGR === 0) {
        for (const g of grRecords) await prisma.datasetRecord.create({ data: { datasetId: grDs.id, data: g, createdBy: adminUser.id } });
        await prisma.dataset.update({ where: { id: grDs.id }, data: { rowCount: grRecords.length } });
    }
    console.log(`✅ Goods Receipts: ${grRecords.length} records\n`);

    // 6. Invoices Dataset
    const invDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Procurement Invoices' } },
        create: {
            accountId: account.id, name: 'Procurement Invoices',
            description: 'Vendor invoices with three-way match status',
            schema: [
                { name: 'Invoice Number', slug: 'invoice_number', type: 'text', required: true },
                { name: 'Vendor Invoice #', slug: 'vendor_invoice', type: 'text', required: true },
                { name: 'PO Number', slug: 'po_number', type: 'text', required: true },
                { name: 'Vendor', slug: 'vendor_name', type: 'text', required: true },
                { name: 'Amount', slug: 'amount', type: 'number', required: true },
                { name: 'Tax', slug: 'tax', type: 'number', required: true },
                { name: 'Total', slug: 'total', type: 'number', required: true },
                { name: 'Invoice Date', slug: 'invoice_date', type: 'date', required: true },
                { name: 'Due Date', slug: 'due_date', type: 'date', required: true },
                { name: 'Status', slug: 'status', type: 'select', required: true },
                { name: 'Match Status', slug: 'match_status', type: 'text' },
                { name: 'Variance', slug: 'variance', type: 'number' },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });
    const invRecords = [
        { invoice_number: 'INV-202602-001', vendor_invoice: 'GOS-89012', po_number: 'PO-202602-00001', vendor_name: 'Global Office Supply Co.', amount: 2450.00, tax: 208.25, total: 2658.25, invoice_date: '2026-02-20', due_date: '2026-03-22', status: 'Pending Match', match_status: 'Variance', variance: -25.00 },
        { invoice_number: 'INV-202601-015', vendor_invoice: 'GOS-88456', po_number: 'PO-202601-00012', vendor_name: 'Global Office Supply Co.', amount: 380.00, tax: 32.30, total: 412.30, invoice_date: '2026-01-25', due_date: '2026-02-24', status: 'Paid', match_status: 'Matched', variance: 0 },
        { invoice_number: 'INV-202602-002', vendor_invoice: 'TD-2026-1847', po_number: 'PO-202602-00003', vendor_name: 'TechDirect Solutions', amount: 18500.00, tax: 1572.50, total: 20072.50, invoice_date: '2026-02-15', due_date: '2026-03-17', status: 'Pending', match_status: 'Awaiting GR', variance: 0 },
    ];
    const existINV = await prisma.datasetRecord.count({ where: { datasetId: invDs.id } });
    if (existINV === 0) {
        for (const i of invRecords) await prisma.datasetRecord.create({ data: { datasetId: invDs.id, data: i, createdBy: adminUser.id } });
        await prisma.dataset.update({ where: { id: invDs.id }, data: { rowCount: invRecords.length } });
    }
    console.log(`✅ Procurement Invoices: ${invRecords.length} records\n`);

    // 7. Requisition Form
    const reqForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-000000000020' },
        create: {
            id: '00000000-0000-0000-0000-000000000020',
            accountId: account.id,
            name: 'Purchase Requisition',
            description: 'Submit a purchase requisition with line items, cost center, and business justification',
            fields: [
                { id: 'f-title', name: 'title', type: 'text', label: 'Requisition Title', required: true, placeholder: 'e.g., Office Supplies Q1 2026' },
                {
                    id: 'f-dept', name: 'department', type: 'select', label: 'Department', required: true,
                    options: [{ value: 'engineering', label: 'Engineering' }, { value: 'operations', label: 'Operations' }, { value: 'marketing', label: 'Marketing' }, { value: 'hr', label: 'Human Resources' }, { value: 'it', label: 'IT' }, { value: 'finance', label: 'Finance' }]
                },
                { id: 'f-cost', name: 'costCenter', type: 'text', label: 'Cost Center', required: true, placeholder: 'CC-XXX-000' },
                {
                    id: 'f-priority', name: 'priority', type: 'radio', label: 'Priority', required: true,
                    options: [{ value: 'low', label: 'Low - Within 30 days' }, { value: 'medium', label: 'Medium - Within 14 days' }, { value: 'high', label: 'High - Within 7 days' }, { value: 'urgent', label: 'Urgent - Within 3 days' }]
                },
                { id: 'f-date', name: 'requiredDate', type: 'date', label: 'Required By Date', required: true },
                {
                    id: 'f-items', name: 'lineItems', type: 'repeater', label: 'Items', required: true, minItems: 1,
                    fields: [
                        { name: 'description', type: 'text', label: 'Description', required: true },
                        { name: 'quantity', type: 'number', label: 'Qty', required: true, min: 1 },
                        { name: 'uom', type: 'select', label: 'UOM', options: [{ value: 'each', label: 'Each' }, { value: 'box', label: 'Box' }, { value: 'case', label: 'Case' }, { value: 'pack', label: 'Pack' }] },
                        { name: 'unitPrice', type: 'number', label: 'Est. Unit Price', required: true },
                        { name: 'lineTotal', type: 'number', label: 'Total', computed: 'quantity * unitPrice', readonly: true },
                        { name: 'preferredVendor', type: 'text', label: 'Preferred Vendor' },
                    ],
                },
                { id: 'f-total', name: 'totalAmount', type: 'number', label: 'Total Estimated Amount', computed: 'SUM(lineItems.lineTotal)', readonly: true },
                { id: 'f-justify', name: 'justification', type: 'textarea', label: 'Business Justification', required: true },
                {
                    id: 'f-location', name: 'deliveryLocation', type: 'select', label: 'Delivery Location', required: true,
                    options: [{ value: 'hq', label: 'HQ - Main Building' }, { value: 'warehouse', label: 'Warehouse A' }, { value: 'branch', label: 'Branch Office' }]
                },
                { id: 'f-notes', name: 'specialInstructions', type: 'textarea', label: 'Special Instructions' },
            ],
            layout: {
                sections: [
                    { title: 'Request Details', fields: ['f-title', 'f-dept', 'f-cost', 'f-priority', 'f-date'] },
                    { title: 'Line Items', fields: ['f-items'] },
                    { title: 'Summary', fields: ['f-total', 'f-justify'] },
                    { title: 'Delivery', fields: ['f-location', 'f-notes'] },
                ],
            },
            validationRules: [],
            conditionalLogic: [],
            settings: { submitButtonText: 'Submit Requisition', showProgressBar: true, allowDraft: true },
            permissions: {},
            version: 1,
            status: 'ACTIVE',
            createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created form: ${reqForm.name}\n`);

    // 8. Invoice Verification Form (Three-Way Match)
    const invForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-000000000021' },
        create: {
            id: '00000000-0000-0000-0000-000000000021',
            accountId: account.id,
            name: 'Invoice Verification (Three-Way Match)',
            description: 'Verify invoice against PO and goods receipt',
            fields: [
                {
                    id: 'f-decision', name: 'decision', type: 'radio', label: 'Decision', required: true,
                    options: [
                        { value: 'approve', label: '✅ Approve for Payment' },
                        { value: 'partial', label: '🔶 Approve Partial Amount' },
                        { value: 'hold', label: '⏸️ Put on Hold' },
                        { value: 'reject', label: '❌ Reject' },
                    ]
                },
                { id: 'f-partial', name: 'partialAmount', type: 'number', label: 'Approved Amount' },
                {
                    id: 'f-hold', name: 'holdReason', type: 'select', label: 'Hold Reason',
                    options: [
                        { value: 'quantity_mismatch', label: 'Quantity Mismatch' },
                        { value: 'price_mismatch', label: 'Price Mismatch' },
                        { value: 'missing_gr', label: 'Missing Goods Receipt' },
                        { value: 'other', label: 'Other' },
                    ]
                },
                { id: 'f-comments', name: 'comments', type: 'textarea', label: 'Comments' },
            ],
            layout: { sections: [{ title: 'Match Decision', fields: ['f-decision', 'f-partial', 'f-hold', 'f-comments'] }] },
            validationRules: [],
            conditionalLogic: [
                { field: 'f-partial', condition: "decision === 'partial'", action: 'show' },
                { field: 'f-hold', condition: "decision === 'hold'", action: 'show' },
                { field: 'f-comments', condition: "decision !== 'approve'", action: 'require' },
            ],
            settings: { submitButtonText: 'Submit Decision', showProgressBar: false },
            permissions: {},
            version: 1,
            status: 'ACTIVE',
            createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created form: ${invForm.name}\n`);

    // 9. Procurement Workflow (21 nodes, 24 edges)
    const procProcess = await prisma.process.upsert({
        where: { id: '00000000-0000-0000-0000-000000000080' },
        create: {
            id: '00000000-0000-0000-0000-000000000080',
            accountId: account.id,
            name: 'Procurement Workflow',
            description: 'Multi-level procurement: requisition → approval → sourcing → PO → goods receipt → invoice matching → payment',
            category: 'Procurement',
            definition: {
                nodes: [
                    // Requisition Phase
                    { id: 'start-1', type: 'start', name: 'Submit Requisition', position: { x: 100, y: 300 }, config: { trigger: 'form_submission', formId: reqForm.id } },
                    { id: 'action-budget', type: 'action', name: 'Budget Check', position: { x: 350, y: 300 }, config: { action: 'check_budget' } },
                    { id: 'decision-budget', type: 'decision', name: 'Budget OK?', position: { x: 600, y: 300 }, config: {}, condition: 'variables.budgetAvailable === true' },
                    { id: 'decision-route', type: 'decision', name: 'Route Approval', position: { x: 850, y: 200 }, config: { decisionTableId: 'req-approval-matrix' } },
                    { id: 'approval-mgr', type: 'approval', name: 'Manager Approval', position: { x: 1100, y: 150 }, config: { assignTo: 'variables.approver1', timeoutDays: 3 } },
                    { id: 'decision-2nd', type: 'decision', name: 'Finance Needed?', position: { x: 1350, y: 150 }, config: {}, condition: 'variables.approver2 !== null' },
                    { id: 'approval-fin', type: 'approval', name: 'Finance Approval', position: { x: 1600, y: 100 }, config: { assignTo: 'role:finance', timeoutDays: 2 } },
                    // Sourcing Phase
                    { id: 'action-rfq', type: 'action', name: 'Send RFQ to Vendors', position: { x: 1850, y: 300 }, config: { action: 'create_rfq' } },
                    { id: 'action-evaluate', type: 'action', name: 'Evaluate Bids', position: { x: 2100, y: 300 }, config: { action: 'evaluate_bids' } },
                    // PO Phase
                    { id: 'action-create-po', type: 'action', name: 'Create PO', position: { x: 2350, y: 300 }, config: { action: 'create_purchase_order' } },
                    { id: 'email-vendor', type: 'email', name: 'Send PO to Vendor', position: { x: 2600, y: 300 }, config: { template: 'po-to-vendor' } },
                    { id: 'wait-delivery', type: 'action', name: 'Track Delivery', position: { x: 2850, y: 300 }, config: { waitFor: 'goods_receipt' } },
                    // Receipt & Payment Phase
                    { id: 'action-gr', type: 'action', name: 'Record Goods Receipt', position: { x: 3100, y: 300 }, config: { action: 'create_goods_receipt' } },
                    { id: 'action-match', type: 'action', name: 'Three-Way Match', position: { x: 3350, y: 300 }, config: { action: 'invoice_match' } },
                    { id: 'decision-match', type: 'decision', name: 'Match OK?', position: { x: 3600, y: 300 }, config: {}, condition: 'variables.matchStatus === "matched"' },
                    { id: 'approval-pay', type: 'approval', name: 'Approve Payment', position: { x: 3850, y: 200 }, config: { formId: invForm.id } },
                    { id: 'action-pay', type: 'action', name: 'Process Payment', position: { x: 4100, y: 300 }, config: { connector: 'erp', operation: 'process_payment' } },
                    // Error/Rejection paths
                    { id: 'email-budget', type: 'email', name: 'Budget Exceeded Notification', position: { x: 600, y: 500 }, config: { template: 'budget-exceeded' } },
                    { id: 'email-rejected', type: 'email', name: 'Requisition Rejected', position: { x: 1350, y: 500 }, config: { template: 'req-rejected' } },
                    // End nodes
                    { id: 'end-complete', type: 'end', name: 'PO Complete', position: { x: 4350, y: 300 }, config: {} },
                    { id: 'end-rejected', type: 'end', name: 'Rejected', position: { x: 1350, y: 650 }, config: {} },
                ],
                edges: [
                    { id: 'e1', source: 'start-1', target: 'action-budget' },
                    { id: 'e2', source: 'action-budget', target: 'decision-budget' },
                    { id: 'e3', source: 'decision-budget', target: 'decision-route', label: 'OK', condition: 'true' },
                    { id: 'e4', source: 'decision-budget', target: 'email-budget', label: 'Over budget', condition: 'false' },
                    { id: 'e5', source: 'decision-route', target: 'approval-mgr', label: 'Routed' },
                    { id: 'e6', source: 'approval-mgr', target: 'decision-2nd', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e7', source: 'approval-mgr', target: 'email-rejected', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e8', source: 'decision-2nd', target: 'approval-fin', label: 'Yes', condition: 'true' },
                    { id: 'e9', source: 'decision-2nd', target: 'action-rfq', label: 'No', condition: 'false' },
                    { id: 'e10', source: 'approval-fin', target: 'action-rfq', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e11', source: 'approval-fin', target: 'email-rejected', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e12', source: 'action-rfq', target: 'action-evaluate' },
                    { id: 'e13', source: 'action-evaluate', target: 'action-create-po' },
                    { id: 'e14', source: 'action-create-po', target: 'email-vendor' },
                    { id: 'e15', source: 'email-vendor', target: 'wait-delivery' },
                    { id: 'e16', source: 'wait-delivery', target: 'action-gr' },
                    { id: 'e17', source: 'action-gr', target: 'action-match' },
                    { id: 'e18', source: 'action-match', target: 'decision-match' },
                    { id: 'e19', source: 'decision-match', target: 'action-pay', label: 'Auto-approve', condition: 'true' },
                    { id: 'e20', source: 'decision-match', target: 'approval-pay', label: 'Review needed', condition: 'false' },
                    { id: 'e21', source: 'approval-pay', target: 'action-pay', label: 'Approved' },
                    { id: 'e22', source: 'action-pay', target: 'end-complete' },
                    { id: 'e23', source: 'email-budget', target: 'end-rejected' },
                    { id: 'e24', source: 'email-rejected', target: 'end-rejected' },
                ],
            },
            variables: [
                { name: 'title', type: 'string', label: 'Requisition Title' },
                { name: 'department', type: 'string', label: 'Department' },
                { name: 'costCenter', type: 'string', label: 'Cost Center' },
                { name: 'priority', type: 'string', label: 'Priority' },
                { name: 'totalAmount', type: 'number', label: 'Total Amount' },
                { name: 'budgetAvailable', type: 'boolean', label: 'Budget Available' },
                { name: 'approver1', type: 'string', label: 'Primary Approver' },
                { name: 'approver2', type: 'string', label: 'Financial Approver' },
                { name: 'selectedVendor', type: 'string', label: 'Selected Vendor' },
                { name: 'poNumber', type: 'string', label: 'PO Number' },
                { name: 'matchStatus', type: 'string', label: 'Match Status' },
            ],
            triggers: [
                { type: 'form_submission', formId: reqForm.id },
                { type: 'manual', label: 'Create Requisition' },
            ],
            settings: { allowCancel: true, trackSLA: true, notification: { onStart: true, onComplete: true, onError: true } },
            permissions: {},
            slaConfig: { defaultDueHours: 96, escalationPolicy: 'notify_admin' },
            version: 1,
            status: 'ACTIVE',
            publishedAt: new Date(),
            createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created process: ${procProcess.name}\n`);

    // 10. Process Instances (6 - various stages)
    const instances: any[] = [];
    instances.push(await prisma.processInstance.create({
        data: {
            processId: procProcess.id, processVersion: 1, status: 'COMPLETED',
            currentNodes: ['end-complete'],
            variables: { reqNumber: 'REQ-202601-0015', title: 'January Office Supplies', totalAmount: 380, poNumber: 'PO-202601-00012', status: 'Paid' },
            startedBy: users[0].id, completedAt: new Date('2026-02-01T10:00:00Z'),
        }
    }));
    instances.push(await prisma.processInstance.create({
        data: {
            processId: procProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['action-match'],
            variables: { reqNumber: 'REQ-202602-0001', title: 'Q1 Office Supplies', totalAmount: 2450, poNumber: 'PO-202602-00001', status: 'Invoice Matching' },
            startedBy: users[0].id,
        }
    }));
    instances.push(await prisma.processInstance.create({
        data: {
            processId: procProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['wait-delivery'],
            variables: { reqNumber: 'REQ-202602-0002', title: 'Engineering Laptop Refresh', totalAmount: 29000, poNumber: 'PO-202602-00002', status: 'In Transit' },
            startedBy: users[2].id, dueAt: new Date('2026-02-18T17:00:00Z'),
        }
    }));
    instances.push(await prisma.processInstance.create({
        data: {
            processId: procProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['approval-mgr'],
            variables: { reqNumber: 'REQ-202602-0004', title: 'Marketing Event Materials', totalAmount: 8750, approver1: 'manager', status: 'Pending Manager' },
            startedBy: users[1].id, dueAt: new Date('2026-02-20T17:00:00Z'),
        }
    }));
    instances.push(await prisma.processInstance.create({
        data: {
            processId: procProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['approval-fin'],
            variables: { reqNumber: 'REQ-202602-0005', title: 'Annual Security Audit', totalAmount: 45000, approver2: 'cfo', status: 'Pending CFO' },
            startedBy: users[4].id, dueAt: new Date('2026-02-25T17:00:00Z'),
        }
    }));
    instances.push(await prisma.processInstance.create({
        data: {
            processId: procProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['approval-mgr'],
            variables: { reqNumber: 'REQ-202602-0007', title: 'Cloud Infrastructure Expansion', totalAmount: 125000, approver1: 'cfo', approver2: 'ceo', status: 'Pending CFO' },
            startedBy: users[2].id, dueAt: new Date('2026-02-22T17:00:00Z'),
        }
    }));
    console.log(`✅ Created ${instances.length} process instances\n`);

    // 11. Task Instances
    const tasks = [];
    tasks.push(await prisma.taskInstance.create({
        data: {
            instanceId: instances[3].id, nodeId: 'approval-mgr',
            name: 'Approve Requisition: Marketing Event Materials - $8,750',
            description: 'Review marketing event materials purchase request',
            taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER',
            formData: { reqNumber: 'REQ-202602-0004', department: 'Marketing', total: 8750 },
            status: 'PENDING', priority: 1, dueAt: new Date('2026-02-20T17:00:00Z'),
        }
    }));
    tasks.push(await prisma.taskInstance.create({
        data: {
            instanceId: instances[4].id, nodeId: 'approval-fin',
            name: 'Finance Review: Security Audit Service - $45,000',
            description: 'CFO review for annual security audit engagement',
            taskType: 'APPROVAL', assigneeId: users[3].id, assigneeType: 'USER',
            formData: { reqNumber: 'REQ-202602-0005', department: 'IT', total: 45000 },
            status: 'PENDING', priority: 1, dueAt: new Date('2026-02-25T17:00:00Z'),
        }
    }));
    tasks.push(await prisma.taskInstance.create({
        data: {
            instanceId: instances[5].id, nodeId: 'approval-mgr',
            name: 'CFO Review: Cloud Infrastructure - $125,000',
            description: 'Executive approval for major cloud infrastructure investment',
            taskType: 'APPROVAL', assigneeId: users[3].id, assigneeType: 'USER',
            formData: { reqNumber: 'REQ-202602-0007', department: 'Engineering', total: 125000 },
            status: 'PENDING', priority: 0, dueAt: new Date('2026-02-22T17:00:00Z'),
        }
    }));
    tasks.push(await prisma.taskInstance.create({
        data: {
            instanceId: instances[1].id, nodeId: 'action-match',
            name: 'Verify Invoice Match: Office Supply - $2,658.25',
            description: 'Three-way match: PO vs GR vs Invoice has $25 shipping variance',
            taskType: 'APPROVAL', assigneeId: users[3].id, assigneeType: 'USER',
            formData: { invoiceNumber: 'INV-202602-001', poNumber: 'PO-202602-00001', variance: -25.00 },
            status: 'PENDING', priority: 2, dueAt: new Date('2026-03-01T17:00:00Z'),
        }
    }));
    tasks.push(await prisma.taskInstance.create({
        data: {
            instanceId: instances[0].id, nodeId: 'approval-mgr',
            name: 'Approve Requisition: January Supplies - $380',
            description: 'Auto-approved (under $500 threshold)',
            taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER',
            formData: { reqNumber: 'REQ-202601-0015', total: 380 },
            status: 'COMPLETED', priority: 2,
            outcome: 'approved', completedAt: new Date('2026-01-16T09:00:00Z'),
            completedBy: adminUser.id, comments: 'Auto-approved: under $500',
        }
    }));
    console.log(`✅ Created ${tasks.length} task instances\n`);

    // 12. Form Submissions
    await prisma.formSubmission.create({
        data: {
            formId: reqForm.id,
            data: { title: 'Marketing Event Materials', department: 'marketing', costCenter: 'CC-MKT-400', priority: 'medium', requiredDate: '2026-03-15', totalAmount: 8750, justification: 'Annual marketing conference booth materials and promotional items', deliveryLocation: 'hq' },
            createdBy: users[1].id,
        }
    });
    await prisma.formSubmission.create({
        data: {
            formId: reqForm.id,
            data: { title: 'Cloud Infrastructure Expansion', department: 'engineering', costCenter: 'CC-ENG-200', priority: 'high', requiredDate: '2026-03-01', totalAmount: 125000, justification: 'Critical capacity expansion to support Q2 growth. Current utilization at 85%.', deliveryLocation: 'hq' },
            createdBy: users[2].id,
        }
    });
    console.log('✅ Created 2 form submissions\n');

    // 13. Procurement Hub App
    const procApp = await prisma.app.upsert({
        where: { accountId_slug: { accountId: account.id, slug: 'procurement' } },
        create: {
            accountId: account.id,
            name: 'Procurement Hub',
            slug: 'procurement',
            description: 'Multi-level procurement: requisitions, vendor management, POs, receiving, and invoice matching',
            icon: 'ShoppingCart',
            definition: {
                type: 'INTERNAL',
                theme: { colors: { primary: '#10B981', secondary: '#059669' } },
                navigation: [
                    { id: 'nav-dash', label: 'Dashboard', icon: 'LayoutDashboard', pageId: 'dashboard' },
                    { id: 'nav-req', label: 'Requisitions', icon: 'FilePlus', pageId: 'requisitions' },
                    { id: 'nav-po', label: 'Purchase Orders', icon: 'ClipboardList', pageId: 'purchase-orders' },
                    { id: 'nav-gr', label: 'Receiving', icon: 'Package', pageId: 'goods-receipts' },
                    { id: 'nav-inv', label: 'Invoices', icon: 'FileText', pageId: 'invoices' },
                    { id: 'nav-div', type: 'divider' },
                    { id: 'nav-vendors', label: 'Vendors', icon: 'Users', pageId: 'vendors' },
                    { id: 'nav-reports', label: 'Reports', icon: 'BarChart3', pageId: 'reports' },
                ],
                pages: [
                    {
                        id: 'dashboard', name: 'Procurement Dashboard', slug: 'dashboard', layout: 'dashboard',
                        components: [
                            { id: 'kpi-req', type: 'kpi-card', position: { x: 0, y: 0, w: 3, h: 2 }, props: { title: 'Open Requisitions', icon: 'FilePlus', color: '#3B82F6', value: '5' } },
                            { id: 'kpi-po', type: 'kpi-card', position: { x: 3, y: 0, w: 3, h: 2 }, props: { title: 'Open POs', icon: 'ClipboardList', color: '#10B981', value: '3' } },
                            { id: 'kpi-gr', type: 'kpi-card', position: { x: 6, y: 0, w: 3, h: 2 }, props: { title: 'Pending Receipts', icon: 'Package', color: '#F59E0B', value: '2' } },
                            { id: 'kpi-inv', type: 'kpi-card', position: { x: 9, y: 0, w: 3, h: 2 }, props: { title: 'Invoices to Process', icon: 'FileText', color: '#EF4444', value: '2' } },
                            { id: 'chart-spend', type: 'pie-chart', position: { x: 0, y: 2, w: 4, h: 4 }, props: { title: 'Spend by Category', donut: true, data: [{ name: 'IT Hardware', value: 49500 }, { name: 'Office Supplies', value: 2830 }, { name: 'Cloud Services', value: 18500 }, { name: 'Furniture', value: 8750 }] } },
                            { id: 'chart-monthly', type: 'line-chart', position: { x: 4, y: 2, w: 8, h: 4 }, props: { title: 'Monthly Procurement Spend', showArea: true } },
                            { id: 'table-tasks', type: 'table', position: { x: 0, y: 6, w: 6, h: 4 }, props: { title: 'My Action Items', columns: [{ field: 'name', header: 'Task' }, { field: 'status', header: 'Status' }, { field: 'dueAt', header: 'Due', format: 'date' }] } },
                            { id: 'table-vendors', type: 'table', position: { x: 6, y: 6, w: 6, h: 4 }, props: { title: 'Top Vendors', columns: [{ field: 'vendor_name', header: 'Vendor' }, { field: 'total', header: 'Total Spend', format: 'currency' }, { field: 'rating', header: 'Rating' }] } },
                        ],
                    },
                    {
                        id: 'requisitions', name: 'Requisitions', slug: 'requisitions', layout: 'single-column',
                        components: [
                            { id: 'header', type: 'heading', position: { x: 0, y: 0, w: 12, h: 1 }, props: { content: 'Purchase Requisitions', level: 'h1' } },
                            { id: 'req-table', type: 'table', position: { x: 0, y: 1, w: 12, h: 10 }, props: { columns: [{ field: 'req_number', header: 'Req #', width: 140 }, { field: 'title', header: 'Title' }, { field: 'department', header: 'Dept' }, { field: 'total_amount', header: 'Amount', format: 'currency' }, { field: 'priority', header: 'Priority' }, { field: 'status', header: 'Status' }], pageSize: 20 } },
                        ],
                    },
                    {
                        id: 'purchase-orders', name: 'Purchase Orders', slug: 'purchase-orders', layout: 'single-column',
                        components: [
                            { id: 'header', type: 'heading', position: { x: 0, y: 0, w: 12, h: 1 }, props: { content: 'Purchase Orders', level: 'h1' } },
                            { id: 'po-table', type: 'table', position: { x: 0, y: 1, w: 12, h: 10 }, props: { columns: [{ field: 'po_number', header: 'PO #', width: 150 }, { field: 'vendor_name', header: 'Vendor' }, { field: 'total', header: 'Total', format: 'currency' }, { field: 'expected_delivery', header: 'Expected', format: 'date' }, { field: 'status', header: 'Status' }], pageSize: 20 } },
                        ],
                    },
                    {
                        id: 'invoices', name: 'Invoice Matching', slug: 'invoices', layout: 'single-column',
                        components: [
                            { id: 'header', type: 'heading', position: { x: 0, y: 0, w: 12, h: 1 }, props: { content: 'Invoice Three-Way Matching', level: 'h1' } },
                            { id: 'inv-table', type: 'table', position: { x: 0, y: 1, w: 12, h: 10 }, props: { columns: [{ field: 'invoice_number', header: 'Invoice #' }, { field: 'vendor_name', header: 'Vendor' }, { field: 'po_number', header: 'PO #' }, { field: 'total', header: 'Amount', format: 'currency' }, { field: 'match_status', header: 'Match' }, { field: 'variance', header: 'Variance', format: 'currency' }, { field: 'status', header: 'Status' }], pageSize: 20 } },
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
    console.log(`✅ Created app: ${procApp.name}\n`);

    // Summary
    console.log('─'.repeat(60));
    console.log('🎉 Multi-Level Procurement System seeding complete!\n');
    console.log('Created:');
    console.log('  📋 Purchase Requisition Form (10 fields + repeater)');
    console.log('  📋 Invoice Verification Form (4 fields)');
    console.log('  🔄 Procurement Workflow (21 nodes, 24 edges)');
    console.log('  📦 Procurement Vendors (6 records)');
    console.log('  📦 Requisitions (8 records)');
    console.log('  📦 Procurement POs (5 records)');
    console.log('  📦 Goods Receipts (2 records)');
    console.log('  📦 Procurement Invoices (3 records)');
    console.log('  📝 2 Form Submissions');
    console.log(`  ⚙️  ${instances.length} Process Instances (1 completed, 5 running)`);
    console.log(`  ✅ ${tasks.length} Task Instances (1 completed, 4 pending)`);
    console.log('  📱 Procurement Hub App (4 pages)');
    console.log('');
}

seedProcurement()
    .catch((e) => { console.error('❌ Procurement seeding failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
