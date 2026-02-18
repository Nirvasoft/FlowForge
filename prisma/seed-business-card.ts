/**
 * Business Card Request System Seed Script
 * Based on: Business Card Request Data Matrix and Approval flow.xlsx
 * 
 * Master Datasets: MPTDepartment, MPTDivision, MPTEmployee, MPTOffice + 5 BC masters
 * Forms: Business Card Request, Card Approval
 * Workflow: Conditional approval (Secretary/DGM/Director paths + printing)
 * App: Business Card Management (4 pages)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function seedBusinessCard() {
    console.log('\n🃏 Seeding Business Card Request System...\n');
    const account = await prisma.account.findFirst({ where: { slug: 'demo' } });
    if (!account) throw new Error('Demo account not found. Run main seed first.');
    const adminUser = await prisma.user.findFirst({ where: { accountId: account.id, email: 'admin@demo.com' } });
    if (!adminUser) throw new Error('Admin user not found. Run main seed first.');

    // ========================================================================
    // 1. USERS
    // ========================================================================
    const userData = [
        { firstName: 'Aung', lastName: 'Min', email: 'aung.min@mpt.com' },
        { firstName: 'Thida', lastName: 'Win', email: 'thida.win@mpt.com' },
        { firstName: 'Kyaw', lastName: 'Zaw', email: 'kyaw.zaw@mpt.com' },
        { firstName: 'Han', lastName: 'Myint', email: 'han.myint@mpt.com' },
        { firstName: 'Su Su', lastName: 'Lwin', email: 'su.lwin@mpt.com' },
        { firstName: 'Zaw', lastName: 'Lin', email: 'zaw.lin@mpt.com' },
        { firstName: 'Nyi', lastName: 'Nyi', email: 'nyi.nyi@mpt.com' },
        { firstName: 'May', lastName: 'Thu', email: 'may.thu@mpt.com' },
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
    const [aungMin, thidaWin, kyawZaw, hanMyint, suLwin, zawLin, nyiNyi, mayThu] = users;
    console.log(`✅ Created ${users.length} MPT users\n`);

    // ========================================================================
    // 2. MASTER DATASETS
    // ========================================================================

    // Helper to create dataset + records
    async function createMasterDataset(name: string, desc: string, schema: any[], records: any[]) {
        const ds = await prisma.dataset.upsert({
            where: { accountId_name: { accountId: account!.id, name } },
            create: { accountId: account!.id, name, description: desc, schema, indexes: [], constraints: [], settings: {}, permissions: {}, rowCount: 0, createdBy: adminUser!.id },
            update: {},
        });
        const existing = await prisma.datasetRecord.count({ where: { datasetId: ds.id } });
        if (existing === 0) {
            for (const r of records) await prisma.datasetRecord.create({ data: { datasetId: ds.id, data: r, createdBy: adminUser!.id } });
            await prisma.dataset.update({ where: { id: ds.id }, data: { rowCount: records.length } });
        }
        console.log(`  📊 ${name}: ${records.length} records`);
        return ds;
    }

    // 2a. MPT Department Master
    await createMasterDataset('MPTDepartmentMaster', 'MPT Department master data', [
        { name: 'Code', slug: 'code', type: 'text', required: true },
        { name: 'Department Description', slug: 'DepartmentDescription', type: 'text', required: true },
    ], [
        { code: 'DEPT-001', DepartmentDescription: 'Network Operations' },
        { code: 'DEPT-002', DepartmentDescription: 'Human Resources' },
        { code: 'DEPT-003', DepartmentDescription: 'Finance & Accounting' },
        { code: 'DEPT-004', DepartmentDescription: 'Information Technology' },
        { code: 'DEPT-005', DepartmentDescription: 'Corporate Planning' },
        { code: 'DEPT-006', DepartmentDescription: 'Customer Service' },
    ]);

    // 2b. MPT Division Master
    await createMasterDataset('MPTDivisionMaster', 'MPT Division master data', [
        { name: 'Code', slug: 'code', type: 'text', required: true },
        { name: 'Division Name', slug: 'DivisionName', type: 'text', required: true },
    ], [
        { code: 'DIV-01', DivisionName: 'Telecom Division' },
        { code: 'DIV-02', DivisionName: 'Postal Division' },
        { code: 'DIV-03', DivisionName: 'Digital Services Division' },
        { code: 'DIV-04', DivisionName: 'Corporate Affairs Division' },
        { code: 'DIV-05', DivisionName: 'International Relations Division' },
    ]);

    // 2c. MPT Employee Master
    await createMasterDataset('MPTEmployeeMaster', 'MPT Employee master data', [
        { name: 'Employee ID', slug: 'EmployeeID', type: 'text', required: true },
        { name: 'Name', slug: 'name', type: 'text', required: true },
        { name: 'Email', slug: 'email', type: 'text' },
        { name: 'Department', slug: 'department', type: 'text' },
        { name: 'Position', slug: 'position', type: 'text' },
    ], users.map((u, i) => ({
        EmployeeID: `MPT-${String(1001 + i).padStart(4, '0')}`,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        department: ['Network Operations', 'Human Resources', 'Finance & Accounting', 'Information Technology', 'Corporate Planning', 'Customer Service', 'Network Operations', 'Digital Services'][i],
        position: ['Engineer', 'Secretary', 'Deputy General Manager', 'General Manager', 'Director', 'Admin Officer', 'Senior Engineer', 'Analyst'][i],
    })));

    // 2d. MPT Office Master
    await createMasterDataset('MPTOfficeMaster', 'MPT Office locations', [
        { name: 'Code', slug: 'code', type: 'text', required: true },
        { name: 'Office Name', slug: 'officeName', type: 'text', required: true },
        { name: 'Address', slug: 'Offaddress', type: 'text' },
    ], [
        { code: 'OFF-HQ', officeName: 'Head Office', Offaddress: 'No. 43, Bo Aung Kyaw Street, Botataung Tsp, Yangon' },
        { code: 'OFF-NPT', officeName: 'Nay Pyi Taw Office', Offaddress: 'Ministry of Transport and Communications, Nay Pyi Taw' },
        { code: 'OFF-MDY', officeName: 'Mandalay Office', Offaddress: '80th Street, Mandalay' },
        { code: 'OFF-SGN', officeName: 'Sagaing Office', Offaddress: 'Sagaing Region Office' },
    ]);

    // 2e. Position Business Card Master
    await createMasterDataset('PositionBusinessCardMaster', 'Positions for business cards', [
        { name: 'Position Eng', slug: 'positionEng', type: 'text', required: true },
        { name: 'Position MM', slug: 'positionmm', type: 'text' },
    ], [
        { positionEng: 'Managing Director', positionmm: 'အုပ်ချုပ်မှုဒါရိုက်တာ' },
        { positionEng: 'Director', positionmm: 'ဒါရိုက်တာ' },
        { positionEng: 'General Manager', positionmm: 'အထွေထွေမန်နေဂျာ' },
        { positionEng: 'Deputy General Manager', positionmm: 'ဒုတိယအထွေထွေမန်နေဂျာ' },
        { positionEng: 'Senior Engineer', positionmm: 'အကြီးတန်းအင်ဂျင်နီယာ' },
        { positionEng: 'Engineer', positionmm: 'အင်ဂျင်နီယာ' },
        { positionEng: 'Manager', positionmm: 'မန်နေဂျာ' },
        { positionEng: 'Assistant Manager', positionmm: 'လက်ထောက်မန်နေဂျာ' },
    ]);

    // 2f. Division Business Card Master
    await createMasterDataset('DivisionBusinessCardMaster', 'Divisions for business cards', [
        { name: 'Division Eng', slug: 'DivEng', type: 'text', required: true },
        { name: 'Division MM', slug: 'DivMM', type: 'text' },
    ], [
        { DivEng: 'Telecom Division', DivMM: 'ဆက်သွယ်ရေးဌာန' },
        { DivEng: 'Postal Division', DivMM: 'စာတိုက်ဌာန' },
        { DivEng: 'Digital Services Division', DivMM: 'ဒစ်ဂျစ်တယ်ဝန်ဆောင်မှုဌာန' },
        { DivEng: 'Corporate Affairs Division', DivMM: 'ကော်ပိုရိတ်ဌာန' },
        { DivEng: 'International Relations Division', DivMM: 'နိုင်ငံတကာဆက်ဆံရေးဌာန' },
    ]);

    // 2g. Department Business Card Master
    await createMasterDataset('DepartmentBusinessCardMaster', 'Departments for business cards', [
        { name: 'Department Eng', slug: 'DeptEng', type: 'text', required: true },
        { name: 'Department MM', slug: 'Deptmm', type: 'text' },
    ], [
        { DeptEng: 'Network Operations', Deptmm: 'ကွန်ယက်လုပ်ငန်းဌာန' },
        { DeptEng: 'Human Resources', Deptmm: 'လူ့စွမ်းအားအရင်းအမြစ်ဌာန' },
        { DeptEng: 'Finance & Accounting', Deptmm: 'ငွေကြေးနှင့်စာရင်းဌာန' },
        { DeptEng: 'Information Technology', Deptmm: 'သတင်းအချက်အလက်နည်းပညာဌာန' },
        { DeptEng: 'Corporate Planning', Deptmm: 'စီးပွားရေးစီမံကိန်းဌာန' },
        { DeptEng: 'Customer Service', Deptmm: 'ဖောက်သည်ဝန်ဆောင်မှုဌာန' },
    ]);

    // 2h. Operation Business Card Master
    await createMasterDataset('OperationBusinessCardMaster', 'Operations for business cards', [
        { name: 'Operation Eng', slug: 'OperationEng', type: 'text', required: true },
        { name: 'Operation MM', slug: 'OperationMM', type: 'text' },
    ], [
        { OperationEng: 'Network Planning', OperationMM: 'ကွန်ယက်စီမံကိန်း' },
        { OperationEng: 'Transmission', OperationMM: 'ထုတ်လွှင့်မှု' },
        { OperationEng: 'Switching', OperationMM: 'ခလုတ် (Switching)' },
        { OperationEng: 'Mobile Network', OperationMM: 'မိုဘိုင်းကွန်ယက်' },
        { OperationEng: 'OSS/BSS', OperationMM: 'OSS/BSS' },
    ]);

    // 2i. Fax Master
    await createMasterDataset('FaxMaster', 'Fax numbers for offices', [
        { name: 'Office', slug: 'office', type: 'text', required: true },
        { name: 'Fax Number', slug: 'faxNumber', type: 'text', required: true },
    ], [
        { office: 'Head Office', faxNumber: '+95-1-371-584' },
        { office: 'Nay Pyi Taw Office', faxNumber: '+95-67-407-225' },
        { office: 'Mandalay Office', faxNumber: '+95-2-34567' },
    ]);

    console.log(`\n✅ Created 9 master datasets\n`);

    // ========================================================================
    // 3. BUSINESS CARD REQUESTS DATASET
    // ========================================================================
    const bcRequestsDs = await createMasterDataset('Business Card Requests', 'Business card request records', [
        { name: 'Reference Number', slug: 'referenceNumber', type: 'text', required: true },
        { name: 'Employee ID', slug: 'employeeId', type: 'text' },
        { name: 'Requested Date', slug: 'requestedDate', type: 'date' },
        { name: 'Department', slug: 'department', type: 'text' },
        { name: 'Eng Name', slug: 'engName', type: 'text', required: true },
        { name: 'MM Name', slug: 'mmName', type: 'text' },
        { name: 'Position', slug: 'position', type: 'text' },
        { name: 'Number of Cards', slug: 'numberOfCards', type: 'number' },
        { name: 'Office', slug: 'office', type: 'text' },
        { name: 'Status', slug: 'status', type: 'select', required: true },
    ], [
        { referenceNumber: 'CO0926B00000001', employeeId: 'MPT-1001', requestedDate: '2026-01-15', department: 'Network Operations', engName: 'Aung Min', mmName: 'အောင်မင်း', position: 'Engineer', numberOfCards: 200, office: 'Head Office', status: 'Delivered' },
        { referenceNumber: 'CO0926B00000002', employeeId: 'MPT-1007', requestedDate: '2026-02-01', department: 'Network Operations', engName: 'Nyi Nyi', mmName: 'ညီညီ', position: 'Senior Engineer', numberOfCards: 100, office: 'Head Office', status: 'Pending DGM Approval' },
        { referenceNumber: 'CO0926B00000003', employeeId: 'MPT-1008', requestedDate: '2026-02-05', department: 'Digital Services', engName: 'May Thu', mmName: 'မေသူ', position: 'Analyst', numberOfCards: 100, office: 'Nay Pyi Taw Office', status: 'Pending Director Approval' },
        { referenceNumber: 'CO0926B00000004', employeeId: 'MPT-1001', requestedDate: '2026-02-10', department: 'Network Operations', engName: 'Aung Min', mmName: 'အောင်မင်း', position: 'Engineer', numberOfCards: 200, office: 'Head Office', status: 'Printing' },
        { referenceNumber: 'CO0926B00000005', employeeId: 'MPT-1002', requestedDate: '2026-02-12', department: 'Human Resources', engName: 'Thida Win', mmName: 'သီတာဝင်း', position: 'Secretary', numberOfCards: 50, office: 'Head Office', status: 'Pending Secretary Approval' },
        { referenceNumber: 'CO0926B00000006', employeeId: 'MPT-1004', requestedDate: '2026-02-14', department: 'Finance & Accounting', engName: 'Han Myint', mmName: 'ဟန်မြင့်', position: 'General Manager', numberOfCards: 300, office: 'Nay Pyi Taw Office', status: 'Submitted' },
    ]);
    console.log(`\n✅ Business Card Requests dataset created\n`);

    // ========================================================================
    // 4. FORMS
    // ========================================================================

    // 4a. Business Card Request Form
    const bcForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-0000000bc001' },
        create: {
            id: '00000000-0000-0000-0000-0000000bc001',
            accountId: account.id,
            name: 'Business Card Request',
            description: 'Request new business cards for MPT staff',
            fields: [
                // Section 1: Requestor Info
                { id: 'f-refno', name: 'referenceNumber', type: 'text', label: 'Reference Number', readOnly: true, formula: 'CONCATENATE("CO","09",YEAR_LAST2,"B",SEQ("00000000"))' },
                { id: 'f-empid', name: 'employeeId', type: 'lookup', label: 'Employee ID Number', lookupDataset: 'MPTEmployeeMaster', lookupField: 'EmployeeID' },
                { id: 'f-reqdate', name: 'requestedDate', type: 'date', label: 'Requested Date', readOnly: true, formula: '_created_at' },
                { id: 'f-dept', name: 'department', type: 'lookup', label: 'Department', lookupDataset: 'MPTDepartmentMaster', lookupField: 'DepartmentDescription' },
                { id: 'f-email', name: 'emailAddress', type: 'email', label: 'Email Address', readOnly: true, formula: '_created_by.Email' },
                { id: 'f-phone', name: 'phone', type: 'number', label: 'Phone' },
                { id: 'f-secadv', name: 'secretaryAdvisor', type: 'toggle', label: 'Secretary/Advisor', defaultValue: false },
                { id: 'f-secadvto', name: 'secretaryAdvisorTo', type: 'user', label: 'Secretary/Advisor To' },
                // Section 2: Card Details
                { id: 'f-numcards', name: 'numberOfCards', type: 'select', label: 'Number of Cards', required: true, options: [{ value: '50', label: '50' }, { value: '100', label: '100' }, { value: '200', label: '200' }, { value: '300', label: '300' }, { value: '500', label: '500' }] },
                { id: 'f-engname', name: 'engName', type: 'text', label: 'Eng-Name', required: true },
                { id: 'f-kanjireq', name: 'kanjiNameRequired', type: 'toggle', label: 'Kanji Name Require?' },
                { id: 'f-kanjiname', name: 'kanjiName', type: 'text', label: 'Kanji-Name' },
                { id: 'f-mmforeigner', name: 'mmNameForeigner', type: 'text', label: 'MM Name for Foreigner' },
                { id: 'f-mmname', name: 'mmName', type: 'text', label: 'MM-Name', required: true },
                { id: 'f-position', name: 'position', type: 'lookup', label: 'Position', required: true, lookupDataset: 'PositionBusinessCardMaster', lookupField: 'positionEng' },
                { id: 'f-mmposition', name: 'mmPosition', type: 'text', label: 'MM-Position', readOnly: true, formula: 'Position.positionmm' },
                { id: 'f-oddsection', name: 'officeDivDept', type: 'checkbox', label: 'Office/Division/Department' },
                { id: 'f-office', name: 'office', type: 'lookup', label: 'Office', required: true, lookupDataset: 'MPTOfficeMaster', lookupField: 'officeName' },
                { id: 'f-division', name: 'division', type: 'lookup', label: 'Division', lookupDataset: 'DivisionBusinessCardMaster', lookupField: 'DivEng' },
                { id: 'f-mmdivision', name: 'mmDivision', type: 'text', label: 'MM-Division', readOnly: true, formula: 'Division.DivMM' },
                { id: 'f-deptbc', name: 'departmentBC', type: 'lookup', label: 'Department', lookupDataset: 'DepartmentBusinessCardMaster', lookupField: 'DeptEng' },
                { id: 'f-mmdept', name: 'mmDepartment', type: 'text', label: 'MM-Department', readOnly: true, formula: 'Department__1.Deptmm' },
                { id: 'f-operation', name: 'operation', type: 'lookup', label: 'Operation', required: true, lookupDataset: 'OperationBusinessCardMaster', lookupField: 'OperationEng' },
                { id: 'f-mmoperation', name: 'mmOperation', type: 'text', label: 'MM-Operation', readOnly: true, formula: 'Operation.OperationMM' },
                { id: 'f-365email', name: 'mptJoEmail', type: 'email', label: 'MPT-JO Email Address (365 email address)' },
                { id: 'f-mobile', name: 'mobilePhone', type: 'text', label: 'Mobile Phone' },
                { id: 'f-group', name: 'group', type: 'select', label: 'Group', options: [{ value: 'Group A', label: 'Group A' }, { value: 'Group B', label: 'Group B' }, { value: 'Group C', label: 'Group C' }] },
                { id: 'f-fax', name: 'fax', type: 'lookup', label: 'Fax', lookupDataset: 'FaxMaster', lookupField: 'faxNumber' },
                { id: 'f-address', name: 'officeAddress', type: 'text', label: 'Office Location / Address', readOnly: true, formula: 'Location_.Offaddress' },
            ],
            layout: {
                sections: [
                    { title: 'Requestor Information', fields: ['f-refno', 'f-empid', 'f-reqdate', 'f-dept', 'f-email', 'f-phone', 'f-secadv', 'f-secadvto'] },
                    { title: 'Card Requestor Information', fields: ['f-numcards', 'f-engname', 'f-kanjireq', 'f-kanjiname', 'f-mmforeigner', 'f-mmname', 'f-position', 'f-mmposition', 'f-oddsection', 'f-office', 'f-division', 'f-mmdivision', 'f-deptbc', 'f-mmdept', 'f-operation', 'f-mmoperation', 'f-365email', 'f-mobile', 'f-group', 'f-fax', 'f-address'] },
                ],
            },
            validationRules: [],
            conditionalLogic: [
                { field: 'f-secadvto', condition: "secretaryAdvisor === true", action: 'show' },
                { field: 'f-kanjiname', condition: "kanjiNameRequired === true", action: 'show' },
                { field: 'f-mmforeigner', condition: "kanjiNameRequired === true", action: 'show' },
            ],
            settings: { submitButtonText: 'Submit Request', showProgressBar: true, allowDraft: true },
            permissions: {},
            version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created form: ${bcForm.name}\n`);

    // 4b. Card Approval Form
    const approvalForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-0000000bc002' },
        create: {
            id: '00000000-0000-0000-0000-0000000bc002',
            accountId: account.id,
            name: 'Business Card Approval',
            description: 'Approve or reject a business card request',
            fields: [
                { id: 'f-decision', name: 'decision', type: 'radio', label: 'Decision', required: true, options: [{ value: 'approve', label: '✅ Approve' }, { value: 'reject', label: '❌ Reject' }, { value: 'revise', label: '🔄 Request Revision' }] },
                { id: 'f-comments', name: 'comments', type: 'textarea', label: 'Comments' },
            ],
            layout: { sections: [{ title: 'Approval Decision', fields: ['f-decision', 'f-comments'] }] },
            validationRules: [],
            conditionalLogic: [{ field: 'f-comments', condition: "decision !== 'approve'", action: 'require' }],
            settings: { submitButtonText: 'Submit Decision', showProgressBar: false },
            permissions: {},
            version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created form: ${approvalForm.name}\n`);

    // ========================================================================
    // 5. WORKFLOW (13 nodes, 15 edges)
    // ========================================================================
    const bcProcess = await prisma.process.upsert({
        where: { id: '00000000-0000-0000-0000-0000000bc080' },
        create: {
            id: '00000000-0000-0000-0000-0000000bc080',
            accountId: account.id,
            name: 'Business Card Approval Workflow',
            description: 'Conditional approval: Secretary/DGM/Director paths + card printing & delivery',
            category: 'Administration',
            definition: {
                nodes: [
                    { id: 'start-1', type: 'start', name: 'Submit BC Request', position: { x: 100, y: 300 }, config: { trigger: 'form_submission', formId: bcForm.id } },
                    { id: 'action-validate', type: 'action', name: 'Validate Request', position: { x: 350, y: 300 }, config: { action: 'validate_form' } },
                    { id: 'decision-sec', type: 'decision', name: 'Secretary/Advisor?', position: { x: 600, y: 300 }, config: {}, condition: 'variables.secretaryAdvisor === true' },
                    { id: 'approval-sec', type: 'approval', name: 'Secretary Approval', position: { x: 850, y: 150 }, config: { assignTo: 'variables.secretaryAdvisorTo', formId: approvalForm.id, timeoutDays: 3 } },
                    { id: 'decision-dgm', type: 'decision', name: 'DGM/Dy-DGM Available?', position: { x: 850, y: 450 }, config: {}, condition: 'variables.dgmEmail !== null || variables.dyDgmEmail !== null' },
                    { id: 'approval-dgm', type: 'approval', name: 'DGM Approval', position: { x: 1100, y: 450 }, config: { assignTo: 'variables.dgmEmail || variables.dyDgmEmail', formId: approvalForm.id, timeoutDays: 5 } },
                    { id: 'decision-dir', type: 'decision', name: 'Director Available?', position: { x: 1350, y: 300 }, config: {}, condition: 'variables.directorEmail !== null' },
                    { id: 'approval-dir', type: 'approval', name: 'Director Approval', position: { x: 1600, y: 200 }, config: { assignTo: 'variables.directorEmail', formId: approvalForm.id, timeoutDays: 7 } },
                    { id: 'action-print', type: 'action', name: 'Print Business Cards', position: { x: 1850, y: 300 }, config: { action: 'print_cards', assignTo: 'role:admin' } },
                    { id: 'action-deliver', type: 'action', name: 'Deliver Cards', position: { x: 2100, y: 300 }, config: { action: 'deliver_cards' } },
                    { id: 'email-notify', type: 'email', name: 'Notify Requestor', position: { x: 2350, y: 300 }, config: { template: 'bc-ready' } },
                    { id: 'end-complete', type: 'end', name: 'Completed', position: { x: 2600, y: 300 }, config: {} },
                    { id: 'end-rejected', type: 'end', name: 'Rejected', position: { x: 1350, y: 600 }, config: {} },
                ],
                edges: [
                    { id: 'e1', source: 'start-1', target: 'action-validate' },
                    { id: 'e2', source: 'action-validate', target: 'decision-sec' },
                    { id: 'e3', source: 'decision-sec', target: 'approval-sec', label: 'Yes - Secretary', condition: 'true' },
                    { id: 'e4', source: 'decision-sec', target: 'decision-dgm', label: 'No', condition: 'false' },
                    { id: 'e5', source: 'approval-sec', target: 'decision-dir', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e6', source: 'approval-sec', target: 'end-rejected', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e7', source: 'decision-dgm', target: 'approval-dgm', label: 'DGM Available', condition: 'true' },
                    { id: 'e8', source: 'decision-dgm', target: 'decision-dir', label: 'No DGM', condition: 'false' },
                    { id: 'e9', source: 'approval-dgm', target: 'decision-dir', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e10', source: 'approval-dgm', target: 'end-rejected', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e11', source: 'decision-dir', target: 'approval-dir', label: 'Director Available', condition: 'true' },
                    { id: 'e12', source: 'decision-dir', target: 'action-print', label: 'No Director', condition: 'false' },
                    { id: 'e13', source: 'approval-dir', target: 'action-print', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e14', source: 'approval-dir', target: 'end-rejected', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e15', source: 'action-print', target: 'action-deliver' },
                    { id: 'e16', source: 'action-deliver', target: 'email-notify' },
                    { id: 'e17', source: 'email-notify', target: 'end-complete' },
                ],
            },
            variables: [
                { name: 'referenceNumber', type: 'string', label: 'Reference Number' },
                { name: 'employeeId', type: 'string', label: 'Employee ID' },
                { name: 'engName', type: 'string', label: 'English Name' },
                { name: 'mmName', type: 'string', label: 'Myanmar Name' },
                { name: 'position', type: 'string', label: 'Position' },
                { name: 'department', type: 'string', label: 'Department' },
                { name: 'numberOfCards', type: 'number', label: 'Number of Cards' },
                { name: 'secretaryAdvisor', type: 'boolean', label: 'Is Secretary/Advisor' },
                { name: 'secretaryAdvisorTo', type: 'string', label: 'Secretary/Advisor To' },
                { name: 'dgmEmail', type: 'string', label: 'DGM Email' },
                { name: 'dyDgmEmail', type: 'string', label: 'Dy-DGM Email' },
                { name: 'directorEmail', type: 'string', label: 'Director Email' },
            ],
            triggers: [{ type: 'form_submission', formId: bcForm.id }],
            settings: {}, permissions: {},
            slaConfig: { defaultDueDays: 5 },
            version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created workflow: ${bcProcess.name} (13 nodes, 17 edges)\n`);

    // ========================================================================
    // 6. PROCESS INSTANCES & TASK INSTANCES
    // ========================================================================

    // Instance 1: Completed (Delivered)
    const inst1 = await prisma.processInstance.create({
        data: {
            processId: bcProcess.id, processVersion: 1, status: 'COMPLETED',
            currentNodes: ['end-complete'],
            variables: { referenceNumber: 'CO0926B00000001', engName: 'Aung Min', mmName: 'အောင်မင်း', position: 'Engineer', department: 'Network Operations', numberOfCards: 200, secretaryAdvisor: false, dgmEmail: hanMyint.email, directorEmail: suLwin.email },
            startedBy: aungMin.id, completedAt: new Date('2026-01-28'),
        },
    });
    await prisma.taskInstance.createMany({
        data: [
            { instanceId: inst1.id, nodeId: 'approval-dgm', name: 'DGM Approval – Aung Min BC', taskType: 'APPROVAL', assigneeId: hanMyint.id, status: 'COMPLETED', outcome: 'approved', completedAt: new Date('2026-01-18'), completedBy: hanMyint.id, formData: { engName: 'Aung Min', numberOfCards: 200, position: 'Engineer', department: 'Network Operations' }, dueAt: new Date('2026-01-23'), priority: 1 },
            { instanceId: inst1.id, nodeId: 'approval-dir', name: 'Director Approval – Aung Min BC', taskType: 'APPROVAL', assigneeId: suLwin.id, status: 'COMPLETED', outcome: 'approved', completedAt: new Date('2026-01-22'), completedBy: suLwin.id, formData: { engName: 'Aung Min', numberOfCards: 200, position: 'Engineer' }, dueAt: new Date('2026-01-25'), priority: 1 },
            { instanceId: inst1.id, nodeId: 'action-print', name: 'Print Cards – Aung Min', taskType: 'TASK', assigneeId: zawLin.id, status: 'COMPLETED', outcome: 'completed', completedAt: new Date('2026-01-26'), completedBy: zawLin.id, formData: { engName: 'Aung Min', numberOfCards: 200 }, priority: 2 },
        ]
    });

    // Instance 2: Pending DGM Approval
    const inst2 = await prisma.processInstance.create({
        data: {
            processId: bcProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['approval-dgm'],
            variables: { referenceNumber: 'CO0926B00000002', engName: 'Nyi Nyi', mmName: 'ညီညီ', position: 'Senior Engineer', department: 'Network Operations', numberOfCards: 100, secretaryAdvisor: false, dgmEmail: hanMyint.email, directorEmail: suLwin.email },
            startedBy: nyiNyi.id,
        },
    });
    await prisma.taskInstance.create({
        data: {
            instanceId: inst2.id, nodeId: 'approval-dgm', name: 'DGM Approval – Nyi Nyi BC Request', taskType: 'APPROVAL', status: 'PENDING', candidateUsers: [hanMyint.id], formData: { engName: 'Nyi Nyi', mmName: 'ညီညီ', numberOfCards: 100, position: 'Senior Engineer', department: 'Network Operations', office: 'Head Office' }, dueAt: new Date('2026-02-06'), priority: 1,
        }
    });

    // Instance 3: Pending Director Approval
    const inst3 = await prisma.processInstance.create({
        data: {
            processId: bcProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['approval-dir'],
            variables: { referenceNumber: 'CO0926B00000003', engName: 'May Thu', mmName: 'မေသူ', position: 'Analyst', department: 'Digital Services', numberOfCards: 100, secretaryAdvisor: false, dgmEmail: null, directorEmail: suLwin.email },
            startedBy: mayThu.id,
        },
    });
    await prisma.taskInstance.create({
        data: {
            instanceId: inst3.id, nodeId: 'approval-dir', name: 'Director Approval – May Thu BC Request', taskType: 'APPROVAL', status: 'PENDING', candidateUsers: [suLwin.id], formData: { engName: 'May Thu', mmName: 'မေသူ', numberOfCards: 100, position: 'Analyst', department: 'Digital Services', office: 'Nay Pyi Taw Office' }, dueAt: new Date('2026-02-12'), priority: 0,
        }
    });

    // Instance 4: Printing stage
    const inst4 = await prisma.processInstance.create({
        data: {
            processId: bcProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['action-print'],
            variables: { referenceNumber: 'CO0926B00000004', engName: 'Aung Min', mmName: 'အောင်မင်း', numberOfCards: 200, secretaryAdvisor: false },
            startedBy: aungMin.id,
        },
    });
    await prisma.taskInstance.create({
        data: {
            instanceId: inst4.id, nodeId: 'action-print', name: 'Print Cards – Aung Min (2nd Order)', taskType: 'TASK', status: 'CLAIMED', assigneeId: zawLin.id, formData: { engName: 'Aung Min', mmName: 'အောင်မင်း', numberOfCards: 200, position: 'Engineer', mmPosition: 'အင်ဂျင်နီယာ', office: 'Head Office', officeAddress: 'No. 43, Bo Aung Kyaw Street' }, dueAt: new Date('2026-02-18'), priority: 2,
        }
    });

    // Instance 5: Pending Secretary Approval
    const inst5 = await prisma.processInstance.create({
        data: {
            processId: bcProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['approval-sec'],
            variables: { referenceNumber: 'CO0926B00000005', engName: 'Thida Win', mmName: 'သီတာဝင်း', position: 'Secretary', department: 'Human Resources', numberOfCards: 50, secretaryAdvisor: true, secretaryAdvisorTo: hanMyint.email },
            startedBy: thidaWin.id,
        },
    });
    await prisma.taskInstance.create({
        data: {
            instanceId: inst5.id, nodeId: 'approval-sec', name: 'Secretary Approval – Thida Win BC Request', taskType: 'APPROVAL', status: 'PENDING', candidateUsers: [hanMyint.id], formData: { engName: 'Thida Win', mmName: 'သီတာဝင်း', numberOfCards: 50, position: 'Secretary', department: 'Human Resources', secretaryAdvisor: true }, dueAt: new Date('2026-02-15'), priority: 1,
        }
    });

    // Create form submissions for all instances
    for (const inst of [inst1, inst2, inst3, inst4, inst5]) {
        const vars = inst.variables as any;
        await prisma.formSubmission.create({
            data: {
                formId: bcForm.id,
                data: vars,
                createdBy: inst.startedBy,
            },
        });
    }

    console.log(`✅ Created 5 process instances with task instances and form submissions\n`);

    // Create approval form submissions for completed approvals
    // Instance 1: DGM approved, Director approved, Print completed
    await prisma.formSubmission.create({
        data: { formId: approvalForm.id, data: { decision: 'approve', comments: 'Approved. Standard card order for engineer.' }, createdBy: hanMyint.id },
    });
    await prisma.formSubmission.create({
        data: { formId: approvalForm.id, data: { decision: 'approve', comments: 'Cards approved for Aung Min.' }, createdBy: suLwin.id },
    });

    console.log(`✅ Created 2 approval form submissions\n`);

    // ========================================================================
    // 7. APPLICATION
    // ========================================================================
    const app = await prisma.app.upsert({
        where: { accountId_slug: { accountId: account.id, slug: 'business-card-mgmt' } },
        create: {
            accountId: account.id, name: 'Business Card Management', slug: 'business-card-mgmt',
            description: 'MPT Business Card Request and Approval System',
            icon: '🃏', status: 'PUBLISHED',
            settings: { navigation: 'sidebar', theme: 'default', color: '#7C3AED' },
            permissions: {},
            createdBy: adminUser.id,
        },
        update: {},
    });
    const pages = [
        { name: 'Dashboard', route: '/dashboard', layout: { components: [{ type: 'stats_cards', config: { datasetId: bcRequestsDs.id } }, { type: 'task_inbox', config: { filterWorkflowId: bcProcess.id } }, { type: 'recent_requests', config: { datasetId: bcRequestsDs.id, limit: 5 } }] }, title: 'BC Dashboard' },
        { name: 'New Request', route: '/new-request', layout: { components: [{ type: 'form_renderer', config: { formId: bcForm.id } }] }, title: 'New Business Card Request' },
        { name: 'Request List', route: '/requests', layout: { components: [{ type: 'data_table', config: { datasetId: bcRequestsDs.id, columns: ['referenceNumber', 'engName', 'department', 'numberOfCards', 'status'] } }] }, title: 'All Requests' },
        { name: 'Approvals', route: '/approvals', layout: { components: [{ type: 'task_inbox', config: { filterWorkflowId: bcProcess.id, filterType: 'APPROVAL' } }] }, title: 'Pending Approvals' },
    ];
    for (const p of pages) {
        await prisma.appPage.upsert({
            where: { appId_route: { appId: app.id, route: p.route } },
            create: { appId: app.id, name: p.name, route: p.route, layout: p.layout, dataSources: [], permissions: {}, title: p.title },
            update: {},
        });
    }
    console.log(`✅ Created app: ${app.name} (${pages.length} pages)\n`);

    console.log('🎉 Business Card Request System seeded successfully!\n');
}

seedBusinessCard()
    .catch((e) => { console.error('❌ Business Card seeding failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
