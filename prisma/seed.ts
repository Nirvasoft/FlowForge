import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default permissions
  const resources = ['users', 'groups', 'roles', 'apps', 'processes', 'forms', 'datasets', 'dashboards', 'connectors'];
  const actions = ['create', 'read', 'update', 'delete'];

  const permissions = [];
  for (const resource of resources) {
    for (const action of actions) {
      const permission = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        create: { resource, action, description: `${action} ${resource}` },
        update: {},
      });
      permissions.push(permission);
    }
  }
  console.log(`✅ Created ${permissions.length} permissions`);

  // Create demo account
  const account = await prisma.account.upsert({
    where: { slug: 'demo' },
    create: {
      name: 'Demo Company',
      slug: 'demo',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
    },
    update: {},
  });
  console.log(`✅ Created account: ${account.name}`);

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { accountId_name: { accountId: account.id, name: 'Admin' } },
    create: {
      accountId: account.id,
      name: 'Admin',
      description: 'Full administrative access',
      isSystem: true,
    },
    update: {},
  });

  const memberRole = await prisma.role.upsert({
    where: { accountId_name: { accountId: account.id, name: 'Member' } },
    create: {
      accountId: account.id,
      name: 'Member',
      description: 'Standard user access',
      isSystem: true,
    },
    update: {},
  });

  const viewerRole = await prisma.role.upsert({
    where: { accountId_name: { accountId: account.id, name: 'Viewer' } },
    create: {
      accountId: account.id,
      name: 'Viewer',
      description: 'Read-only access',
      isSystem: true,
    },
    update: {},
  });

  console.log('✅ Created roles: Admin, Member, Viewer');

  // Assign permissions to roles
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      create: { roleId: adminRole.id, permissionId: permission.id },
      update: {},
    });
  }

  const memberPermissions = permissions.filter(
    (p) => p.action === 'read' || (p.action !== 'delete' && !['roles', 'connectors'].includes(p.resource))
  );
  for (const permission of memberPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: memberRole.id, permissionId: permission.id } },
      create: { roleId: memberRole.id, permissionId: permission.id },
      update: {},
    });
  }

  const viewerPermissions = permissions.filter((p) => p.action === 'read');
  for (const permission of viewerPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: viewerRole.id, permissionId: permission.id } },
      create: { roleId: viewerRole.id, permissionId: permission.id },
      update: {},
    });
  }

  console.log('✅ Assigned permissions to roles');

  // Create demo user
  const passwordHash = await bcrypt.hash('Demo123!@#', 12);
  const demoUser = await prisma.user.upsert({
    where: { accountId_email: { accountId: account.id, email: 'admin@demo.com' } },
    create: {
      accountId: account.id,
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerified: true,
    },
    update: {},
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: demoUser.id, roleId: adminRole.id } },
    create: { userId: demoUser.id, roleId: adminRole.id },
    update: {},
  });

  console.log(`✅ Created demo user: admin@demo.com (password: Demo123!@#)`);

  // Create sample groups
  const engineeringGroup = await prisma.group.upsert({
    where: { accountId_name: { accountId: account.id, name: 'Engineering' } },
    create: {
      accountId: account.id,
      name: 'Engineering',
      description: 'Engineering team',
      type: 'STATIC',
    },
    update: {},
  });

  await prisma.group.upsert({
    where: { accountId_name: { accountId: account.id, name: 'Sales' } },
    create: {
      accountId: account.id,
      name: 'Sales',
      description: 'Sales team',
      type: 'STATIC',
    },
    update: {},
  });

  console.log('✅ Created groups: Engineering, Sales');

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: engineeringGroup.id, userId: demoUser.id } },
    create: { groupId: engineeringGroup.id, userId: demoUser.id },
    update: {},
  });

  console.log('✅ Added demo user to Engineering group');
  console.log('');
  console.log('🎉 Database seeding completed!');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Email: admin@demo.com');
  console.log('  Password: Demo123!@#');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
