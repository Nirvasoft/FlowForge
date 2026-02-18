/**
 * Business Trip Report System Seed Script
 * Based on: Business Trip Report Data Matrix and Approval Flow.xlsx
 *
 * Datasets: EmployeeMaster (KDDI), BT Company, BT Position + reuse MPT masters
 * Forms: Business Trip Report (31 fields), Trip Report Approval
 * Workflow: Linear 4-step approval (7 nodes, 6 edges)
 * App: Business Trip Report (4 pages)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function seedBusinessTrip() {
    console.log('\n✈️  Seeding Business Trip Report System...\n');
    const account = await prisma.account.findFirst({ where: { slug: 'demo' } });
    if (!account) throw new Error('Demo account not found. Run main seed first.');
    const adminUser = await prisma.user.findFirst({ where: { accountId: account.id, email: 'admin@demo.com' } });
    if (!adminUser) throw new Error('Admin user not found. Run main seed first.');

    // ========================================================================
    // 1. USERS
    // ========================================================================
    const userData = [
        { firstName: 'Takeshi', lastName: 'Yamada', email: 'takeshi.yamada@mpt.com' },
        { firstName: 'Yuki', lastName: 'Tanaka', email: 'yuki.tanaka@mpt.com' },
        { firstName: 'Hiroshi', lastName: 'Sato', email: 'hiroshi.sato@mpt.com' },
        { firstName: 'Kenji', lastName: 'Nakamura', email: 'kenji.nakamura@mpt.com' },
        { firstName: 'Min', lastName: 'Htet', email: 'min.htet@mpt.com' },
        { firstName: 'Aye', lastName: 'Chan', email: 'aye.chan@mpt.com' },
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
    const [takeshi, yuki, hiroshi, kenji, minHtet, ayeChan] = users;
    console.log(`✅ Created ${users.length} KDDI/MPT users\n`);

    // ========================================================================
    // 2. DATASETS
    // ========================================================================
    async function createDataset(name: string, desc: string, schema: any[], records: any[]) {
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

    // 2a. Employee Master (KDDI)
    await createDataset('EmployeeMaster', 'Employee master data (KDDI/MPT)', [
        { name: 'Employee ID', slug: 'EmployeeID', type: 'text', required: true },
        { name: 'First Name', slug: 'FirstName', type: 'text', required: true },
        { name: 'Last Name', slug: 'LastName', type: 'text', required: true },
        { name: 'Email', slug: 'OfficeEmailAddress', type: 'text' },
        { name: 'Employee Level', slug: 'EmployeeLevel', type: 'text' },
        { name: 'Internal Level', slug: 'InternalEmployeeLevel', type: 'text' },
        { name: 'Position', slug: 'Position', type: 'text' },
        { name: 'Office', slug: 'OfficeDescription', type: 'text' },
        { name: 'Division', slug: 'DivisionDescription', type: 'text' },
        { name: 'Department', slug: 'DepartmentDescription', type: 'text' },
        { name: 'Team', slug: 'TeamDescription', type: 'text' },
    ], [
        { EmployeeID: 'KDDI-001', FirstName: 'Takeshi', LastName: 'Yamada', OfficeEmailAddress: 'takeshi.yamada@mpt.com', EmployeeLevel: 'Senior', InternalEmployeeLevel: 'L5', Position: 'Network Engineer', OfficeDescription: 'Yangon HQ', DivisionDescription: 'Telecom Division', DepartmentDescription: 'Network Operations', TeamDescription: 'Core Network Team' },
        { EmployeeID: 'KDDI-002', FirstName: 'Yuki', LastName: 'Tanaka', OfficeEmailAddress: 'yuki.tanaka@mpt.com', EmployeeLevel: 'Mid', InternalEmployeeLevel: 'L3', Position: 'Project Coordinator', OfficeDescription: 'Yangon HQ', DivisionDescription: 'Corporate Affairs', DepartmentDescription: 'Corporate Planning', TeamDescription: 'Project Management Team' },
        { EmployeeID: 'KDDI-003', FirstName: 'Hiroshi', LastName: 'Sato', OfficeEmailAddress: 'hiroshi.sato@mpt.com', EmployeeLevel: 'Manager', InternalEmployeeLevel: 'L7', Position: 'Division Manager', OfficeDescription: 'Yangon HQ', DivisionDescription: 'Telecom Division', DepartmentDescription: 'Network Operations', TeamDescription: 'Management' },
        { EmployeeID: 'KDDI-004', FirstName: 'Kenji', LastName: 'Nakamura', OfficeEmailAddress: 'kenji.nakamura@mpt.com', EmployeeLevel: 'Director', InternalEmployeeLevel: 'L9', Position: 'Technical Director', OfficeDescription: 'Yangon HQ', DivisionDescription: 'Telecom Division', DepartmentDescription: 'Executive', TeamDescription: 'Executive Team' },
        { EmployeeID: 'MPT-2001', FirstName: 'Min', LastName: 'Htet', OfficeEmailAddress: 'min.htet@mpt.com', EmployeeLevel: 'Senior', InternalEmployeeLevel: 'L5', Position: 'Admin Officer', OfficeDescription: 'Yangon HQ', DivisionDescription: 'Corporate Affairs', DepartmentDescription: 'Administration', TeamDescription: 'Admin Team' },
        { EmployeeID: 'MPT-2002', FirstName: 'Aye', LastName: 'Chan', OfficeEmailAddress: 'aye.chan@mpt.com', EmployeeLevel: 'Mid', InternalEmployeeLevel: 'L3', Position: 'Technical Analyst', OfficeDescription: 'Nay Pyi Taw', DivisionDescription: 'Digital Services', DepartmentDescription: 'IT', TeamDescription: 'Systems Team' },
    ]);

    // 2b. BT Company
    await createDataset('BT Company', 'Companies for business trip reports', [
        { name: 'Company Name', slug: 'companyName', type: 'text', required: true },
        { name: 'Country', slug: 'country', type: 'text' },
    ], [
        { companyName: 'KDDI Corporation', country: 'Japan' },
        { companyName: 'MPT (Myanma Posts and Telecommunications)', country: 'Myanmar' },
        { companyName: 'Sumitomo Corporation', country: 'Japan' },
        { companyName: 'KDDI Summit Global Myanmar', country: 'Myanmar' },
    ]);

    // 2c. BT Position (Rank)
    await createDataset('BT Position', 'Positions/Ranks for business trip', [
        { name: 'Rank', slug: 'rank', type: 'text', required: true },
        { name: 'Level', slug: 'level', type: 'number' },
    ], [
        { rank: 'Managing Director', level: 1 },
        { rank: 'Director', level: 2 },
        { rank: 'General Manager', level: 3 },
        { rank: 'Manager', level: 4 },
        { rank: 'Staff', level: 5 },
    ]);

    // 2d. Business Trip Reports dataset
    const btReportsDs = await createDataset('Business Trip Reports', 'Business trip report records', [
        { name: 'Reference Number', slug: 'referenceNumber', type: 'text', required: true },
        { name: 'Report Date', slug: 'reportDate', type: 'date' },
        { name: 'Initiator Name', slug: 'initiatorName', type: 'text' },
        { name: 'Company', slug: 'company', type: 'text' },
        { name: 'Destination', slug: 'deptDispatched', type: 'text' },
        { name: 'Scope of Work', slug: 'scopeOfWork', type: 'text' },
        { name: 'Arrival Date', slug: 'arrivalDate1', type: 'date' },
        { name: 'Departure Date', slug: 'departureDate1', type: 'date' },
        { name: 'Status', slug: 'status', type: 'select', required: true },
    ], [
        { referenceNumber: 'CO1026B00000001', reportDate: '2026-01-10', initiatorName: 'Takeshi Yamada', company: 'KDDI Corporation', deptDispatched: 'Network Operations Dept, NPT', scopeOfWork: 'Core network inspection and performance audit at Nay Pyi Taw data center', arrivalDate1: '2026-01-12', departureDate1: '2026-01-16', status: 'Completed' },
        { referenceNumber: 'CO1026B00000002', reportDate: '2026-02-01', initiatorName: 'Yuki Tanaka', company: 'KDDI Corporation', deptDispatched: 'Mandalay Regional Office', scopeOfWork: 'Project status review and stakeholder meetings with regional team', arrivalDate1: '2026-02-03', departureDate1: '2026-02-05', status: 'Pending Manager Review' },
        { referenceNumber: 'CO1026B00000003', reportDate: '2026-02-08', initiatorName: 'Aye Chan', company: 'MPT', deptDispatched: 'KDDI Tokyo HQ', scopeOfWork: 'Technical training on 5G network deployment and integration', arrivalDate1: '2026-02-15', departureDate1: '2026-02-22', status: 'Pending Director Approval' },
        { referenceNumber: 'CO1026B00000004', reportDate: '2026-02-12', initiatorName: 'Takeshi Yamada', company: 'KDDI Corporation', deptDispatched: 'Sagaing Office', scopeOfWork: 'Fiber optic cable installation supervision and quality check', arrivalDate1: '2026-02-14', departureDate1: '2026-02-16', status: 'Filing' },
    ]);
    console.log(`\n✅ Created datasets\n`);

    // ========================================================================
    // 3. FORMS
    // ========================================================================

    // 3a. Business Trip Report Form
    const btForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-00000000b701' },
        create: {
            id: '00000000-0000-0000-0000-00000000b701',
            accountId: account.id,
            name: 'Business Trip Report',
            description: 'Report form for KDDI/MPT business trips',
            fields: [
                // Section 1: Initiator Information
                { id: 'f-refno', name: 'referenceNumber', type: 'text', label: 'Reference Number', readOnly: true, formula: 'CONCATENATE("CO","10",YEAR_LAST2,"B",SEQ("00000000"))' },
                { id: 'f-reportdate', name: 'reportDate', type: 'date', label: 'Report Date', required: true },
                { id: 'f-initid', name: 'initiatorId', type: 'text', label: "Initiator's ID", readOnly: true, formula: 'Initiators_ID_Lookup.EmployeeID' },
                { id: 'f-initname', name: 'initiatorName', type: 'text', label: "Initiator's Full Name", readOnly: true, formula: '_created_by.Name' },
                { id: 'f-initemail', name: 'initiatorEmail', type: 'email', label: "Initiator's Email", readOnly: true, formula: '_created_by.Email' },
                { id: 'f-initphone', name: 'initiatorPhone', type: 'text', label: "Initiator's Phone Number", required: true },
                { id: 'f-initlevel', name: 'initiatorLevel', type: 'text', label: "Initiator's Level", readOnly: true, formula: 'Initiators_Level_Lookup.EmployeeLevel' },
                { id: 'f-initposition', name: 'initiatorPosition', type: 'text', label: "Initiator's Position", readOnly: true, formula: 'Initiators_Position_Lookup.InternalEmployeeLevel' },
                { id: 'f-initoffice', name: 'initiatorOffice', type: 'text', label: "Initiator's Office", readOnly: true, formula: 'Initiators_Office_Lookup.OfficeDescription' },
                { id: 'f-initdiv', name: 'initiatorDivision', type: 'text', label: "Initiator's Division", readOnly: true, formula: 'Initiators_Division_Lookup.DivisionDescription' },
                { id: 'f-initdept', name: 'initiatorDepartment', type: 'text', label: "Initiator's Department", readOnly: true, formula: 'Initiators_Department_Lookup.DepartmentDescription' },
                { id: 'f-initteam', name: 'initiatorTeam', type: 'text', label: "Initiator's Team", readOnly: true, formula: 'Initiators_Team_Lookup.TeamDescription' },
                { id: 'f-reqdate', name: 'requestedDate', type: 'date', label: 'Requested Date', readOnly: true, formula: '_created_at' },
                // Section 2: Business Trip Information
                { id: 'f-name', name: 'tripName', type: 'text', label: 'Name' },
                { id: 'f-company', name: 'company', type: 'select', label: 'Company', lookupDataset: 'BT Company', lookupField: 'companyName' },
                { id: 'f-position', name: 'position', type: 'text', label: 'Position' },
                { id: 'f-rank', name: 'rank', type: 'select', label: 'Rank', lookupDataset: 'BT Position', lookupField: 'rank' },
                { id: 'f-dispatched', name: 'deptDispatched', type: 'text', label: 'Dept. dispatched to' },
                { id: 'f-scope', name: 'scopeOfWork', type: 'textarea', label: 'Scope of work' },
                { id: 'f-multitravel', name: 'travelMoreThanOnce', type: 'toggle', label: 'Travel More Than One Time', defaultValue: false },
                { id: 'f-arr1', name: 'arrivalDate1', type: 'date', label: 'Arrival Date (1st Time)', required: true },
                { id: 'f-dep1', name: 'departureDate1', type: 'date', label: 'Departure Date (1st Time)', required: true },
                { id: 'f-arr2', name: 'arrivalDate2', type: 'date', label: 'Arrival Date (2nd Time)' },
                { id: 'f-dep2', name: 'departureDate2', type: 'date', label: 'Departure Date (2nd Time)' },
                { id: 'f-arr3', name: 'arrivalDate3', type: 'date', label: 'Arrival Date (3rd Time)' },
                { id: 'f-dep3', name: 'departureDate3', type: 'date', label: 'Departure Date (3rd Time)' },
                { id: 'f-arr4', name: 'arrivalDate4', type: 'date', label: 'Arrival Date (4th Time)' },
                { id: 'f-dep4', name: 'departureDate4', type: 'date', label: 'Departure Date (4th Time)' },
                { id: 'f-report', name: 'attachedReport', type: 'file', label: 'Attached Report' },
            ],
            layout: {
                sections: [
                    { title: 'Initiator Information', fields: ['f-refno', 'f-reportdate', 'f-initid', 'f-initname', 'f-initemail', 'f-initphone', 'f-initlevel', 'f-initposition', 'f-initoffice', 'f-initdiv', 'f-initdept', 'f-initteam', 'f-reqdate'] },
                    { title: 'Business Trip Information', fields: ['f-name', 'f-company', 'f-position', 'f-rank', 'f-dispatched', 'f-scope', 'f-multitravel', 'f-arr1', 'f-dep1', 'f-arr2', 'f-dep2', 'f-arr3', 'f-dep3', 'f-arr4', 'f-dep4', 'f-report'] },
                ],
            },
            validationRules: [],
            conditionalLogic: [
                { field: 'f-arr2', condition: "travelMoreThanOnce === true", action: 'show' },
                { field: 'f-dep2', condition: "travelMoreThanOnce === true", action: 'show' },
                { field: 'f-arr3', condition: "travelMoreThanOnce === true", action: 'show' },
                { field: 'f-dep3', condition: "travelMoreThanOnce === true", action: 'show' },
                { field: 'f-arr4', condition: "travelMoreThanOnce === true", action: 'show' },
                { field: 'f-dep4', condition: "travelMoreThanOnce === true", action: 'show' },
            ],
            settings: { submitButtonText: 'Submit Trip Report', showProgressBar: true, allowDraft: true },
            permissions: { requiredGroup: 'businesstrip_report_ini_JOIT' },
            version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created form: ${btForm.name}\n`);

    // 3b. Trip Report Approval Form
    const approvalForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-00000000b702' },
        create: {
            id: '00000000-0000-0000-0000-00000000b702',
            accountId: account.id,
            name: 'Trip Report Approval',
            description: 'Approve or reject a business trip report',
            fields: [
                { id: 'f-decision', name: 'decision', type: 'radio', label: 'Decision', required: true, options: [{ value: 'approve', label: '✅ Approve' }, { value: 'reject', label: '❌ Reject' }, { value: 'revise', label: '🔄 Request Revision' }] },
                { id: 'f-comments', name: 'comments', type: 'textarea', label: 'Comments' },
            ],
            layout: { sections: [{ title: 'Review Decision', fields: ['f-decision', 'f-comments'] }] },
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
    // 4. WORKFLOW (7 nodes, 6 edges) — linear approval
    // ========================================================================
    const btProcess = await prisma.process.upsert({
        where: { id: '00000000-0000-0000-0000-00000000b780' },
        create: {
            id: '00000000-0000-0000-0000-00000000b780',
            accountId: account.id,
            name: 'Business Trip Report Workflow',
            description: 'Linear approval: Submit → Manager Review → Director Approval → Admin Filing → Notify → Complete',
            category: 'Administration',
            definition: {
                nodes: [
                    { id: 'start-1', type: 'start', name: 'Submit Trip Report', position: { x: 100, y: 300 }, config: { trigger: 'form_submission', formId: btForm.id } },
                    { id: 'action-validate', type: 'action', name: 'Validate Report', position: { x: 400, y: 300 }, config: { action: 'validate_form' } },
                    { id: 'approval-mgr', type: 'approval', name: 'Manager Review', position: { x: 700, y: 300 }, config: { assignTo: 'role:manager', formId: approvalForm.id, timeoutDays: 3 } },
                    { id: 'approval-dir', type: 'approval', name: 'Director Approval', position: { x: 1000, y: 300 }, config: { assignTo: 'role:director', formId: approvalForm.id, timeoutDays: 5 } },
                    { id: 'task-filing', type: 'action', name: 'Admin Filing', position: { x: 1300, y: 300 }, config: { assignTo: 'role:admin', action: 'file_report' } },
                    { id: 'email-notify', type: 'email', name: 'Notify Initiator', position: { x: 1600, y: 300 }, config: { template: 'trip-report-approved' } },
                    { id: 'end-1', type: 'end', name: 'Completed', position: { x: 1900, y: 300 }, config: {} },
                ],
                edges: [
                    { id: 'e1', source: 'start-1', target: 'action-validate', label: 'Always' },
                    { id: 'e2', source: 'action-validate', target: 'approval-mgr', label: 'Always' },
                    { id: 'e3', source: 'approval-mgr', target: 'approval-dir', label: 'Always' },
                    { id: 'e4', source: 'approval-dir', target: 'task-filing', label: 'Always' },
                    { id: 'e5', source: 'task-filing', target: 'email-notify', label: 'Always' },
                    { id: 'e6', source: 'email-notify', target: 'end-1', label: 'Always' },
                ],
            },
            variables: [
                { name: 'referenceNumber', type: 'string', label: 'Reference Number' },
                { name: 'initiatorName', type: 'string', label: 'Initiator Name' },
                { name: 'company', type: 'string', label: 'Company' },
                { name: 'deptDispatched', type: 'string', label: 'Dept Dispatched To' },
                { name: 'scopeOfWork', type: 'string', label: 'Scope of Work' },
                { name: 'arrivalDate1', type: 'date', label: 'Arrival Date' },
                { name: 'departureDate1', type: 'date', label: 'Departure Date' },
            ],
            triggers: [{ type: 'form_submission', formId: btForm.id }],
            settings: {}, permissions: {},
            slaConfig: { defaultDueDays: 7 },
            version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created workflow: ${btProcess.name} (7 nodes, 6 edges)\n`);

    // ========================================================================
    // 5. PROCESS INSTANCES & TASK INSTANCES
    // ========================================================================

    // Instance 1: Completed
    const inst1 = await prisma.processInstance.create({
        data: {
            processId: btProcess.id, processVersion: 1, status: 'COMPLETED',
            currentNodes: ['end-1'],
            variables: { referenceNumber: 'CO1026B00000001', initiatorName: 'Takeshi Yamada', company: 'KDDI Corporation', deptDispatched: 'Network Operations Dept, NPT', scopeOfWork: 'Core network inspection', arrivalDate1: '2026-01-12', departureDate1: '2026-01-16' },
            startedBy: takeshi.id, completedAt: new Date('2026-01-20'),
        },
    });
    await prisma.taskInstance.createMany({
        data: [
            { instanceId: inst1.id, nodeId: 'approval-mgr', name: 'Manager Review – Takeshi Trip', taskType: 'APPROVAL', assigneeId: hiroshi.id, status: 'COMPLETED', outcome: 'approved', completedAt: new Date('2026-01-13'), completedBy: hiroshi.id, formData: { initiatorName: 'Takeshi Yamada', company: 'KDDI Corporation', deptDispatched: 'Network Operations Dept, NPT', scopeOfWork: 'Core network inspection', arrivalDate1: '2026-01-12', departureDate1: '2026-01-16' }, dueAt: new Date('2026-01-17'), priority: 1 },
            { instanceId: inst1.id, nodeId: 'approval-dir', name: 'Director Approval – Takeshi Trip', taskType: 'APPROVAL', assigneeId: kenji.id, status: 'COMPLETED', outcome: 'approved', completedAt: new Date('2026-01-15'), completedBy: kenji.id, formData: { initiatorName: 'Takeshi Yamada', company: 'KDDI Corporation', scopeOfWork: 'Core network inspection' }, dueAt: new Date('2026-01-20'), priority: 1 },
            { instanceId: inst1.id, nodeId: 'task-filing', name: 'File Report – Takeshi Trip', taskType: 'TASK', assigneeId: minHtet.id, status: 'COMPLETED', outcome: 'completed', completedAt: new Date('2026-01-18'), completedBy: minHtet.id, formData: { initiatorName: 'Takeshi Yamada', referenceNumber: 'CO1026B00000001' }, priority: 0 },
        ]
    });

    // Instance 2: Pending Manager Review
    const inst2 = await prisma.processInstance.create({
        data: {
            processId: btProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['approval-mgr'],
            variables: { referenceNumber: 'CO1026B00000002', initiatorName: 'Yuki Tanaka', company: 'KDDI Corporation', deptDispatched: 'Mandalay Regional Office', scopeOfWork: 'Project status review and stakeholder meetings', arrivalDate1: '2026-02-03', departureDate1: '2026-02-05' },
            startedBy: yuki.id,
        },
    });
    await prisma.taskInstance.create({
        data: {
            instanceId: inst2.id, nodeId: 'approval-mgr', name: 'Manager Review – Yuki Tanaka Trip Report', taskType: 'APPROVAL', status: 'PENDING', candidateUsers: [hiroshi.id], formData: { initiatorName: 'Yuki Tanaka', company: 'KDDI Corporation', deptDispatched: 'Mandalay Regional Office', scopeOfWork: 'Project status review and stakeholder meetings with regional team', arrivalDate1: '2026-02-03', departureDate1: '2026-02-05', rank: 'Staff' }, dueAt: new Date('2026-02-08'), priority: 1,
        }
    });

    // Instance 3: Pending Director Approval
    const inst3 = await prisma.processInstance.create({
        data: {
            processId: btProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['approval-dir'],
            variables: { referenceNumber: 'CO1026B00000003', initiatorName: 'Aye Chan', company: 'MPT', deptDispatched: 'KDDI Tokyo HQ', scopeOfWork: 'Technical training on 5G network deployment', arrivalDate1: '2026-02-15', departureDate1: '2026-02-22' },
            startedBy: ayeChan.id,
        },
    });
    await prisma.taskInstance.create({
        data: {
            instanceId: inst3.id, nodeId: 'approval-dir', name: 'Director Approval – Aye Chan Trip to Tokyo', taskType: 'APPROVAL', status: 'PENDING', candidateUsers: [kenji.id], formData: { initiatorName: 'Aye Chan', company: 'MPT', deptDispatched: 'KDDI Tokyo HQ', scopeOfWork: 'Technical training on 5G network deployment and integration', arrivalDate1: '2026-02-15', departureDate1: '2026-02-22', rank: 'Staff', attachedReport: 'trip_report_aye_5g_training.pdf' }, dueAt: new Date('2026-02-13'), priority: 0,
        }
    });

    // Instance 4: Filing stage
    const inst4 = await prisma.processInstance.create({
        data: {
            processId: btProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['task-filing'],
            variables: { referenceNumber: 'CO1026B00000004', initiatorName: 'Takeshi Yamada', company: 'KDDI Corporation', deptDispatched: 'Sagaing Office', scopeOfWork: 'Fiber optic cable installation supervision', arrivalDate1: '2026-02-14', departureDate1: '2026-02-16' },
            startedBy: takeshi.id,
        },
    });
    await prisma.taskInstance.create({
        data: {
            instanceId: inst4.id, nodeId: 'task-filing', name: 'File Report – Takeshi Sagaing Trip', taskType: 'TASK', status: 'CLAIMED', assigneeId: minHtet.id, formData: { initiatorName: 'Takeshi Yamada', company: 'KDDI Corporation', deptDispatched: 'Sagaing Office', scopeOfWork: 'Fiber optic cable installation supervision and quality check', arrivalDate1: '2026-02-14', departureDate1: '2026-02-16', attachedReport: 'fiber_inspection_report.pdf' }, dueAt: new Date('2026-02-21'), priority: 0,
        }
    });

    // Create form submissions for all instances
    for (const inst of [inst1, inst2, inst3, inst4]) {
        const vars = inst.variables as any;
        await prisma.formSubmission.create({
            data: {
                formId: btForm.id,
                data: vars,
                createdBy: inst.startedBy,
            },
        });
    }

    console.log(`✅ Created 4 process instances with task instances and form submissions\n`);

    // Create approval form submissions for completed approvals
    // Instance 1: Manager and Director both approved
    await prisma.formSubmission.create({
        data: { formId: approvalForm.id, data: { decision: 'approve', comments: 'Trip report reviewed. All expenses within policy.' }, createdBy: hiroshi.id },
    });
    await prisma.formSubmission.create({
        data: { formId: approvalForm.id, data: { decision: 'approve', comments: 'Approved. Network inspection was necessary and well-documented.' }, createdBy: kenji.id },
    });

    console.log(`✅ Created 2 approval form submissions\n`);

    // ========================================================================
    // 6. APPLICATION
    // ========================================================================
    const app = await prisma.app.upsert({
        where: { accountId_slug: { accountId: account.id, slug: 'business-trip-report' } },
        create: {
            accountId: account.id, name: 'Business Trip Report', slug: 'business-trip-report',
            description: 'KDDI/MPT Business Trip Report and Approval System — restricted to JOIT group',
            icon: '✈️', status: 'PUBLISHED',
            settings: { navigation: 'sidebar', theme: 'default', color: '#0891B2', requiredGroup: 'businesstrip_report_ini_JOIT' },
            permissions: {},
            createdBy: adminUser.id,
        },
        update: {},
    });
    const pages = [
        { name: 'Dashboard', route: '/dashboard', layout: { components: [{ type: 'stats_cards', config: { datasetId: btReportsDs.id } }, { type: 'task_inbox', config: { filterWorkflowId: btProcess.id } }, { type: 'recent_reports', config: { datasetId: btReportsDs.id, limit: 5 } }] }, title: 'Trip Report Dashboard' },
        { name: 'New Report', route: '/new-report', layout: { components: [{ type: 'form_renderer', config: { formId: btForm.id } }] }, title: 'New Business Trip Report' },
        { name: 'Report List', route: '/reports', layout: { components: [{ type: 'data_table', config: { datasetId: btReportsDs.id, columns: ['referenceNumber', 'initiatorName', 'company', 'deptDispatched', 'arrivalDate1', 'departureDate1', 'status'] } }] }, title: 'All Trip Reports' },
        { name: 'Approvals', route: '/approvals', layout: { components: [{ type: 'task_inbox', config: { filterWorkflowId: btProcess.id, filterType: 'APPROVAL' } }] }, title: 'Pending Approvals' },
    ];
    for (const p of pages) {
        await prisma.appPage.upsert({
            where: { appId_route: { appId: app.id, route: p.route } },
            create: { appId: app.id, name: p.name, route: p.route, layout: p.layout, dataSources: [], permissions: {}, title: p.title },
            update: {},
        });
    }
    console.log(`✅ Created app: ${app.name} (${pages.length} pages)\n`);

    console.log('🎉 Business Trip Report System seeded successfully!\n');
}

seedBusinessTrip()
    .catch((e) => { console.error('❌ Business Trip seeding failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
