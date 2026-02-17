/**
 * Stationery / Sundry / Tissue / Toner & Drum Request Seed Script
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedStationerySundry() {
    console.log('📦 Seeding Stationery/Sundry/Tissue/Toner Request Flow...\n');

    const account = await prisma.account.findUnique({ where: { slug: 'demo' } });
    if (!account) throw new Error('Demo account not found. Run main seed first.');
    const adminUser = await prisma.user.findUnique({ where: { accountId_email: { accountId: account.id, email: 'admin@demo.com' } } });
    if (!adminUser) throw new Error('Demo admin user not found.');

    // Reuse MPT users from company-event seed
    const getUser = async (email: string) => {
        return prisma.user.findUnique({ where: { accountId_email: { accountId: account.id, email } } });
    };
    const yamin = await getUser('yamin.aye@demo.com');
    const aung = await getUser('aung.kyaw@demo.com');
    const thida = await getUser('thida.win@demo.com');
    const minHtet = await getUser('min.htet@demo.com');
    const suMyat = await getUser('su.myat@demo.com');

    // Create admin-specific users
    const bcryptModule = await import('bcryptjs');
    const bcryptLib = bcryptModule.default || bcryptModule;
    const passwordHash = await bcryptLib.hash('Demo123!@#', 12);

    const adminProfiles = [
        { email: 'winminhtun@demo.com', firstName: 'Win Min', lastName: 'Htun' },
        { email: 'shuaye@demo.com', firstName: 'Shu', lastName: 'Aye' },
        { email: 'khinmyowin@demo.com', firstName: 'Khin Myo', lastName: 'Win' },
        { email: 'myintmyintaye@demo.com', firstName: 'Myint Myint', lastName: 'Aye' },
        { email: 'miminye@demo.com', firstName: 'Mi Mi', lastName: 'Nge' },
    ];
    const adminUsers: any[] = [];
    for (const p of adminProfiles) {
        const u = await prisma.user.upsert({
            where: { accountId_email: { accountId: account.id, email: p.email } },
            create: { accountId: account.id, email: p.email, passwordHash, firstName: p.firstName, lastName: p.lastName, status: 'ACTIVE', emailVerified: true },
            update: {},
        });
        adminUsers.push(u);
    }
    const [tmAdmin, dgmAdmin, sundryAdmin, tissueAdmin, stationeryAdmin] = adminUsers;
    console.log('✅ Created/found admin users\n');

    // ========== DATASETS ==========

    const mkDataset = async (name: string, desc: string, schema: any[], records: any[]) => {
        const ds = await prisma.dataset.upsert({
            where: { accountId_name: { accountId: account.id, name } },
            create: { accountId: account.id, name, description: desc, schema, indexes: [], constraints: [], settings: {}, permissions: {}, rowCount: 0, createdBy: adminUser.id },
            update: {},
        });
        // Only add records if no records exist yet (checks actual count, not rowCount field)
        const existingCount = await prisma.datasetRecord.count({ where: { datasetId: ds.id } });
        if (existingCount === 0) {
            for (const r of records) {
                await prisma.datasetRecord.create({ data: { datasetId: ds.id, data: r, createdBy: adminUser.id } });
            }
            await prisma.dataset.update({ where: { id: ds.id }, data: { rowCount: records.length } });
        }
        return ds;
    };

    // Category dropdown dataset
    const sorsDs = await mkDataset('SorS', 'Stationery/Sundry/Tissue/Toner category dropdown', [
        { name: 'Category', slug: 'category', type: 'text', required: true },
    ], [
        { category: 'Stationery' }, { category: 'Sundry' }, { category: 'Tissue' }, { category: 'Toner & Drum' },
    ]);

    // Toner & Drum Price dataset
    const tonerDs = await mkDataset('TonerDrumPrice', 'Toner & Drum item price master', [
        { name: 'Item Name', slug: 'item_name', type: 'text', required: true },
        { name: 'Unit Price', slug: 'unit_price', type: 'number', required: true },
        { name: 'Compatible Model', slug: 'compatible_model', type: 'text' },
    ], [
        { item_name: 'HP 05A Black Toner', unit_price: 85000, compatible_model: 'HP LaserJet P2035/P2055' },
        { item_name: 'HP 83A Black Toner', unit_price: 75000, compatible_model: 'HP LaserJet Pro M125/M127' },
        { item_name: 'Canon 328 Toner', unit_price: 65000, compatible_model: 'Canon MF4450/MF4550' },
        { item_name: 'HP CF226A Toner', unit_price: 120000, compatible_model: 'HP LaserJet Pro M402/M426' },
        { item_name: 'HP CE505A Drum Unit', unit_price: 180000, compatible_model: 'HP LaserJet P2035/P2055' },
        { item_name: 'Brother TN-2380 Toner', unit_price: 55000, compatible_model: 'Brother HL-L2360/DCP-L2540' },
        { item_name: 'HP CF219A Drum', unit_price: 195000, compatible_model: 'HP LaserJet Pro M102/M130' },
    ]);

    // Sundry Good dataset
    const sundryDs = await mkDataset('SundryGood', 'Sundry goods item master', [
        { name: 'Item Name', slug: 'item_name', type: 'text', required: true },
        { name: 'Unit Price', slug: 'unit_price', type: 'number', required: true },
        { name: 'Item Type', slug: 'item_type', type: 'text' },
    ], [
        { item_name: 'Trash Bag (Large)', unit_price: 3500, item_type: 'Cleaning' },
        { item_name: 'Hand Soap Refill (500ml)', unit_price: 2800, item_type: 'Hygiene' },
        { item_name: 'Air Freshener Spray', unit_price: 4500, item_type: 'Cleaning' },
        { item_name: 'Floor Cleaner (1L)', unit_price: 5200, item_type: 'Cleaning' },
        { item_name: 'Paper Towel Roll', unit_price: 1500, item_type: 'Hygiene' },
        { item_name: 'Dishwashing Liquid (500ml)', unit_price: 2200, item_type: 'Kitchen' },
    ]);

    // Tissue Master dataset
    const tissueDs = await mkDataset('TissueMaster', 'Tissue item master', [
        { name: 'Item Name', slug: 'item_name', type: 'text', required: true },
        { name: 'Unit Price', slug: 'unit_price', type: 'number', required: true },
    ], [
        { item_name: 'Facial Tissue Box (200 sheets)', unit_price: 1800 },
        { item_name: 'Toilet Roll (10-pack)', unit_price: 5500 },
        { item_name: 'Wet Wipes (80 sheets)', unit_price: 2500 },
        { item_name: 'Kitchen Towel Roll (2-pack)', unit_price: 3200 },
        { item_name: 'Pocket Tissue (10-pack)', unit_price: 1200 },
    ]);

    // Stationery Master dataset
    const stationeryDs = await mkDataset('StationeryMaster', 'Stationery item master', [
        { name: 'Item Name', slug: 'item_name', type: 'text', required: true },
        { name: 'Item Type', slug: 'item_type', type: 'text', required: true },
    ], [
        { item_name: 'A4 Paper', item_type: 'Paper' },
        { item_name: 'A3 Paper', item_type: 'Paper' },
        { item_name: 'Ballpoint Pen', item_type: 'Writing' },
        { item_name: 'Marker Pen', item_type: 'Writing' },
        { item_name: 'Stapler', item_type: 'Office Supply' },
        { item_name: 'Sticky Notes', item_type: 'Office Supply' },
        { item_name: 'File Folder', item_type: 'Filing' },
        { item_name: 'Envelope (A4)', item_type: 'Mailing' },
    ]);

    // Stationery Price Master dataset
    const stationeryPriceDs = await mkDataset('StationeryPriceMaster', 'Stationery order item pricing', [
        { name: 'Order Item', slug: 'order_item', type: 'text', required: true },
        { name: 'Unit Price', slug: 'unit_price', type: 'number', required: true },
        { name: 'Item Type', slug: 'item_type', type: 'text' },
    ], [
        { order_item: 'A4 Paper (Double A 80gsm, Ream)', unit_price: 5500, item_type: 'Paper' },
        { order_item: 'A4 Paper (IK Plus 70gsm, Ream)', unit_price: 4800, item_type: 'Paper' },
        { order_item: 'A3 Paper (Double A 80gsm, Ream)', unit_price: 9500, item_type: 'Paper' },
        { order_item: 'Ballpoint Pen (Blue, Box of 12)', unit_price: 3600, item_type: 'Writing' },
        { order_item: 'Ballpoint Pen (Black, Box of 12)', unit_price: 3600, item_type: 'Writing' },
        { order_item: 'Marker Pen (Set of 4)', unit_price: 4200, item_type: 'Writing' },
        { order_item: 'Heavy Duty Stapler', unit_price: 8500, item_type: 'Office Supply' },
        { order_item: 'Sticky Notes (3x3, 5-pack)', unit_price: 2800, item_type: 'Office Supply' },
        { order_item: 'File Folder (Pack of 10)', unit_price: 6500, item_type: 'Filing' },
        { order_item: 'A4 Envelope (Pack of 50)', unit_price: 3500, item_type: 'Mailing' },
    ]);

    console.log('✅ Created 6 item/category datasets with sample data\n');

    // ========== FORM ==========
    const form = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-000000000060' },
        create: {
            id: '00000000-0000-0000-0000-000000000060',
            accountId: account.id,
            name: 'Stationery / Sundry / Tissue / Toner Request',
            description: 'Request form for office stationery, sundry goods, tissue products, and toner/drum replacements with category-specific item tables and auto-pricing.',
            fields: [
                // --- Requestor Info ---
                { id: 'ss-ref-no', name: 'referenceNumber', label: 'Reference Number', type: 'text', required: false, order: 1, config: { readonly: true, computed: 'CONCATENATE("CO","08",YEAR_2DIGIT,"B",SEQ_8DIGIT)' } },
                { id: 'ss-emp-id', name: 'employeeId', label: 'Employee ID', type: 'text', required: true, order: 2, config: { autoPopulate: 'Employee_ID_Lookup.EmployeeID' } },
                { id: 'ss-email', name: 'emailAddress', label: 'Email Address', type: 'text', required: false, order: 3, config: { readonly: true, autoPopulate: '_created_by.Email' } },
                { id: 'ss-req-date', name: 'requestedDate', label: 'Requested Date', type: 'date', required: false, order: 4, config: { readonly: true, autoPopulate: 'TODAY()' } },
                { id: 'ss-office', name: 'officeName', label: 'Office Name', type: 'text', required: false, order: 5, config: { readonly: true, autoPopulate: 'Office_Name_Lookup.OfficeDescription' } },
                { id: 'ss-division', name: 'divisionName', label: 'Division Name', type: 'text', required: false, order: 6, config: { readonly: true, autoPopulate: 'Division_Name_Lookup.DivisionDescription' } },
                { id: 'ss-dept', name: 'departmentName', label: 'Department Name', type: 'text', required: false, order: 7, config: { readonly: true, autoPopulate: 'Department_Name_Lookup.DepartmentDescription' } },
                { id: 'ss-category', name: 'categoryType', label: 'Stationery Or Sundry Or Tissue Or Toner', type: 'dropdown', required: true, order: 8, config: { datasetId: sorsDs.id, displayField: 'category', valueField: 'category', options: ['Stationery', 'Sundry', 'Tissue', 'Toner & Drum'] } },
                { id: 'ss-phone', name: 'requestorPhone', label: 'Requestor Phone Number', type: 'number', required: true, order: 9, config: { placeholder: 'Enter phone number' } },
                // --- Toner / Drum Table ---
                { id: 'ss-td-item', name: 'tonerItemName', label: 'Item Name (Toner/Drum)', type: 'lookup', required: false, order: 10, config: { datasetId: tonerDs.id, displayField: 'item_name', valueField: 'item_name', visibleWhen: 'categoryType === "Toner & Drum"' } },
                { id: 'ss-td-qty', name: 'tonerQuantity', label: 'Quantity', type: 'number', required: false, order: 11, config: { min: 1, visibleWhen: 'categoryType === "Toner & Drum"' } },
                { id: 'ss-td-price', name: 'tonerPrice', label: 'Price', type: 'number', required: false, order: 12, config: { readonly: true, computed: 'Item_Name_5.UnitPrice', prefix: 'MMK', visibleWhen: 'categoryType === "Toner & Drum"' } },
                { id: 'ss-td-subtotal', name: 'tonerSubTotal', label: 'Sub Total Price', type: 'number', required: false, order: 13, config: { readonly: true, computed: 'tonerQuantity * tonerPrice', prefix: 'MMK', visibleWhen: 'categoryType === "Toner & Drum"' } },
                { id: 'ss-td-grand', name: 'tonerGrandTotal', label: 'Grand Total Price (Toner & Drum)', type: 'number', required: false, order: 14, config: { readonly: true, aggregation: 'sum', aggregationField: 'tonerSubTotal', prefix: 'MMK', visibleWhen: 'categoryType === "Toner & Drum"' } },
                // --- Sundry Good Table ---
                { id: 'ss-sg-item', name: 'sundryItemName', label: 'Item Name (Sundry)', type: 'lookup', required: false, order: 15, config: { datasetId: sundryDs.id, displayField: 'item_name', valueField: 'item_name', visibleWhen: 'categoryType === "Sundry"' } },
                { id: 'ss-sg-qty', name: 'sundryQuantity', label: 'Quantity', type: 'number', required: false, order: 16, config: { min: 1, visibleWhen: 'categoryType === "Sundry"' } },
                { id: 'ss-sg-price', name: 'sundryPrice', label: 'Price', type: 'number', required: false, order: 17, config: { readonly: true, computed: 'Item_Name_1_2.UnitPrice', prefix: 'MMK', visibleWhen: 'categoryType === "Sundry"' } },
                { id: 'ss-sg-subtotal', name: 'sundrySubTotal', label: 'Sub Total Price', type: 'number', required: false, order: 18, config: { readonly: true, computed: 'sundryQuantity * sundryPrice', prefix: 'MMK', visibleWhen: 'categoryType === "Sundry"' } },
                { id: 'ss-sg-grand', name: 'sundryGrandTotal', label: 'Grand Total Price (Sundry)', type: 'number', required: false, order: 19, config: { readonly: true, aggregation: 'sum', aggregationField: 'sundrySubTotal', prefix: 'MMK', visibleWhen: 'categoryType === "Sundry"' } },
                // --- Tissue Table ---
                { id: 'ss-ti-item', name: 'tissueItemName', label: 'Item Name (Tissue)', type: 'lookup', required: false, order: 20, config: { datasetId: tissueDs.id, displayField: 'item_name', valueField: 'item_name', visibleWhen: 'categoryType === "Tissue"' } },
                { id: 'ss-ti-qty', name: 'tissueQuantity', label: 'Quantity', type: 'number', required: false, order: 21, config: { min: 1, visibleWhen: 'categoryType === "Tissue"' } },
                { id: 'ss-ti-price', name: 'tissueUnitPrice', label: 'Unit Price', type: 'number', required: false, order: 22, config: { readonly: true, computed: 'Item_Name.UnitPrice', prefix: 'MMK', visibleWhen: 'categoryType === "Tissue"' } },
                { id: 'ss-ti-subtotal', name: 'tissueSubTotal', label: 'Sub Total', type: 'number', required: false, order: 23, config: { readonly: true, computed: 'tissueQuantity * tissueUnitPrice', prefix: 'MMK', visibleWhen: 'categoryType === "Tissue"' } },
                { id: 'ss-ti-grand', name: 'tissueGrandTotal', label: 'Grand Total Price (Tissue)', type: 'number', required: false, order: 24, config: { readonly: true, aggregation: 'sum', aggregationField: 'tissueSubTotal', prefix: 'MMK', visibleWhen: 'categoryType === "Tissue"' } },
                // --- Stationery Table ---
                { id: 'ss-st-item', name: 'stationeryItemName', label: 'Item Name (Stationery)', type: 'lookup', required: false, order: 25, config: { datasetId: stationeryDs.id, displayField: 'item_name', valueField: 'item_name', hidden: true, visibleWhen: 'categoryType === "Stationery"' } },
                { id: 'ss-st-type', name: 'stationeryItemType', label: 'Item Type', type: 'text', required: false, order: 26, config: { readonly: true, hidden: true, computed: 'Item_Name_1.ItemType_', visibleWhen: 'categoryType === "Stationery"' } },
                { id: 'ss-st-order', name: 'stationeryOrderItem', label: 'Order Item', type: 'lookup', required: false, order: 27, config: { datasetId: stationeryPriceDs.id, displayField: 'order_item', valueField: 'order_item', visibleWhen: 'categoryType === "Stationery"' } },
                { id: 'ss-st-qty', name: 'stationeryQuantity', label: 'Quantity', type: 'number', required: false, order: 28, config: { min: 1, visibleWhen: 'categoryType === "Stationery"' } },
                { id: 'ss-st-price', name: 'stationeryUnitPrice', label: 'Unit Price', type: 'number', required: false, order: 29, config: { readonly: true, computed: 'Order_Item.UnitPrice', prefix: 'MMK', visibleWhen: 'categoryType === "Stationery"' } },
                { id: 'ss-st-subtotal', name: 'stationerySubTotal', label: 'Sub Total', type: 'number', required: false, order: 30, config: { readonly: true, computed: 'stationeryQuantity * stationeryUnitPrice', prefix: 'MMK', visibleWhen: 'categoryType === "Stationery"' } },
                { id: 'ss-st-grand', name: 'stationeryGrandTotal', label: 'Grand Total Price (Stationery)', type: 'number', required: false, order: 31, config: { readonly: true, aggregation: 'sum', aggregationField: 'stationerySubTotal', prefix: 'MMK', visibleWhen: 'categoryType === "Stationery"' } },
                // --- Admin Remark ---
                { id: 'ss-recv-date', name: 'orderReceiveDate', label: 'Order Receive Date', type: 'date', required: false, order: 32, config: { editableBy: 'role:admin', visibleAfterApproval: true } },
                { id: 'ss-remark', name: 'adminRemark', label: 'Remark', type: 'textarea', required: false, order: 33, config: { editableBy: 'role:admin', visibleAfterApproval: true, maxLength: 2000 } },
            ],
            layout: {
                columns: 2,
                sections: [
                    { title: 'Requestor Information', fields: ['ss-ref-no', 'ss-emp-id', 'ss-email', 'ss-req-date', 'ss-office', 'ss-division', 'ss-dept', 'ss-category', 'ss-phone'] },
                    { title: 'Toner / Drum Items', condition: 'categoryType === "Toner & Drum"', fields: ['ss-td-item', 'ss-td-qty', 'ss-td-price', 'ss-td-subtotal', 'ss-td-grand'] },
                    { title: 'Sundry Good Items', condition: 'categoryType === "Sundry"', fields: ['ss-sg-item', 'ss-sg-qty', 'ss-sg-price', 'ss-sg-subtotal', 'ss-sg-grand'] },
                    { title: 'Tissue Items', condition: 'categoryType === "Tissue"', fields: ['ss-ti-item', 'ss-ti-qty', 'ss-ti-price', 'ss-ti-subtotal', 'ss-ti-grand'] },
                    { title: 'Stationery Items', condition: 'categoryType === "Stationery"', fields: ['ss-st-item', 'ss-st-type', 'ss-st-order', 'ss-st-qty', 'ss-st-price', 'ss-st-subtotal', 'ss-st-grand'] },
                    { title: 'Admin Remark', fields: ['ss-recv-date', 'ss-remark'] },
                ],
            },
            validationRules: [],
            conditionalLogic: [
                { field: 'categoryType', value: 'Toner & Drum', showSections: ['Toner / Drum Items'] },
                { field: 'categoryType', value: 'Sundry', showSections: ['Sundry Good Items'] },
                { field: 'categoryType', value: 'Tissue', showSections: ['Tissue Items'] },
                { field: 'categoryType', value: 'Stationery', showSections: ['Stationery Items'] },
            ],
            settings: { submitButtonText: 'Submit Request', allowDraft: true },
            permissions: {}, version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created form: ${form.name}\n`);

    // ========== WORKFLOW ==========
    const process = await prisma.process.upsert({
        where: { id: '00000000-0000-0000-0000-000000000061' },
        create: {
            id: '00000000-0000-0000-0000-000000000061',
            accountId: account.id,
            name: 'Stationery / Sundry Request Approval Workflow',
            description: 'Multi-level approval for stationery, sundry, tissue, and toner/drum requests with category-based admin routing',
            category: 'Admin',
            definition: {
                nodes: [
                    { id: 'start', type: 'start', name: 'Submit Request', position: { x: 100, y: 300 }, config: { trigger: 'form_submission', formId: form.id } },
                    { id: 'dgm-approval', type: 'approval', name: "Requestor's DGM / DyDGM", description: 'DGM or Deputy DGM of the requestor reviews', position: { x: 350, y: 300 }, config: { assignTo: 'role:dgm', timeoutDays: 3 } },
                    { id: 'director-approval', type: 'approval', name: 'Director Approval', position: { x: 600, y: 200 }, config: { assignTo: 'role:director', timeoutDays: 3 } },
                    { id: 'dy-director-approval', type: 'approval', name: 'Deputy Director Approval', position: { x: 600, y: 400 }, config: { assignTo: 'role:dy_director', timeoutDays: 3 } },
                    { id: 'pic-tm', type: 'approval', name: "PIC's Team Manager", description: 'Person-in-charge Team Manager reviews (Toner/Drum only)', position: { x: 850, y: 300 }, config: { assignTo: 'role:pic_tm', timeoutDays: 2 } },
                    { id: 'admin-tm', type: 'approval', name: 'Admin Team Manager', description: 'U Win Min Htun', position: { x: 1100, y: 300 }, config: { assignTo: `user:${tmAdmin.id}`, timeoutDays: 2 } },
                    { id: 'dgm-admin', type: 'approval', name: 'DGM Admin Approval', description: 'Daw Shu Aye', position: { x: 1350, y: 300 }, config: { assignTo: `user:${dgmAdmin.id}`, timeoutDays: 3 } },
                    { id: 'category-route', type: 'decision', name: 'Category Router', description: 'Route to category-specific admin handler', position: { x: 1600, y: 300 }, config: {} },
                    { id: 'sundry-handler', type: 'approval', name: 'Sundry Admin', description: 'Khin Myo Win', position: { x: 1850, y: 100 }, config: { assignTo: `user:${sundryAdmin.id}`, timeoutDays: 2 } },
                    { id: 'tissue-handler', type: 'approval', name: 'Tissue Admin', description: 'Myint Myint Aye', position: { x: 1850, y: 250 }, config: { assignTo: `user:${tissueAdmin.id}`, timeoutDays: 2 } },
                    { id: 'stationery-handler', type: 'approval', name: 'Stationery Admin', description: 'Mi Mi Nge', position: { x: 1850, y: 400 }, config: { assignTo: `user:${stationeryAdmin.id}`, timeoutDays: 2 } },
                    { id: 'toner-handler', type: 'approval', name: 'Toner/Drum Admin', description: 'Khin Myo Win', position: { x: 1850, y: 550 }, config: { assignTo: `user:${sundryAdmin.id}`, timeoutDays: 2 } },
                    { id: 'email-reject', type: 'email', name: 'Rejection Notification', position: { x: 1100, y: 550 }, config: { to: '{{initiator.email}}', subject: 'Request Rejected - {{variables.referenceNumber}}' } },
                    { id: 'end-approved', type: 'end', name: 'Request Fulfilled', position: { x: 2100, y: 300 }, config: {} },
                    { id: 'end-rejected', type: 'end', name: 'Request Rejected', position: { x: 1350, y: 550 }, config: {} },
                ],
                edges: [
                    { id: 'e1', source: 'start', target: 'dgm-approval', label: 'Submit' },
                    { id: 'e2', source: 'dgm-approval', target: 'director-approval', label: 'Approved', condition: 'outcome === "approved" && variables.departmentName !== "Administration Department" && variables.hasDGM' },
                    { id: 'e2b', source: 'dgm-approval', target: 'director-approval', label: 'Always', condition: 'outcome === "approved"' },
                    { id: 'e2r', source: 'dgm-approval', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e3a', source: 'director-approval', target: 'dy-director-approval', label: 'Parallel' },
                    { id: 'e3b', source: 'director-approval', target: 'pic-tm', label: 'Toner/Drum', condition: 'outcome === "approved" && variables.categoryType === "Toner & Drum"' },
                    { id: 'e3c', source: 'director-approval', target: 'admin-tm', label: 'Stationery/Sundry', condition: 'outcome === "approved" && variables.categoryType !== "Toner & Drum"' },
                    { id: 'e3r', source: 'director-approval', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e4', source: 'pic-tm', target: 'admin-tm', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e4r', source: 'pic-tm', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e5', source: 'admin-tm', target: 'dgm-admin', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e5r', source: 'admin-tm', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e6', source: 'dgm-admin', target: 'category-route', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e6r', source: 'dgm-admin', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e7a', source: 'category-route', target: 'sundry-handler', label: 'Sundry', condition: 'variables.categoryType === "Sundry"' },
                    { id: 'e7b', source: 'category-route', target: 'tissue-handler', label: 'Tissue', condition: 'variables.categoryType === "Tissue"' },
                    { id: 'e7c', source: 'category-route', target: 'stationery-handler', label: 'Stationery', condition: 'variables.categoryType === "Stationery"' },
                    { id: 'e7d', source: 'category-route', target: 'toner-handler', label: 'Toner/Drum', condition: 'variables.categoryType === "Toner & Drum"' },
                    { id: 'e8a', source: 'sundry-handler', target: 'end-approved', label: 'Done' },
                    { id: 'e8b', source: 'tissue-handler', target: 'end-approved', label: 'Done' },
                    { id: 'e8c', source: 'stationery-handler', target: 'end-approved', label: 'Done' },
                    { id: 'e8d', source: 'toner-handler', target: 'end-approved', label: 'Done' },
                    { id: 'e9', source: 'email-reject', target: 'end-rejected', label: '' },
                ],
            },
            variables: [
                { name: 'referenceNumber', type: 'string' }, { name: 'employeeId', type: 'string' },
                { name: 'emailAddress', type: 'string' }, { name: 'officeName', type: 'string' },
                { name: 'divisionName', type: 'string' }, { name: 'departmentName', type: 'string' },
                { name: 'categoryType', type: 'string' }, { name: 'requestorPhone', type: 'string' },
                { name: 'grandTotal', type: 'number' },
            ],
            triggers: [{ type: 'form_submission', formId: form.id }],
            settings: { allowCancel: true, trackSLA: true }, permissions: {},
            slaConfig: { defaultDueHours: 72, escalationPolicy: 'notify_admin' },
            version: 1, status: 'ACTIVE', publishedAt: new Date(), createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created workflow: ${process.name}\n`);

    // ========== SAMPLE PROCESS INSTANCES ==========

    // Instance 1: RUNNING — Toner request at PIC TM stage
    const inst1 = await prisma.processInstance.create({
        data: {
            processId: process.id, processVersion: 1, status: 'RUNNING', currentNodes: ['pic-tm'],
            variables: { referenceNumber: 'CO0826B00000001', employeeId: 'MPT-0002', emailAddress: 'aung.kyaw@demo.com', officeName: 'Yangon Head Office', divisionName: 'Technology & IT', departmentName: 'Software Engineering', categoryType: 'Toner & Drum', requestorPhone: '09123456789', tonerItemName: 'HP 05A Black Toner', tonerQuantity: 5, tonerPrice: 85000, tonerSubTotal: 425000, tonerGrandTotal: 425000 },
            startedBy: aung!.id, dueAt: new Date('2026-03-05T17:00:00Z'),
        }
    });
    await prisma.taskInstance.create({ data: { instanceId: inst1.id, nodeId: 'pic-tm', name: "PIC's TM: Toner Request - 5 x HP 05A", taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER', formData: { category: 'Toner & Drum', item: 'HP 05A Black Toner', qty: 5, total: 425000 }, status: 'PENDING', priority: 1, dueAt: new Date('2026-02-25T17:00:00Z') } });

    // Instance 2: RUNNING — Stationery request at Admin TM stage
    const inst2 = await prisma.processInstance.create({
        data: {
            processId: process.id, processVersion: 1, status: 'RUNNING', currentNodes: ['admin-tm'],
            variables: { referenceNumber: 'CO0826B00000002', employeeId: 'MPT-0003', emailAddress: 'thida.win@demo.com', officeName: 'Mandalay Office', divisionName: 'Sales & Marketing', departmentName: 'Enterprise Sales', categoryType: 'Stationery', requestorPhone: '09987654321', stationeryOrderItem: 'A4 Paper (Double A 80gsm, Ream)', stationeryQuantity: 20, stationeryUnitPrice: 5500, stationerySubTotal: 110000, stationeryGrandTotal: 110000 },
            startedBy: thida!.id, dueAt: new Date('2026-03-08T17:00:00Z'),
        }
    });
    await prisma.taskInstance.create({ data: { instanceId: inst2.id, nodeId: 'admin-tm', name: 'Admin TM: Stationery - 20 x A4 Paper', taskType: 'APPROVAL', assigneeId: tmAdmin.id, assigneeType: 'USER', formData: { category: 'Stationery', item: 'A4 Paper (Double A 80gsm)', qty: 20, total: 110000 }, status: 'PENDING', priority: 1, dueAt: new Date('2026-02-28T17:00:00Z') } });

    // Instance 3: COMPLETED — Tissue request fulfilled
    const inst3 = await prisma.processInstance.create({
        data: {
            processId: process.id, processVersion: 1, status: 'COMPLETED', currentNodes: ['end-approved'],
            variables: { referenceNumber: 'CO0826B00000003', employeeId: 'MPT-0004', categoryType: 'Tissue', tissuItemName: 'Facial Tissue Box (200 sheets)', tissueQuantity: 50, tissueUnitPrice: 1800, tissueSubTotal: 90000, tissueGrandTotal: 90000 },
            startedBy: minHtet!.id, completedAt: new Date('2026-02-14T12:00:00Z'),
        }
    });
    await prisma.taskInstance.create({ data: { instanceId: inst3.id, nodeId: 'tissue-handler', name: 'Tissue Admin: 50 x Facial Tissue Box', taskType: 'APPROVAL', assigneeId: tissueAdmin.id, assigneeType: 'USER', formData: { category: 'Tissue', total: 90000 }, status: 'COMPLETED', priority: 1, outcome: 'approved', completedAt: new Date('2026-02-14T12:00:00Z'), completedBy: tissueAdmin.id } });

    // Instance 4: RUNNING — Sundry at DGM Admin stage
    const inst4 = await prisma.processInstance.create({
        data: {
            processId: process.id, processVersion: 1, status: 'RUNNING', currentNodes: ['dgm-admin'],
            variables: { referenceNumber: 'CO0826B00000004', employeeId: 'MPT-0005', categoryType: 'Sundry', sundryItemName: 'Hand Soap Refill (500ml)', sundryQuantity: 30, sundryPrice: 2800, sundrySubTotal: 84000, sundryGrandTotal: 84000 },
            startedBy: suMyat!.id, dueAt: new Date('2026-03-10T17:00:00Z'),
        }
    });
    await prisma.taskInstance.create({ data: { instanceId: inst4.id, nodeId: 'dgm-admin', name: 'DGM Admin: Sundry - 30 x Hand Soap Refill', taskType: 'APPROVAL', assigneeId: dgmAdmin.id, assigneeType: 'USER', formData: { category: 'Sundry', total: 84000 }, status: 'PENDING', priority: 1, dueAt: new Date('2026-03-01T17:00:00Z') } });

    // Instance 5: COMPLETED — Rejected toner request
    const inst5 = await prisma.processInstance.create({
        data: {
            processId: process.id, processVersion: 1, status: 'COMPLETED', currentNodes: ['end-rejected'],
            variables: { referenceNumber: 'CO0826B00000005', employeeId: 'MPT-0001', categoryType: 'Toner & Drum', tonerItemName: 'HP CF226A Toner', tonerQuantity: 50, tonerPrice: 120000, tonerSubTotal: 6000000, tonerGrandTotal: 6000000 },
            startedBy: yamin!.id, completedAt: new Date('2026-02-10T09:00:00Z'),
        }
    });
    await prisma.taskInstance.create({ data: { instanceId: inst5.id, nodeId: 'director-approval', name: 'Director: Toner Bulk Order REJECTED - MMK 6M', description: 'Excessive quantity. 50 toners is unreasonable for single request.', taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER', formData: { category: 'Toner & Drum', total: 6000000 }, status: 'COMPLETED', priority: 1, outcome: 'rejected', completedAt: new Date('2026-02-10T09:00:00Z'), completedBy: adminUser.id } });

    console.log('✅ Created 5 process instances with task instances\n');

    // Form submissions for running instances
    for (const inst of [inst1, inst2, inst4]) {
        await prisma.formSubmission.create({ data: { formId: form.id, data: inst.variables as any, createdBy: inst.startedBy } });
    }
    console.log('✅ Created 3 form submissions\n');
    console.log('📦 Stationery/Sundry/Tissue/Toner seeding complete!\n');
}

seedStationerySundry()
    .catch((e) => { console.error('❌ Seeding failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
