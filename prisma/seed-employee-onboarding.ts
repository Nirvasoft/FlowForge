/**
 * Employee Onboarding Seed Script
 * Creates a complete Employee Onboarding workflow with:
 * - Multi-step wizard form (Personal Info → Employment → Equipment & Access → Documents)
 * - Parallel workflow (submit → fork → IT/HR/Facilities/Manager tasks → join → welcome email)
 * - Supporting datasets (Departments, Positions, Employees, Onboarding Records)
 * - Onboarding Equipment & Access Decision Table (in-memory via server startup)
 * - Sample process instances and task instances
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedEmployeeOnboarding() {
    console.log('👤 Seeding Employee Onboarding Flow...\n');

    // ==========================================================================
    // 1. Get demo account and users
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

    const bcryptModule = await import('bcryptjs');
    const bcryptLib = bcryptModule.default || bcryptModule;
    const passwordHash = await bcryptLib.hash('Demo123!@#', 12);

    const userProfiles = [
        { email: 'hr.manager@demo.com', firstName: 'Karen', lastName: 'Phillips' },
        { email: 'it.manager@demo.com', firstName: 'Steve', lastName: 'Rogers' },
        { email: 'facilities@demo.com', firstName: 'Diana', lastName: 'Lane' },
        { email: 'eng.manager@demo.com', firstName: 'Peter', lastName: 'Chen' },
        { email: 'mkt.manager@demo.com', firstName: 'Laura', lastName: 'Kim' },
        { email: 'new.hire1@demo.com', firstName: 'Emily', lastName: 'Zhang' },
        { email: 'new.hire2@demo.com', firstName: 'James', lastName: 'Torres' },
        { email: 'new.hire3@demo.com', firstName: 'Aisha', lastName: 'Rahman' },
    ];

    const onboardUsers = [];
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
        onboardUsers.push(user);
    }

    const [hrManager, itManager, facilities, engManager, mktManager, newHire1, newHire2, newHire3] = onboardUsers;
    console.log(`✅ Found/created ${onboardUsers.length} onboarding users\n`);

    // ==========================================================================
    // 2. Create Supporting Datasets (Departments, Positions, Employees)
    // ==========================================================================

    // --- Departments Dataset ---
    const deptDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Departments' } },
        create: {
            accountId: account.id,
            name: 'Departments',
            description: 'Company departments for lookup in forms and workflows',
            schema: [
                { name: 'Department ID', slug: 'dept_id', type: 'text', required: true },
                { name: 'Name', slug: 'name', type: 'text', required: true },
                { name: 'Manager', slug: 'manager', type: 'text', required: false },
                { name: 'Head Count', slug: 'head_count', type: 'number', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {}, rowCount: 0,
            createdBy: adminUser.id,
        },
        update: {},
    });

    const departments = [
        { dept_id: 'DEPT-ENG', name: 'Engineering', manager: 'Peter Chen', head_count: 45 },
        { dept_id: 'DEPT-MKT', name: 'Marketing', manager: 'Laura Kim', head_count: 18 },
        { dept_id: 'DEPT-HR', name: 'Human Resources', manager: 'Karen Phillips', head_count: 8 },
        { dept_id: 'DEPT-FIN', name: 'Finance', manager: 'Robert Davis', head_count: 12 },
        { dept_id: 'DEPT-SALES', name: 'Sales', manager: 'Amanda Scott', head_count: 22 },
        { dept_id: 'DEPT-OPS', name: 'Operations', manager: 'Diana Lane', head_count: 10 },
        { dept_id: 'DEPT-IT', name: 'IT', manager: 'Steve Rogers', head_count: 15 },
    ];

    for (const dept of departments) {
        await prisma.datasetRecord.create({
            data: { datasetId: deptDataset.id, data: dept, createdBy: adminUser.id },
        });
    }
    await prisma.dataset.update({ where: { id: deptDataset.id }, data: { rowCount: departments.length } });
    console.log(`✅ Created Departments dataset (${departments.length} records)`);

    // --- Positions Dataset ---
    const posDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Positions' } },
        create: {
            accountId: account.id,
            name: 'Positions',
            description: 'Job titles and positions for lookup',
            schema: [
                { name: 'Position ID', slug: 'position_id', type: 'text', required: true },
                { name: 'Title', slug: 'title', type: 'text', required: true },
                { name: 'Department', slug: 'department', type: 'text', required: true },
                { name: 'Level', slug: 'level', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {}, rowCount: 0,
            createdBy: adminUser.id,
        },
        update: {},
    });

    const positions = [
        { position_id: 'POS-001', title: 'Software Engineer', department: 'Engineering', level: 'IC3' },
        { position_id: 'POS-002', title: 'Senior Software Engineer', department: 'Engineering', level: 'IC4' },
        { position_id: 'POS-003', title: 'Product Manager', department: 'Engineering', level: 'IC4' },
        { position_id: 'POS-004', title: 'Marketing Specialist', department: 'Marketing', level: 'IC2' },
        { position_id: 'POS-005', title: 'Marketing Manager', department: 'Marketing', level: 'M1' },
        { position_id: 'POS-006', title: 'HR Coordinator', department: 'Human Resources', level: 'IC2' },
        { position_id: 'POS-007', title: 'Financial Analyst', department: 'Finance', level: 'IC3' },
        { position_id: 'POS-008', title: 'Sales Executive', department: 'Sales', level: 'IC3' },
    ];

    for (const pos of positions) {
        await prisma.datasetRecord.create({
            data: { datasetId: posDataset.id, data: pos, createdBy: adminUser.id },
        });
    }
    await prisma.dataset.update({ where: { id: posDataset.id }, data: { rowCount: positions.length } });
    console.log(`✅ Created Positions dataset (${positions.length} records)`);

    // --- Employees Dataset (for "Reports To" lookup) ---
    const empDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Employees' } },
        create: {
            accountId: account.id,
            name: 'Employees',
            description: 'Employee directory for manager lookup and org chart',
            schema: [
                { name: 'Employee ID', slug: 'emp_id', type: 'text', required: true },
                { name: 'Full Name', slug: 'full_name', type: 'text', required: true },
                { name: 'Email', slug: 'email', type: 'text', required: true },
                { name: 'Department', slug: 'department', type: 'text', required: true },
                { name: 'Title', slug: 'title', type: 'text', required: true },
                { name: 'Status', slug: 'status', type: 'text', required: true },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {}, rowCount: 0,
            createdBy: adminUser.id,
        },
        update: {},
    });

    const employees = [
        { emp_id: 'EMP-001', full_name: 'Peter Chen', email: 'eng.manager@demo.com', department: 'Engineering', title: 'VP Engineering', status: 'Active' },
        { emp_id: 'EMP-002', full_name: 'Laura Kim', email: 'mkt.manager@demo.com', department: 'Marketing', title: 'Marketing Director', status: 'Active' },
        { emp_id: 'EMP-003', full_name: 'Karen Phillips', email: 'hr.manager@demo.com', department: 'Human Resources', title: 'HR Manager', status: 'Active' },
        { emp_id: 'EMP-004', full_name: 'Steve Rogers', email: 'it.manager@demo.com', department: 'IT', title: 'IT Manager', status: 'Active' },
        { emp_id: 'EMP-005', full_name: 'Diana Lane', email: 'facilities@demo.com', department: 'Operations', title: 'Facilities Manager', status: 'Active' },
    ];

    for (const emp of employees) {
        await prisma.datasetRecord.create({
            data: { datasetId: empDataset.id, data: emp, createdBy: adminUser.id },
        });
    }
    await prisma.dataset.update({ where: { id: empDataset.id }, data: { rowCount: employees.length } });
    console.log(`✅ Created Employees dataset (${employees.length} records)\n`);

    // ==========================================================================
    // 3. Create Multi-Step Wizard Form
    // ==========================================================================
    const onboardingForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-000000000005' },
        create: {
            id: '00000000-0000-0000-0000-000000000005',
            accountId: account.id,
            name: 'New Employee Onboarding',
            description: 'Multi-step wizard for new employee onboarding: personal info, employment details, equipment & access, and documents',
            fields: [
                // Step 1: Personal Information
                { id: 'f-firstName', name: 'firstName', label: 'First Name', type: 'text', required: true, order: 1, config: {} },
                { id: 'f-lastName', name: 'lastName', label: 'Last Name', type: 'text', required: true, order: 2, config: {} },
                { id: 'f-email', name: 'email', label: 'Personal Email', type: 'email', required: true, order: 3, config: {} },
                { id: 'f-phone', name: 'phone', label: 'Phone Number', type: 'phone', required: true, order: 4, config: {} },
                { id: 'f-dob', name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true, order: 5, config: {} },
                { id: 'f-address', name: 'address', label: 'Home Address', type: 'address', required: true, order: 6, config: {} },
                {
                    id: 'f-emergency', name: 'emergencyContact', label: 'Emergency Contact', type: 'group', required: false, order: 7,
                    config: {
                        fields: [
                            { name: 'name', type: 'text', label: 'Name' },
                            { name: 'relationship', type: 'text', label: 'Relationship' },
                            { name: 'phone', type: 'phone', label: 'Phone' },
                        ],
                    },
                },
                // Step 2: Employment Details
                { id: 'f-startDate', name: 'startDate', label: 'Start Date', type: 'date', required: true, order: 8, config: {} },
                {
                    id: 'f-department', name: 'department', label: 'Department', type: 'lookup', required: true, order: 9,
                    config: { datasetId: 'departments', displayField: 'name', valueField: 'dept_id' },
                },
                {
                    id: 'f-jobTitle', name: 'jobTitle', label: 'Job Title', type: 'lookup', required: true, order: 10,
                    config: { datasetId: 'positions', displayField: 'title', valueField: 'position_id' },
                },
                {
                    id: 'f-manager', name: 'manager', label: 'Reports To', type: 'lookup', required: true, order: 11,
                    config: { datasetId: 'employees', displayField: 'full_name', valueField: 'emp_id' },
                },
                {
                    id: 'f-location', name: 'location', label: 'Work Location', type: 'select', required: true, order: 12,
                    config: {
                        options: [
                            { value: 'hq', label: 'Headquarters' },
                            { value: 'remote', label: 'Remote' },
                            { value: 'hybrid', label: 'Hybrid' },
                        ],
                    },
                },
                {
                    id: 'f-empType', name: 'employmentType', label: 'Employment Type', type: 'radio', required: true, order: 13,
                    config: {
                        options: [
                            { value: 'fulltime', label: 'Full-time' },
                            { value: 'parttime', label: 'Part-time' },
                            { value: 'contractor', label: 'Contractor' },
                        ],
                    },
                },
                // Step 3: Equipment & Access
                {
                    id: 'f-computer', name: 'computerType', label: 'Computer', type: 'select', required: true, order: 14,
                    config: {
                        options: [
                            { value: 'macbook-pro', label: 'MacBook Pro 14"' },
                            { value: 'macbook-air', label: 'MacBook Air' },
                            { value: 'dell-xps', label: 'Dell XPS 15' },
                            { value: 'thinkpad', label: 'ThinkPad X1' },
                        ],
                    },
                },
                {
                    id: 'f-accessories', name: 'accessories', label: 'Accessories', type: 'multiselect', required: false, order: 15,
                    config: {
                        options: [
                            { value: 'monitor', label: 'External Monitor' },
                            { value: 'keyboard', label: 'Wireless Keyboard' },
                            { value: 'mouse', label: 'Wireless Mouse' },
                            { value: 'headset', label: 'Headset' },
                        ],
                    },
                },
                {
                    id: 'f-software', name: 'softwareNeeded', label: 'Software', type: 'multiselect', required: false, order: 16,
                    config: {
                        options: [
                            { value: 'office365', label: 'Microsoft 365' },
                            { value: 'adobe', label: 'Adobe Creative Cloud' },
                            { value: 'slack', label: 'Slack' },
                            { value: 'zoom', label: 'Zoom' },
                            { value: 'github', label: 'GitHub' },
                            { value: 'jira', label: 'Jira' },
                        ],
                    },
                },
                {
                    id: 'f-sysAccess', name: 'systemAccess', label: 'System Access', type: 'multiselect', required: false, order: 17,
                    config: {
                        options: [
                            { value: 'erp', label: 'ERP System' },
                            { value: 'crm', label: 'CRM' },
                            { value: 'hr', label: 'HR Portal' },
                            { value: 'finance', label: 'Finance System' },
                        ],
                    },
                },
                // Step 4: Documents
                { id: 'f-idDoc', name: 'idDocument', label: 'ID Document', type: 'file', required: true, order: 18, config: { accept: '.pdf,.jpg' } },
                { id: 'f-taxForm', name: 'taxForm', label: 'Tax Form (W-4)', type: 'file', required: true, order: 19, config: {} },
                { id: 'f-directDeposit', name: 'directDeposit', label: 'Direct Deposit Form', type: 'file', required: false, order: 20, config: {} },
                { id: 'f-signedOffer', name: 'signedOffer', label: 'Signed Offer Letter', type: 'file', required: true, order: 21, config: {} },
                { id: 'f-nda', name: 'ndaSigned', label: 'I have read and signed the NDA', type: 'checkbox', required: true, order: 22, config: {} },
                { id: 'f-handbook', name: 'handbookAck', label: 'I acknowledge receipt of Employee Handbook', type: 'checkbox', required: true, order: 23, config: {} },
            ],
            layout: {
                type: 'wizard',
                columns: 2,
                steps: [
                    {
                        name: 'Personal Information',
                        fields: ['f-firstName', 'f-lastName', 'f-email', 'f-phone', 'f-dob', 'f-address', 'f-emergency'],
                    },
                    {
                        name: 'Employment Details',
                        fields: ['f-startDate', 'f-department', 'f-jobTitle', 'f-manager', 'f-location', 'f-empType'],
                    },
                    {
                        name: 'Equipment & Access',
                        fields: ['f-computer', 'f-accessories', 'f-software', 'f-sysAccess'],
                    },
                    {
                        name: 'Documents',
                        fields: ['f-idDoc', 'f-taxForm', 'f-directDeposit', 'f-signedOffer', 'f-nda', 'f-handbook'],
                    },
                ],
            },
            validationRules: [
                { field: 'email', rule: 'email', message: 'Please enter a valid email address' },
                { field: 'startDate', rule: 'futureDate', message: 'Start date must be in the future' },
            ],
            conditionalLogic: [
                {
                    field: 'directDeposit',
                    condition: { field: 'employmentType', operator: 'in', value: ['fulltime', 'parttime'] },
                    action: { type: 'show' },
                },
            ],
            settings: {
                submitButtonText: 'Complete Onboarding',
                showProgressBar: true,
                allowDraft: true,
            },
            permissions: {},
            version: 1,
            status: 'ACTIVE',
            createdBy: adminUser.id,
        },
        update: {},
    });

    console.log(`✅ Created wizard form: ${onboardingForm.name} (${onboardingForm.id})\n`);

    // ==========================================================================
    // 4. Create Parallel Workflow
    // ==========================================================================
    const onboardProcess = await prisma.process.upsert({
        where: { id: '00000000-0000-0000-0000-000000000050' },
        create: {
            id: '00000000-0000-0000-0000-000000000050',
            accountId: account.id,
            name: 'Employee Onboarding Workflow',
            description: 'Parallel onboarding workflow: IT setup, HR benefits enrollment, facilities badge & desk, and manager first-week planning run concurrently',
            category: 'HR',
            definition: {
                nodes: [
                    {
                        id: 'submit-form',
                        type: 'start',
                        name: 'Submit Onboarding Form',
                        description: 'New hire or HR submits the onboarding wizard form',
                        position: { x: 100, y: 300 },
                        config: { trigger: 'form_submission', formId: onboardingForm.id },
                    },
                    {
                        id: 'validate-data',
                        type: 'action',
                        name: 'Validate & Enrich Data',
                        description: 'Validate form data, resolve lookups, and determine equipment based on department/role',
                        position: { x: 350, y: 300 },
                        config: {
                            action: 'validate_and_enrich',
                            decisionTableId: 'onboarding-equipment-access',
                        },
                    },
                    {
                        id: 'create-record',
                        type: 'action',
                        name: 'Create Employee Record',
                        description: 'Create a new onboarding record in the dataset',
                        position: { x: 600, y: 300 },
                        config: { action: 'dataset_create', datasetId: 'onboarding-records' },
                    },
                    {
                        id: 'fork-parallel',
                        type: 'fork',
                        name: 'Fork: Parallel Tasks',
                        description: 'Split into 4 parallel onboarding tasks',
                        position: { x: 850, y: 300 },
                        config: { forkType: 'parallel' },
                    },
                    // Parallel branch 1: IT Setup
                    {
                        id: 'it-setup',
                        type: 'approval',
                        name: 'IT: Setup Computer & Accounts',
                        description: 'IT team provisions laptop, creates email, sets up software, configures VPN, and grants system access',
                        position: { x: 1150, y: 100 },
                        config: {
                            assignTo: 'it-team',
                            taskType: 'it_setup',
                            checklist: [
                                'Provision laptop ({{variables.computerType}})',
                                'Create corporate email',
                                'Install software: {{variables.softwareNeeded}}',
                                'Grant system access: {{variables.systemAccess}}',
                                'Configure VPN',
                                'Setup accessories: {{variables.accessories}}',
                            ],
                        },
                    },
                    // Parallel branch 2: HR Benefits
                    {
                        id: 'hr-benefits',
                        type: 'approval',
                        name: 'HR: Benefits Enrollment',
                        description: 'HR processes benefits enrollment, tax documents, payroll setup, and policy acknowledgments',
                        position: { x: 1150, y: 250 },
                        config: {
                            assignTo: 'hr-team',
                            taskType: 'hr_benefits',
                            checklist: [
                                'Process W-4 tax form',
                                'Setup direct deposit',
                                'Enroll in health insurance',
                                'Setup 401(k) account',
                                'Verify NDA signature',
                                'File signed offer letter',
                            ],
                        },
                    },
                    // Parallel branch 3: Facilities
                    {
                        id: 'facilities-setup',
                        type: 'approval',
                        name: 'Facilities: Badge & Desk',
                        description: 'Facilities prepares security badge, desk assignment, parking pass, and building access',
                        position: { x: 1150, y: 400 },
                        config: {
                            assignTo: 'facilities-team',
                            taskType: 'facilities_setup',
                            checklist: [
                                'Create security badge',
                                'Assign desk/workspace',
                                'Issue parking pass',
                                'Grant building access',
                                'Prepare welcome kit',
                            ],
                        },
                    },
                    // Parallel branch 4: Manager
                    {
                        id: 'manager-prep',
                        type: 'approval',
                        name: 'Manager: Plan First Week',
                        description: 'Hiring manager prepares onboarding plan, team introductions, and first-week schedule',
                        position: { x: 1150, y: 550 },
                        config: {
                            assignTo: '{{variables.manager}}',
                            taskType: 'manager_prep',
                            checklist: [
                                'Create first-week schedule',
                                'Assign onboarding buddy',
                                'Schedule team introductions',
                                'Prepare initial project briefing',
                                'Book onboarding meetings',
                            ],
                        },
                    },
                    // Join
                    {
                        id: 'join-all',
                        type: 'join',
                        name: 'Join: Wait for All Tasks',
                        description: 'Wait for all 4 parallel tasks to complete before proceeding',
                        position: { x: 1450, y: 300 },
                        config: { joinType: 'all' },
                    },
                    // Welcome email
                    {
                        id: 'welcome-email',
                        type: 'email',
                        name: 'Send Welcome Email',
                        description: 'Send welcome email to new hire with first-day instructions, credentials, and onboarding schedule',
                        position: { x: 1700, y: 300 },
                        config: {
                            to: '{{variables.email}}',
                            subject: 'Welcome to the team, {{variables.firstName}}! 🎉',
                            template: 'new_hire_welcome',
                        },
                    },
                    // End
                    {
                        id: 'end-complete',
                        type: 'end',
                        name: 'Onboarding Complete',
                        description: 'Employee onboarding process fully completed',
                        position: { x: 1950, y: 300 },
                        config: {},
                    },
                ],
                edges: [
                    { id: 'e1', source: 'submit-form', target: 'validate-data', label: '' },
                    { id: 'e2', source: 'validate-data', target: 'create-record', label: 'Validated' },
                    { id: 'e3', source: 'create-record', target: 'fork-parallel', label: 'Record created' },
                    { id: 'e4', source: 'fork-parallel', target: 'it-setup', label: 'IT Setup' },
                    { id: 'e5', source: 'fork-parallel', target: 'hr-benefits', label: 'HR Benefits' },
                    { id: 'e6', source: 'fork-parallel', target: 'facilities-setup', label: 'Facilities' },
                    { id: 'e7', source: 'fork-parallel', target: 'manager-prep', label: 'Manager Prep' },
                    { id: 'e8', source: 'it-setup', target: 'join-all', label: '' },
                    { id: 'e9', source: 'hr-benefits', target: 'join-all', label: '' },
                    { id: 'e10', source: 'facilities-setup', target: 'join-all', label: '' },
                    { id: 'e11', source: 'manager-prep', target: 'join-all', label: '' },
                    { id: 'e12', source: 'join-all', target: 'welcome-email', label: 'All tasks done' },
                    { id: 'e13', source: 'welcome-email', target: 'end-complete', label: '' },
                ],
            },
            variables: [
                { name: 'firstName', type: 'string', label: 'First Name' },
                { name: 'lastName', type: 'string', label: 'Last Name' },
                { name: 'email', type: 'string', label: 'Personal Email' },
                { name: 'phone', type: 'string', label: 'Phone' },
                { name: 'startDate', type: 'string', label: 'Start Date' },
                { name: 'department', type: 'string', label: 'Department' },
                { name: 'jobTitle', type: 'string', label: 'Job Title' },
                { name: 'manager', type: 'string', label: 'Reports To' },
                { name: 'location', type: 'string', label: 'Work Location' },
                { name: 'employmentType', type: 'string', label: 'Employment Type' },
                { name: 'computerType', type: 'string', label: 'Computer' },
                { name: 'accessories', type: 'array', label: 'Accessories' },
                { name: 'softwareNeeded', type: 'array', label: 'Software' },
                { name: 'systemAccess', type: 'array', label: 'System Access' },
            ],
            triggers: [
                { type: 'form_submission', formId: onboardingForm.id },
                { type: 'manual', label: 'Start Onboarding' },
            ],
            settings: {
                allowCancel: true,
                notification: { onStart: true, onComplete: true, onError: true },
            },
            permissions: {},
            slaConfig: { defaultDueHours: 72, escalationPolicy: 'notify_hr' },
            version: 1,
            status: 'ACTIVE',
            publishedAt: new Date(),
            createdBy: adminUser.id,
        },
        update: {},
    });

    console.log(`✅ Created process: ${onboardProcess.name} (${onboardProcess.id})\n`);

    // ==========================================================================
    // 5. Create Onboarding Records Dataset
    // ==========================================================================
    const onboardDataset = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Onboarding Records' } },
        create: {
            accountId: account.id,
            name: 'Onboarding Records',
            description: 'Tracks all employee onboarding requests with status, progress, and completion details',
            schema: [
                { name: 'Onboarding ID', slug: 'onboarding_id', type: 'text', required: true },
                { name: 'Employee Name', slug: 'employee_name', type: 'text', required: true },
                { name: 'Email', slug: 'email', type: 'text', required: true },
                { name: 'Department', slug: 'department', type: 'text', required: true },
                { name: 'Job Title', slug: 'job_title', type: 'text', required: true },
                { name: 'Start Date', slug: 'start_date', type: 'date', required: true },
                { name: 'Location', slug: 'location', type: 'text', required: true },
                { name: 'Status', slug: 'status', type: 'select', required: true },
                { name: 'IT Setup', slug: 'it_setup', type: 'text', required: false },
                { name: 'HR Benefits', slug: 'hr_benefits', type: 'text', required: false },
                { name: 'Facilities', slug: 'facilities', type: 'text', required: false },
                { name: 'Manager Prep', slug: 'manager_prep', type: 'text', required: false },
                { name: 'Completed At', slug: 'completed_at', type: 'date', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {}, rowCount: 0,
            createdBy: adminUser.id,
        },
        update: {},
    });

    const onboardRecords = [
        {
            onboarding_id: 'ONB-001', employee_name: 'Emily Zhang', email: 'new.hire1@demo.com',
            department: 'Engineering', job_title: 'Software Engineer', start_date: '2026-02-17',
            location: 'Hybrid', status: 'In Progress',
            it_setup: 'In Progress', hr_benefits: 'Completed', facilities: 'Completed', manager_prep: 'Pending',
            completed_at: '',
        },
        {
            onboarding_id: 'ONB-002', employee_name: 'James Torres', email: 'new.hire2@demo.com',
            department: 'Marketing', job_title: 'Marketing Specialist', start_date: '2026-02-24',
            location: 'Headquarters', status: 'In Progress',
            it_setup: 'Pending', hr_benefits: 'Pending', facilities: 'Pending', manager_prep: 'Pending',
            completed_at: '',
        },
        {
            onboarding_id: 'ONB-003', employee_name: 'Aisha Rahman', email: 'new.hire3@demo.com',
            department: 'Engineering', job_title: 'Senior Software Engineer', start_date: '2026-02-10',
            location: 'Remote', status: 'Completed',
            it_setup: 'Completed', hr_benefits: 'Completed', facilities: 'Completed', manager_prep: 'Completed',
            completed_at: '2026-02-08T10:00:00Z',
        },
        {
            onboarding_id: 'ONB-004', employee_name: 'Carlos Rivera', email: 'carlos.r@demo.com',
            department: 'Sales', job_title: 'Sales Executive', start_date: '2026-03-03',
            location: 'Headquarters', status: 'Pending',
            it_setup: 'Not Started', hr_benefits: 'Not Started', facilities: 'Not Started', manager_prep: 'Not Started',
            completed_at: '',
        },
        {
            onboarding_id: 'ONB-005', employee_name: 'Priya Sharma', email: 'priya.s@demo.com',
            department: 'Finance', job_title: 'Financial Analyst', start_date: '2026-02-03',
            location: 'Headquarters', status: 'Completed',
            it_setup: 'Completed', hr_benefits: 'Completed', facilities: 'Completed', manager_prep: 'Completed',
            completed_at: '2026-02-02T16:00:00Z',
        },
    ];

    for (const rec of onboardRecords) {
        await prisma.datasetRecord.create({
            data: { datasetId: onboardDataset.id, data: rec, createdBy: adminUser.id },
        });
    }
    await prisma.dataset.update({ where: { id: onboardDataset.id }, data: { rowCount: onboardRecords.length } });
    console.log(`✅ Created Onboarding Records dataset (${onboardRecords.length} records)\n`);

    // ==========================================================================
    // 6. Create Form Submissions
    // ==========================================================================
    const formSubmissions = [
        {
            firstName: 'Emily', lastName: 'Zhang',
            email: 'emily.zhang@personal.com', phone: '+1-415-555-0101',
            dateOfBirth: '1995-08-14',
            address: '742 Evergreen Terrace, San Francisco, CA 94102',
            emergencyContact: { name: 'Wei Zhang', relationship: 'Father', phone: '+1-415-555-0102' },
            startDate: '2026-02-17', department: 'DEPT-ENG', jobTitle: 'POS-001',
            manager: 'EMP-001', location: 'hybrid', employmentType: 'fulltime',
            computerType: 'macbook-pro',
            accessories: ['monitor', 'keyboard', 'mouse', 'headset'],
            softwareNeeded: ['office365', 'slack', 'github', 'jira'],
            systemAccess: ['hr'],
            idDocument: 'id-emily.pdf', taxForm: 'w4-emily.pdf',
            directDeposit: 'dd-emily.pdf', signedOffer: 'offer-emily.pdf',
            ndaSigned: true, handbookAck: true,
            submittedBy: 'Emily Zhang',
        },
        {
            firstName: 'James', lastName: 'Torres',
            email: 'james.torres@personal.com', phone: '+1-212-555-0201',
            dateOfBirth: '1992-03-22',
            address: '456 Broadway, New York, NY 10013',
            emergencyContact: { name: 'Maria Torres', relationship: 'Wife', phone: '+1-212-555-0202' },
            startDate: '2026-02-24', department: 'DEPT-MKT', jobTitle: 'POS-004',
            manager: 'EMP-002', location: 'hq', employmentType: 'fulltime',
            computerType: 'macbook-air',
            accessories: ['monitor', 'headset'],
            softwareNeeded: ['office365', 'adobe', 'slack', 'zoom'],
            systemAccess: ['crm', 'hr'],
            idDocument: 'id-james.pdf', taxForm: 'w4-james.pdf',
            directDeposit: 'dd-james.pdf', signedOffer: 'offer-james.pdf',
            ndaSigned: true, handbookAck: true,
            submittedBy: 'James Torres',
        },
        {
            firstName: 'Aisha', lastName: 'Rahman',
            email: 'aisha.rahman@personal.com', phone: '+1-650-555-0301',
            dateOfBirth: '1990-11-05',
            address: '1200 Tech Blvd, Palo Alto, CA 94301',
            emergencyContact: { name: 'Omar Rahman', relationship: 'Brother', phone: '+1-650-555-0302' },
            startDate: '2026-02-10', department: 'DEPT-ENG', jobTitle: 'POS-002',
            manager: 'EMP-001', location: 'remote', employmentType: 'fulltime',
            computerType: 'macbook-pro',
            accessories: ['monitor', 'keyboard', 'mouse', 'headset'],
            softwareNeeded: ['office365', 'slack', 'github', 'jira', 'zoom'],
            systemAccess: ['hr'],
            idDocument: 'id-aisha.pdf', taxForm: 'w4-aisha.pdf',
            directDeposit: 'dd-aisha.pdf', signedOffer: 'offer-aisha.pdf',
            ndaSigned: true, handbookAck: true,
            submittedBy: 'Aisha Rahman',
        },
        {
            firstName: 'Carlos', lastName: 'Rivera',
            email: 'carlos.rivera@personal.com', phone: '+1-305-555-0401',
            dateOfBirth: '1988-06-18',
            address: '890 Ocean Dr, Miami, FL 33139',
            emergencyContact: { name: 'Sofia Rivera', relationship: 'Sister', phone: '+1-305-555-0402' },
            startDate: '2026-03-03', department: 'DEPT-SALES', jobTitle: 'POS-008',
            manager: 'EMP-001', location: 'hq', employmentType: 'fulltime',
            computerType: 'dell-xps',
            accessories: ['monitor', 'headset'],
            softwareNeeded: ['office365', 'slack', 'zoom'],
            systemAccess: ['crm', 'erp', 'hr'],
            idDocument: 'id-carlos.pdf', taxForm: 'w4-carlos.pdf',
            directDeposit: 'dd-carlos.pdf', signedOffer: 'offer-carlos.pdf',
            ndaSigned: true, handbookAck: true,
            submittedBy: 'Carlos Rivera',
        },
    ];

    for (const submission of formSubmissions) {
        const submitterUser = onboardUsers.find(u => u.firstName === submission.submittedBy.split(' ')[0]);
        await prisma.formSubmission.create({
            data: {
                formId: onboardingForm.id,
                data: submission,
                createdBy: submitterUser?.id || adminUser.id,
            },
        });
    }
    console.log(`✅ Created ${formSubmissions.length} form submissions\n`);

    // ==========================================================================
    // 7. Create Process Instances
    // ==========================================================================

    // Instance 1: RUNNING - Emily Zhang (Engineering, hybrid, parallel tasks in progress)
    const inst1 = await prisma.processInstance.create({
        data: {
            processId: onboardProcess.id,
            processVersion: 1,
            status: 'RUNNING',
            currentNodes: ['it-setup', 'manager-prep'],
            variables: {
                firstName: 'Emily', lastName: 'Zhang', email: 'emily.zhang@personal.com',
                department: 'Engineering', jobTitle: 'Software Engineer',
                manager: 'Peter Chen', location: 'hybrid', employmentType: 'fulltime',
                startDate: '2026-02-17', computerType: 'macbook-pro',
                accessories: ['monitor', 'keyboard', 'mouse', 'headset'],
                softwareNeeded: ['office365', 'slack', 'github', 'jira'],
                systemAccess: ['hr'],
                onboardingId: 'ONB-001',
            },
            startedBy: hrManager.id,
        },
    });

    // Instance 2: RUNNING - James Torres (Marketing, HQ, all 4 tasks pending)
    const inst2 = await prisma.processInstance.create({
        data: {
            processId: onboardProcess.id,
            processVersion: 1,
            status: 'RUNNING',
            currentNodes: ['it-setup', 'hr-benefits', 'facilities-setup', 'manager-prep'],
            variables: {
                firstName: 'James', lastName: 'Torres', email: 'james.torres@personal.com',
                department: 'Marketing', jobTitle: 'Marketing Specialist',
                manager: 'Laura Kim', location: 'hq', employmentType: 'fulltime',
                startDate: '2026-02-24', computerType: 'macbook-air',
                accessories: ['monitor', 'headset'],
                softwareNeeded: ['office365', 'adobe', 'slack', 'zoom'],
                systemAccess: ['crm', 'hr'],
                onboardingId: 'ONB-002',
            },
            startedBy: hrManager.id,
        },
    });

    // Instance 3: COMPLETED - Aisha Rahman (Engineering, remote, all done)
    const inst3 = await prisma.processInstance.create({
        data: {
            processId: onboardProcess.id,
            processVersion: 1,
            status: 'COMPLETED',
            currentNodes: ['end-complete'],
            variables: {
                firstName: 'Aisha', lastName: 'Rahman', email: 'aisha.rahman@personal.com',
                department: 'Engineering', jobTitle: 'Senior Software Engineer',
                manager: 'Peter Chen', location: 'remote', employmentType: 'fulltime',
                startDate: '2026-02-10', computerType: 'macbook-pro',
                onboardingId: 'ONB-003',
            },
            completedAt: new Date('2026-02-08T10:00:00Z'),
            startedBy: hrManager.id,
        },
    });

    // Instance 4: COMPLETED - Priya Sharma (Finance, HQ, all done)
    const inst4 = await prisma.processInstance.create({
        data: {
            processId: onboardProcess.id,
            processVersion: 1,
            status: 'COMPLETED',
            currentNodes: ['end-complete'],
            variables: {
                firstName: 'Priya', lastName: 'Sharma', email: 'priya.s@demo.com',
                department: 'Finance', jobTitle: 'Financial Analyst',
                location: 'hq', employmentType: 'fulltime',
                startDate: '2026-02-03',
                onboardingId: 'ONB-005',
            },
            completedAt: new Date('2026-02-02T16:00:00Z'),
            startedBy: hrManager.id,
        },
    });

    // Instance 5: RUNNING - Carlos Rivera (Sales, HQ, not yet started—still at validate-data)
    const inst5 = await prisma.processInstance.create({
        data: {
            processId: onboardProcess.id,
            processVersion: 1,
            status: 'RUNNING',
            currentNodes: ['validate-data'],
            variables: {
                firstName: 'Carlos', lastName: 'Rivera', email: 'carlos.rivera@personal.com',
                department: 'Sales', jobTitle: 'Sales Executive',
                location: 'hq', employmentType: 'fulltime',
                startDate: '2026-03-03', computerType: 'dell-xps',
                onboardingId: 'ONB-004',
            },
            startedBy: hrManager.id,
        },
    });

    console.log(`✅ Created 5 process instances\n`);

    // ==========================================================================
    // 8. Create Task Instances (parallel tasks)
    // ==========================================================================

    // --- Emily Zhang (inst1): HR ✅, Facilities ✅, IT 🔄, Manager ⏳ ---

    // IT Setup - PENDING (in progress)
    await prisma.taskInstance.create({
        data: {
            instanceId: inst1.id, nodeId: 'it-setup',
            name: 'IT Setup: Emily Zhang - Software Engineer',
            description: 'Provision MacBook Pro 14", setup email, install Office 365, Slack, GitHub, Jira. Grant HR Portal access. Configure VPN for hybrid work.',
            taskType: 'TASK', assigneeId: itManager.id, assigneeType: 'USER',
            formData: {
                employee: 'Emily Zhang', department: 'Engineering',
                computer: 'MacBook Pro 14"', software: ['Office 365', 'Slack', 'GitHub', 'Jira'],
                accessories: ['Monitor', 'Keyboard', 'Mouse', 'Headset'],
            },
            status: 'PENDING', priority: 0,
            dueAt: new Date('2026-02-14T17:00:00Z'),
        },
    });

    // HR Benefits - COMPLETED
    await prisma.taskInstance.create({
        data: {
            instanceId: inst1.id, nodeId: 'hr-benefits',
            name: 'HR Benefits: Emily Zhang - Enrollment',
            description: 'Process W-4, setup direct deposit, enroll in health insurance and 401(k), verify NDA.',
            taskType: 'TASK', assigneeId: hrManager.id, assigneeType: 'USER',
            formData: { employee: 'Emily Zhang', department: 'Engineering' },
            status: 'COMPLETED', priority: 1,
            dueAt: new Date('2026-02-14T17:00:00Z'),
            outcome: 'completed',
            completedAt: new Date('2026-02-08T11:00:00Z'),
            completedBy: hrManager.id,
            comments: 'All benefits enrolled. W-4 processed. Direct deposit active.',
        },
    });

    // Facilities - COMPLETED
    await prisma.taskInstance.create({
        data: {
            instanceId: inst1.id, nodeId: 'facilities-setup',
            name: 'Facilities: Emily Zhang - Badge & Desk',
            description: 'Create security badge, assign hot-desk (hybrid), issue parking pass, grant building access.',
            taskType: 'TASK', assigneeId: facilities.id, assigneeType: 'USER',
            formData: { employee: 'Emily Zhang', location: 'Hybrid' },
            status: 'COMPLETED', priority: 1,
            dueAt: new Date('2026-02-14T17:00:00Z'),
            outcome: 'completed',
            completedAt: new Date('2026-02-07T16:00:00Z'),
            completedBy: facilities.id,
            comments: 'Badge created. Hot-desk B-204 assigned. Parking pass issued.',
        },
    });

    // Manager Prep - PENDING
    await prisma.taskInstance.create({
        data: {
            instanceId: inst1.id, nodeId: 'manager-prep',
            name: 'Manager Prep: Emily Zhang - First Week Plan',
            description: 'Create first-week schedule, assign onboarding buddy, schedule team intros, prepare project briefing.',
            taskType: 'TASK', assigneeId: engManager.id, assigneeType: 'USER',
            formData: { employee: 'Emily Zhang', department: 'Engineering', startDate: '2026-02-17' },
            status: 'PENDING', priority: 1,
            dueAt: new Date('2026-02-14T17:00:00Z'),
        },
    });

    // --- James Torres (inst2): All 4 tasks PENDING ---

    await prisma.taskInstance.create({
        data: {
            instanceId: inst2.id, nodeId: 'it-setup',
            name: 'IT Setup: James Torres - Marketing Specialist',
            description: 'Provision MacBook Air, setup email, install Office 365, Adobe CC, Slack, Zoom. Grant CRM + HR access.',
            taskType: 'TASK', assigneeId: itManager.id, assigneeType: 'USER',
            formData: {
                employee: 'James Torres', department: 'Marketing',
                computer: 'MacBook Air', software: ['Office 365', 'Adobe CC', 'Slack', 'Zoom'],
            },
            status: 'PENDING', priority: 1,
            dueAt: new Date('2026-02-21T17:00:00Z'),
        },
    });

    await prisma.taskInstance.create({
        data: {
            instanceId: inst2.id, nodeId: 'hr-benefits',
            name: 'HR Benefits: James Torres - Enrollment',
            description: 'Process W-4, setup direct deposit, enroll in benefits, verify NDA and handbook acknowledgment.',
            taskType: 'TASK', assigneeId: hrManager.id, assigneeType: 'USER',
            formData: { employee: 'James Torres', department: 'Marketing' },
            status: 'PENDING', priority: 1,
            dueAt: new Date('2026-02-21T17:00:00Z'),
        },
    });

    await prisma.taskInstance.create({
        data: {
            instanceId: inst2.id, nodeId: 'facilities-setup',
            name: 'Facilities: James Torres - Badge & Desk',
            description: 'Create security badge, assign permanent desk (HQ), issue parking pass, grant building access.',
            taskType: 'TASK', assigneeId: facilities.id, assigneeType: 'USER',
            formData: { employee: 'James Torres', location: 'Headquarters' },
            status: 'PENDING', priority: 1,
            dueAt: new Date('2026-02-21T17:00:00Z'),
        },
    });

    await prisma.taskInstance.create({
        data: {
            instanceId: inst2.id, nodeId: 'manager-prep',
            name: 'Manager Prep: James Torres - First Week Plan',
            description: 'Create first-week schedule, assign buddy, schedule team intros for Marketing team.',
            taskType: 'TASK', assigneeId: mktManager.id, assigneeType: 'USER',
            formData: { employee: 'James Torres', department: 'Marketing', startDate: '2026-02-24' },
            status: 'PENDING', priority: 1,
            dueAt: new Date('2026-02-21T17:00:00Z'),
        },
    });

    // --- Aisha Rahman (inst3): All 4 tasks COMPLETED ---

    for (const [nodeId, label, assignee] of [
        ['it-setup', 'IT Setup', itManager],
        ['hr-benefits', 'HR Benefits', hrManager],
        ['facilities-setup', 'Facilities', facilities],
        ['manager-prep', 'Manager Prep', engManager],
    ] as const) {
        await prisma.taskInstance.create({
            data: {
                instanceId: inst3.id, nodeId: nodeId as string,
                name: `${label}: Aisha Rahman - Sr. Software Engineer`,
                description: `Completed ${label.toLowerCase()} for Aisha Rahman onboarding.`,
                taskType: 'TASK',
                assigneeId: (assignee as any).id,
                assigneeType: 'USER',
                formData: { employee: 'Aisha Rahman', department: 'Engineering' },
                status: 'COMPLETED', priority: 2,
                dueAt: new Date('2026-02-07T17:00:00Z'),
                outcome: 'completed',
                completedAt: new Date('2026-02-07T15:00:00Z'),
                completedBy: (assignee as any).id,
            },
        });
    }

    // --- Priya Sharma (inst4): All 4 tasks COMPLETED ---

    for (const [nodeId, label, assignee] of [
        ['it-setup', 'IT Setup', itManager],
        ['hr-benefits', 'HR Benefits', hrManager],
        ['facilities-setup', 'Facilities', facilities],
        ['manager-prep', 'Manager Prep', engManager],
    ] as const) {
        await prisma.taskInstance.create({
            data: {
                instanceId: inst4.id, nodeId: nodeId as string,
                name: `${label}: Priya Sharma - Financial Analyst`,
                description: `Completed ${label.toLowerCase()} for Priya Sharma onboarding.`,
                taskType: 'TASK',
                assigneeId: (assignee as any).id,
                assigneeType: 'USER',
                formData: { employee: 'Priya Sharma', department: 'Finance' },
                status: 'COMPLETED', priority: 2,
                dueAt: new Date('2026-01-31T17:00:00Z'),
                outcome: 'completed',
                completedAt: new Date('2026-02-01T12:00:00Z'),
                completedBy: (assignee as any).id,
            },
        });
    }

    console.log(`✅ Created 16 task instances (4 per employee × 4 employees)\n`);

    // ==========================================================================
    // Summary
    // ==========================================================================
    console.log('🎉 Employee Onboarding Flow seeding complete!');
    console.log('   📋 Wizard Form: New Employee Onboarding (4 steps, 23 fields)');
    console.log('   🔄 Workflow: Employee Onboarding (12 nodes, parallel fork/join)');
    console.log('   📊 Datasets: Departments (7), Positions (8), Employees (5), Onboarding Records (5)');
    console.log('   📝 Form Submissions: 4');
    console.log('   🏃 Process Instances: 5 (2 completed, 3 running)');
    console.log('   ✅ Task Instances: 16 (8 completed, 8 pending)');
    console.log('\n   ⚡ Decision Table "Onboarding Equipment & Access" seeded in-memory via server startup.\n');
}

seedEmployeeOnboarding()
    .catch((e) => {
        console.error('❌ Employee Onboarding seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
