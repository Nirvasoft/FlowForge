/**
 * Problem Management Seed Script
 * Creates: Problem Management Dataset, Incidents, Problem Tasks, Notes History,
 *          Task SLA, Reference Datasets, Problem Report Form, Problem Lifecycle Workflow,
 *          App, Sample Data
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedProblemManagement() {
    console.log('\n🔍 Seeding Problem Management...\n');

    // 1. Get account & admin user
    const account = await prisma.account.findFirst({ where: { slug: 'demo' } });
    if (!account) throw new Error('Demo account not found. Run main seed first.');

    const adminUser = await prisma.user.findFirst({ where: { accountId: account.id, email: 'admin@demo.com' } });
    if (!adminUser) throw new Error('Admin user not found. Run main seed first.');

    // Ensure problem management users exist
    const pmUserData = [
        { firstName: 'Kyaw', lastName: 'Zaw Tun', email: 'kyaw.zawtun@demo.com', role: 'Problem Manager' },
        { firstName: 'Phone', lastName: 'Myat Soe', email: 'phone.myatsoe@demo.com', role: 'L1 Support Lead' },
        { firstName: 'Khine', lastName: 'Zar Thwe', email: 'khine.zarthwe@demo.com', role: 'L2 Vendor Support' },
        { firstName: 'Aung', lastName: 'Min Htet', email: 'aung.minhtet@demo.com', role: 'Service Desk Analyst' },
        { firstName: 'Su', lastName: 'Mon Kyaw', email: 'su.monkyaw@demo.com', role: 'IT Manager' },
        { firstName: 'Zay', lastName: 'Yar Lin', email: 'zay.yarlin@demo.com', role: 'Change Manager' },
    ];

    const users: any[] = [];
    for (const u of pmUserData) {
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
    console.log(`✅ Found/created ${users.length} problem management users\n`);

    // 2. Reference Datasets
    // 2a. Services (Business & Technical services)
    const servicesDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Services' } },
        create: {
            accountId: account.id, name: 'Services',
            description: 'Business and Technical services catalog',
            schema: [
                { name: 'Name', slug: 'name', type: 'text', required: true },
                { name: 'Service Classification', slug: 'service_classification', type: 'text', required: true },
                { name: 'Name 1', slug: 'name_1', type: 'text', required: false },
                { name: 'Parent 1', slug: 'parent_1', type: 'text', required: false },
                { name: 'Assignment Group', slug: 'assignment_group', type: 'text', required: false },
                { name: 'Support Group', slug: 'support_group', type: 'text', required: false },
                { name: 'Vendor Support Group', slug: 'u_vendor_support_group', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const serviceRecords = [
        { name: 'SVC-BS-001', service_classification: 'Business Service', name_1: 'Email & Collaboration', parent_1: '', assignment_group: 'GRP-L1-INFRA', support_group: 'GRP-L2-INFRA', u_vendor_support_group: 'GRP-L3-MSFT' },
        { name: 'SVC-BS-002', service_classification: 'Business Service', name_1: 'ERP System', parent_1: '', assignment_group: 'GRP-L1-APPS', support_group: 'GRP-L2-APPS', u_vendor_support_group: 'GRP-L3-SAP' },
        { name: 'SVC-BS-003', service_classification: 'Business Service', name_1: 'Network Services', parent_1: '', assignment_group: 'GRP-L1-NET', support_group: 'GRP-L2-NET', u_vendor_support_group: 'GRP-L3-CISCO' },
        { name: 'SVC-BS-004', service_classification: 'Business Service', name_1: 'Core Banking', parent_1: '', assignment_group: 'GRP-L1-CORE', support_group: 'GRP-L2-CORE', u_vendor_support_group: 'GRP-L3-FIS' },
        { name: 'SVC-TS-001', service_classification: 'Technical Service', name_1: 'Exchange Server', parent_1: 'Email & Collaboration', assignment_group: 'GRP-L1-INFRA', support_group: 'GRP-L2-INFRA', u_vendor_support_group: 'GRP-L3-MSFT' },
        { name: 'SVC-TS-002', service_classification: 'Technical Service', name_1: 'SAP HANA', parent_1: 'ERP System', assignment_group: 'GRP-L1-APPS', support_group: 'GRP-L2-APPS', u_vendor_support_group: 'GRP-L3-SAP' },
        { name: 'SVC-TS-003', service_classification: 'Technical Service', name_1: 'Core Switch', parent_1: 'Network Services', assignment_group: 'GRP-L1-NET', support_group: 'GRP-L2-NET', u_vendor_support_group: 'GRP-L3-CISCO' },
        { name: 'SVC-TS-004', service_classification: 'Technical Service', name_1: 'Payment Gateway', parent_1: 'Core Banking', assignment_group: 'GRP-L1-CORE', support_group: 'GRP-L2-CORE', u_vendor_support_group: 'GRP-L3-FIS' },
    ];

    const existingSvc = await prisma.datasetRecord.count({ where: { datasetId: servicesDs.id } });
    if (existingSvc === 0) {
        for (const r of serviceRecords) await prisma.datasetRecord.create({ data: { datasetId: servicesDs.id, data: r, createdBy: adminUser.id } });
        await prisma.dataset.update({ where: { id: servicesDs.id }, data: { rowCount: serviceRecords.length } });
    }
    console.log(`✅ Services dataset: ${serviceRecords.length} records\n`);

    // 2b. sys_user_group
    const userGroupDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'sys_user_group' } },
        create: {
            accountId: account.id, name: 'sys_user_group',
            description: 'Support groups for assignment',
            schema: [
                { name: 'Name', slug: 'name', type: 'text', required: true },
                { name: 'Name 1', slug: 'name_1', type: 'text', required: true },
                { name: 'Service Level', slug: 'u_service_level', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const groupRecords = [
        { name: 'GRP-L1-INFRA', name_1: 'GRP-L1-INFRA', u_service_level: 'L1' },
        { name: 'GRP-L1-APPS', name_1: 'GRP-L1-APPS', u_service_level: 'L1' },
        { name: 'GRP-L1-NET', name_1: 'GRP-L1-NET', u_service_level: 'L1' },
        { name: 'GRP-L1-CORE', name_1: 'GRP-L1-CORE', u_service_level: 'L1' },
        { name: 'GRP-L2-INFRA', name_1: 'GRP-L2-INFRA', u_service_level: 'L2' },
        { name: 'GRP-L2-APPS', name_1: 'GRP-L2-APPS', u_service_level: 'L2' },
        { name: 'GRP-L2-NET', name_1: 'GRP-L2-NET', u_service_level: 'L2' },
        { name: 'GRP-L2-CORE', name_1: 'GRP-L2-CORE', u_service_level: 'L2' },
        { name: 'GRP-L3-MSFT', name_1: 'GRP-L3-MSFT', u_service_level: 'L3' },
        { name: 'GRP-L3-SAP', name_1: 'GRP-L3-SAP', u_service_level: 'L3' },
    ];

    const existingGrp = await prisma.datasetRecord.count({ where: { datasetId: userGroupDs.id } });
    if (existingGrp === 0) {
        for (const r of groupRecords) await prisma.datasetRecord.create({ data: { datasetId: userGroupDs.id, data: r, createdBy: adminUser.id } });
        await prisma.dataset.update({ where: { id: userGroupDs.id }, data: { rowCount: groupRecords.length } });
    }
    console.log(`✅ sys_user_group dataset: ${groupRecords.length} records\n`);

    // 2c. sys_user
    const sysUserDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'sys_user' } },
        create: {
            accountId: account.id, name: 'sys_user',
            description: 'System users for assignment and vendor contacts',
            schema: [
                { name: 'Name', slug: 'name', type: 'text', required: true },
                { name: 'Email', slug: 'email_1', type: 'text', required: true },
                { name: 'Name 1', slug: 'name_1', type: 'text', required: false },
                { name: 'User Group', slug: 'usr_group', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const sysUserRecords = [
        { name: 'USR-001', email_1: 'kyaw.zawtun@demo.com', name_1: 'Kyaw Zaw Tun', usr_group: 'GRP-L1-INFRA,GRP-L1-APPS' },
        { name: 'USR-002', email_1: 'phone.myatsoe@demo.com', name_1: 'Phone Myat Soe', usr_group: 'GRP-L1-INFRA,GRP-L1-NET' },
        { name: 'USR-003', email_1: 'khine.zarthwe@demo.com', name_1: 'Khine Zar Thwe', usr_group: 'GRP-L2-INFRA,GRP-L2-APPS' },
        { name: 'USR-004', email_1: 'aung.minhtet@demo.com', name_1: 'Aung Min Htet', usr_group: 'GRP-L1-CORE' },
        { name: 'USR-005', email_1: 'vendor.msft@demo.com', name_1: 'Microsoft Support', usr_group: 'GRP-L3-MSFT' },
        { name: 'USR-006', email_1: 'vendor.sap@demo.com', name_1: 'SAP Support', usr_group: 'GRP-L3-SAP' },
        { name: 'USR-007', email_1: 'vendor.cisco@demo.com', name_1: 'Cisco Support', usr_group: 'GRP-L3-CISCO' },
        { name: 'USR-008', email_1: 'su.monkyaw@demo.com', name_1: 'Su Mon Kyaw', usr_group: 'GRP-L1-APPS,GRP-L2-APPS' },
    ];

    const existingUsr = await prisma.datasetRecord.count({ where: { datasetId: sysUserDs.id } });
    if (existingUsr === 0) {
        for (const r of sysUserRecords) await prisma.datasetRecord.create({ data: { datasetId: sysUserDs.id, data: r, createdBy: adminUser.id } });
        await prisma.dataset.update({ where: { id: sysUserDs.id }, data: { rowCount: sysUserRecords.length } });
    }
    console.log(`✅ sys_user dataset: ${sysUserRecords.length} records\n`);

    // 2d. CI_Relationships
    const ciDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'CI_Relationships' } },
        create: {
            accountId: account.id, name: 'CI_Relationships',
            description: 'Configuration item relationships',
            schema: [
                { name: 'Parent', slug: 'parent_1', type: 'text', required: true },
                { name: 'Name', slug: 'name', type: 'text', required: true },
                { name: 'Child', slug: 'child', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const ciRecords = [
        { parent_1: 'Exchange Server', name: 'CI-EXCH-01', child: 'Mail Server Primary' },
        { parent_1: 'Exchange Server', name: 'CI-EXCH-02', child: 'Mail Server Secondary' },
        { parent_1: 'SAP HANA', name: 'CI-SAP-01', child: 'SAP Production DB' },
        { parent_1: 'Core Switch', name: 'CI-SW-01', child: 'Core Router A' },
        { parent_1: 'Payment Gateway', name: 'CI-PAY-01', child: 'Payment API Server' },
    ];

    const existingCI = await prisma.datasetRecord.count({ where: { datasetId: ciDs.id } });
    if (existingCI === 0) {
        for (const r of ciRecords) await prisma.datasetRecord.create({ data: { datasetId: ciDs.id, data: r, createdBy: adminUser.id } });
        await prisma.dataset.update({ where: { id: ciDs.id }, data: { rowCount: ciRecords.length } });
    }
    console.log(`✅ CI_Relationships dataset: ${ciRecords.length} records\n`);

    // 2e. KB_Knowledge
    const kbDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'KB_Knowledge' } },
        create: {
            accountId: account.id, name: 'KB_Knowledge',
            description: 'Knowledge base articles for problem resolution',
            schema: [
                { name: 'Number', slug: 'Number_1', type: 'text', required: true },
                { name: 'Category', slug: 'Category', type: 'text', required: false },
                { name: 'Short Description', slug: 'Short_Description', type: 'text', required: true },
                { name: 'Meta Description', slug: 'Meta_Description_1', type: 'text', required: false },
                { name: 'Active', slug: 'Active', type: 'boolean', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const kbRecords = [
        { Number_1: 'KB0001', Category: 'Infrastructure', Short_Description: 'Exchange Server High CPU Troubleshooting', Meta_Description_1: 'Steps to diagnose and resolve Exchange Server high CPU issues including database maintenance and transport queue clearing', Active: true },
        { Number_1: 'KB0002', Category: 'Applications', Short_Description: 'SAP HANA Memory Allocation Best Practices', Meta_Description_1: 'Configuration guide for SAP HANA memory management including row store and column store optimization', Active: true },
        { Number_1: 'KB0003', Category: 'Network', Short_Description: 'Core Switch Failover Procedures', Meta_Description_1: 'Step-by-step failover procedures for Cisco core switches including HSRP and spanning tree verification', Active: true },
        { Number_1: 'KB0004', Category: 'Security', Short_Description: 'Payment Gateway PCI Compliance Checklist', Meta_Description_1: 'PCI DSS compliance verification checklist for payment gateway infrastructure', Active: true },
    ];

    const existingKB = await prisma.datasetRecord.count({ where: { datasetId: kbDs.id } });
    if (existingKB === 0) {
        for (const r of kbRecords) await prisma.datasetRecord.create({ data: { datasetId: kbDs.id, data: r, createdBy: adminUser.id } });
        await prisma.dataset.update({ where: { id: kbDs.id }, data: { rowCount: kbRecords.length } });
    }
    console.log(`✅ KB_Knowledge dataset: ${kbRecords.length} records\n`);

    // 2f. contract_sla
    const slaDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'contract_sla' } },
        create: {
            accountId: account.id, name: 'contract_sla',
            description: 'SLA definitions for problem management',
            schema: [
                { name: 'Name', slug: 'Name', type: 'text', required: true },
                { name: 'Name 1', slug: 'Name_1', type: 'text', required: false },
                { name: 'Table', slug: 'Table', type: 'text', required: true },
                { name: 'Target', slug: 'Target', type: 'text', required: true },
                { name: 'Priority', slug: 'Priority', type: 'text', required: false },
                { name: 'Assignment Group', slug: 'Assignment_Group', type: 'text', required: false },
                { name: 'Service Type', slug: 'Service_Type', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const slaRecords = [
        { Name: 'SLA-PRB-001', Name_1: 'P1 Critical Resolution', Table: 'problem', Target: 'Resolution', Priority: '1 - Critical', Assignment_Group: 'GRP-L1-INFRA', Service_Type: 'Infrastructure' },
        { Name: 'SLA-PRB-002', Name_1: 'P2 High Resolution', Table: 'problem', Target: 'Resolution', Priority: '2 - High', Assignment_Group: 'GRP-L1-APPS', Service_Type: 'Application' },
        { Name: 'SLA-PRB-003', Name_1: 'P3 Minor Resolution', Table: 'problem', Target: 'Resolution', Priority: '3 - Minor', Assignment_Group: 'GRP-L1-NET', Service_Type: 'Network' },
        { Name: 'SLA-PRB-004', Name_1: 'P4 Low Resolution', Table: 'problem', Target: 'Resolution', Priority: '4 - Low', Assignment_Group: 'GRP-L1-CORE', Service_Type: 'Core Banking' },
        { Name: 'SLA-PRB-005', Name_1: 'P5 Planning Resolution', Table: 'problem', Target: 'Resolution', Priority: '5 - Planning', Assignment_Group: 'GRP-L1-INFRA', Service_Type: 'Infrastructure' },
        { Name: 'SLA-PRB-006', Name_1: 'P1 Critical Resolution L2', Table: 'problem', Target: 'Resolution', Priority: '1 - Critical', Assignment_Group: 'GRP-L2-INFRA', Service_Type: 'Infrastructure' },
    ];

    const existingSLA = await prisma.datasetRecord.count({ where: { datasetId: slaDs.id } });
    if (existingSLA === 0) {
        for (const r of slaRecords) await prisma.datasetRecord.create({ data: { datasetId: slaDs.id, data: r, createdBy: adminUser.id } });
        await prisma.dataset.update({ where: { id: slaDs.id }, data: { rowCount: slaRecords.length } });
    }
    console.log(`✅ contract_sla dataset: ${slaRecords.length} records\n`);

    // 2g. KB_Category
    const kbCatDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'KB_Category' } },
        create: {
            accountId: account.id, name: 'KB_Category',
            description: 'Knowledge base categories',
            schema: [
                { name: 'Name', slug: 'Name', type: 'text', required: true },
                { name: 'Category', slug: 'Category', type: 'text', required: true },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const kbCatRecords = [
        { Name: '1', Category: 'Infrastructure' },
        { Name: '2', Category: 'Applications' },
        { Name: '3', Category: 'Network' },
    ];

    const existingKBCat = await prisma.datasetRecord.count({ where: { datasetId: kbCatDs.id } });
    if (existingKBCat === 0) {
        for (const r of kbCatRecords) await prisma.datasetRecord.create({ data: { datasetId: kbCatDs.id, data: r, createdBy: adminUser.id } });
        await prisma.dataset.update({ where: { id: kbCatDs.id }, data: { rowCount: kbCatRecords.length } });
    }
    console.log(`✅ KB_Category dataset: ${kbCatRecords.length} records\n`);

    // 3. Main Dataset — Problem Management
    const problemDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'Problem Management' } },
        create: {
            accountId: account.id, name: 'Problem Management',
            description: 'ITIL Problem Management records with full lifecycle tracking',
            schema: [
                { name: 'Problem ID', slug: 'Untitled_Field_2', type: 'text', required: false },
                { name: 'State', slug: 'State', type: 'text', required: false },
                { name: 'Impact', slug: 'Impact', type: 'select', required: true },
                { name: 'Urgency', slug: 'Urgency', type: 'select', required: true },
                { name: 'Priority', slug: 'Priority', type: 'text', required: false },
                { name: 'Business Service', slug: 'Business_service', type: 'reference', required: true },
                { name: 'Technical Service', slug: 'Technical_service', type: 'reference', required: true },
                { name: 'Service Type', slug: 'Service_Type', type: 'select', required: false },
                { name: 'Configuration Item', slug: 'Configuration_Item', type: 'reference', required: false },
                { name: 'Assignment Group', slug: 'Assignment_group', type: 'reference', required: true },
                { name: 'Assigned To', slug: 'Assigned_to', type: 'reference', required: false },
                { name: 'PIC Contact', slug: 'PIC', type: 'multiuser', required: true },
                { name: 'Assignment Group L2', slug: 'Assignment_group_L2', type: 'reference', required: false },
                { name: 'Choosing Assignment group L2', slug: 'Choosing_Assignment_group_L2', type: 'boolean', required: false },
                { name: 'Vendor Contact', slug: 'Vendor_Contact', type: 'reference', required: false },
                { name: 'Short Description', slug: 'Short_description', type: 'textarea', required: true },
                { name: 'Description', slug: 'Description', type: 'textarea', required: true },
                { name: 'Work Notes', slug: 'Work_notes', type: 'textarea', required: false },
                { name: 'Root Cause Explanation', slug: 'Root_Cause_Explanation', type: 'textarea', required: false },
                { name: 'Preventive Measures', slug: 'Preventive_Measures', type: 'textarea', required: false },
                { name: 'Solution Details', slug: 'Solution_Details', type: 'textarea', required: false },
                { name: 'Close Notes', slug: 'Close_notes', type: 'textarea', required: false },
                { name: 'Known Error', slug: 'Known_Error', type: 'boolean', required: false },
                { name: 'Pending Change', slug: 'Pending_Change', type: 'boolean', required: false },
                { name: 'Closed/Resolved', slug: 'ClosedResolved', type: 'boolean', required: false },
                { name: 'Reopen', slug: 'Reopen', type: 'boolean', required: false },
                { name: 'Take', slug: 'Take', type: 'boolean', required: false },
                { name: 'Root Cause Analysis', slug: 'Root_Cause_Analysis', type: 'boolean', required: false },
                { name: 'Create Knowledge', slug: 'Create_Knowledge', type: 'boolean', required: false },
                { name: 'Opened', slug: 'Opened', type: 'datetime', required: false },
                { name: 'Expected Delivery Time', slug: 'Expected_Delivery_Time', type: 'datetime', required: false },
                { name: 'Closed', slug: 'Closed', type: 'datetime', required: false },
                { name: 'Closed By', slug: 'Closed_by', type: 'text', required: false },
                { name: 'Date of Actual Production Release', slug: 'Date_of_Actual_Production_Release', type: 'datetime', required: false },
                { name: 'Vendor SLA Success', slug: 'Vendor_SLA_Success', type: 'boolean', required: false },
                { name: 'Change Request', slug: 'Change_request', type: 'reference', required: false },
                { name: 'Related KB', slug: 'Related_Search_1', type: 'reference', required: false },
                { name: 'Task SLA Resolution', slug: 'TASK_SLA_RESOLUTION', type: 'reference', required: false },
                { name: 'Non Kissflow User', slug: 'Non_Kissflow_User', type: 'boolean', required: false },
                { name: 'Management Attachment', slug: 'Management_Attachment', type: 'attachment', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    // 4. Sub-datasets
    const incidentsDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'PM Incidents' } },
        create: {
            accountId: account.id, name: 'PM Incidents',
            description: 'Related incidents linked to problems',
            schema: [
                { name: 'Number', slug: 'Number_3', type: 'text', required: false },
                { name: 'Active', slug: 'Active_1', type: 'text', required: false },
                { name: 'Activity Due', slug: 'Activity_due_1', type: 'text', required: false },
                { name: 'Assigned To', slug: 'Assigned_to_3', type: 'text', required: false },
                { name: 'Assignment Group', slug: 'Assignment_group_3', type: 'text', required: false },
                { name: 'Business Duration', slug: 'Business_duration_1', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const problemTasksDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'PM Problem Tasks' } },
        create: {
            accountId: account.id, name: 'PM Problem Tasks',
            description: 'Problem tasks for tracking sub-items',
            schema: [
                { name: 'Number', slug: 'Number_4', type: 'text', required: false },
                { name: 'Configuration Item', slug: 'Configuration_Item_2', type: 'reference', required: false },
                { name: 'Priority', slug: 'Priority_2', type: 'select', required: false },
                { name: 'Due Date', slug: 'Due_date', type: 'date', required: false },
                { name: 'Problem', slug: 'Problem', type: 'reference', required: false },
                { name: 'Assignment Group', slug: 'Assignment_group_1', type: 'reference', required: false },
                { name: 'Assigned To', slug: 'Assigned_to_1', type: 'text', required: false },
                { name: 'Short Description', slug: 'Short_description_2', type: 'textarea', required: false },
                { name: 'Description', slug: 'Description_1', type: 'textarea', required: false },
                { name: 'Work Notes', slug: 'Work_notes_1', type: 'textarea', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const notesHistoryDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'PM Notes History' } },
        create: {
            accountId: account.id, name: 'PM Notes History',
            description: 'Problem state change and work notes history',
            schema: [
                { name: 'Last State', slug: 'Last_State', type: 'text', required: false },
                { name: 'Modified By', slug: 'Modified_By', type: 'text', required: false },
                { name: 'Modified At', slug: 'Modified_At_1', type: 'text', required: false },
                { name: 'Work Notes', slug: 'Work_Notes_3', type: 'textarea', required: false },
                { name: 'Number', slug: 'Number_5', type: 'text', required: false },
                { name: 'Root Cause', slug: 'Root_Cause_Explanation_1', type: 'textarea', required: false },
                { name: 'Preventive Measures', slug: 'Preventive_Measures_1', type: 'textarea', required: false },
                { name: 'Solution Details', slug: 'Solution_Details_1', type: 'textarea', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    const taskSlaDs = await prisma.dataset.upsert({
        where: { accountId_name: { accountId: account.id, name: 'PM Task SLA' } },
        create: {
            accountId: account.id, name: 'PM Task SLA',
            description: 'SLA tracking records for problem resolution',
            schema: [
                { name: 'Form ID', slug: 'FORM_ID', type: 'text', required: false },
                { name: 'SLA ID', slug: 'SLA_ID', type: 'text', required: false },
                { name: 'SLA Definition', slug: 'SLA_DEFINITION', type: 'text', required: false },
                { name: 'Table', slug: 'TABLE', type: 'text', required: false },
                { name: 'Type', slug: 'TYPE', type: 'text', required: false },
                { name: 'Target', slug: 'TARGET', type: 'text', required: false },
                { name: 'Stage', slug: 'STAG', type: 'text', required: false },
                { name: 'Has Breached', slug: 'HAS_BREACHED', type: 'text', required: false },
                { name: 'Start Time', slug: 'START_TIME', type: 'datetime', required: false },
                { name: 'Stop Time', slug: 'STOP_TIME', type: 'datetime', required: false },
                { name: 'Original Breach Time', slug: 'Untitled_Field', type: 'datetime', required: false },
                { name: 'Actual Breach Time', slug: 'ACTUAL_BREACH_TIME', type: 'datetime', required: false },
                { name: 'Business Time Left', slug: 'BUSINESS_TIME_LEFT', type: 'text', required: false },
            ],
            indexes: [], constraints: [], settings: {}, permissions: {},
            rowCount: 0, createdBy: adminUser.id,
        },
        update: {},
    });

    console.log(`✅ Created sub-datasets: PM Incidents, PM Problem Tasks, PM Notes History, PM Task SLA\n`);

    // 5. Sample Problem Records
    const problemRecords = [
        { Untitled_Field_2: 'PRB0040747', State: 'Closed', Impact: '1 - High', Urgency: '1 - High', Priority: '1 - Critical', Business_service: 'SVC-BS-001', Technical_service: 'SVC-TS-001', Service_Type: 'Infrastructure', Assignment_group: 'GRP-L1-INFRA', Assigned_to: 'Kyaw Zaw Tun', Short_description: 'Exchange Server intermittent mail delivery failures', Description: 'Production Exchange Server experiencing intermittent mail delivery failures affecting 200+ users. Messages queuing in transport database.', Root_Cause_Explanation: 'Transport database corruption caused by unexpected power event. Database logs exceeded allocated disk space.', Preventive_Measures: 'Implement UPS monitoring alerts. Set up disk space threshold alerts at 80% and 90%.', Solution_Details: 'Repaired transport database using eseutil. Cleared orphaned messages from queue. Increased disk allocation.', Close_notes: 'Root cause identified and resolved. Preventive measures implemented.', Known_Error: false, ClosedResolved: true, Closed_by: 'Kyaw Zaw Tun', Opened: '2026-01-15T08:00:00Z', Closed: '2026-01-17T14:30:00Z', Vendor_SLA_Success: true, Create_Knowledge: true },
        { Untitled_Field_2: 'PRB0040748', State: 'Closed', Impact: '2 - Medium', Urgency: '2 - Medium', Priority: '3 - Minor', Business_service: 'SVC-BS-002', Technical_service: 'SVC-TS-002', Service_Type: 'Application', Assignment_group: 'GRP-L1-APPS', Assigned_to: 'Su Mon Kyaw', Short_description: 'SAP HANA scheduled batch jobs failing nightly', Description: 'Nightly batch processing jobs for financial reporting failing since Jan 20. Error: memory allocation exceeded threshold.', Root_Cause_Explanation: 'HANA row store memory not properly reclaimed after large report generation.', Solution_Details: 'Adjusted memory allocation parameters. Scheduled regular memory cleanup via HANA admin console.', Close_notes: 'Batch jobs running successfully for 5 consecutive days.', Known_Error: false, ClosedResolved: true, Closed_by: 'Su Mon Kyaw', Opened: '2026-01-20T06:00:00Z', Closed: '2026-01-25T16:00:00Z', Vendor_SLA_Success: true },
        { Untitled_Field_2: 'PRB0040749', State: 'Open', Impact: '1 - High', Urgency: '2 - Medium', Priority: '2 - High', Business_service: 'SVC-BS-003', Technical_service: 'SVC-TS-003', Service_Type: 'Network', Assignment_group: 'GRP-L1-NET', Assigned_to: 'Phone Myat Soe', Short_description: 'Intermittent network latency spikes in Data Center A', Description: 'Network monitoring detected recurring latency spikes (>200ms) on core switch every 4 hours. Affecting all services hosted in DC-A.', Work_notes: 'Initial investigation: correlates with backup window. Checking if backup traffic saturating uplinks.', Known_Error: false, Choosing_Assignment_group_L2: false, Opened: '2026-02-10T09:00:00Z' },
        { Untitled_Field_2: 'PRB0040750', State: 'Open', Impact: '2 - Medium', Urgency: '1 - High', Priority: '2 - High', Business_service: 'SVC-BS-004', Technical_service: 'SVC-TS-004', Service_Type: 'Core Banking', Assignment_group: 'GRP-L1-CORE', Assigned_to: 'Aung Min Htet', Short_description: 'Payment gateway timeout errors during peak hours', Description: 'Payment gateway returning timeout errors (HTTP 504) between 11:00-14:00 daily. Approximately 5% of transactions affected.', Work_notes: 'Monitoring thread pool utilization. Current max connections: 200. May need increase.', Known_Error: false, Choosing_Assignment_group_L2: false, Opened: '2026-02-12T11:00:00Z' },
        { Untitled_Field_2: 'PRB0040751', State: 'Known Error', Impact: '1 - High', Urgency: '1 - High', Priority: '1 - Critical', Business_service: 'SVC-BS-001', Technical_service: 'SVC-TS-001', Service_Type: 'Infrastructure', Assignment_group: 'GRP-L1-INFRA', Assigned_to: 'Kyaw Zaw Tun', Short_description: 'Exchange Server calendar sync failures with mobile devices', Description: 'ActiveSync calendar synchronization failing for iOS 18+ devices. Known Microsoft issue.', Root_Cause_Explanation: 'Microsoft Exchange 2019 CU14 incompatible with iOS 18 ActiveSync implementation.', Work_notes: 'Microsoft confirmed bug. Hotfix expected in CU15 (March 2026). Workaround: use Outlook Mobile app.', Known_Error: true, Choosing_Assignment_group_L2: true, Assignment_group_L2: 'GRP-L3-MSFT', Opened: '2026-02-01T07:00:00Z' },
        { Untitled_Field_2: 'PRB0040752', State: 'Pending Change', Impact: '2 - Medium', Urgency: '2 - Medium', Priority: '3 - Minor', Business_service: 'SVC-BS-002', Technical_service: 'SVC-TS-002', Service_Type: 'Application', Assignment_group: 'GRP-L1-APPS', Assigned_to: 'Su Mon Kyaw', Short_description: 'SAP user session timeouts during long transactions', Description: 'Users experiencing session timeouts when processing transactions longer than 30 minutes. Affecting finance team during month-end closing.', Root_Cause_Explanation: 'SAP session timeout configured at 30 min. Needs increase for finance module.', Pending_Change: true, Work_notes: 'Change request CHG0001234 submitted to increase session timeout to 120 min for finance module.', Opened: '2026-02-05T10:00:00Z' },
        { Untitled_Field_2: 'PRB0040753', State: 'Open', Impact: '3 - Low', Urgency: '2 - Medium', Priority: '4 - Low', Business_service: 'SVC-BS-003', Technical_service: 'SVC-TS-003', Service_Type: 'Network', Assignment_group: 'GRP-L1-NET', Assigned_to: 'Phone Myat Soe', Choosing_Assignment_group_L2: true, Assignment_group_L2: 'GRP-L2-NET', Short_description: 'WiFi coverage gaps in Building B renovated areas', Description: 'After renovation in Building B floors 3-5, WiFi signal weak or absent in several zones. 15 users affected.', Work_notes: 'L2 vendor survey scheduled for Feb 25. Temporary APs deployed.', Opened: '2026-02-14T08:00:00Z' },
        { Untitled_Field_2: 'PRB0040754', State: 'Close/Resolve', Impact: '1 - High', Urgency: '2 - Medium', Priority: '2 - High', Business_service: 'SVC-BS-004', Technical_service: 'SVC-TS-004', Service_Type: 'Core Banking', Assignment_group: 'GRP-L1-CORE', Assigned_to: 'Aung Min Htet', Short_description: 'Core banking batch reconciliation discrepancies', Description: 'Daily reconciliation showing mismatches between transaction log and settlement files.', Root_Cause_Explanation: 'Timezone handling bug in settlement file parser. UTC vs local time offset causing duplicate entries.', Solution_Details: 'Patched settlement parser to use UTC consistently. Added validation step to check for duplicates.', Close_notes: 'Fix deployed. 7 days of successful reconciliation confirmed.', ClosedResolved: true, Opened: '2026-02-08T06:00:00Z' },
    ];

    const existingProblems = await prisma.datasetRecord.count({ where: { datasetId: problemDs.id } });
    if (existingProblems === 0) {
        for (const r of problemRecords) await prisma.datasetRecord.create({ data: { datasetId: problemDs.id, data: r, createdBy: adminUser.id } });
        await prisma.dataset.update({ where: { id: problemDs.id }, data: { rowCount: problemRecords.length } });
    }
    console.log(`✅ Problem Management dataset: ${problemRecords.length} records\n`);

    // 6. Problem Report Form
    const problemForm = await prisma.form.upsert({
        where: { id: '00000000-0000-0000-0000-000000000006' },
        create: {
            id: '00000000-0000-0000-0000-000000000006',
            accountId: account.id,
            name: 'Problem Report',
            description: 'Submit a new problem for investigation and root cause analysis',
            fields: [
                { id: 'f-bs', name: 'Business_service', label: 'Business Service', type: 'reference', required: true, order: 1, config: { datasetName: 'Services', displayField: 'name_1', filter: { service_classification: 'Business Service' } } },
                { id: 'f-ts', name: 'Technical_service', label: 'Technical Service', type: 'reference', required: true, order: 2, config: { datasetName: 'Services', displayField: 'name_1', filter: { service_classification: 'Technical Service' } } },
                { id: 'f-impact', name: 'Impact', label: 'Impact', type: 'select', required: true, order: 3, config: { options: [{ value: '1 - High', label: '1 - High' }, { value: '2 - Medium', label: '2 - Medium' }, { value: '3 - Low', label: '3 - Low' }] } },
                { id: 'f-urgency', name: 'Urgency', label: 'Urgency', type: 'select', required: true, order: 4, config: { options: [{ value: '1 - High', label: '1 - High' }, { value: '2 - Medium', label: '2 - Medium' }, { value: '3 - Low', label: '3 - Low' }] } },
                { id: 'f-svctype', name: 'Service_Type', label: 'Service Type', type: 'select', required: false, order: 5, config: { options: [{ value: 'Infrastructure', label: 'Infrastructure' }, { value: 'Application', label: 'Application' }, { value: 'Network', label: 'Network' }, { value: 'Core Banking', label: 'Core Banking' }] } },
                { id: 'f-ag', name: 'Assignment_group', label: 'Assignment Group', type: 'reference', required: true, order: 6, config: { datasetName: 'sys_user_group', displayField: 'name_1' } },
                { id: 'f-pic', name: 'PIC', label: 'PIC Contact', type: 'multiuser', required: true, order: 7, config: {} },
                { id: 'f-chgreq', name: 'Change_request', label: 'Change Request', type: 'reference', required: false, order: 8, config: { processName: 'Change_PEW', displayField: 'Name' } },
                { id: 'f-short', name: 'Short_description', label: 'Short Description', type: 'textarea', required: true, order: 9, config: { maxLength: 500 } },
                { id: 'f-desc', name: 'Description', label: 'Description', type: 'richtext', required: true, order: 10, config: {} },
                { id: 'f-createkb', name: 'Create_Knowledge', label: 'Create Knowledge Article?', type: 'checkbox', required: false, order: 11, config: {} },
                { id: 'f-ptcreate', name: 'Problem_Tasks_Create', label: 'Create Problem Tasks?', type: 'checkbox', required: false, order: 12, config: {} },
                { id: 'f-attach', name: 'Management_Attachment', label: 'Attachments', type: 'file', required: false, order: 13, config: { maxFiles: 10 } },
            ],
            layout: {
                columns: 2,
                sections: [
                    { title: 'Service Classification', fields: ['f-bs', 'f-ts', 'f-svctype'] },
                    { title: 'Impact & Urgency', fields: ['f-impact', 'f-urgency'] },
                    { title: 'Assignment', fields: ['f-ag', 'f-pic', 'f-chgreq'] },
                    { title: 'Problem Details', fields: ['f-short', 'f-desc', 'f-createkb', 'f-ptcreate', 'f-attach'] },
                ],
            },
            validationRules: [],
            conditionalLogic: [],
            settings: { submitButtonText: 'Submit Problem', allowDraft: true },
            permissions: {}, version: 1, status: 'ACTIVE', createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created form: ${problemForm.name}\n`);

    // 7. Problem Lifecycle Workflow
    const problemProcess = await prisma.process.upsert({
        where: { id: '00000000-0000-0000-0000-000000000090' },
        create: {
            id: '00000000-0000-0000-0000-000000000090',
            accountId: account.id,
            name: 'Problem Lifecycle Workflow',
            description: 'ITIL Problem Management lifecycle: Start → Open → Known Error → Pending Change → Close/Resolve → Completed. Includes L1/L2 parallel investigation and GotoTask loops.',
            category: 'ITSM',
            definition: {
                nodes: [
                    { id: 'start', type: 'start', name: 'Start', description: 'Problem submitted via form', position: { x: 50, y: 300 } },
                    { id: 'goto-known-error', type: 'decision', name: 'L2 Escalation Check', description: 'If L2 assignment selected, goto Known Error directly', position: { x: 200, y: 300 }, condition: 'Choosing_Assignment_group_L2 == true' },
                    { id: 'dummy-step-take', type: 'action', name: 'Dummy Step Take', description: 'Auto-step to set Take_Val before Open', position: { x: 350, y: 400 } },
                    { id: 'open', type: 'approval', name: 'Open', description: 'L1 team investigates the problem. Can escalate to L2, mark as Known Error, Pending Change, or Close.', position: { x: 500, y: 300 } },
                    { id: 'dummy-step-reopen', type: 'action', name: 'Dummy Step Reopen', description: 'Auto-step for reopen routing', position: { x: 650, y: 150 }, condition: 'Reopen == true' },
                    { id: 'open-l1', type: 'approval', name: 'Open L1', description: 'L1 support group parallel investigation (when L2 NOT chosen)', position: { x: 650, y: 400 } },
                    { id: 'goto-dummy-reopen-l1', type: 'decision', name: 'L1 → Reopen Check', description: 'If L2 escalation needed from L1, goto Dummy Step Reopen', position: { x: 800, y: 400 }, condition: 'Choosing_Assignment_group_L2 == true' },
                    { id: 'open-l2', type: 'approval', name: 'Open L2', description: 'L2/Vendor support parallel investigation (when L2 chosen)', position: { x: 650, y: 500 } },
                    { id: 'goto-open-l2', type: 'decision', name: 'L2 → RCA Check', description: 'If Root Cause Analysis done, goto Open for further action', position: { x: 800, y: 500 }, condition: 'Root_Cause_Analysis == true' },
                    { id: 'known-error', type: 'approval', name: 'Known Error', description: 'Problem identified as known error. Workaround documented. Awaiting permanent fix.', position: { x: 900, y: 300 } },
                    { id: 'goto-ke-loop', type: 'decision', name: 'KE → L2 Loop', description: 'If L2 reassignment needed, loop back to Known Error', position: { x: 1050, y: 200 }, condition: 'Choosing_Assignment_group_L2 == true' },
                    { id: 'pending-change', type: 'approval', name: 'Pending Change', description: 'Problem requires a change request to resolve. Awaiting change implementation.', position: { x: 1050, y: 400 } },
                    { id: 'close-resolve', type: 'approval', name: 'Close/Resolve', description: 'Problem resolved or closed. Root cause documented, solution verified.', position: { x: 1200, y: 300 } },
                    { id: 'completed', type: 'end', name: 'Completed', description: 'Problem lifecycle complete', position: { x: 1400, y: 300 } },
                ],
                edges: [
                    { id: 'e1', source: 'start', target: 'goto-known-error' },
                    { id: 'e2', source: 'goto-known-error', target: 'known-error', label: 'L2 = true', condition: 'Choosing_Assignment_group_L2 == true' },
                    { id: 'e3', source: 'goto-known-error', target: 'dummy-step-take', label: 'L2 = false' },
                    { id: 'e4', source: 'dummy-step-take', target: 'open' },
                    { id: 'e5', source: 'open', target: 'open-l1', label: 'Investigate L1' },
                    { id: 'e6', source: 'open', target: 'open-l2', label: 'Investigate L2', condition: 'Choosing_Assignment_group_L2 == true' },
                    { id: 'e7', source: 'open-l1', target: 'goto-dummy-reopen-l1' },
                    { id: 'e8', source: 'goto-dummy-reopen-l1', target: 'dummy-step-reopen', label: 'Escalate to L2', condition: 'Choosing_Assignment_group_L2 == true' },
                    { id: 'e9', source: 'open-l2', target: 'goto-open-l2' },
                    { id: 'e10', source: 'goto-open-l2', target: 'open', label: 'RCA complete', condition: 'Root_Cause_Analysis == true' },
                    { id: 'e11', source: 'dummy-step-reopen', target: 'open', label: 'Reopen', condition: 'Reopen == true' },
                    { id: 'e12', source: 'dummy-step-reopen', target: 'close-resolve', label: 'Close from reopen' },
                    { id: 'e13', source: 'known-error', target: 'goto-ke-loop' },
                    { id: 'e14', source: 'goto-ke-loop', target: 'known-error', label: 'Loop KE', condition: 'Choosing_Assignment_group_L2 == true' },
                    { id: 'e15', source: 'goto-ke-loop', target: 'pending-change', label: 'Pending Change', condition: 'Pending_Change == true' },
                    { id: 'e16', source: 'goto-ke-loop', target: 'close-resolve', label: 'Close/Resolve', condition: 'ClosedResolved == true' },
                    { id: 'e17', source: 'pending-change', target: 'close-resolve', label: 'Change done', condition: 'ClosedResolved == true' },
                    { id: 'e18', source: 'close-resolve', target: 'completed', label: 'Completed', condition: 'ClosedResolved == true' },
                ],
            },
            variables: [
                { name: 'State', type: 'string', label: 'State' },
                { name: 'Impact', type: 'string', label: 'Impact' },
                { name: 'Urgency', type: 'string', label: 'Urgency' },
                { name: 'Priority', type: 'string', label: 'Priority' },
                { name: 'Short_description', type: 'string', label: 'Short Description' },
                { name: 'Assignment_group', type: 'string', label: 'Assignment Group' },
                { name: 'Assigned_to', type: 'string', label: 'Assigned To' },
                { name: 'Choosing_Assignment_group_L2', type: 'boolean', label: 'Choosing L2' },
                { name: 'Known_Error', type: 'boolean', label: 'Known Error' },
                { name: 'Pending_Change', type: 'boolean', label: 'Pending Change' },
                { name: 'ClosedResolved', type: 'boolean', label: 'Closed/Resolved' },
                { name: 'Reopen', type: 'boolean', label: 'Reopen' },
                { name: 'Take', type: 'boolean', label: 'Take' },
                { name: 'Root_Cause_Analysis', type: 'boolean', label: 'Root Cause Analysis' },
                { name: 'Take_Val', type: 'string', label: 'Take Val' },
            ],
            triggers: [{ type: 'form_submission', formId: problemForm.id }, { type: 'manual', label: 'Create Problem' }],
            settings: { allowCancel: true, trackSLA: true, notification: { onStart: true, onComplete: true, onError: true } },
            permissions: {},
            slaConfig: { defaultDueHours: 336, escalationPolicy: 'notify_manager' },
            version: 1, status: 'ACTIVE', publishedAt: new Date(), createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created process: ${problemProcess.name}\n`);

    // 8. Process Instances
    const instances = [];
    instances.push(await prisma.processInstance.create({ data: { processId: problemProcess.id, processVersion: 1, status: 'COMPLETED', currentNodes: ['completed'], variables: { problemId: 'PRB0040747', State: 'Closed', Impact: '1 - High', Urgency: '1 - High', Priority: '1 - Critical', Short_description: 'Exchange Server intermittent mail delivery failures', Assignment_group: 'GRP-L1-INFRA', Assigned_to: 'Kyaw Zaw Tun', ClosedResolved: true }, startedBy: users[0].id, completedAt: new Date('2026-01-17T14:30:00Z') } }));
    instances.push(await prisma.processInstance.create({ data: { processId: problemProcess.id, processVersion: 1, status: 'COMPLETED', currentNodes: ['completed'], variables: { problemId: 'PRB0040748', State: 'Closed', Impact: '2 - Medium', Urgency: '2 - Medium', Priority: '3 - Minor', Short_description: 'SAP HANA scheduled batch jobs failing nightly', Assignment_group: 'GRP-L1-APPS', Assigned_to: 'Su Mon Kyaw', ClosedResolved: true }, startedBy: users[3].id, completedAt: new Date('2026-01-25T16:00:00Z') } }));
    instances.push(await prisma.processInstance.create({ data: { processId: problemProcess.id, processVersion: 1, status: 'RUNNING', currentNodes: ['open-l1'], variables: { problemId: 'PRB0040749', State: 'Open', Impact: '1 - High', Urgency: '2 - Medium', Priority: '2 - High', Short_description: 'Intermittent network latency spikes in Data Center A', Assignment_group: 'GRP-L1-NET', Assigned_to: 'Phone Myat Soe', Choosing_Assignment_group_L2: false }, startedBy: users[1].id, dueAt: new Date('2026-02-24T09:00:00Z') } }));
    instances.push(await prisma.processInstance.create({ data: { processId: problemProcess.id, processVersion: 1, status: 'RUNNING', currentNodes: ['open-l1'], variables: { problemId: 'PRB0040750', State: 'Open', Impact: '2 - Medium', Urgency: '1 - High', Priority: '2 - High', Short_description: 'Payment gateway timeout errors during peak hours', Assignment_group: 'GRP-L1-CORE', Assigned_to: 'Aung Min Htet', Choosing_Assignment_group_L2: false }, startedBy: users[3].id, dueAt: new Date('2026-02-26T11:00:00Z') } }));
    instances.push(await prisma.processInstance.create({ data: { processId: problemProcess.id, processVersion: 1, status: 'RUNNING', currentNodes: ['known-error'], variables: { problemId: 'PRB0040751', State: 'Known Error', Impact: '1 - High', Urgency: '1 - High', Priority: '1 - Critical', Short_description: 'Exchange Server calendar sync failures with mobile devices', Assignment_group: 'GRP-L1-INFRA', Assigned_to: 'Kyaw Zaw Tun', Known_Error: true, Choosing_Assignment_group_L2: true }, startedBy: users[0].id, dueAt: new Date('2026-03-15T07:00:00Z') } }));
    instances.push(await prisma.processInstance.create({ data: { processId: problemProcess.id, processVersion: 1, status: 'RUNNING', currentNodes: ['pending-change'], variables: { problemId: 'PRB0040752', State: 'Pending Change', Impact: '2 - Medium', Urgency: '2 - Medium', Priority: '3 - Minor', Short_description: 'SAP user session timeouts during long transactions', Assignment_group: 'GRP-L1-APPS', Assigned_to: 'Su Mon Kyaw', Pending_Change: true }, startedBy: users[3].id, dueAt: new Date('2026-03-05T10:00:00Z') } }));
    console.log(`✅ Created ${instances.length} process instances\n`);

    // 9. Task Instances
    await prisma.taskInstance.create({ data: { instanceId: instances[2].id, nodeId: 'open-l1', name: 'Investigate: Network latency spikes DC-A', description: 'L1 investigation of intermittent network latency in Data Center A', taskType: 'TASK', assigneeId: users[1].id, assigneeType: 'USER', formData: { problemId: 'PRB0040749', Priority: '2 - High', Assignment_group: 'GRP-L1-NET' }, status: 'PENDING', priority: 1, dueAt: new Date('2026-02-24T09:00:00Z') } });
    await prisma.taskInstance.create({ data: { instanceId: instances[3].id, nodeId: 'open-l1', name: 'Investigate: Payment gateway timeouts', description: 'L1 investigation of payment gateway HTTP 504 errors during peak hours', taskType: 'TASK', assigneeId: users[3].id, assigneeType: 'USER', formData: { problemId: 'PRB0040750', Priority: '2 - High', Assignment_group: 'GRP-L1-CORE' }, status: 'PENDING', priority: 1, dueAt: new Date('2026-02-26T11:00:00Z') } });
    await prisma.taskInstance.create({ data: { instanceId: instances[4].id, nodeId: 'known-error', name: 'Known Error: Exchange calendar sync — awaiting CU15', description: 'Monitor Microsoft CU15 release for ActiveSync fix. Workaround: use Outlook Mobile.', taskType: 'TASK', assigneeId: users[0].id, assigneeType: 'USER', formData: { problemId: 'PRB0040751', Priority: '1 - Critical', Assignment_group: 'GRP-L1-INFRA', Known_Error: true }, status: 'PENDING', priority: 0, dueAt: new Date('2026-03-15T07:00:00Z') } });
    await prisma.taskInstance.create({ data: { instanceId: instances[5].id, nodeId: 'pending-change', name: 'Pending Change: SAP session timeout increase', description: 'Awaiting CHG0001234 implementation to increase SAP session timeout to 120 min', taskType: 'TASK', assigneeId: users[3].id, assigneeType: 'USER', formData: { problemId: 'PRB0040752', Priority: '3 - Minor', Assignment_group: 'GRP-L1-APPS', Pending_Change: true }, status: 'PENDING', priority: 2, dueAt: new Date('2026-03-05T10:00:00Z') } });
    await prisma.taskInstance.create({ data: { instanceId: instances[0].id, nodeId: 'close-resolve', name: 'Resolved: Exchange mail delivery failures', description: 'Transport database repaired. Preventive measures implemented.', taskType: 'TASK', assigneeId: users[0].id, assigneeType: 'USER', formData: { problemId: 'PRB0040747', Priority: '1 - Critical', ClosedResolved: true }, status: 'COMPLETED', priority: 0, outcome: 'resolved', completedAt: new Date('2026-01-17T14:30:00Z'), completedBy: users[0].id, comments: 'Root cause: transport DB corruption from power event. Fixed and preventive measures in place.' } });
    console.log(`✅ Created 5 task instances\n`);

    // 10. Form Submissions
    const formSubmissions = [
        { Business_service: 'Email & Collaboration', Technical_service: 'Exchange Server', Impact: '1 - High', Urgency: '1 - High', Service_Type: 'Infrastructure', Assignment_group: 'GRP-L1-INFRA', PIC: ['Kyaw Zaw Tun'], Short_description: 'Exchange Server intermittent mail delivery failures', Description: 'Production Exchange Server experiencing intermittent mail delivery failures affecting 200+ users.', Create_Knowledge: true },
        { Business_service: 'Network Services', Technical_service: 'Core Switch', Impact: '1 - High', Urgency: '2 - Medium', Service_Type: 'Network', Assignment_group: 'GRP-L1-NET', PIC: ['Phone Myat Soe'], Short_description: 'Intermittent network latency spikes in Data Center A', Description: 'Network monitoring detected recurring latency spikes (>200ms) on core switch every 4 hours.' },
        { Business_service: 'Core Banking', Technical_service: 'Payment Gateway', Impact: '2 - Medium', Urgency: '1 - High', Service_Type: 'Core Banking', Assignment_group: 'GRP-L1-CORE', PIC: ['Aung Min Htet'], Short_description: 'Payment gateway timeout errors during peak hours', Description: 'Payment gateway returning timeout errors (HTTP 504) between 11:00-14:00 daily.' },
    ];

    const existingSubmissions = await prisma.formSubmission.count({ where: { formId: problemForm.id } });
    if (existingSubmissions === 0) {
        for (const s of formSubmissions) {
            await prisma.formSubmission.create({ data: { formId: problemForm.id, data: s, createdBy: adminUser.id } });
        }
    }
    console.log(`✅ Created ${formSubmissions.length} form submissions\n`);

    // 11. App Configuration
    await prisma.app.upsert({
        where: { accountId_slug: { accountId: account.id, slug: 'problem-management' } },
        create: {
            accountId: account.id, slug: 'problem-management', name: 'Problem Management',
            description: 'ITIL Problem Management — track, investigate, and resolve root causes',
            icon: '🔍',
            definition: {
                navigation: [
                    { label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
                    { label: 'Problems', icon: 'AlertTriangle', path: '/problems' },
                    { label: 'Known Errors', icon: 'Bug', path: '/known-errors' },
                    { label: 'Reports', icon: 'BarChart3', path: '/reports' },
                ],
                dashboard: {
                    kpis: [
                        { label: 'Open Problems', value: '4', change: '+1', trend: 'up', color: 'orange' },
                        { label: 'Known Errors', value: '1', change: '0', trend: 'neutral', color: 'red' },
                        { label: 'Pending Change', value: '1', change: '0', trend: 'neutral', color: 'yellow' },
                        { label: 'Resolved (MTD)', value: '3', change: '+1', trend: 'up', color: 'green' },
                        { label: 'Avg Resolution', value: '4.2 days', change: '-0.5', trend: 'down', color: 'blue' },
                    ],
                    charts: [
                        { type: 'pie', title: 'By Priority', data: [{ label: '1 - Critical', value: 2, color: '#E74C3C' }, { label: '2 - High', value: 3, color: '#F39C12' }, { label: '3 - Minor', value: 2, color: '#3498DB' }, { label: '4 - Low', value: 1, color: '#2ECC71' }] },
                        { type: 'bar', title: 'By State', data: [{ label: 'Open', value: 3 }, { label: 'Known Error', value: 1 }, { label: 'Pending Change', value: 1 }, { label: 'Close/Resolve', value: 1 }, { label: 'Closed', value: 2 }] },
                    ],
                    tables: [
                        { title: 'Active Problems', datasetSlug: 'Problem Management', columns: ['Untitled_Field_2', 'Short_description', 'Priority', 'State', 'Assigned_to'], filter: { State: { $ne: 'Closed' } }, sort: { Priority: 'asc' } },
                    ],
                },
            },
            status: 'PUBLISHED',
            publishedAt: new Date(),
            createdBy: adminUser.id,
        },
        update: {},
    });
    console.log(`✅ Created Problem Management app\n`);

    // Summary
    console.log('─'.repeat(60));
    console.log('🎉 Problem Management seeding complete!');
    console.log('');
    console.log('Created:');
    console.log('  📦 7 Reference Datasets (Services, sys_user_group, sys_user, CI, KB, SLA, KB_Category)');
    console.log('  📦 Problem Management Dataset (8 records, ~40 fields)');
    console.log('  📦 4 Sub-datasets (Incidents, Problem Tasks, Notes History, Task SLA)');
    console.log('  📋 Problem Report Form (13 fields, 4 sections)');
    console.log('  🔄 Problem Lifecycle Workflow (14 nodes, 18 edges — GotoTask loops + parallel L1/L2)');
    console.log('  📝 3 Form Submissions');
    console.log('  ⚙️  6 Process Instances (2 completed, 4 running)');
    console.log('  ✅ 5 Task Instances (1 completed, 4 pending)');
    console.log('  📱 Problem Management App (4 pages)');
    console.log('');
}

seedProblemManagement()
    .catch((e) => { console.error('❌ Problem Management seeding failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
