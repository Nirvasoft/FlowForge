/**
 * Training Application (LMS) Seed Script
 * Creates: Training datasets, application form, multi-level approval workflow, sample instances
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedTrainingLMS() {
    console.log('🎓 Seeding Training Application (LMS) Flow...\n');

    const account = await prisma.account.findUnique({ where: { slug: 'demo' } });
    if (!account) throw new Error('Demo account not found.');
    const adminUser = await prisma.user.findUnique({ where: { accountId_email: { accountId: account.id, email: 'admin@demo.com' } } });
    if (!adminUser) throw new Error('Demo admin user not found.');

    const getUser = async (email: string) => prisma.user.findUnique({ where: { accountId_email: { accountId: account.id, email } } });
    const aung = await getUser('aung.kyaw@demo.com');
    const thida = await getUser('thida.win@demo.com');
    const minHtet = await getUser('min.htet@demo.com');
    const suMyat = await getUser('su.myat@demo.com');
    const yamin = await getUser('yamin.aye@demo.com');

    const mkDs = async (name: string, desc: string, schema: any[], records: any[]) => {
        const ds = await prisma.dataset.upsert({
            where: { accountId_name: { accountId: account.id, name } },
            create: { accountId: account.id, name, description: desc, schema, indexes: [], constraints: [], settings: {}, permissions: {}, rowCount: 0, createdBy: adminUser.id },
            update: {},
        });
        const existingCount = await prisma.datasetRecord.count({ where: { datasetId: ds.id } });
        if (existingCount === 0) {
            for (const r of records) await prisma.datasetRecord.create({ data: { datasetId: ds.id, data: r, createdBy: adminUser.id } });
            await prisma.dataset.update({ where: { id: ds.id }, data: { rowCount: records.length } });
        }
        return ds;
    };

    // ========== DATASETS ==========

    const trainingDb = await mkDs('JOITTrainingDatabase', 'JOIT Training course catalog with schedules and details', [
        { name: 'Training Code', slug: 'training_code', type: 'text', required: true },
        { name: 'Training Name', slug: 'training_name', type: 'text', required: true },
        { name: 'Training Path', slug: 'training_path', type: 'text', required: true },
        { name: 'Training Schedule', slug: 'training_schedule', type: 'text' },
        { name: 'Class Size', slug: 'class_size', type: 'number' },
        { name: 'Training Location', slug: 'training_location', type: 'text' },
        { name: 'Trainer', slug: 'trainer', type: 'text' },
        { name: 'Training Course', slug: 'training_course', type: 'text' },
        { name: 'Training Month', slug: 'training_month', type: 'text' },
        { name: 'Learning Type', slug: 'learning_type', type: 'text' },
        { name: 'Training Time', slug: 'training_time', type: 'text' },
    ], [
        { training_code: 'TRN-001', training_name: 'Advanced Python Programming', training_path: 'Technical Skill Training', training_schedule: 'Mon-Fri, 9AM-12PM', class_size: 25, training_location: 'Yangon HQ Training Room A', trainer: 'Dr. Kyaw Zin', training_course: 'Python Advanced', training_month: 'March 2026', learning_type: 'Classroom', training_time: '3 hours' },
        { training_code: 'TRN-002', training_name: 'Business English Communication', training_path: 'English Training', training_schedule: 'Tue & Thu, 2PM-4PM', class_size: 20, training_location: 'Online (Zoom)', trainer: 'Ms. Sarah Johnson', training_course: 'Business English', training_month: 'March 2026', learning_type: 'Online', training_time: '2 hours' },
        { training_code: 'TRN-003', training_name: 'Leadership & Management Skills', training_path: 'Non-Technical Training', training_schedule: 'Wed, 10AM-3PM', class_size: 15, training_location: 'Mandalay Office', trainer: 'U Aung Thu', training_course: 'Leadership Fundamentals', training_month: 'April 2026', learning_type: 'Workshop', training_time: '5 hours' },
        { training_code: 'TRN-004', training_name: 'Microsoft Excel Advanced', training_path: 'Computer Training', training_schedule: 'Mon & Wed, 1PM-3PM', class_size: 30, training_location: 'Yangon HQ Computer Lab', trainer: 'Daw Hnin Wai', training_course: 'Excel Advanced', training_month: 'March 2026', learning_type: 'Hands-on', training_time: '2 hours' },
        { training_code: 'TRN-005', training_name: 'JOIT System Overview', training_path: 'JO Knowledge and Procedure Training', training_schedule: 'Fri, 9AM-11AM', class_size: 40, training_location: 'Online (Teams)', trainer: 'Ko Min Thant', training_course: 'JOIT Orientation', training_month: 'Feb 2026', learning_type: 'Online', training_time: '2 hours' },
        { training_code: 'TRN-006', training_name: 'Core Values & Competency Workshop', training_path: 'Core Competency Training', training_schedule: 'Thu, 10AM-4PM', class_size: 20, training_location: 'Naypyidaw Office', trainer: 'Daw Thin Thin Aye', training_course: 'Core Values', training_month: 'May 2026', learning_type: 'Workshop', training_time: '6 hours' },
        { training_code: 'TRN-007', training_name: 'SAP ERP Fundamentals', training_path: 'Corporate Application and Procedure', training_schedule: 'Mon-Fri, 9AM-5PM', class_size: 15, training_location: 'Yangon HQ Training Room B', trainer: 'External: SAP Academy', training_course: 'SAP Basics', training_month: 'April 2026', learning_type: 'Classroom', training_time: '8 hours' },
        { training_code: 'TRN-008', training_name: 'Project Management Professional', training_path: 'Non-Technical Training', training_schedule: 'Sat, 9AM-1PM', class_size: 20, training_location: 'Online (Zoom)', trainer: 'Dr. Myo Win', training_course: 'PMP Prep', training_month: 'March 2026', learning_type: 'Online', training_time: '4 hours' },
    ]);

    const sectionDs = await mkDs('JOITSectionMaster', 'JOIT organizational sections', [
        { name: 'Section Code', slug: 'section_code', type: 'text', required: true },
        { name: 'Section Name', slug: 'section_name', type: 'text', required: true },
    ], [
        { section_code: 'SEC-01', section_name: 'Technology' },
        { section_code: 'SEC-02', section_name: 'Business Operations' },
        { section_code: 'SEC-03', section_name: 'Corporate Services' },
        { section_code: 'SEC-04', section_name: 'Network & Infrastructure' },
    ]);

    const cityDs = await mkDs('YangonCityList', 'Departure city list for travel', [
        { name: 'City Name', slug: 'city_name', type: 'text', required: true },
        { name: 'Region', slug: 'region', type: 'text' },
    ], [
        { city_name: 'Yangon', region: 'Yangon' }, { city_name: 'Mandalay', region: 'Mandalay' },
        { city_name: 'Naypyidaw', region: 'Naypyidaw' }, { city_name: 'Sagaing', region: 'Sagaing' },
        { city_name: 'Bago', region: 'Bago' }, { city_name: 'Mawlamyine', region: 'Mon' },
        { city_name: 'Pathein', region: 'Ayeyarwady' }, { city_name: 'Taunggyi', region: 'Shan' },
    ]);

    const tripDs = await mkDs('JOITDomesticBusinessTrip', 'Domestic business trip city routes with cost estimates', [
        { name: 'From City', slug: 'from_city', type: 'text', required: true },
        { name: 'To City', slug: 'to_city', type: 'text', required: true },
        { name: 'Transport Cost', slug: 'transport_cost', type: 'number' },
        { name: 'Taxi Cost', slug: 'taxi_cost', type: 'number' },
    ], [
        { from_city: 'Yangon', to_city: 'Mandalay', transport_cost: 45000, taxi_cost: 15000 },
        { from_city: 'Yangon', to_city: 'Naypyidaw', transport_cost: 35000, taxi_cost: 12000 },
        { from_city: 'Mandalay', to_city: 'Yangon', transport_cost: 45000, taxi_cost: 15000 },
        { from_city: 'Mandalay', to_city: 'Naypyidaw', transport_cost: 25000, taxi_cost: 10000 },
        { from_city: 'Naypyidaw', to_city: 'Yangon', transport_cost: 35000, taxi_cost: 12000 },
        { from_city: 'Sagaing', to_city: 'Mandalay', transport_cost: 8000, taxi_cost: 5000 },
    ]);

    const genderDs = await mkDs('GenderList', 'Gender options', [
        { name: 'Gender', slug: 'gender', type: 'text', required: true },
    ], [{ gender: 'Male' }, { gender: 'Female' }, { gender: 'Other' }]);

    const hostelDs = await mkDs('StayHostelOptions', 'Hostel stay options', [
        { name: 'Option', slug: 'option', type: 'text', required: true },
    ], [{ option: 'Yes - Company Hostel' }, { option: 'Yes - External Hotel' }, { option: 'No' }]);

    console.log('✅ Created 6 new datasets with sample data\n');

    // ========== FORM ==========
    const form = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-000000000070' },
        create: {
            id: '00000000-0000-0000-0000-000000000070',
            accountId: account.id,
            name: 'Training Application (LMS)',
            description: 'Apply for training courses through the Learning Management System. Includes travel & accommodation for out-of-station attendees.',
            fields: [
                // --- Training Info ---
                { id: 'lms-agree', name: 'attendanceRuleAgreed', label: 'I have read and agree to follow the Training Attendance Rules', type: 'checkbox', required: true, order: 1, config: { description: 'Before applying, please read the Training Attendance Rules. သင်တန်းမလျှောက်ထားခင်တွင် သင်တန်းတက်ရောက်ခြင်းဆိုင်ရာ စည်းမျဥ်းစည်းကမ်းဖတ်ရှုပါ။' } },
                { id: 'lms-code', name: 'trainingCode', label: 'Training Code', type: 'lookup', required: true, order: 2, config: { datasetId: trainingDb.id, displayField: 'training_code', valueField: 'training_code' } },
                { id: 'lms-name', name: 'trainingName', label: 'Training Name', type: 'text', required: false, order: 3, config: { readonly: true, autoPopulate: 'TrainingCode.training_name' } },
                { id: 'lms-path', name: 'trainingPath', label: 'Training Path', type: 'text', required: false, order: 4, config: { readonly: true, autoPopulate: 'TrainingCode.training_path' } },
                { id: 'lms-sched', name: 'trainingSchedule', label: 'Training Schedule', type: 'text', required: false, order: 5, config: { readonly: true, autoPopulate: 'TrainingCode.training_schedule' } },
                { id: 'lms-size', name: 'classSize', label: 'Class Size', type: 'text', required: false, order: 6, config: { readonly: true, autoPopulate: 'TrainingCode.class_size' } },
                { id: 'lms-loc', name: 'trainingLocation', label: 'Training Location', type: 'text', required: false, order: 7, config: { readonly: true, autoPopulate: 'TrainingCode.training_location' } },
                { id: 'lms-trainer', name: 'trainer', label: 'Trainer', type: 'text', required: false, order: 8, config: { readonly: true, autoPopulate: 'TrainingCode.trainer' } },
                { id: 'lms-course', name: 'trainingCourse', label: 'Training Course', type: 'text', required: false, order: 9, config: { readonly: true, autoPopulate: 'TrainingCode.training_course' } },
                { id: 'lms-month', name: 'trainingMonth', label: 'Training Month', type: 'text', required: false, order: 10, config: { readonly: true, autoPopulate: 'TrainingCode.training_month' } },
                { id: 'lms-type', name: 'learningType', label: 'Learning Type', type: 'text', required: false, order: 11, config: { readonly: true, autoPopulate: 'TrainingCode.learning_type' } },
                { id: 'lms-time', name: 'trainingTime', label: 'Training Time', type: 'text', required: false, order: 12, config: { readonly: true, autoPopulate: 'TrainingCode.training_time' } },
                // --- Initiator Info ---
                { id: 'lms-ref', name: 'referenceNumber', label: 'Reference Number', type: 'text', required: false, order: 13, config: { readonly: true, computed: 'CONCATENATE("CO","20",YEAR_2DIGIT,"C",SEQ_4DIGIT)' } },
                { id: 'lms-date', name: 'initiatedDate', label: 'Initiated Date', type: 'date', required: false, order: 14, config: { readonly: true, autoPopulate: 'TODAY()' } },
                { id: 'lms-empid', name: 'initiatorEmployeeId', label: 'Initiator Employee ID', type: 'text', required: true, order: 15, config: { autoPopulate: 'Employee_ID_Lookup.EmployeeID' } },
                { id: 'lms-empname', name: 'initiatorFullName', label: 'Initiator Full Name', type: 'text', required: false, order: 16, config: { readonly: true, autoPopulate: '_created_by.Name' } },
                { id: 'lms-email', name: 'initiatorEmail', label: 'Initiator Email', type: 'text', required: false, order: 17, config: { readonly: true, autoPopulate: '_created_by.Email' } },
                { id: 'lms-phone', name: 'initiatorPhone', label: 'Initiator Phone Number', type: 'text', required: false, order: 18, config: { readonly: true, autoPopulate: 'Employee.phone' } },
                { id: 'lms-level', name: 'initiatorLevel', label: 'Initiator Level', type: 'text', required: false, order: 19, config: { readonly: true, autoPopulate: 'Employee.level' } },
                { id: 'lms-pos', name: 'initiatorPosition', label: 'Initiator Position', type: 'text', required: false, order: 20, config: { readonly: true, autoPopulate: 'Employee.position' } },
                { id: 'lms-office', name: 'initiatorOffice', label: 'Initiator Office', type: 'text', required: false, order: 21, config: { readonly: true, autoPopulate: 'Office_Lookup.OfficeDescription' } },
                { id: 'lms-div', name: 'initiatorDivision', label: 'Initiator Division', type: 'text', required: false, order: 22, config: { readonly: true, autoPopulate: 'Division_Lookup.DivisionDescription' } },
                { id: 'lms-dept', name: 'initiatorDepartment', label: 'Initiator Department', type: 'text', required: false, order: 23, config: { readonly: true, autoPopulate: 'Department_Lookup.DepartmentDescription' } },
                { id: 'lms-team', name: 'initiatorTeam', label: 'Initiator Team', type: 'text', required: false, order: 24, config: { readonly: true, autoPopulate: 'Team_Lookup.TeamDescription' } },
                { id: 'lms-reason', name: 'attendReason', label: 'Attend Reason for Training Request', type: 'textarea', required: true, order: 25, config: { minLength: 10, maxLength: 2000, placeholder: 'Explain why you need this training' } },
                { id: 'lms-behalf', name: 'onBehalfOfOther', label: 'On Behalf of Other', type: 'toggle', required: false, order: 26, config: { defaultValue: false } },
                // --- Travel & Accommodation ---
                { id: 'lms-sr', name: 'fromStateAndRegion', label: 'From State & Region', type: 'toggle', required: false, order: 27, config: { defaultValue: false } },
                { id: 'lms-trip', name: 'businessTrip', label: 'Business Trip', type: 'toggle', required: false, order: 28, config: { defaultValue: false } },
                { id: 'lms-depart', name: 'departureCity', label: 'Departure From City', type: 'dropdown', required: false, order: 29, config: { datasetId: cityDs.id, displayField: 'city_name', valueField: 'city_name' } },
                { id: 'lms-hostel', name: 'stayHostel', label: 'Stay Hostel', type: 'dropdown', required: false, order: 30, config: { datasetId: hostelDs.id, displayField: 'option', valueField: 'option' } },
                // --- Business Trip Table ---
                { id: 'lms-bt-empid', name: 'travellerEmployeeId', label: 'Traveller Employee ID', type: 'lookup', required: false, order: 31, config: { visibleWhen: 'businessTrip === true', datasetId: 'MPTEmployeeMaster', displayField: 'employee_id' } },
                { id: 'lms-bt-name', name: 'travellerName', label: 'Traveller Name', type: 'text', required: false, order: 32, config: { readonly: true, visibleWhen: 'businessTrip === true', computed: 'CONCAT(Traveler.FirstName, " ", Traveler.LastName)' } },
                { id: 'lms-bt-from', name: 'travelDepartureCity', label: 'Departure from City', type: 'dropdown', required: false, order: 33, config: { visibleWhen: 'businessTrip === true', datasetId: cityDs.id, displayField: 'city_name' } },
                { id: 'lms-bt-dest', name: 'destinationCity', label: 'Destination City', type: 'text', required: false, order: 34, config: { visibleWhen: 'businessTrip === true' } },
                { id: 'lms-bt-trans', name: 'transportationCost', label: 'Transportation Cost (Go-Return)', type: 'number', required: false, order: 35, config: { visibleWhen: 'businessTrip === true', prefix: 'MMK' } },
                { id: 'lms-bt-taxi', name: 'taxiCost', label: 'Taxi Cost (Go-Return)', type: 'number', required: false, order: 36, config: { visibleWhen: 'businessTrip === true', prefix: 'MMK' } },
                { id: 'lms-bt-hotel', name: 'hotelExpense', label: 'Hotel Expense', type: 'number', required: false, order: 37, config: { visibleWhen: 'businessTrip === true', prefix: 'MMK' } },
                { id: 'lms-bt-ttrans', name: 'transportTotal', label: 'Transportation Cost Total', type: 'number', required: false, order: 38, config: { readonly: true, visibleWhen: 'businessTrip === true', computed: 'transportationCost + taxiCost', prefix: 'MMK' } },
                { id: 'lms-bt-daily', name: 'dailyAllowanceTotal', label: 'Daily Allowance Total', type: 'number', required: false, order: 39, config: { visibleWhen: 'businessTrip === true', prefix: 'MMK' } },
                { id: 'lms-bt-est', name: 'estimatedTotal', label: 'Estimated Total', type: 'number', required: false, order: 40, config: { readonly: true, visibleWhen: 'businessTrip === true', computed: 'transportTotal + dailyAllowanceTotal + hotelExpense', prefix: 'MMK' } },
                { id: 'lms-bt-start', name: 'tripStartDate', label: 'Trip Start Date', type: 'date', required: false, order: 41, config: { visibleWhen: 'businessTrip === true' } },
                { id: 'lms-bt-end', name: 'tripEndDate', label: 'Trip End Date', type: 'date', required: false, order: 42, config: { visibleWhen: 'businessTrip === true' } },
                { id: 'lms-bt-dur', name: 'tripDuration', label: 'Trip Duration (days)', type: 'number', required: false, order: 43, config: { readonly: true, visibleWhen: 'businessTrip === true', computed: '(tripEndDate - tripStartDate) + 1' } },
                { id: 'lms-bt-gender', name: 'travellerGender', label: 'Gender', type: 'dropdown', required: false, order: 44, config: { visibleWhen: 'businessTrip === true', datasetId: genderDs.id, displayField: 'gender' } },
                { id: 'lms-bt-stay', name: 'travellerStayHostel', label: 'Stay-Hostel', type: 'dropdown', required: false, order: 45, config: { visibleWhen: 'businessTrip === true', datasetId: hostelDs.id, displayField: 'option' } },
                // --- TPTC Section ---
                { id: 'lms-approve', name: 'approveToAttend', label: 'Approve to attend?', type: 'toggle', required: false, order: 46, config: { editableBy: 'role:tptc', visibleAfterApproval: true } },
            ],
            layout: {
                columns: 2,
                sections: [
                    { title: 'Training Attendance Rules', description: 'Please read and agree to the Training Attendance Rules before applying.', fields: ['lms-agree'] },
                    { title: 'Training Information', fields: ['lms-code', 'lms-name', 'lms-path', 'lms-sched', 'lms-size', 'lms-loc', 'lms-trainer', 'lms-course', 'lms-month', 'lms-type', 'lms-time'] },
                    { title: 'Initiator Information', fields: ['lms-ref', 'lms-date', 'lms-empid', 'lms-empname', 'lms-email', 'lms-phone', 'lms-level', 'lms-pos', 'lms-office', 'lms-div', 'lms-dept', 'lms-team', 'lms-reason', 'lms-behalf'] },
                    { title: 'Travel & Accommodation', fields: ['lms-sr', 'lms-trip', 'lms-depart', 'lms-hostel'] },
                    { title: 'Business Trip Attendee Details', condition: 'businessTrip === true', fields: ['lms-bt-empid', 'lms-bt-name', 'lms-bt-from', 'lms-bt-dest', 'lms-bt-trans', 'lms-bt-taxi', 'lms-bt-hotel', 'lms-bt-ttrans', 'lms-bt-daily', 'lms-bt-est', 'lms-bt-start', 'lms-bt-end', 'lms-bt-dur', 'lms-bt-gender', 'lms-bt-stay'] },
                    { title: 'TPTC Section', fields: ['lms-approve'] },
                ],
            },
            validationRules: [
                { field: 'attendanceRuleAgreed', rule: 'mustBeTrue', message: 'You must agree to the Training Attendance Rules' },
            ],
            conditionalLogic: [
                { field: 'businessTrip', value: true, showSections: ['Business Trip Attendee Details'] },
            ],
            settings: { submitButtonText: 'Submit Training Application', allowDraft: true },
            permissions: {}, version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created form: ${form.name} (46 fields)\n`);

    // ========== WORKFLOW ==========
    const process = await prisma.process.upsert({
        where: { id: '00000000-0000-0000-0000-000000000071' },
        create: {
            id: '00000000-0000-0000-0000-000000000071',
            accountId: account.id,
            name: 'Training Application Approval Workflow',
            description: 'Multi-level LMS training approval with S&R routing, parallel advisors, and training-path-specific handlers',
            category: 'HR',
            definition: {
                nodes: [
                    { id: 'start', type: 'start', name: 'Submit LMS Application', position: { x: 100, y: 400 }, config: { trigger: 'form_submission', formId: form.id } },
                    { id: 'tm-approval', type: 'approval', name: 'Team Manager Approval', position: { x: 350, y: 400 }, config: { assignTo: 'role:team_manager', timeoutDays: 3 } },
                    { id: 'sr-check', type: 'decision', name: 'S&R / Regional Check', position: { x: 600, y: 400 }, config: {}, condition: 'variables.fromStateAndRegion' },
                    { id: 'regional-mgr', type: 'approval', name: 'Regional Manager Approval', position: { x: 850, y: 250 }, config: { assignTo: 'role:regional_manager', timeoutDays: 3 } },
                    { id: 'reporting-to', type: 'approval', name: 'Reporting To Email', description: 'Direct supervisor review', position: { x: 850, y: 550 }, config: { assignTo: 'role:reporting_to', timeoutDays: 2 } },
                    { id: 'dgm-approval', type: 'approval', name: 'DGM Approval', position: { x: 1100, y: 300 }, config: { assignTo: 'role:dgm', timeoutDays: 3 } },
                    { id: 'advisor-dgm', type: 'approval', name: 'Advisor to DGM Approval', position: { x: 1100, y: 500 }, config: { assignTo: 'role:advisor_dgm', timeoutDays: 3 } },
                    { id: 'director-approval', type: 'approval', name: 'Director Approval', position: { x: 1350, y: 300 }, config: { assignTo: 'role:director', timeoutDays: 3 } },
                    { id: 'advisor-dir', type: 'approval', name: 'Advisor to Director Approval', position: { x: 1350, y: 500 }, config: { assignTo: 'role:advisor_director', timeoutDays: 3 } },
                    { id: 'cxo-approval', type: 'approval', name: 'CxO Approval', position: { x: 1600, y: 300 }, config: { assignTo: 'role:cxo', timeoutDays: 5 } },
                    { id: 'advisor-cxo', type: 'approval', name: 'Advisor to CxO Approval', position: { x: 1600, y: 500 }, config: { assignTo: 'role:advisor_cxo', timeoutDays: 5 } },
                    { id: 'admin-hr-dir', type: 'approval', name: 'Director (Admin & HR) Approval', position: { x: 1850, y: 300 }, config: { assignTo: 'role:admin_hr_director', timeoutDays: 3 } },
                    { id: 'advisor-admin-hr', type: 'approval', name: 'Advisor to Director (Admin & HR)', position: { x: 1850, y: 500 }, config: { assignTo: 'role:advisor_admin_hr', timeoutDays: 3 } },
                    { id: 'coo-approval', type: 'approval', name: 'COO Approval', position: { x: 2100, y: 400 }, config: { assignTo: 'role:coo', timeoutDays: 5 } },
                    { id: 'path-route', type: 'decision', name: 'Training Path Router', position: { x: 2350, y: 400 }, config: {}, condition: 'variables.trainingPath' },
                    // Training path handlers
                    { id: 'handler-tech', type: 'action', name: 'Technical Skill Training', position: { x: 2600, y: 50 }, config: { handler: 'training_path_handler' } },
                    { id: 'handler-english', type: 'action', name: 'English Training', position: { x: 2600, y: 150 }, config: { handler: 'training_path_handler' } },
                    { id: 'handler-computer', type: 'action', name: 'Computer Training', position: { x: 2600, y: 250 }, config: { handler: 'training_path_handler' } },
                    { id: 'handler-jo', type: 'action', name: 'JO Knowledge & Procedure', position: { x: 2600, y: 350 }, config: { handler: 'training_path_handler' } },
                    { id: 'handler-core', type: 'action', name: 'Core Competency Training', position: { x: 2600, y: 450 }, config: { handler: 'training_path_handler' } },
                    { id: 'handler-nontech', type: 'action', name: 'Non-Technical Training', position: { x: 2600, y: 550 }, config: { handler: 'training_path_handler' } },
                    { id: 'handler-corp', type: 'action', name: 'Corporate App & Procedure', position: { x: 2600, y: 650 }, config: { handler: 'training_path_handler' } },
                    { id: 'email-reject', type: 'email', name: 'Rejection Notification', position: { x: 1350, y: 700 }, config: { to: '{{initiator.email}}', subject: 'Training Application Rejected - {{variables.referenceNumber}}' } },
                    { id: 'end-approved', type: 'end', name: 'Application Approved', position: { x: 2850, y: 400 }, config: {} },
                    { id: 'end-rejected', type: 'end', name: 'Application Rejected', position: { x: 1600, y: 700 }, config: {} },
                ],
                edges: [
                    { id: 'e1', source: 'start', target: 'tm-approval', label: 'Submit' },
                    { id: 'e2', source: 'tm-approval', target: 'sr-check', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e2r', source: 'tm-approval', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e3a', source: 'sr-check', target: 'regional-mgr', label: 'From S&R', condition: 'variables.fromStateAndRegion === true' },
                    { id: 'e3b', source: 'sr-check', target: 'reporting-to', label: 'Not S&R', condition: 'variables.fromStateAndRegion !== true' },
                    { id: 'e4', source: 'regional-mgr', target: 'reporting-to', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e4r', source: 'regional-mgr', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e5', source: 'reporting-to', target: 'dgm-approval', label: 'Approved' },
                    { id: 'e5b', source: 'reporting-to', target: 'advisor-dgm', label: 'Parallel Advisor' },
                    { id: 'e6', source: 'dgm-approval', target: 'director-approval', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e6b', source: 'advisor-dgm', target: 'advisor-dir', label: 'Approved' },
                    { id: 'e6r', source: 'dgm-approval', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e7', source: 'director-approval', target: 'cxo-approval', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e7b', source: 'advisor-dir', target: 'advisor-cxo', label: 'Approved' },
                    { id: 'e7r', source: 'director-approval', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e8', source: 'cxo-approval', target: 'admin-hr-dir', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e8b', source: 'advisor-cxo', target: 'advisor-admin-hr', label: 'Approved' },
                    { id: 'e8r', source: 'cxo-approval', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e9', source: 'admin-hr-dir', target: 'coo-approval', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e9r', source: 'admin-hr-dir', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e10', source: 'coo-approval', target: 'path-route', label: 'Approved', condition: 'outcome === "approved"' },
                    { id: 'e10r', source: 'coo-approval', target: 'email-reject', label: 'Rejected', condition: 'outcome === "rejected"' },
                    // Training path routing
                    { id: 'ep1', source: 'path-route', target: 'handler-tech', condition: 'variables.trainingPath === "Technical Skill Training"' },
                    { id: 'ep2', source: 'path-route', target: 'handler-english', condition: 'variables.trainingPath === "English Training"' },
                    { id: 'ep3', source: 'path-route', target: 'handler-computer', condition: 'variables.trainingPath === "Computer Training"' },
                    { id: 'ep4', source: 'path-route', target: 'handler-jo', condition: 'variables.trainingPath === "JO Knowledge and Procedure Training"' },
                    { id: 'ep5', source: 'path-route', target: 'handler-core', condition: 'variables.trainingPath === "Core Competency Training"' },
                    { id: 'ep6', source: 'path-route', target: 'handler-nontech', condition: 'variables.trainingPath === "Non-Technical Training"' },
                    { id: 'ep7', source: 'path-route', target: 'handler-corp', condition: 'variables.trainingPath === "Corporate Application and Procedure"' },
                    // All handlers → end
                    { id: 'ef1', source: 'handler-tech', target: 'end-approved' },
                    { id: 'ef2', source: 'handler-english', target: 'end-approved' },
                    { id: 'ef3', source: 'handler-computer', target: 'end-approved' },
                    { id: 'ef4', source: 'handler-jo', target: 'end-approved' },
                    { id: 'ef5', source: 'handler-core', target: 'end-approved' },
                    { id: 'ef6', source: 'handler-nontech', target: 'end-approved' },
                    { id: 'ef7', source: 'handler-corp', target: 'end-approved' },
                    { id: 'erej', source: 'email-reject', target: 'end-rejected' },
                ],
            },
            variables: [
                { name: 'referenceNumber', type: 'string' }, { name: 'trainingCode', type: 'string' },
                { name: 'trainingName', type: 'string' }, { name: 'trainingPath', type: 'string' },
                { name: 'trainingLocation', type: 'string' }, { name: 'learningType', type: 'string' },
                { name: 'initiatorEmployeeId', type: 'string' }, { name: 'initiatorFullName', type: 'string' },
                { name: 'initiatorDivision', type: 'string' }, { name: 'initiatorDepartment', type: 'string' },
                { name: 'attendReason', type: 'string' }, { name: 'fromStateAndRegion', type: 'boolean' },
                { name: 'businessTrip', type: 'boolean' }, { name: 'estimatedTotal', type: 'number' },
            ],
            triggers: [{ type: 'form_submission', formId: form.id }],
            settings: { allowCancel: true, trackSLA: true },
            permissions: {},
            slaConfig: { defaultDueHours: 120, escalationPolicy: 'notify_admin' },
            version: 1, status: 'ACTIVE', publishedAt: new Date(), createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created workflow: ${process.name} (25 nodes, 36 edges)\n`);

    // ========== SAMPLE INSTANCES ==========

    // 1: RUNNING — Python training at Director stage
    const i1 = await prisma.processInstance.create({
        data: {
            processId: process.id, processVersion: 1, status: 'RUNNING', currentNodes: ['director-approval', 'advisor-dir'],
            variables: { referenceNumber: 'CO2026C0001', trainingCode: 'TRN-001', trainingName: 'Advanced Python Programming', trainingPath: 'Technical Skill Training', trainingLocation: 'Yangon HQ Training Room A', learningType: 'Classroom', initiatorEmployeeId: 'MPT-0002', initiatorFullName: 'Aung Kyaw', initiatorDivision: 'Technology & IT', initiatorDepartment: 'Software Engineering', attendReason: 'Need to upskill in advanced Python for backend microservices development', fromStateAndRegion: false, businessTrip: false },
            startedBy: aung!.id, dueAt: new Date('2026-03-10T17:00:00Z'),
        }
    });
    await prisma.taskInstance.create({ data: { instanceId: i1.id, nodeId: 'director-approval', name: 'Director: Python Training - Aung Kyaw', taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER', formData: { training: 'TRN-001', path: 'Technical Skill', applicant: 'Aung Kyaw' }, status: 'PENDING', priority: 1, dueAt: new Date('2026-03-01T17:00:00Z') } });

    // 2: RUNNING — English training with S&R, at Regional Manager
    const i2 = await prisma.processInstance.create({
        data: {
            processId: process.id, processVersion: 1, status: 'RUNNING', currentNodes: ['regional-mgr'],
            variables: { referenceNumber: 'CO2026C0002', trainingCode: 'TRN-002', trainingName: 'Business English Communication', trainingPath: 'English Training', trainingLocation: 'Online (Zoom)', learningType: 'Online', initiatorEmployeeId: 'MPT-0003', initiatorFullName: 'Thida Win', initiatorDivision: 'Sales & Marketing', attendReason: 'Required for international client communication', fromStateAndRegion: true, businessTrip: false },
            startedBy: thida!.id, dueAt: new Date('2026-03-15T17:00:00Z'),
        }
    });
    await prisma.taskInstance.create({ data: { instanceId: i2.id, nodeId: 'regional-mgr', name: 'Regional Manager: English Training - Thida Win (S&R)', taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER', formData: { training: 'TRN-002', path: 'English', applicant: 'Thida Win', fromSR: true }, status: 'PENDING', priority: 1, dueAt: new Date('2026-02-28T17:00:00Z') } });

    // 3: COMPLETED — JOIT training completed
    const i3 = await prisma.processInstance.create({
        data: {
            processId: process.id, processVersion: 1, status: 'COMPLETED', currentNodes: ['end-approved'],
            variables: { referenceNumber: 'CO2026C0003', trainingCode: 'TRN-005', trainingName: 'JOIT System Overview', trainingPath: 'JO Knowledge and Procedure Training', initiatorEmployeeId: 'MPT-0004', initiatorFullName: 'Min Htet', attendReason: 'New employee onboarding requirement', fromStateAndRegion: false, businessTrip: false },
            startedBy: minHtet!.id, completedAt: new Date('2026-02-15T16:00:00Z'),
        }
    });
    await prisma.taskInstance.create({ data: { instanceId: i3.id, nodeId: 'handler-jo', name: 'JO Knowledge Handler: JOIT Overview - Min Htet', taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER', formData: { training: 'TRN-005' }, status: 'COMPLETED', priority: 1, outcome: 'approved', completedAt: new Date('2026-02-15T16:00:00Z'), completedBy: adminUser.id } });

    // 4: RUNNING — Business trip training at CxO
    const i4 = await prisma.processInstance.create({
        data: {
            processId: process.id, processVersion: 1, status: 'RUNNING', currentNodes: ['cxo-approval', 'advisor-cxo'],
            variables: { referenceNumber: 'CO2026C0004', trainingCode: 'TRN-003', trainingName: 'Leadership & Management Skills', trainingPath: 'Non-Technical Training', trainingLocation: 'Mandalay Office', initiatorEmployeeId: 'MPT-0005', initiatorFullName: 'Su Myat', attendReason: 'Prepare for team lead role promotion', fromStateAndRegion: false, businessTrip: true, departureCity: 'Naypyidaw', destinationCity: 'Mandalay', transportationCost: 25000, taxiCost: 10000, hotelExpense: 80000, estimatedTotal: 145000, tripDuration: 3 },
            startedBy: suMyat!.id, dueAt: new Date('2026-04-01T17:00:00Z'),
        }
    });
    await prisma.taskInstance.create({ data: { instanceId: i4.id, nodeId: 'cxo-approval', name: 'CxO: Leadership Training + Business Trip - Su Myat (MMK 145,000)', taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER', formData: { training: 'TRN-003', path: 'Non-Technical', trip: true, total: 145000 }, status: 'PENDING', priority: 2, dueAt: new Date('2026-03-15T17:00:00Z') } });

    // 5: COMPLETED — Rejected at TM level
    const i5 = await prisma.processInstance.create({
        data: {
            processId: process.id, processVersion: 1, status: 'COMPLETED', currentNodes: ['end-rejected'],
            variables: { referenceNumber: 'CO2026C0005', trainingCode: 'TRN-007', trainingName: 'SAP ERP Fundamentals', trainingPath: 'Corporate Application and Procedure', initiatorEmployeeId: 'MPT-0001', initiatorFullName: 'Yamin Aye', attendReason: 'Want to learn SAP', fromStateAndRegion: false, businessTrip: false },
            startedBy: yamin!.id, completedAt: new Date('2026-02-12T10:00:00Z'),
        }
    });
    await prisma.taskInstance.create({ data: { instanceId: i5.id, nodeId: 'tm-approval', name: 'TM: SAP Training REJECTED - Yamin Aye', description: 'Not relevant to current role. Recommend re-applying after role change.', taskType: 'APPROVAL', assigneeId: adminUser.id, assigneeType: 'USER', formData: { training: 'TRN-007' }, status: 'COMPLETED', priority: 1, outcome: 'rejected', completedAt: new Date('2026-02-12T10:00:00Z'), completedBy: adminUser.id } });

    console.log('✅ Created 5 process instances with task instances\n');

    for (const inst of [i1, i2, i4]) {
        await prisma.formSubmission.create({ data: { formId: form.id, data: inst.variables as any, createdBy: inst.startedBy } });
    }
    console.log('✅ Created 3 form submissions\n');
    console.log('🎓 Training Application (LMS) seeding complete!\n');
}

seedTrainingLMS()
    .catch((e) => { console.error('❌ Seeding failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
