/**
 * Leave Request Flow Seed Script
 * Creates a complete Leave Request workflow with:
 * - Leave Request Form (with fields for leave type, dates, reason)
 * - Leave Request Workflow/Process (Start → Submit Form → Manager Approval → HR Review → End)
 * - Leave Records Dataset (with columns for tracking)
 * - Sample process instances and task instances at various stages
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedLeaveRequestFlow() {
    console.log('🌿 Seeding Leave Request Flow...\n');

    // ==========================================================================
    // 1. Get the demo account and user
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

    console.log(`✅ Found account: ${account.name} (${account.id})`);
    console.log(`✅ Found user: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.id})\n`);

    // ==========================================================================
    // 2. Create additional users for realistic data
    // ==========================================================================
    const bcryptModule = await import('bcryptjs');
    const bcryptLib = bcryptModule.default || bcryptModule;
    const passwordHash = await bcryptLib.hash('Demo123!@#', 12);

    const users = [];
    const userProfiles = [
        { email: 'john.doe@demo.com', firstName: 'John', lastName: 'Doe' },
        { email: 'jane.smith@demo.com', firstName: 'Jane', lastName: 'Smith' },
        { email: 'mike.wilson@demo.com', firstName: 'Mike', lastName: 'Wilson' },
        { email: 'sarah.chen@demo.com', firstName: 'Sarah', lastName: 'Chen' },
        { email: 'alex.kumar@demo.com', firstName: 'Alex', lastName: 'Kumar' },
    ];

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
        users.push(user);
    }

    // Assign Member role to new users
    const memberRole = await prisma.role.findUnique({
        where: { accountId_name: { accountId: account.id, name: 'Member' } },
    });
    if (memberRole) {
        for (const user of users) {
            await prisma.userRole.upsert({
                where: { userId_roleId: { userId: user.id, roleId: memberRole.id } },
                create: { userId: user.id, roleId: memberRole.id },
                update: {},
            });
        }
    }

    console.log(`✅ Created ${users.length} additional users\n`);

    // ==========================================================================
    // 3. Create Leave Request Form
    // ==========================================================================
    const leaveRequestForm = await prisma.form.upsert({
        where: {
            id: '00000000-0000-0000-0000-000000000001',
        },
        create: {
            id: '00000000-0000-0000-0000-000000000001',
            accountId: account.id,
            name: 'Leave Request Form',
            description: 'Submit a leave request for manager and HR approval',
            fields: [
                {
                    id: 'field-employee',
                    name: 'employeeName',
                    label: 'Employee Name',
                    type: 'text',
                    required: true,
                    order: 1,
                    config: { placeholder: 'Your full name' },
                },
                {
                    id: 'field-department',
                    name: 'department',
                    label: 'Department',
                    type: 'select',
                    required: true,
                    order: 2,
                    config: {
                        options: [
                            { label: 'Engineering', value: 'engineering' },
                            { label: 'Sales', value: 'sales' },
                            { label: 'Marketing', value: 'marketing' },
                            { label: 'Human Resources', value: 'hr' },
                            { label: 'Finance', value: 'finance' },
                            { label: 'Operations', value: 'operations' },
                        ],
                    },
                },
                {
                    id: 'field-leave-type',
                    name: 'leaveType',
                    label: 'Leave Type',
                    type: 'select',
                    required: true,
                    order: 3,
                    config: {
                        options: [
                            { label: 'Annual Leave', value: 'annual' },
                            { label: 'Sick Leave', value: 'sick' },
                            { label: 'Personal Leave', value: 'personal' },
                            { label: 'Maternity/Paternity', value: 'parental' },
                            { label: 'Bereavement', value: 'bereavement' },
                            { label: 'Unpaid Leave', value: 'unpaid' },
                        ],
                    },
                },
                {
                    id: 'field-start-date',
                    name: 'startDate',
                    label: 'Start Date',
                    type: 'date',
                    required: true,
                    order: 4,
                    config: {},
                },
                {
                    id: 'field-end-date',
                    name: 'endDate',
                    label: 'End Date',
                    type: 'date',
                    required: true,
                    order: 5,
                    config: {},
                },
                {
                    id: 'field-days',
                    name: 'totalDays',
                    label: 'Total Days',
                    type: 'number',
                    required: true,
                    order: 6,
                    config: { min: 0.5, max: 30, step: 0.5 },
                },
                {
                    id: 'field-reason',
                    name: 'reason',
                    label: 'Reason for Leave',
                    type: 'textarea',
                    required: true,
                    order: 7,
                    config: { placeholder: 'Please provide a brief reason...', minLength: 10, maxLength: 500 },
                },
                {
                    id: 'field-contact',
                    name: 'emergencyContact',
                    label: 'Emergency Contact (while on leave)',
                    type: 'text',
                    required: false,
                    order: 8,
                    config: { placeholder: 'Phone number or email' },
                },
                {
                    id: 'field-handover',
                    name: 'handoverNotes',
                    label: 'Handover Notes',
                    type: 'textarea',
                    required: false,
                    order: 9,
                    config: { placeholder: 'Tasks to hand over or delegate...' },
                },
            ],
            layout: {
                columns: 2,
                sections: [
                    { title: 'Employee Information', fields: ['field-employee', 'field-department'] },
                    { title: 'Leave Details', fields: ['field-leave-type', 'field-start-date', 'field-end-date', 'field-days'] },
                    { title: 'Additional Information', fields: ['field-reason', 'field-contact', 'field-handover'] },
                ],
            },
            validationRules: [
                { field: 'endDate', rule: 'greaterThan', compareField: 'startDate', message: 'End date must be after start date' },
                { field: 'totalDays', rule: 'min', value: 0.5, message: 'Minimum leave is half a day' },
            ],
            conditionalLogic: [],
            settings: {
                submitButtonText: 'Submit Leave Request',
                showProgressBar: false,
                allowDraft: true,
            },
            permissions: {},
            version: 1,
            status: 'ACTIVE',
            createdBy: adminUser.id,
        },
        update: {},
    });

    console.log(`✅ Created form: ${leaveRequestForm.name} (${leaveRequestForm.id})\n`);

    // ==========================================================================
    // 4. Create Leave Request Process/Workflow
    // ==========================================================================
    const leaveProcess = await prisma.process.upsert({
        where: {
            id: '00000000-0000-0000-0000-000000000010',
        },
        create: {
            id: '00000000-0000-0000-0000-000000000010',
            accountId: account.id,
            name: 'Leave Request Workflow',
            description: 'Employee leave request with manager approval and HR review process',
            category: 'HR',
            definition: {
                nodes: [
                    {
                        id: 'start-1',
                        type: 'start',
                        name: 'Leave Request Initiated',
                        description: 'Employee submits a leave request form',
                        position: { x: 100, y: 300 },
                        config: { trigger: 'form_submission', formId: leaveRequestForm.id },
                    },
                    {
                        id: 'form-1',
                        type: 'form',
                        name: 'Submit Leave Form',
                        description: 'Employee fills in the leave request details',
                        position: { x: 350, y: 300 },
                        config: {
                            formId: leaveRequestForm.id,
                            assignTo: 'initiator',
                        },
                    },
                    {
                        id: 'decision-1',
                        type: 'decision',
                        name: 'Auto-Approve Check',
                        description: 'Check if leave is ≤ 1 day for auto-approval',
                        position: { x: 600, y: 300 },
                        config: {},
                        condition: 'variables.totalDays <= 1',
                    },
                    {
                        id: 'approval-1',
                        type: 'approval',
                        name: 'Manager Approval',
                        description: 'Direct manager reviews and approves/rejects the leave request',
                        position: { x: 850, y: 200 },
                        config: {
                            assignTo: 'manager',
                            approvalType: 'single',
                            timeoutDays: 3,
                            escalateTo: 'hr_manager',
                            formFields: ['leaveType', 'startDate', 'endDate', 'totalDays', 'reason'],
                        },
                    },
                    {
                        id: 'decision-2',
                        type: 'decision',
                        name: 'Manager Decision',
                        description: 'Check manager approval decision',
                        position: { x: 1100, y: 200 },
                        config: {},
                        condition: 'outcome === "approved"',
                    },
                    {
                        id: 'approval-2',
                        type: 'approval',
                        name: 'HR Review',
                        description: 'HR reviews approved leave requests (for leaves > 3 days)',
                        position: { x: 1350, y: 100 },
                        config: {
                            assignTo: 'role:hr_manager',
                            approvalType: 'single',
                            timeoutDays: 2,
                            condition: 'variables.totalDays > 3',
                        },
                    },
                    {
                        id: 'email-1',
                        type: 'email',
                        name: 'Send Approval Notification',
                        description: 'Notify employee that leave is approved',
                        position: { x: 1600, y: 200 },
                        config: {
                            to: '{{initiator.email}}',
                            subject: 'Leave Request Approved',
                            template: 'leave_approved',
                        },
                    },
                    {
                        id: 'email-2',
                        type: 'email',
                        name: 'Send Rejection Notification',
                        description: 'Notify employee that leave is rejected',
                        position: { x: 1100, y: 450 },
                        config: {
                            to: '{{initiator.email}}',
                            subject: 'Leave Request Rejected',
                            template: 'leave_rejected',
                        },
                    },
                    {
                        id: 'action-1',
                        type: 'action',
                        name: 'Update Leave Balance',
                        description: 'Deduct leave days from employee balance',
                        position: { x: 1850, y: 200 },
                        config: {
                            action: 'update_dataset',
                            datasetName: 'Leave Records',
                            operation: 'insert',
                        },
                    },
                    {
                        id: 'end-1',
                        type: 'end',
                        name: 'Leave Approved',
                        description: 'Leave request process completed (approved)',
                        position: { x: 2100, y: 200 },
                        config: {},
                    },
                    {
                        id: 'end-2',
                        type: 'end',
                        name: 'Leave Rejected',
                        description: 'Leave request process completed (rejected)',
                        position: { x: 1350, y: 450 },
                        config: {},
                    },
                ],
                edges: [
                    { id: 'e1', source: 'start-1', target: 'form-1', label: '' },
                    { id: 'e2', source: 'form-1', target: 'decision-1', label: 'Form Submitted' },
                    { id: 'e3', source: 'decision-1', target: 'approval-1', label: '> 1 day', condition: 'variables.totalDays > 1' },
                    { id: 'e4', source: 'decision-1', target: 'email-1', label: '≤ 1 day (Auto-Approve)', condition: 'variables.totalDays <= 1' },
                    { id: 'e5', source: 'approval-1', target: 'decision-2', label: 'Decision Made' },
                    { id: 'e6', source: 'decision-2', target: 'approval-2', label: 'Approved & > 3 days', condition: 'outcome === "approved" && variables.totalDays > 3' },
                    { id: 'e7', source: 'decision-2', target: 'email-1', label: 'Approved & ≤ 3 days', condition: 'outcome === "approved" && variables.totalDays <= 3' },
                    { id: 'e8', source: 'decision-2', target: 'email-2', label: 'Rejected', condition: 'outcome === "rejected"' },
                    { id: 'e9', source: 'approval-2', target: 'email-1', label: 'HR Approved' },
                    { id: 'e10', source: 'email-1', target: 'action-1', label: '' },
                    { id: 'e11', source: 'action-1', target: 'end-1', label: '' },
                    { id: 'e12', source: 'email-2', target: 'end-2', label: '' },
                ],
            },
            variables: [
                { name: 'employeeName', type: 'string', label: 'Employee Name' },
                { name: 'department', type: 'string', label: 'Department' },
                { name: 'leaveType', type: 'string', label: 'Leave Type' },
                { name: 'startDate', type: 'date', label: 'Start Date' },
                { name: 'endDate', type: 'date', label: 'End Date' },
                { name: 'totalDays', type: 'number', label: 'Total Days' },
                { name: 'reason', type: 'string', label: 'Reason' },
                { name: 'managerApproval', type: 'string', label: 'Manager Decision' },
                { name: 'hrApproval', type: 'string', label: 'HR Decision' },
            ],
            triggers: [
                { type: 'form_submission', formId: leaveRequestForm.id },
                { type: 'manual', label: 'Submit Leave Request' },
            ],
            settings: {
                allowCancel: true,
                trackSLA: true,
                notification: { onStart: true, onComplete: true, onError: true },
            },
            permissions: {},
            slaConfig: {
                defaultDueHours: 72,
                escalationPolicy: 'notify_admin',
            },
            version: 1,
            status: 'ACTIVE',
            publishedAt: new Date(),
            createdBy: adminUser.id,
        },
        update: {},
    });

    console.log(`✅ Created process: ${leaveProcess.name} (${leaveProcess.id})\n`);

    // ==========================================================================
    // 5. Create Leave Records Dataset
    // ==========================================================================
    const leaveDataset = await prisma.dataset.upsert({
        where: {
            accountId_name: { accountId: account.id, name: 'Leave Records' },
        },
        create: {
            accountId: account.id,
            name: 'Leave Records',
            description: 'All leave request records with approval status and tracking',
            schema: [
                { name: 'Employee', slug: 'employee', type: 'text', required: true },
                { name: 'Department', slug: 'department', type: 'select', required: true },
                { name: 'Leave Type', slug: 'leave_type', type: 'select', required: true },
                { name: 'Start Date', slug: 'start_date', type: 'date', required: true },
                { name: 'End Date', slug: 'end_date', type: 'date', required: true },
                { name: 'Total Days', slug: 'total_days', type: 'number', required: true },
                { name: 'Reason', slug: 'reason', type: 'text', required: false },
                { name: 'Status', slug: 'status', type: 'select', required: true },
                { name: 'Approved By', slug: 'approved_by', type: 'text', required: false },
                { name: 'Comments', slug: 'comments', type: 'text', required: false },
            ],
            indexes: [],
            constraints: [],
            settings: {},
            permissions: {},
            rowCount: 0,
            createdBy: adminUser.id,
        },
        update: {},
    });

    console.log(`✅ Created dataset: ${leaveDataset.name} (${leaveDataset.id})\n`);

    // ==========================================================================
    // 6. Create Sample Leave Records (Dataset Records)
    // ==========================================================================
    const sampleLeaveRecords = [
        {
            employee: 'John Doe', department: 'Engineering', leave_type: 'Annual Leave',
            start_date: '2026-02-10', end_date: '2026-02-14', total_days: 5,
            reason: 'Family vacation to the beach', status: 'Approved',
            approved_by: 'Demo Admin', comments: 'Approved. Enjoy your vacation!',
        },
        {
            employee: 'Jane Smith', department: 'Sales', leave_type: 'Sick Leave',
            start_date: '2026-02-03', end_date: '2026-02-04', total_days: 2,
            reason: 'Flu symptoms, doctor advised rest', status: 'Approved',
            approved_by: 'Demo Admin', comments: 'Get well soon.',
        },
        {
            employee: 'Mike Wilson', department: 'Marketing', leave_type: 'Personal Leave',
            start_date: '2026-02-17', end_date: '2026-02-17', total_days: 1,
            reason: 'House moving day', status: 'Approved',
            approved_by: 'Auto-Approved', comments: 'Auto-approved (≤ 1 day)',
        },
        {
            employee: 'Sarah Chen', department: 'Engineering', leave_type: 'Annual Leave',
            start_date: '2026-03-01', end_date: '2026-03-07', total_days: 5,
            reason: 'Attending tech conference abroad', status: 'Pending Manager Approval',
            approved_by: '', comments: '',
        },
        {
            employee: 'Alex Kumar', department: 'Finance', leave_type: 'Sick Leave',
            start_date: '2026-02-06', end_date: '2026-02-06', total_days: 1,
            reason: 'Dental appointment', status: 'Approved',
            approved_by: 'Auto-Approved', comments: 'Auto-approved (≤ 1 day)',
        },
        {
            employee: 'John Doe', department: 'Engineering', leave_type: 'Personal Leave',
            start_date: '2026-03-15', end_date: '2026-03-18', total_days: 4,
            reason: 'Wedding anniversary trip', status: 'Pending HR Review',
            approved_by: 'Demo Admin', comments: 'Manager approved; pending HR review (>3 days)',
        },
        {
            employee: 'Jane Smith', department: 'Sales', leave_type: 'Annual Leave',
            start_date: '2026-02-24', end_date: '2026-02-26', total_days: 3,
            reason: 'Short family trip', status: 'Rejected',
            approved_by: 'Demo Admin', comments: 'Rejected: conflicts with quarterly sales review.',
        },
        {
            employee: 'Mike Wilson', department: 'Marketing', leave_type: 'Unpaid Leave',
            start_date: '2026-04-01', end_date: '2026-04-10', total_days: 8,
            reason: 'Extended personal travel', status: 'Pending Manager Approval',
            approved_by: '', comments: '',
        },
    ];

    let recordsCreated = 0;
    for (const record of sampleLeaveRecords) {
        await prisma.datasetRecord.create({
            data: {
                datasetId: leaveDataset.id,
                data: record,
                createdBy: users.find(u => u.firstName === record.employee.split(' ')[0])?.id || adminUser.id,
            },
        });
        recordsCreated++;
    }

    // Update row count
    await prisma.dataset.update({
        where: { id: leaveDataset.id },
        data: { rowCount: recordsCreated },
    });

    console.log(`✅ Created ${recordsCreated} leave records\n`);

    // ==========================================================================
    // 7. Create Form Submissions
    // ==========================================================================
    const formSubmissions = [
        {
            employeeName: 'John Doe', department: 'engineering', leaveType: 'annual',
            startDate: '2026-02-10', endDate: '2026-02-14', totalDays: 5,
            reason: 'Family vacation to the beach', emergencyContact: '+1-555-0101',
            handoverNotes: 'Delegate code reviews to Sarah Chen. Sprint planning notes in shared doc.',
        },
        {
            employeeName: 'Jane Smith', department: 'sales', leaveType: 'sick',
            startDate: '2026-02-03', endDate: '2026-02-04', totalDays: 2,
            reason: 'Flu symptoms, doctor advised rest', emergencyContact: '+1-555-0202',
            handoverNotes: 'Client meetings rescheduled. Urgent matters: contact Mike Wilson.',
        },
        {
            employeeName: 'Sarah Chen', department: 'engineering', leaveType: 'annual',
            startDate: '2026-03-01', endDate: '2026-03-07', totalDays: 5,
            reason: 'Attending tech conference abroad', emergencyContact: '+1-555-0404',
            handoverNotes: 'All open PRs reviewed. John Doe is backup for deployment pipeline.',
        },
        {
            employeeName: 'Mike Wilson', department: 'marketing', leaveType: 'unpaid',
            startDate: '2026-04-01', endDate: '2026-04-10', totalDays: 8,
            reason: 'Extended personal travel', emergencyContact: '+1-555-0303',
            handoverNotes: 'Q2 campaign materials are finalized. No pending deadlines.',
        },
    ];

    for (const submission of formSubmissions) {
        await prisma.formSubmission.create({
            data: {
                formId: leaveRequestForm.id,
                data: submission,
                createdBy: users.find(u => u.firstName === submission.employeeName.split(' ')[0])?.id || adminUser.id,
            },
        });
    }

    console.log(`✅ Created ${formSubmissions.length} form submissions\n`);

    // ==========================================================================
    // 8. Create Process Instances (workflow runs at different stages)
    // ==========================================================================
    const allUsers = [adminUser, ...users];
    const processInstances = [];

    // Instance 1: COMPLETED (John Doe - Annual Leave - Approved)
    const instance1 = await prisma.processInstance.create({
        data: {
            processId: leaveProcess.id,
            processVersion: 1,
            status: 'COMPLETED',
            currentNodes: ['end-1'],
            variables: {
                employeeName: 'John Doe', department: 'engineering', leaveType: 'annual',
                startDate: '2026-02-10', endDate: '2026-02-14', totalDays: 5,
                reason: 'Family vacation to the beach',
                managerApproval: 'approved', hrApproval: 'approved',
            },
            startedBy: users[0].id, // John Doe
            completedAt: new Date('2026-02-02T14:30:00Z'),
        },
    });
    processInstances.push(instance1);

    // Instance 2: COMPLETED (Jane Smith - Sick Leave - Approved)
    const instance2 = await prisma.processInstance.create({
        data: {
            processId: leaveProcess.id,
            processVersion: 1,
            status: 'COMPLETED',
            currentNodes: ['end-1'],
            variables: {
                employeeName: 'Jane Smith', department: 'sales', leaveType: 'sick',
                startDate: '2026-02-03', endDate: '2026-02-04', totalDays: 2,
                reason: 'Flu symptoms, doctor advised rest',
                managerApproval: 'approved',
            },
            startedBy: users[1].id, // Jane Smith
            completedAt: new Date('2026-02-02T10:00:00Z'),
        },
    });
    processInstances.push(instance2);

    // Instance 3: COMPLETED (Mike Wilson - Personal Leave - Auto-approved)
    const instance3 = await prisma.processInstance.create({
        data: {
            processId: leaveProcess.id,
            processVersion: 1,
            status: 'COMPLETED',
            currentNodes: ['end-1'],
            variables: {
                employeeName: 'Mike Wilson', department: 'marketing', leaveType: 'personal',
                startDate: '2026-02-17', endDate: '2026-02-17', totalDays: 1,
                reason: 'House moving day',
                managerApproval: 'auto-approved',
            },
            startedBy: users[2].id, // Mike Wilson
            completedAt: new Date('2026-02-15T09:00:00Z'),
        },
    });
    processInstances.push(instance3);

    // Instance 4: RUNNING - Pending Manager Approval (Sarah Chen)
    const instance4 = await prisma.processInstance.create({
        data: {
            processId: leaveProcess.id,
            processVersion: 1,
            status: 'RUNNING',
            currentNodes: ['approval-1'],
            variables: {
                employeeName: 'Sarah Chen', department: 'engineering', leaveType: 'annual',
                startDate: '2026-03-01', endDate: '2026-03-07', totalDays: 5,
                reason: 'Attending tech conference abroad',
            },
            startedBy: users[3].id, // Sarah Chen
            dueAt: new Date('2026-02-10T17:00:00Z'),
        },
    });
    processInstances.push(instance4);

    // Instance 5: RUNNING - Pending HR Review (John Doe second request)
    const instance5 = await prisma.processInstance.create({
        data: {
            processId: leaveProcess.id,
            processVersion: 1,
            status: 'RUNNING',
            currentNodes: ['approval-2'],
            variables: {
                employeeName: 'John Doe', department: 'engineering', leaveType: 'personal',
                startDate: '2026-03-15', endDate: '2026-03-18', totalDays: 4,
                reason: 'Wedding anniversary trip',
                managerApproval: 'approved',
            },
            startedBy: users[0].id, // John Doe
            dueAt: new Date('2026-02-12T17:00:00Z'),
        },
    });
    processInstances.push(instance5);

    // Instance 6: COMPLETED - Rejected (Jane Smith)
    const instance6 = await prisma.processInstance.create({
        data: {
            processId: leaveProcess.id,
            processVersion: 1,
            status: 'COMPLETED',
            currentNodes: ['end-2'],
            variables: {
                employeeName: 'Jane Smith', department: 'sales', leaveType: 'annual',
                startDate: '2026-02-24', endDate: '2026-02-26', totalDays: 3,
                reason: 'Short family trip',
                managerApproval: 'rejected',
            },
            startedBy: users[1].id,
            completedAt: new Date('2026-02-05T16:00:00Z'),
        },
    });
    processInstances.push(instance6);

    // Instance 7: RUNNING - Pending Manager Approval (Mike Wilson)
    const instance7 = await prisma.processInstance.create({
        data: {
            processId: leaveProcess.id,
            processVersion: 1,
            status: 'RUNNING',
            currentNodes: ['approval-1'],
            variables: {
                employeeName: 'Mike Wilson', department: 'marketing', leaveType: 'unpaid',
                startDate: '2026-04-01', endDate: '2026-04-10', totalDays: 8,
                reason: 'Extended personal travel',
            },
            startedBy: users[2].id,
            dueAt: new Date('2026-02-14T17:00:00Z'),
        },
    });
    processInstances.push(instance7);

    console.log(`✅ Created ${processInstances.length} process instances\n`);

    // ==========================================================================
    // 9. Create Task Instances (approval tasks)
    // ==========================================================================

    // Task 1: Manager Approval for John Doe (COMPLETED - Approved)
    await prisma.taskInstance.create({
        data: {
            instanceId: instance1.id,
            nodeId: 'approval-1',
            name: 'Approve Leave: John Doe - Annual Leave (5 days)',
            description: 'Review and approve leave request from John Doe for Feb 10-14',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'USER',
            formData: {
                employeeName: 'John Doe', leaveType: 'Annual Leave',
                startDate: '2026-02-10', endDate: '2026-02-14', totalDays: 5,
                reason: 'Family vacation to the beach',
            },
            status: 'COMPLETED',
            priority: 1,
            outcome: 'approved',
            completedAt: new Date('2026-02-01T11:30:00Z'),
            completedBy: adminUser.id,
            comments: 'Approved. Enjoy your vacation!',
        },
    });

    // Task 2: HR Review for John Doe (COMPLETED - Approved)
    await prisma.taskInstance.create({
        data: {
            instanceId: instance1.id,
            nodeId: 'approval-2',
            name: 'HR Review: John Doe - Annual Leave (5 days)',
            description: 'HR review for leave > 3 days',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'ROLE',
            formData: {
                employeeName: 'John Doe', leaveType: 'Annual Leave',
                totalDays: 5, managerApproval: 'approved',
            },
            status: 'COMPLETED',
            priority: 1,
            outcome: 'approved',
            completedAt: new Date('2026-02-02T14:30:00Z'),
            completedBy: adminUser.id,
            comments: 'HR approved. Leave balance sufficient.',
        },
    });

    // Task 3: Manager Approval for Jane Smith - Sick (COMPLETED)
    await prisma.taskInstance.create({
        data: {
            instanceId: instance2.id,
            nodeId: 'approval-1',
            name: 'Approve Leave: Jane Smith - Sick Leave (2 days)',
            description: 'Review and approve sick leave from Jane Smith for Feb 3-4',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'USER',
            formData: {
                employeeName: 'Jane Smith', leaveType: 'Sick Leave',
                startDate: '2026-02-03', endDate: '2026-02-04', totalDays: 2,
                reason: 'Flu symptoms, doctor advised rest',
            },
            status: 'COMPLETED',
            priority: 2,
            outcome: 'approved',
            completedAt: new Date('2026-02-02T09:45:00Z'),
            completedBy: adminUser.id,
            comments: 'Get well soon.',
        },
    });

    // Task 4: Manager Approval for Sarah Chen (PENDING - Active)
    await prisma.taskInstance.create({
        data: {
            instanceId: instance4.id,
            nodeId: 'approval-1',
            name: 'Approve Leave: Sarah Chen - Annual Leave (5 days)',
            description: 'Review and approve leave request from Sarah Chen for Mar 1-7',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'USER',
            formData: {
                employeeName: 'Sarah Chen', leaveType: 'Annual Leave',
                startDate: '2026-03-01', endDate: '2026-03-07', totalDays: 5,
                reason: 'Attending tech conference abroad',
            },
            status: 'PENDING',
            priority: 1,
            dueAt: new Date('2026-02-10T17:00:00Z'),
        },
    });

    // Task 5: HR Review for John Doe second request (PENDING - Active)
    await prisma.taskInstance.create({
        data: {
            instanceId: instance5.id,
            nodeId: 'approval-2',
            name: 'HR Review: John Doe - Personal Leave (4 days)',
            description: 'HR review for Personal Leave > 3 days. Manager already approved.',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'ROLE',
            formData: {
                employeeName: 'John Doe', leaveType: 'Personal Leave',
                startDate: '2026-03-15', endDate: '2026-03-18', totalDays: 4,
                reason: 'Wedding anniversary trip',
                managerApproval: 'approved',
            },
            status: 'PENDING',
            priority: 1,
            dueAt: new Date('2026-02-12T17:00:00Z'),
        },
    });

    // Task 6: Manager Approval for Jane Smith - Rejected
    await prisma.taskInstance.create({
        data: {
            instanceId: instance6.id,
            nodeId: 'approval-1',
            name: 'Approve Leave: Jane Smith - Annual Leave (3 days)',
            description: 'Review leave request from Jane Smith for Feb 24-26',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'USER',
            formData: {
                employeeName: 'Jane Smith', leaveType: 'Annual Leave',
                startDate: '2026-02-24', endDate: '2026-02-26', totalDays: 3,
                reason: 'Short family trip',
            },
            status: 'COMPLETED',
            priority: 1,
            outcome: 'rejected',
            completedAt: new Date('2026-02-05T16:00:00Z'),
            completedBy: adminUser.id,
            comments: 'Rejected: conflicts with quarterly sales review.',
        },
    });

    // Task 7: Manager Approval for Mike Wilson - Pending
    await prisma.taskInstance.create({
        data: {
            instanceId: instance7.id,
            nodeId: 'approval-1',
            name: 'Approve Leave: Mike Wilson - Unpaid Leave (8 days)',
            description: 'Review unpaid leave request from Mike Wilson for Apr 1-10',
            taskType: 'APPROVAL',
            assigneeId: adminUser.id,
            assigneeType: 'USER',
            formData: {
                employeeName: 'Mike Wilson', leaveType: 'Unpaid Leave',
                startDate: '2026-04-01', endDate: '2026-04-10', totalDays: 8,
                reason: 'Extended personal travel',
            },
            status: 'PENDING',
            priority: 2,
            dueAt: new Date('2026-02-14T17:00:00Z'),
        },
    });

    console.log('✅ Created 7 task instances (3 pending, 4 completed)\n');

    // ==========================================================================
    // 10. Create Node Executions (workflow audit trail)
    // ==========================================================================
    // Instance 1 (John Doe - Completed): all nodes executed
    const nodeExecutionData = [
        // Instance 1 - Fully completed
        {
            instanceId: instance1.id, nodeId: 'start-1', nodeType: 'start', status: 'COMPLETED' as const,
            startedAt: new Date('2026-01-30T09:00:00Z'), completedAt: new Date('2026-01-30T09:00:01Z')
        },
        {
            instanceId: instance1.id, nodeId: 'form-1', nodeType: 'form', status: 'COMPLETED' as const,
            startedAt: new Date('2026-01-30T09:00:01Z'), completedAt: new Date('2026-01-30T09:15:00Z')
        },
        {
            instanceId: instance1.id, nodeId: 'decision-1', nodeType: 'decision', status: 'COMPLETED' as const,
            startedAt: new Date('2026-01-30T09:15:00Z'), completedAt: new Date('2026-01-30T09:15:01Z')
        },
        {
            instanceId: instance1.id, nodeId: 'approval-1', nodeType: 'approval', status: 'COMPLETED' as const,
            startedAt: new Date('2026-01-30T09:15:01Z'), completedAt: new Date('2026-02-01T11:30:00Z')
        },
        {
            instanceId: instance1.id, nodeId: 'decision-2', nodeType: 'decision', status: 'COMPLETED' as const,
            startedAt: new Date('2026-02-01T11:30:00Z'), completedAt: new Date('2026-02-01T11:30:01Z')
        },
        {
            instanceId: instance1.id, nodeId: 'approval-2', nodeType: 'approval', status: 'COMPLETED' as const,
            startedAt: new Date('2026-02-01T11:30:01Z'), completedAt: new Date('2026-02-02T14:30:00Z')
        },
        {
            instanceId: instance1.id, nodeId: 'email-1', nodeType: 'email', status: 'COMPLETED' as const,
            startedAt: new Date('2026-02-02T14:30:00Z'), completedAt: new Date('2026-02-02T14:30:05Z')
        },
        {
            instanceId: instance1.id, nodeId: 'action-1', nodeType: 'action', status: 'COMPLETED' as const,
            startedAt: new Date('2026-02-02T14:30:05Z'), completedAt: new Date('2026-02-02T14:30:06Z')
        },
        {
            instanceId: instance1.id, nodeId: 'end-1', nodeType: 'end', status: 'COMPLETED' as const,
            startedAt: new Date('2026-02-02T14:30:06Z'), completedAt: new Date('2026-02-02T14:30:06Z')
        },

        // Instance 4 (Sarah Chen - Running at approval-1)
        {
            instanceId: instance4.id, nodeId: 'start-1', nodeType: 'start', status: 'COMPLETED' as const,
            startedAt: new Date('2026-02-07T08:00:00Z'), completedAt: new Date('2026-02-07T08:00:01Z')
        },
        {
            instanceId: instance4.id, nodeId: 'form-1', nodeType: 'form', status: 'COMPLETED' as const,
            startedAt: new Date('2026-02-07T08:00:01Z'), completedAt: new Date('2026-02-07T08:20:00Z')
        },
        {
            instanceId: instance4.id, nodeId: 'decision-1', nodeType: 'decision', status: 'COMPLETED' as const,
            startedAt: new Date('2026-02-07T08:20:00Z'), completedAt: new Date('2026-02-07T08:20:01Z')
        },
        {
            instanceId: instance4.id, nodeId: 'approval-1', nodeType: 'approval', status: 'RUNNING' as const,
            startedAt: new Date('2026-02-07T08:20:01Z')
        },

        // Instance 5 (John Doe 2nd - Running at approval-2)
        {
            instanceId: instance5.id, nodeId: 'start-1', nodeType: 'start', status: 'COMPLETED' as const,
            startedAt: new Date('2026-02-06T10:00:00Z'), completedAt: new Date('2026-02-06T10:00:01Z')
        },
        {
            instanceId: instance5.id, nodeId: 'form-1', nodeType: 'form', status: 'COMPLETED' as const,
            startedAt: new Date('2026-02-06T10:00:01Z'), completedAt: new Date('2026-02-06T10:10:00Z')
        },
        {
            instanceId: instance5.id, nodeId: 'decision-1', nodeType: 'decision', status: 'COMPLETED' as const,
            startedAt: new Date('2026-02-06T10:10:00Z'), completedAt: new Date('2026-02-06T10:10:01Z')
        },
        {
            instanceId: instance5.id, nodeId: 'approval-1', nodeType: 'approval', status: 'COMPLETED' as const,
            startedAt: new Date('2026-02-06T10:10:01Z'), completedAt: new Date('2026-02-07T09:00:00Z')
        },
        {
            instanceId: instance5.id, nodeId: 'decision-2', nodeType: 'decision', status: 'COMPLETED' as const,
            startedAt: new Date('2026-02-07T09:00:00Z'), completedAt: new Date('2026-02-07T09:00:01Z')
        },
        {
            instanceId: instance5.id, nodeId: 'approval-2', nodeType: 'approval', status: 'RUNNING' as const,
            startedAt: new Date('2026-02-07T09:00:01Z')
        },
    ];

    for (const exec of nodeExecutionData) {
        await prisma.nodeExecution.create({
            data: {
                instanceId: exec.instanceId,
                nodeId: exec.nodeId,
                nodeType: exec.nodeType,
                status: exec.status,
                startedAt: exec.startedAt,
                completedAt: exec.completedAt || null,
                input: {},
                output: {},
            },
        });
    }

    console.log(`✅ Created ${nodeExecutionData.length} node executions\n`);

    // ==========================================================================
    // Summary
    // ==========================================================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉 Leave Request Flow seeded successfully!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Created:');
    console.log(`   • 5 additional users (john.doe, jane.smith, mike.wilson, sarah.chen, alex.kumar)`);
    console.log(`   • 1 Form: "Leave Request Form" (9 fields, 3 sections)`);
    console.log(`   • 1 Process/Workflow: "Leave Request Workflow" (11 nodes, 12 edges)`);
    console.log(`   • 1 Dataset: "Leave Records" (10 columns, ${recordsCreated} records)`);
    console.log(`   • ${processInstances.length} workflow instances (4 completed, 3 running)`);
    console.log(`   • 7 approval tasks (3 pending, 4 completed)`);
    console.log(`   • ${formSubmissions.length} form submissions`);
    console.log(`   • ${nodeExecutionData.length} node execution audit entries`);
    console.log('');
    console.log('🔑 All users share password: Demo123!@#');
    console.log('');
    console.log('📊 Workflow stages represented:');
    console.log('   ✅ Auto-approved (≤1 day)  →  Mike Wilson, Alex Kumar');
    console.log('   ✅ Manager + HR Approved   →  John Doe (5-day vacation)');
    console.log('   ⏳ Pending Manager Approval →  Sarah Chen, Mike Wilson (8-day)');
    console.log('   ⏳ Pending HR Review        →  John Doe (4-day anniversary)');
    console.log('   ❌ Rejected by Manager      →  Jane Smith (conflicts)');
    console.log('');
}

seedLeaveRequestFlow()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
