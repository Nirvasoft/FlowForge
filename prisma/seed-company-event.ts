/**
 * Company Event Fee Reimbursement Seed Script
 * Creates:
 * - 5 MPT Master Datasets (Employee, Division, Department, Office, Team)
 * - Event Fee Reimbursement Form
 * - Multi-level approval workflow with parallel advisor approvals
 * - Sample process instances and task instances
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCompanyEventReimbursement() {
    console.log('🎉 Seeding Company Event Fee Reimbursement Flow...\n');

    // ==========================================================================
    // 1. Get demo account and admin user
    // ==========================================================================
    const account = await prisma.account.findUnique({ where: { slug: 'demo' } });
    if (!account) throw new Error('Demo account not found. Run main seed first.');

    const adminUser = await prisma.user.findUnique({
        where: { accountId_email: { accountId: account.id, email: 'admin@demo.com' } },
    });
    if (!adminUser) throw new Error('Demo admin user not found.');

    const bcryptModule = await import('bcryptjs');
    const bcryptLib = bcryptModule.default || bcryptModule;
    const passwordHash = await bcryptLib.hash('Demo123!@#', 12);

    // Create MPT-specific users
    const mptUsers: any[] = [];
    const userProfiles = [
        { email: 'yamin.aye@demo.com', firstName: 'Yamin', lastName: 'Aye' },
        { email: 'aung.kyaw@demo.com', firstName: 'Aung', lastName: 'Kyaw' },
        { email: 'thida.win@demo.com', firstName: 'Thida', lastName: 'Win' },
        { email: 'min.htet@demo.com', firstName: 'Min', lastName: 'Htet' },
        { email: 'su.myat@demo.com', firstName: 'Su', lastName: 'Myat' },
        { email: 'ko.zaw@demo.com', firstName: 'Ko', lastName: 'Zaw' },
        { email: 'hnin.si@demo.com', firstName: 'Hnin', lastName: 'Si' },
    ];

    for (const p of userProfiles) {
        const user = await prisma.user.upsert({
            where: { accountId_email: { accountId: account.id, email: p.email } },
            create: { accountId: account.id, email: p.email, passwordHash, firstName: p.firstName, lastName: p.lastName, status: 'ACTIVE', emailVerified: true },
            update: {},
        });
        mptUsers.push(user);
    }
    console.log(`✅ Found/created ${mptUsers.length} MPT users\n`);

    // ==========================================================================
    // 2. Create 5 MPT Master Datasets
    // ==========================================================================

    // --- MPTOfficeMaster ---
    const officeDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'MPTOfficeMaster' } },
        create: {
            accountId: account.id, name: 'MPTOfficeMaster',
            description: 'MPT Office locations master data',
            schema: [
                { name: 'Office Code', slug: 'office_code', type: 'text', required: true },
                { name: 'Office Description', slug: 'office_description', type: 'text', required: true },
                { name: 'Region', slug: 'region', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {}, rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const offices = [
        { office_code: 'YGN-HQ', office_description: 'Yangon Head Office', region: 'Yangon' },
        { office_code: 'MDY-01', office_description: 'Mandalay Office', region: 'Mandalay' },
        { office_code: 'NPT-01', office_description: 'Naypyidaw Office', region: 'Naypyidaw' },
        { office_code: 'SGN-01', office_description: 'Sagaing Office', region: 'Sagaing' },
        { office_code: 'BGO-01', office_description: 'Bago Office', region: 'Bago' },
    ];
    for (const r of offices) {
        await prisma.datasetRecord.create({ data: { datasetId: officeDataset.id, data: r, createdBy: adminUser.id } });
    }
    await prisma.dataset.update({ where: { id: officeDataset.id }, data: { rowCount: offices.length } });

    // --- MPTDivisionMaster ---
    const divisionDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'MPTDivisionMaster' } },
        create: {
            accountId: account.id, name: 'MPTDivisionMaster',
            description: 'MPT Division master data',
            schema: [
                { name: 'Division Code', slug: 'division_code', type: 'text', required: true },
                { name: 'Division Name', slug: 'division_name', type: 'text', required: true },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {}, rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const divisions = [
        { division_code: '1301', division_name: 'Technology & IT' },
        { division_code: '1305', division_name: 'Sales & Marketing' },
        { division_code: '1310', division_name: 'Human Resource & Admin' },
        { division_code: '1315', division_name: 'Finance & Accounting' },
        { division_code: '1321', division_name: 'Corporate Strategy & Planning' },
        { division_code: '1325', division_name: 'Network Operations' },
    ];
    for (const r of divisions) {
        await prisma.datasetRecord.create({ data: { datasetId: divisionDataset.id, data: r, createdBy: adminUser.id } });
    }
    await prisma.dataset.update({ where: { id: divisionDataset.id }, data: { rowCount: divisions.length } });

    // --- MPTDepartmentMaster ---
    const deptDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'MPTDepartmentMaster' } },
        create: {
            accountId: account.id, name: 'MPTDepartmentMaster',
            description: 'MPT Department master data',
            schema: [
                { name: 'Department Code', slug: 'dept_code', type: 'text', required: true },
                { name: 'Department Name', slug: 'dept_name', type: 'text', required: true },
                { name: 'Division Code', slug: 'division_code', type: 'text', required: true },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {}, rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const departments = [
        { dept_code: 'D001', dept_name: 'Software Engineering', division_code: '1301' },
        { dept_code: 'D002', dept_name: 'Infrastructure', division_code: '1301' },
        { dept_code: 'D003', dept_name: 'Enterprise Sales', division_code: '1305' },
        { dept_code: 'D004', dept_name: 'HR Operations', division_code: '1310' },
        { dept_code: 'D005', dept_name: 'General Accounting', division_code: '1315' },
        { dept_code: 'D006', dept_name: 'Strategy Office', division_code: '1321' },
        { dept_code: 'D007', dept_name: 'NOC', division_code: '1325' },
    ];
    for (const r of departments) {
        await prisma.datasetRecord.create({ data: { datasetId: deptDataset.id, data: r, createdBy: adminUser.id } });
    }
    await prisma.dataset.update({ where: { id: deptDataset.id }, data: { rowCount: departments.length } });

    // --- MPTTeamMaster ---
    const teamDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'MPTTeamMaster' } },
        create: {
            accountId: account.id, name: 'MPTTeamMaster',
            description: 'MPT Team master data',
            schema: [
                { name: 'Team Code', slug: 'team_code', type: 'text', required: true },
                { name: 'Team Description', slug: 'team_description', type: 'text', required: true },
                { name: 'Department Code', slug: 'dept_code', type: 'text', required: true },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {}, rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const teams = [
        { team_code: 'T001', team_description: 'Backend Development', dept_code: 'D001' },
        { team_code: 'T002', team_description: 'Frontend Development', dept_code: 'D001' },
        { team_code: 'T003', team_description: 'Cloud Operations', dept_code: 'D002' },
        { team_code: 'T004', team_description: 'B2B Sales', dept_code: 'D003' },
        { team_code: 'T005', team_description: 'Recruitment', dept_code: 'D004' },
        { team_code: 'T006', team_description: 'Planning Team', dept_code: 'D006' },
    ];
    for (const r of teams) {
        await prisma.datasetRecord.create({ data: { datasetId: teamDataset.id, data: r, createdBy: adminUser.id } });
    }
    await prisma.dataset.update({ where: { id: teamDataset.id }, data: { rowCount: teams.length } });

    // --- MPTEmployeeMaster ---
    const empDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'MPTEmployeeMaster' } },
        create: {
            accountId: account.id, name: 'MPTEmployeeMaster',
            description: 'MPT Employee master data with org hierarchy lookups',
            schema: [
                { name: 'Employee ID', slug: 'employee_id', type: 'text', required: true },
                { name: 'Full Name', slug: 'full_name', type: 'text', required: true },
                { name: 'Email', slug: 'email', type: 'text', required: true },
                { name: 'Office Code', slug: 'office_code', type: 'text', required: true },
                { name: 'Division Code', slug: 'division_code', type: 'text', required: true },
                { name: 'Department Code', slug: 'dept_code', type: 'text', required: true },
                { name: 'Team Code', slug: 'team_code', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {}, rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const employees = [
        { employee_id: 'MPT-0001', full_name: 'Yamin Aye', email: 'yamin.aye@demo.com', office_code: 'YGN-HQ', division_code: '1310', dept_code: 'D004', team_code: 'T005' },
        { employee_id: 'MPT-0002', full_name: 'Aung Kyaw', email: 'aung.kyaw@demo.com', office_code: 'YGN-HQ', division_code: '1301', dept_code: 'D001', team_code: 'T001' },
        { employee_id: 'MPT-0003', full_name: 'Thida Win', email: 'thida.win@demo.com', office_code: 'MDY-01', division_code: '1305', dept_code: 'D003', team_code: 'T004' },
        { employee_id: 'MPT-0004', full_name: 'Min Htet', email: 'min.htet@demo.com', office_code: 'YGN-HQ', division_code: '1321', dept_code: 'D006', team_code: 'T006' },
        { employee_id: 'MPT-0005', full_name: 'Su Myat', email: 'su.myat@demo.com', office_code: 'NPT-01', division_code: '1315', dept_code: 'D005', team_code: '' },
        { employee_id: 'MPT-0006', full_name: 'Ko Zaw', email: 'ko.zaw@demo.com', office_code: 'YGN-HQ', division_code: '1325', dept_code: 'D007', team_code: '' },
        { employee_id: 'MPT-0007', full_name: 'Hnin Si', email: 'hnin.si@demo.com', office_code: 'SGN-01', division_code: '1310', dept_code: 'D004', team_code: 'T005' },
    ];
    for (const r of employees) {
        await prisma.datasetRecord.create({ data: { datasetId: empDataset.id, data: r, createdBy: adminUser.id } });
    }
    await prisma.dataset.update({ where: { id: empDataset.id }, data: { rowCount: employees.length } });

    console.log('✅ Created 5 MPT Master Datasets with sample data\n');

    // ==========================================================================
    // 3. Create Event Fee Reimbursement Form
    // ==========================================================================
    const eventForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-000000000050' },
        create: {
            id: '00000000-0000-0000-0000-000000000050',
            accountId: account.id,
            name: 'Company Event Fee Reimbursement',
            description: 'Submit reimbursement requests for company event fees. Amount per JO member is 35,000 kyat per year including applicable tax.',
            fields: [
                // --- Requester Details (auto-populated) ---
                { id: 'field-ref-no', name: 'referenceNumber', label: 'Reference Number', type: 'text', required: false, order: 1, config: { readonly: true, computed: 'CONCATENATE("CO","02",YEAR_2DIGIT,"B",SEQ_8DIGIT)', placeholder: 'Auto-generated' } },
                { id: 'field-emp-id', name: 'employeeId', label: 'Employee ID', type: 'lookup', required: true, order: 2, config: { datasetId: empDataset.id, displayField: 'employee_id', valueField: 'employee_id', placeholder: 'Select Employee' } },
                { id: 'field-emp-name', name: 'employeeFullName', label: 'Employee Full Name', type: 'text', required: true, order: 3, config: { readonly: true, autoPopulate: '_created_by.Name' } },
                { id: 'field-emp-email', name: 'employeeEmail', label: 'Employee Email', type: 'text', required: false, order: 4, config: { readonly: true, autoPopulate: '_created_by.Email' } },
                { id: 'field-emp-office', name: 'employeeOffice', label: 'Employee Office', type: 'lookup', required: true, order: 5, config: { datasetId: officeDataset.id, displayField: 'office_description', valueField: 'office_code', autoPopulate: 'Office_Lookup.OfficeDescription' } },
                { id: 'field-emp-division', name: 'employeeDivision', label: 'Employee Division', type: 'lookup', required: false, order: 6, config: { datasetId: divisionDataset.id, displayField: 'division_name', valueField: 'division_code', autoPopulate: 'Division_Lookup.DivisionName' } },
                { id: 'field-emp-dept', name: 'employeeDepartment', label: 'Employee Department', type: 'lookup', required: false, order: 7, config: { datasetId: deptDataset.id, displayField: 'dept_name', valueField: 'dept_code', autoPopulate: 'Department_Lookup.DepartmentName' } },
                { id: 'field-emp-team', name: 'employeeTeam', label: 'Employee Team', type: 'lookup', required: false, order: 8, config: { datasetId: teamDataset.id, displayField: 'team_description', valueField: 'team_code', autoPopulate: 'Team_Lookup.TeamDescription' } },
                { id: 'field-req-date', name: 'requestedDate', label: 'Requested Date', type: 'date', required: false, order: 9, config: { readonly: true, autoPopulate: 'TODAY()' } },
                // --- Event Details ---
                { id: 'field-event-date', name: 'eventDate', label: 'Event Date', type: 'date', required: true, order: 10, config: { minDate: 'tomorrow', validation: 'Must be a future date' } },
                { id: 'field-participants', name: 'numberOfParticipants', label: 'No of Participants', type: 'number', required: true, order: 11, config: { min: 1, placeholder: 'Enter number of participants' } },
                { id: 'field-place', name: 'place', label: 'Place', type: 'text', required: true, order: 12, config: { placeholder: 'Event location' } },
                { id: 'field-purpose', name: 'purpose', label: 'Purpose', type: 'textarea', required: true, order: 13, config: { minLength: 10, maxLength: 2000, placeholder: 'Describe the purpose of the event' } },
                { id: 'field-total-cost', name: 'totalCostMMK', label: 'Total Cost (MMK)', type: 'number', required: true, order: 14, config: { prefix: 'MMK', min: 0 } },
                { id: 'field-organizer', name: 'headOfEventOrganizer', label: 'Head of Event Organizer', type: 'user', required: true, order: 15, config: { placeholder: 'Select organizer' } },
                { id: 'field-attachment', name: 'attachment', label: 'Attachment', type: 'file', required: true, order: 16, config: { accept: '.pdf,.jpg,.png,.xlsx,.docx', maxSize: '10MB' } },
                { id: 'field-formula-cost', name: 'formulaTotalCost', label: 'Budget Limit (Participants × 35,000)', type: 'number', required: false, order: 17, config: { readonly: true, hidden: false, computed: 'numberOfParticipants * 35000', prefix: 'MMK' } },
            ],
            layout: {
                columns: 2,
                sections: [
                    { title: 'Requester Details', fields: ['field-ref-no', 'field-emp-id', 'field-emp-name', 'field-emp-email', 'field-emp-office', 'field-emp-division', 'field-emp-dept', 'field-emp-team', 'field-req-date'] },
                    { title: 'IO Code Information', description: 'When you prepare the payment for Company Event, please use this IO Code – 1716000650 (OPEX 322 Company Event).', fields: [] },
                    { title: 'Event Details', fields: ['field-event-date', 'field-participants', 'field-place', 'field-purpose', 'field-total-cost', 'field-organizer', 'field-attachment', 'field-formula-cost'] },
                ],
            },
            validationRules: [
                { field: 'eventDate', rule: 'futureDate', message: 'Event date must be in the future' },
                { field: 'totalCostMMK', rule: 'max', condition: 'formulaTotalCost', message: 'Total cost exceeds budget (participants × 35,000 kyat)' },
            ],
            conditionalLogic: [],
            settings: { submitButtonText: 'Submit Reimbursement Request', showProgressBar: false, allowDraft: true },
            permissions: {}, version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });

    console.log(`✅ Created form: ${eventForm.name}\n`);

    // ==========================================================================
    // 4. Create Approval Workflow
    // ==========================================================================
    const eventProcess = await prisma.process.upsert({
        where: { id: '00000000-0000-0000-0000-000000000051' },
        create: {
            id: '00000000-0000-0000-0000-000000000051',
            accountId: account.id,
            name: 'Company Event Fee Reimbursement Workflow',
            description: 'Multi-level approval workflow for company event fee reimbursement with division-based routing and parallel advisor approvals',
            category: 'Finance',
            definition: {
                nodes: [
                    { id: 'start', type: 'start', name: 'Submit Request', description: 'Employee submits event fee reimbursement form', position: { x: 100, y: 300 }, config: { trigger: 'form_submission', formId: eventForm.id } },
                    { id: 'eb-team-approval', type: 'approval', name: 'EB Team Approval', description: 'EB HR Team (Yamin Aye / JOIT EB HR Team) reviews the request', position: { x: 350, y: 300 }, config: { assignTo: 'user:yamin.aye@demo.com', approvalType: 'single', timeoutDays: 3, escalateTo: 'director' } },
                    { id: 'division-check', type: 'decision', name: 'Division Check', description: 'Route based on employee division (1321 or others)', position: { x: 600, y: 300 }, config: {}, condition: 'variables.employeeDivision' },
                    // --- Path A: Division ≠ 1321 (full chain) ---
                    { id: 'director-approval', type: 'approval', name: 'Director Approval', description: 'Director reviews and approves the request', position: { x: 850, y: 150 }, config: { assignTo: 'role:director', approvalType: 'single', timeoutDays: 3 } },
                    { id: 'advisor-director', type: 'approval', name: 'Advisor to Director Approval', description: 'Advisor to Director can approve in parallel', position: { x: 850, y: 450 }, config: { assignTo: 'role:advisor_director', approvalType: 'single', timeoutDays: 3 } },
                    { id: 'ce-approval', type: 'approval', name: 'Chief Executive Approval', description: 'Chief Executive reviews and approves', position: { x: 1100, y: 150 }, config: { assignTo: 'role:chief_executive', approvalType: 'single', timeoutDays: 5 } },
                    { id: 'advisor-ce', type: 'approval', name: 'Advisor to Chief Executive Approval', description: 'Advisor to Chief Executive can approve in parallel', position: { x: 1100, y: 450 }, config: { assignTo: 'role:advisor_ce', approvalType: 'single', timeoutDays: 5 } },
                    { id: 'hr-director-approval', type: 'approval', name: 'Director of HR & Admin', description: 'Director of Human Resource & Admin reviews the request', position: { x: 1350, y: 150 }, config: { assignTo: 'role:hr_director', approvalType: 'single', timeoutDays: 3 } },
                    { id: 'advisor-hr-director', type: 'approval', name: 'Advisor to HR Director', description: 'Advisor to Director of HR & Admin can approve in parallel', position: { x: 1350, y: 450 }, config: { assignTo: 'role:advisor_hr_director', approvalType: 'single', timeoutDays: 3 } },
                    { id: 'email-dgm', type: 'email', name: 'Notify DGM/DY DGM HR', description: 'Send notification to DGM / DY DGM HR Management', position: { x: 1600, y: 300 }, config: { to: 'role:dgm_hr', subject: 'Event Reimbursement Approved - {{variables.referenceNumber}}', template: 'event_reimbursement_notify' } },
                    // --- COO (shared by both paths) ---
                    { id: 'coo-approval', type: 'approval', name: 'COO Approval', description: 'Chief Operating Officer final approval', position: { x: 1850, y: 150 }, config: { assignTo: 'role:coo', approvalType: 'single', timeoutDays: 5 } },
                    { id: 'advisor-coo', type: 'approval', name: 'Advisor to COO Approval', description: 'Advisor to COO can approve in parallel', position: { x: 1850, y: 450 }, config: { assignTo: 'role:advisor_coo', approvalType: 'single', timeoutDays: 5 } },
                    // --- Rejection / End ---
                    { id: 'email-reject', type: 'email', name: 'Rejection Notification', description: 'Notify requester of rejection', position: { x: 1100, y: 650 }, config: { to: '{{initiator.email}}', subject: 'Event Reimbursement Rejected - {{variables.referenceNumber}}', template: 'event_reimbursement_rejected' } },
                    { id: 'end-approved', type: 'end', name: 'Request Approved', description: 'Event fee reimbursement fully approved', position: { x: 2100, y: 300 }, config: {} },
                    { id: 'end-rejected', type: 'end', name: 'Request Rejected', description: 'Event fee reimbursement rejected', position: { x: 1350, y: 650 }, config: {} },
                ],
                edges: [
                    { id: 'e1', source: 'start', target: 'eb-team-approval', label: 'Submit' },
                    { id: 'e2', source: 'eb-team-approval', target: 'division-check', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e2r', source: 'eb-team-approval', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    // Division ≠ 1321: full chain
                    { id: 'e3a', source: 'division-check', target: 'director-approval', label: 'Division ≠ 1321', condition: 'variables.employeeDivision !== "1321"' },
                    { id: 'e3b', source: 'division-check', target: 'advisor-director', label: 'Parallel Advisor', condition: 'variables.employeeDivision !== "1321"' },
                    { id: 'e4a', source: 'director-approval', target: 'ce-approval', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e4b', source: 'advisor-director', target: 'advisor-ce', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e4ar', source: 'director-approval', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e5a', source: 'ce-approval', target: 'hr-director-approval', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e5b', source: 'advisor-ce', target: 'advisor-hr-director', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e5ar', source: 'ce-approval', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e6a', source: 'hr-director-approval', target: 'email-dgm', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e6b', source: 'advisor-hr-director', target: 'email-dgm', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e6ar', source: 'hr-director-approval', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e7', source: 'email-dgm', target: 'coo-approval', label: '' },
                    { id: 'e7b', source: 'email-dgm', target: 'advisor-coo', label: 'Parallel Advisor' },
                    // Division = 1321: skip to COO
                    { id: 'e8a', source: 'division-check', target: 'coo-approval', label: 'Division = 1321', condition: 'variables.employeeDivision === "1321"' },
                    { id: 'e8b', source: 'division-check', target: 'advisor-coo', label: 'Parallel Advisor (1321)', condition: 'variables.employeeDivision === "1321"' },
                    // COO → End
                    { id: 'e9a', source: 'coo-approval', target: 'end-approved', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e9b', source: 'advisor-coo', target: 'end-approved', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e9r', source: 'coo-approval', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e10', source: 'email-reject', target: 'end-rejected', label: '' },
                ],
            },
            variables: [
                { name: 'referenceNumber', type: 'string', label: 'Reference Number' },
                { name: 'employeeId', type: 'string', label: 'Employee ID' },
                { name: 'employeeFullName', type: 'string', label: 'Employee Full Name' },
                { name: 'employeeEmail', type: 'string', label: 'Employee Email' },
                { name: 'employeeOffice', type: 'string', label: 'Employee Office' },
                { name: 'employeeDivision', type: 'string', label: 'Employee Division' },
                { name: 'employeeDepartment', type: 'string', label: 'Employee Department' },
                { name: 'employeeTeam', type: 'string', label: 'Employee Team' },
                { name: 'eventDate', type: 'date', label: 'Event Date' },
                { name: 'numberOfParticipants', type: 'number', label: 'Number of Participants' },
                { name: 'place', type: 'string', label: 'Place' },
                { name: 'purpose', type: 'string', label: 'Purpose' },
                { name: 'totalCostMMK', type: 'number', label: 'Total Cost (MMK)' },
                { name: 'formulaTotalCost', type: 'number', label: 'Budget Limit' },
                { name: 'headOfEventOrganizer', type: 'string', label: 'Head of Event Organizer' },
            ],
            triggers: [
                { type: 'form_submission', formId: eventForm.id },
                { type: 'manual', label: 'Submit Event Reimbursement' },
            ],
            settings: { allowCancel: true, trackSLA: true, notification: { onStart: true, onComplete: true, onError: true } },
            permissions: {},
            slaConfig: { defaultDueHours: 120, escalationPolicy: 'notify_admin' },
            version: 1, status: 'ACTIVE', publishedAt: new Date(), createdBy: adminUser.id,
        },
        update: {},
    });

    console.log(`✅ Created workflow: ${eventProcess.name}\n`);

    // ==========================================================================
    // 5. Create Sample Process Instances & Task Instances
    // ==========================================================================

    // Instance 1: RUNNING — Tech team event, at Director Approval stage
    const inst1 = await prisma.processInstance.create({
        data: {
            processId: eventProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['director-approval', 'advisor-director'],
            variables: {
                referenceNumber: 'CO0226B00000001', employeeId: 'MPT-0002', employeeFullName: 'Aung Kyaw',
                employeeEmail: 'aung.kyaw@demo.com', employeeOffice: 'Yangon Head Office',
                employeeDivision: '1301', employeeDepartment: 'Software Engineering',
                employeeTeam: 'Backend Development', eventDate: '2026-03-15',
                numberOfParticipants: 30, place: 'Sedona Hotel, Yangon',
                purpose: 'Annual tech team building and knowledge sharing event',
                totalCostMMK: 900000, formulaTotalCost: 1050000,
                headOfEventOrganizer: 'Aung Kyaw',
            },
            startedBy: mptUsers[1].id,
            dueAt: new Date('2026-03-01T17:00:00Z'),
        },
    });

    await prisma.taskInstance.create({
        data: {
            instanceId: inst1.id, nodeId: 'eb-team-approval', name: 'EB Team Review: Tech Team Building',
            taskType: 'APPROVAL', assigneeId: mptUsers[0].id, assigneeType: 'USER',
            formData: { referenceNumber: 'CO0226B00000001', totalCostMMK: 900000, participants: 30 },
            status: 'COMPLETED', priority: 1, outcome: 'approved',
            completedAt: new Date('2026-02-12T10:00:00Z'), completedBy: mptUsers[0].id,
        },
    });

    await prisma.taskInstance.create({
        data: {
            instanceId: inst1.id, nodeId: 'director-approval', name: 'Director Approval: Tech Team Building - MMK 900,000',
            taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER',
            formData: { referenceNumber: 'CO0226B00000001', totalCostMMK: 900000, participants: 30, division: '1301' },
            status: 'PENDING', priority: 1, dueAt: new Date('2026-02-20T17:00:00Z'),
        },
    });

    // Instance 2: RUNNING — Strategy division (1321), at COO directly
    const inst2 = await prisma.processInstance.create({
        data: {
            processId: eventProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['coo-approval', 'advisor-coo'],
            variables: {
                referenceNumber: 'CO0226B00000002', employeeId: 'MPT-0004', employeeFullName: 'Min Htet',
                employeeEmail: 'min.htet@demo.com', employeeOffice: 'Yangon Head Office',
                employeeDivision: '1321', employeeDepartment: 'Strategy Office',
                employeeTeam: 'Planning Team', eventDate: '2026-03-20',
                numberOfParticipants: 15, place: 'Lotte Hotel, Yangon',
                purpose: 'Quarterly strategy alignment and planning workshop',
                totalCostMMK: 450000, formulaTotalCost: 525000,
                headOfEventOrganizer: 'Min Htet',
            },
            startedBy: mptUsers[3].id,
            dueAt: new Date('2026-03-05T17:00:00Z'),
        },
    });

    await prisma.taskInstance.create({
        data: {
            instanceId: inst2.id, nodeId: 'coo-approval', name: 'COO Approval: Strategy Workshop - MMK 450,000',
            description: 'Division 1321 — routed directly to COO',
            taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER',
            formData: { referenceNumber: 'CO0226B00000002', totalCostMMK: 450000, participants: 15, division: '1321' },
            status: 'PENDING', priority: 2, dueAt: new Date('2026-02-25T17:00:00Z'),
        },
    });

    // Instance 3: COMPLETED — Sales event fully approved
    const inst3 = await prisma.processInstance.create({
        data: {
            processId: eventProcess.id, processVersion: 1, status: 'COMPLETED',
            currentNodes: ['end-approved'],
            variables: {
                referenceNumber: 'CO0226B00000003', employeeId: 'MPT-0003', employeeFullName: 'Thida Win',
                employeeEmail: 'thida.win@demo.com', employeeOffice: 'Mandalay Office',
                employeeDivision: '1305', employeeDepartment: 'Enterprise Sales',
                eventDate: '2026-02-01', numberOfParticipants: 20, place: 'Hilton Mandalay',
                purpose: 'Sales team kickoff and target setting for Q1 2026',
                totalCostMMK: 600000, formulaTotalCost: 700000,
                headOfEventOrganizer: 'Thida Win',
            },
            startedBy: mptUsers[2].id,
            completedAt: new Date('2026-02-10T16:00:00Z'),
        },
    });

    await prisma.taskInstance.create({
        data: {
            instanceId: inst3.id, nodeId: 'coo-approval', name: 'COO Approval: Sales Kickoff - MMK 600,000',
            taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER',
            formData: { referenceNumber: 'CO0226B00000003', totalCostMMK: 600000, participants: 20 },
            status: 'COMPLETED', priority: 1, outcome: 'approved',
            completedAt: new Date('2026-02-10T14:00:00Z'), completedBy: adminUser.id,
        },
    });

    // Instance 4: COMPLETED — Rejected at CE level
    const inst4 = await prisma.processInstance.create({
        data: {
            processId: eventProcess.id, processVersion: 1, status: 'COMPLETED',
            currentNodes: ['end-rejected'],
            variables: {
                referenceNumber: 'CO0226B00000004', employeeId: 'MPT-0006', employeeFullName: 'Ko Zaw',
                employeeDivision: '1325', employeeDepartment: 'NOC',
                eventDate: '2026-02-20', numberOfParticipants: 50, place: 'Karaweik Palace',
                purpose: 'Network operations celebration', totalCostMMK: 2000000, formulaTotalCost: 1750000,
                headOfEventOrganizer: 'Ko Zaw', status: 'Rejected',
            },
            startedBy: mptUsers[5].id,
            completedAt: new Date('2026-02-08T11:00:00Z'),
        },
    });

    await prisma.taskInstance.create({
        data: {
            instanceId: inst4.id, nodeId: 'ce-approval', name: 'CE Review: NOC Celebration - MMK 2,000,000',
            description: 'Cost exceeds budget limit (MMK 1,750,000). Rejected.',
            taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER',
            formData: { referenceNumber: 'CO0226B00000004', totalCostMMK: 2000000, formulaTotalCost: 1750000 },
            status: 'COMPLETED', priority: 1, outcome: 'rejected',
            completedAt: new Date('2026-02-08T11:00:00Z'), completedBy: adminUser.id,
        },
    });

    // Instance 5: RUNNING — HR event, at HR Director stage
    const inst5 = await prisma.processInstance.create({
        data: {
            processId: eventProcess.id, processVersion: 1, status: 'RUNNING',
            currentNodes: ['hr-director-approval'],
            variables: {
                referenceNumber: 'CO0226B00000005', employeeId: 'MPT-0007', employeeFullName: 'Hnin Si',
                employeeDivision: '1310', employeeDepartment: 'HR Operations',
                eventDate: '2026-03-25', numberOfParticipants: 10, place: 'Novotel Yangon',
                purpose: 'HR team professional development workshop',
                totalCostMMK: 300000, formulaTotalCost: 350000,
                headOfEventOrganizer: 'Hnin Si',
            },
            startedBy: mptUsers[6].id,
            dueAt: new Date('2026-03-10T17:00:00Z'),
        },
    });

    await prisma.taskInstance.create({
        data: {
            instanceId: inst5.id, nodeId: 'hr-director-approval', name: 'HR Director Approval: HR Workshop - MMK 300,000',
            taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER',
            formData: { referenceNumber: 'CO0226B00000005', totalCostMMK: 300000, participants: 10 },
            status: 'PENDING', priority: 1, dueAt: new Date('2026-03-01T17:00:00Z'),
        },
    });

    console.log('✅ Created 5 process instances with task instances\n');

    // Create form submissions for running instances
    for (const inst of [inst1, inst2, inst5]) {
        const vars = inst.variables as any;
        await prisma.formSubmission.create({
            data: {
                formId: eventForm.id,
                data: vars,
                createdBy: inst.startedBy,
            },
        });
    }

    console.log('✅ Created 3 form submissions\n');
    console.log('🎉 Company Event Fee Reimbursement seeding complete!\n');
}

seedCompanyEventReimbursement()
    .catch((e) => {
        console.error('❌ Company Event seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
