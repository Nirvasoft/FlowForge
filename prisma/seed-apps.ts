/**
 * Apps Seed Script
 * Creates sample applications with pages and components to populate the Apps UI.
 *
 * Apps created:
 *   1. Expense Manager (internal, published) — Dashboard, Submit Claim, My Claims
 *   2. Employee Portal (portal, published) — Home, Leave Requests, Directory
 *   3. IT Help Desk (internal, draft) — Tickets, Knowledge Base
 *   4. Customer Portal (portal, draft) — Login, Support Tickets
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedApps() {
    console.log('📱 Seeding Sample Apps...\n');

    // Get demo account
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

    // ==========================================================================
    // 1. Expense Manager App (Internal, Published)
    // ==========================================================================
    const expenseApp = await prisma.app.upsert({
        where: { accountId_slug: { accountId: account.id, slug: 'expense-manager' } },
        create: {
            accountId: account.id,
            name: 'Expense Manager',
            slug: 'expense-manager',
            description: 'Track and approve expense claims with automated routing, receipt validation, and real-time status tracking.',
            icon: 'receipt',
            definition: {
                type: 'internal',
                navigation: {
                    type: 'sidebar',
                    position: 'left',
                    collapsed: false,
                    items: [
                        { label: 'Dashboard', icon: 'LayoutDashboard', page: 'dashboard' },
                        { label: 'Submit Claim', icon: 'PlusCircle', page: 'submit-claim' },
                        { label: 'My Claims', icon: 'FileText', page: 'my-claims' },
                    ],
                },
                theme: {
                    primaryColor: '#7c3aed',
                    accentColor: '#a78bfa',
                    mode: 'dark',
                    borderRadius: 8,
                    fontFamily: 'Inter',
                },
            },
            settings: {
                allowPublicAccess: false,
                requireAuth: true,
                defaultPage: 'dashboard',
            },
            permissions: {},
            version: 1,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            createdBy: adminUser.id,
        },
        update: {
            definition: {
                type: 'internal',
                navigation: {
                    type: 'sidebar',
                    position: 'left',
                    collapsed: false,
                    items: [
                        { label: 'Dashboard', icon: 'LayoutDashboard', page: 'dashboard' },
                        { label: 'Submit Claim', icon: 'PlusCircle', page: 'submit-claim' },
                        { label: 'My Claims', icon: 'FileText', page: 'my-claims' },
                    ],
                },
                theme: {
                    primaryColor: '#7c3aed',
                    accentColor: '#a78bfa',
                    mode: 'dark',
                    borderRadius: 8,
                    fontFamily: 'Inter',
                },
            },
        },
    });

    // Expense Manager pages
    const expensePages = [
        {
            name: 'Dashboard',
            route: '/dashboard',
            layout: {
                rows: [
                    {
                        columns: [
                            {
                                width: 4,
                                components: [{
                                    type: 'stat-card',
                                    props: { title: 'Pending Claims', value: '5', icon: 'Clock', color: '#f59e0b' },
                                }],
                            },
                            {
                                width: 4,
                                components: [{
                                    type: 'stat-card',
                                    props: { title: 'Approved This Month', value: '$4,320', icon: 'CheckCircle', color: '#10b981' },
                                }],
                            },
                            {
                                width: 4,
                                components: [{
                                    type: 'stat-card',
                                    props: { title: 'Total Claims', value: '28', icon: 'FileText', color: '#6366f1' },
                                }],
                            },
                        ],
                    },
                    {
                        columns: [
                            {
                                width: 8,
                                components: [{
                                    type: 'data-table',
                                    props: {
                                        title: 'Recent Claims',
                                        dataSource: { type: 'instances', config: { processId: 'expense-claim' } },
                                        columns: ['Claim Title', 'Amount', 'Status', 'Submitted'],
                                    },
                                }],
                            },
                            {
                                width: 4,
                                components: [{
                                    type: 'chart',
                                    props: {
                                        title: 'Claims by Category',
                                        type: 'doughnut',
                                        data: [
                                            { label: 'Travel', value: 45 },
                                            { label: 'Meals', value: 25 },
                                            { label: 'Software', value: 15 },
                                            { label: 'Other', value: 15 },
                                        ],
                                    },
                                }],
                            },
                        ],
                    },
                ],
            },
            dataSources: [
                { id: 'ds-1', type: 'instances', config: { processId: 'expense-claim', status: 'RUNNING' } },
            ],
            title: 'Expense Manager — Dashboard',
            description: 'Overview of expense claims, pending approvals, and spending trends',
        },
        {
            name: 'Submit Claim',
            route: '/submit-claim',
            layout: {
                rows: [
                    {
                        columns: [
                            {
                                width: 8,
                                components: [{
                                    type: 'form-renderer',
                                    props: {
                                        title: 'New Expense Claim',
                                        formId: '00000000-0000-0000-0000-000000000002',
                                        submitAction: { type: 'startWorkflow', config: { workflowId: 'expense-claim' } },
                                    },
                                }],
                            },
                            {
                                width: 4,
                                components: [{
                                    type: 'info-panel',
                                    props: {
                                        title: 'Submission Guidelines',
                                        items: [
                                            'Attach receipts for all items over $25',
                                            'Claims under $100 are auto-approved',
                                            'Business justification required for $500+',
                                            'Processing takes 3-5 business days',
                                        ],
                                    },
                                }],
                            },
                        ],
                    },
                ],
            },
            dataSources: [],
            title: 'Submit Expense Claim',
            description: 'Submit a new expense claim for approval',
        },
        {
            name: 'My Claims',
            route: '/my-claims',
            layout: {
                rows: [
                    {
                        columns: [
                            {
                                width: 12,
                                components: [{
                                    type: 'data-table',
                                    props: {
                                        title: 'My Expense Claims',
                                        dataSource: { type: 'instances', config: { processId: 'expense-claim', startedBy: 'current_user' } },
                                        columns: ['Claim Title', 'Amount', 'Category', 'Status', 'Submitted', 'Approver'],
                                        actions: ['View', 'Cancel'],
                                        pagination: true,
                                        pageSize: 10,
                                    },
                                }],
                            },
                        ],
                    },
                ],
            },
            dataSources: [],
            title: 'My Expense Claims',
            description: 'View and track your submitted expense claims',
        },
    ];

    for (const page of expensePages) {
        await prisma.appPage.upsert({
            where: { appId_route: { appId: expenseApp.id, route: page.route } },
            create: {
                appId: expenseApp.id,
                name: page.name,
                route: page.route,
                layout: page.layout as any,
                dataSources: page.dataSources as any,
                title: page.title,
                description: page.description,
            },
            update: {},
        });
    }

    console.log(`✅ Created app: ${expenseApp.name} (${expenseApp.status}) — ${expensePages.length} pages\n`);

    // ==========================================================================
    // 2. Employee Portal (Portal, Published)
    // ==========================================================================
    const employeePortal = await prisma.app.upsert({
        where: { accountId_slug: { accountId: account.id, slug: 'employee-portal' } },
        create: {
            accountId: account.id,
            name: 'Employee Portal',
            slug: 'employee-portal',
            description: 'Self-service portal for employees to manage leave, view company directory, and access HR resources.',
            icon: 'users',
            definition: {
                type: 'portal',
                navigation: {
                    type: 'sidebar',
                    position: 'left',
                    collapsed: false,
                    items: [
                        { label: 'Home', icon: 'Home', page: 'home' },
                        { label: 'Leave Requests', icon: 'Calendar', page: 'leave-requests' },
                        { label: 'Directory', icon: 'Users', page: 'directory' },
                    ],
                },
                theme: {
                    primaryColor: '#0ea5e9',
                    accentColor: '#38bdf8',
                    mode: 'dark',
                    borderRadius: 12,
                    fontFamily: 'Inter',
                },
            },
            settings: {
                allowPublicAccess: false,
                requireAuth: true,
                defaultPage: 'home',
            },
            permissions: {},
            version: 1,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            createdBy: adminUser.id,
        },
        update: {
            definition: {
                type: 'portal',
                navigation: {
                    type: 'sidebar',
                    position: 'left',
                    collapsed: false,
                    items: [
                        { label: 'Home', icon: 'Home', page: 'home' },
                        { label: 'Leave Requests', icon: 'Calendar', page: 'leave-requests' },
                        { label: 'Directory', icon: 'Users', page: 'directory' },
                    ],
                },
                theme: {
                    primaryColor: '#0ea5e9',
                    accentColor: '#38bdf8',
                    mode: 'dark',
                    borderRadius: 12,
                    fontFamily: 'Inter',
                },
            },
        },
    });

    const portalPages = [
        {
            name: 'Home',
            route: '/home',
            layout: {
                rows: [
                    {
                        columns: [
                            {
                                width: 12,
                                components: [{
                                    type: 'hero-banner',
                                    props: {
                                        title: 'Welcome Back!',
                                        subtitle: 'Access your HR tools, submit leave requests, and stay connected with your team.',
                                        backgroundGradient: 'from-sky-500 to-indigo-600',
                                    },
                                }],
                            },
                        ],
                    },
                    {
                        columns: [
                            {
                                width: 4,
                                components: [{
                                    type: 'quick-action-card',
                                    props: { title: 'Request Leave', icon: 'Calendar', link: '/leave-requests', color: '#0ea5e9' },
                                }],
                            },
                            {
                                width: 4,
                                components: [{
                                    type: 'quick-action-card',
                                    props: { title: 'Submit Expense', icon: 'Receipt', link: '/expenses', color: '#8b5cf6' },
                                }],
                            },
                            {
                                width: 4,
                                components: [{
                                    type: 'quick-action-card',
                                    props: { title: 'Team Directory', icon: 'Users', link: '/directory', color: '#10b981' },
                                }],
                            },
                        ],
                    },
                    {
                        columns: [
                            {
                                width: 6,
                                components: [{
                                    type: 'task-inbox',
                                    props: { title: 'My Pending Tasks', limit: 5 },
                                }],
                            },
                            {
                                width: 6,
                                components: [{
                                    type: 'announcement-feed',
                                    props: {
                                        title: 'Company Announcements',
                                        items: [
                                            { title: 'Q1 Town Hall — Feb 20', date: '2026-02-10', priority: 'high' },
                                            { title: 'New Health Benefits Available', date: '2026-02-08', priority: 'normal' },
                                            { title: 'Office Closure — Presidents Day', date: '2026-02-05', priority: 'normal' },
                                        ],
                                    },
                                }],
                            },
                        ],
                    },
                ],
            },
            dataSources: [],
            title: 'Employee Portal — Home',
            description: 'Employee self-service home page with quick actions and announcements',
        },
        {
            name: 'Leave Requests',
            route: '/leave-requests',
            layout: {
                rows: [
                    {
                        columns: [
                            {
                                width: 3,
                                components: [{
                                    type: 'stat-card',
                                    props: { title: 'Annual Leave', value: '12 days', subtitle: '18 remaining', color: '#0ea5e9' },
                                }],
                            },
                            {
                                width: 3,
                                components: [{
                                    type: 'stat-card',
                                    props: { title: 'Sick Leave', value: '2 days', subtitle: '8 remaining', color: '#f59e0b' },
                                }],
                            },
                            {
                                width: 3,
                                components: [{
                                    type: 'stat-card',
                                    props: { title: 'Personal', value: '1 day', subtitle: '2 remaining', color: '#8b5cf6' },
                                }],
                            },
                            {
                                width: 3,
                                components: [{
                                    type: 'stat-card',
                                    props: { title: 'Pending', value: '1', subtitle: 'request', color: '#ef4444' },
                                }],
                            },
                        ],
                    },
                    {
                        columns: [
                            {
                                width: 12,
                                components: [{
                                    type: 'data-table',
                                    props: {
                                        title: 'My Leave History',
                                        columns: ['Type', 'Start Date', 'End Date', 'Days', 'Status', 'Approver'],
                                        pagination: true,
                                    },
                                }],
                            },
                        ],
                    },
                ],
            },
            dataSources: [],
            title: 'Leave Requests',
            description: 'Submit and track leave requests',
        },
        {
            name: 'Directory',
            route: '/directory',
            layout: {
                rows: [
                    {
                        columns: [
                            {
                                width: 12,
                                components: [{
                                    type: 'user-directory',
                                    props: {
                                        title: 'Company Directory',
                                        searchable: true,
                                        groupBy: 'department',
                                        showAvatar: true,
                                        fields: ['Name', 'Email', 'Department', 'Role', 'Phone'],
                                    },
                                }],
                            },
                        ],
                    },
                ],
            },
            dataSources: [],
            title: 'Company Directory',
            description: 'Browse team members and organizational chart',
        },
    ];

    for (const page of portalPages) {
        await prisma.appPage.upsert({
            where: { appId_route: { appId: employeePortal.id, route: page.route } },
            create: {
                appId: employeePortal.id,
                name: page.name,
                route: page.route,
                layout: page.layout as any,
                dataSources: page.dataSources as any,
                title: page.title,
                description: page.description,
            },
            update: {},
        });
    }

    console.log(`✅ Created app: ${employeePortal.name} (${employeePortal.status}) — ${portalPages.length} pages\n`);

    // ==========================================================================
    // 3. IT Help Desk (Internal, Draft)
    // ==========================================================================
    const helpDesk = await prisma.app.upsert({
        where: { accountId_slug: { accountId: account.id, slug: 'it-help-desk' } },
        create: {
            accountId: account.id,
            name: 'IT Help Desk',
            slug: 'it-help-desk',
            description: 'Manage IT support tickets with SLA tracking, knowledge base, and automated routing to specialists.',
            icon: 'headphones',
            definition: {
                type: 'internal',
                navigation: {
                    type: 'sidebar',
                    position: 'left',
                    collapsed: false,
                    items: [
                        { label: 'Tickets', icon: 'Ticket', page: 'tickets' },
                        { label: 'Knowledge Base', icon: 'BookOpen', page: 'knowledge-base' },
                    ],
                },
                theme: {
                    primaryColor: '#f97316',
                    accentColor: '#fb923c',
                    mode: 'dark',
                    borderRadius: 8,
                    fontFamily: 'Inter',
                },
            },
            settings: {
                allowPublicAccess: false,
                requireAuth: true,
                defaultPage: 'tickets',
            },
            permissions: {},
            version: 1,
            status: 'DRAFT',
            createdBy: adminUser.id,
        },
        update: {
            definition: {
                type: 'internal',
                navigation: {
                    type: 'sidebar',
                    position: 'left',
                    collapsed: false,
                    items: [
                        { label: 'Tickets', icon: 'Ticket', page: 'tickets' },
                        { label: 'Knowledge Base', icon: 'BookOpen', page: 'knowledge-base' },
                    ],
                },
                theme: {
                    primaryColor: '#f97316',
                    accentColor: '#fb923c',
                    mode: 'dark',
                    borderRadius: 8,
                    fontFamily: 'Inter',
                },
            },
        },
    });

    const helpDeskPages = [
        {
            name: 'Tickets',
            route: '/tickets',
            layout: {
                rows: [
                    {
                        columns: [
                            {
                                width: 3,
                                components: [{
                                    type: 'stat-card',
                                    props: { title: 'Open', value: '12', color: '#ef4444' },
                                }],
                            },
                            {
                                width: 3,
                                components: [{
                                    type: 'stat-card',
                                    props: { title: 'In Progress', value: '8', color: '#f59e0b' },
                                }],
                            },
                            {
                                width: 3,
                                components: [{
                                    type: 'stat-card',
                                    props: { title: 'Resolved Today', value: '5', color: '#10b981' },
                                }],
                            },
                            {
                                width: 3,
                                components: [{
                                    type: 'stat-card',
                                    props: { title: 'Avg Resolution', value: '4.2h', color: '#6366f1' },
                                }],
                            },
                        ],
                    },
                    {
                        columns: [
                            {
                                width: 12,
                                components: [{
                                    type: 'data-table',
                                    props: {
                                        title: 'Support Tickets',
                                        columns: ['Ticket #', 'Subject', 'Priority', 'Assignee', 'Status', 'Created', 'SLA'],
                                        actions: ['View', 'Assign', 'Close'],
                                        filterable: true,
                                        sortable: true,
                                    },
                                }],
                            },
                        ],
                    },
                ],
            },
            dataSources: [],
            title: 'IT Support Tickets',
            description: 'View and manage IT support tickets',
        },
        {
            name: 'Knowledge Base',
            route: '/knowledge-base',
            layout: {
                rows: [
                    {
                        columns: [
                            {
                                width: 12,
                                components: [{
                                    type: 'search-bar',
                                    props: { placeholder: 'Search knowledge base articles...', fullWidth: true },
                                }],
                            },
                        ],
                    },
                    {
                        columns: [
                            {
                                width: 4,
                                components: [{
                                    type: 'category-card',
                                    props: { title: 'Getting Started', icon: 'Rocket', count: 12, color: '#0ea5e9' },
                                }],
                            },
                            {
                                width: 4,
                                components: [{
                                    type: 'category-card',
                                    props: { title: 'Network & VPN', icon: 'Wifi', count: 8, color: '#8b5cf6' },
                                }],
                            },
                            {
                                width: 4,
                                components: [{
                                    type: 'category-card',
                                    props: { title: 'Software Setup', icon: 'Download', count: 15, color: '#10b981' },
                                }],
                            },
                        ],
                    },
                ],
            },
            dataSources: [],
            title: 'IT Knowledge Base',
            description: 'Self-service IT help articles and guides',
        },
    ];

    for (const page of helpDeskPages) {
        await prisma.appPage.upsert({
            where: { appId_route: { appId: helpDesk.id, route: page.route } },
            create: {
                appId: helpDesk.id,
                name: page.name,
                route: page.route,
                layout: page.layout as any,
                dataSources: page.dataSources as any,
                title: page.title,
                description: page.description,
            },
            update: {},
        });
    }

    console.log(`✅ Created app: ${helpDesk.name} (${helpDesk.status}) — ${helpDeskPages.length} pages\n`);

    // ==========================================================================
    // 4. Customer Portal (Portal, Draft)
    // ==========================================================================
    const customerPortal = await prisma.app.upsert({
        where: { accountId_slug: { accountId: account.id, slug: 'customer-portal' } },
        create: {
            accountId: account.id,
            name: 'Customer Portal',
            slug: 'customer-portal',
            description: 'External-facing portal for customers to submit support tickets, track orders, and access documentation.',
            icon: 'globe',
            definition: {
                type: 'portal',
                navigation: {
                    type: 'topbar',
                    position: 'top',
                    collapsed: false,
                    items: [
                        { label: 'Home', icon: 'Home', page: 'home' },
                        { label: 'Support', icon: 'MessageSquare', page: 'support' },
                    ],
                },
                theme: {
                    primaryColor: '#10b981',
                    accentColor: '#34d399',
                    mode: 'light',
                    borderRadius: 12,
                    fontFamily: 'Inter',
                },
            },
            settings: {
                allowPublicAccess: true,
                requireAuth: false,
                defaultPage: 'home',
                customDomain: 'support.example.com',
            },
            permissions: {},
            version: 1,
            status: 'DRAFT',
            createdBy: adminUser.id,
        },
        update: {
            definition: {
                type: 'portal',
                navigation: {
                    type: 'topbar',
                    position: 'top',
                    collapsed: false,
                    items: [
                        { label: 'Home', icon: 'Home', page: 'home' },
                        { label: 'Support', icon: 'MessageSquare', page: 'support' },
                    ],
                },
                theme: {
                    primaryColor: '#10b981',
                    accentColor: '#34d399',
                    mode: 'light',
                    borderRadius: 12,
                    fontFamily: 'Inter',
                },
            },
        },
    });

    const customerPages = [
        {
            name: 'Home',
            route: '/home',
            layout: {
                rows: [
                    {
                        columns: [
                            {
                                width: 12,
                                components: [{
                                    type: 'hero-banner',
                                    props: {
                                        title: 'How can we help?',
                                        subtitle: 'Search our knowledge base or submit a support ticket',
                                        backgroundGradient: 'from-emerald-500 to-teal-600',
                                        showSearch: true,
                                    },
                                }],
                            },
                        ],
                    },
                    {
                        columns: [
                            {
                                width: 4,
                                components: [{
                                    type: 'quick-action-card',
                                    props: { title: 'Submit Ticket', icon: 'PlusCircle', link: '/support', color: '#10b981' },
                                }],
                            },
                            {
                                width: 4,
                                components: [{
                                    type: 'quick-action-card',
                                    props: { title: 'Track Order', icon: 'Package', link: '/orders', color: '#0ea5e9' },
                                }],
                            },
                            {
                                width: 4,
                                components: [{
                                    type: 'quick-action-card',
                                    props: { title: 'Documentation', icon: 'BookOpen', link: '/docs', color: '#8b5cf6' },
                                }],
                            },
                        ],
                    },
                ],
            },
            dataSources: [],
            title: 'Welcome — Customer Support Portal',
            description: 'Get help, track orders, and access documentation',
        },
        {
            name: 'Support',
            route: '/support',
            layout: {
                rows: [
                    {
                        columns: [
                            {
                                width: 8,
                                components: [{
                                    type: 'form-renderer',
                                    props: {
                                        title: 'Submit a Support Ticket',
                                        fields: [
                                            { name: 'subject', type: 'text', label: 'Subject', required: true },
                                            { name: 'category', type: 'select', label: 'Category', options: ['Bug Report', 'Feature Request', 'Account Issue', 'Billing', 'Other'] },
                                            { name: 'priority', type: 'select', label: 'Priority', options: ['Low', 'Medium', 'High', 'Critical'] },
                                            { name: 'description', type: 'textarea', label: 'Description', required: true },
                                            { name: 'attachment', type: 'file', label: 'Attachment' },
                                        ],
                                    },
                                }],
                            },
                            {
                                width: 4,
                                components: [{
                                    type: 'info-panel',
                                    props: {
                                        title: 'Need Quick Help?',
                                        items: [
                                            'Check our FAQ section first',
                                            'Average response time: 2 hours',
                                            'Critical issues: Call +1-800-SUPPORT',
                                        ],
                                    },
                                }],
                            },
                        ],
                    },
                    {
                        columns: [
                            {
                                width: 12,
                                components: [{
                                    type: 'data-table',
                                    props: {
                                        title: 'My Tickets',
                                        columns: ['Ticket #', 'Subject', 'Status', 'Priority', 'Created', 'Last Update'],
                                        pagination: true,
                                    },
                                }],
                            },
                        ],
                    },
                ],
            },
            dataSources: [],
            title: 'Support — Submit a Ticket',
            description: 'Submit and track your support requests',
        },
    ];

    for (const page of customerPages) {
        await prisma.appPage.upsert({
            where: { appId_route: { appId: customerPortal.id, route: page.route } },
            create: {
                appId: customerPortal.id,
                name: page.name,
                route: page.route,
                layout: page.layout as any,
                dataSources: page.dataSources as any,
                title: page.title,
                description: page.description,
            },
            update: {},
        });
    }

    console.log(`✅ Created app: ${customerPortal.name} (${customerPortal.status}) — ${customerPages.length} pages\n`);

    // Summary
    console.log('────────────────────────────────────────────────────────────');
    console.log('🎉 Apps seeding completed!\n');
    console.log('Created:');
    console.log('  📱 Expense Manager (internal, published) — 3 pages');
    console.log('  🌐 Employee Portal (portal, published) — 3 pages');
    console.log('  🎧 IT Help Desk (internal, draft) — 2 pages');
    console.log('  🌍 Customer Portal (portal, draft) — 2 pages');
    console.log('');
}

seedApps()
    .catch((e) => {
        console.error('❌ Error seeding apps:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
