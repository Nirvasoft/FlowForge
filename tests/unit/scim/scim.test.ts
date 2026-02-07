/**
 * FlowForge SCIM Tests
 * Test suite for SCIM 2.0 compliance and Directory Sync
 */

import { SCIMService } from '../src/services/scim/scim.service';
import { DirectorySyncService } from '../src/services/scim/directory-sync.service';
import { SCIMFilterParser, SCIMFilterMatcher } from '../src/services/scim/filter-parser';
import type { SCIMUser, SCIMGroup } from '../src/types/scim';

describe('SCIM Filter Parser', () => {
  const parser = new SCIMFilterParser();
  const matcher = new SCIMFilterMatcher();

  test('parses simple equality filter', () => {
    const expr = parser.parse('userName eq "john"');
    expect(expr.type).toBe('attribute');
    expect((expr as any).attributePath).toBe('userName');
    expect((expr as any).operator).toBe('eq');
    expect((expr as any).value).toBe('john');
  });

  test('parses presence filter', () => {
    const expr = parser.parse('emails pr');
    expect(expr.type).toBe('attribute');
    expect((expr as any).operator).toBe('pr');
  });

  test('parses AND expression', () => {
    const expr = parser.parse('active eq true and userName sw "j"');
    expect(expr.type).toBe('logical');
    expect((expr as any).operator).toBe('and');
  });

  test('parses OR expression', () => {
    const expr = parser.parse('title eq "Manager" or title eq "Director"');
    expect(expr.type).toBe('logical');
    expect((expr as any).operator).toBe('or');
  });

  test('parses NOT expression', () => {
    const expr = parser.parse('not active eq false');
    expect(expr.type).toBe('not');
  });

  test('parses grouped expression', () => {
    const expr = parser.parse('(userName eq "john") and active eq true');
    expect(expr.type).toBe('logical');
  });

  test('parses complex nested filter', () => {
    const expr = parser.parse('(userName co "test" or email ew "@example.com") and active eq true');
    expect(expr.type).toBe('logical');
  });

  test('matches equality', () => {
    const expr = parser.parse('userName eq "john"');
    expect(matcher.match({ userName: 'john' }, expr)).toBe(true);
    expect(matcher.match({ userName: 'Jane' }, expr)).toBe(false);
  });

  test('matches case-insensitive', () => {
    const expr = parser.parse('userName eq "JOHN"');
    expect(matcher.match({ userName: 'john' }, expr)).toBe(true);
  });

  test('matches contains', () => {
    const expr = parser.parse('email co "example"');
    expect(matcher.match({ email: 'user@example.com' }, expr)).toBe(true);
    expect(matcher.match({ email: 'user@other.com' }, expr)).toBe(false);
  });

  test('matches starts with', () => {
    const expr = parser.parse('userName sw "j"');
    expect(matcher.match({ userName: 'john' }, expr)).toBe(true);
    expect(matcher.match({ userName: 'mary' }, expr)).toBe(false);
  });

  test('matches ends with', () => {
    const expr = parser.parse('email ew ".com"');
    expect(matcher.match({ email: 'user@example.com' }, expr)).toBe(true);
    expect(matcher.match({ email: 'user@example.org' }, expr)).toBe(false);
  });

  test('matches presence', () => {
    const expr = parser.parse('title pr');
    expect(matcher.match({ title: 'Manager' }, expr)).toBe(true);
    expect(matcher.match({ title: null }, expr)).toBe(false);
    expect(matcher.match({}, expr)).toBe(false);
  });

  test('matches nested path', () => {
    const expr = parser.parse('name.givenName eq "John"');
    expect(matcher.match({ name: { givenName: 'John' } }, expr)).toBe(true);
  });
});

describe('SCIM Service', () => {
  let service: SCIMService;

  beforeEach(() => {
    service = new SCIMService('https://test.example.com/scim/v2');
  });

  describe('Service Provider Config', () => {
    test('returns valid config', () => {
      const config = service.getServiceProviderConfig();
      expect(config.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig');
      expect(config.patch.supported).toBe(true);
      expect(config.bulk.supported).toBe(true);
      expect(config.filter.supported).toBe(true);
    });

    test('returns resource types', () => {
      const types = service.getResourceTypes();
      expect(types).toHaveLength(2);
      expect(types.map(t => t.id)).toContain('User');
      expect(types.map(t => t.id)).toContain('Group');
    });
  });

  describe('User Operations', () => {
    test('creates a user', async () => {
      const user = await service.createUser({
        userName: 'john.doe',
        name: { givenName: 'John', familyName: 'Doe' },
        emails: [{ value: 'john@example.com', primary: true }],
        active: true,
      });

      expect(user.id).toBeDefined();
      expect(user.userName).toBe('john.doe');
      expect(user.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:User');
      expect(user.meta.resourceType).toBe('User');
    });

    test('gets a user by ID', async () => {
      const created = await service.createUser({
        userName: 'jane.doe',
        active: true,
      });

      const user = await service.getUser(created.id);
      expect(user).not.toBeNull();
      expect(user?.userName).toBe('jane.doe');
    });

    test('lists users', async () => {
      await service.createUser({ userName: 'user1', active: true });
      await service.createUser({ userName: 'user2', active: true });

      const result = await service.listUsers();
      expect(result.totalResults).toBeGreaterThanOrEqual(2);
      expect(result.Resources.length).toBeGreaterThanOrEqual(2);
    });

    test('filters users', async () => {
      await service.createUser({ userName: 'filter-test', active: true });
      
      const result = await service.listUsers({
        filter: 'userName eq "filter-test"',
      });
      
      expect(result.Resources.some(u => u.userName === 'filter-test')).toBe(true);
    });

    test('updates a user', async () => {
      const created = await service.createUser({
        userName: 'update-test',
        active: true,
      });

      const updated = await service.updateUser(created.id, {
        displayName: 'Updated Name',
        active: false,
      });

      expect(updated.displayName).toBe('Updated Name');
      expect(updated.active).toBe(false);
    });

    test('patches a user', async () => {
      const created = await service.createUser({
        userName: 'patch-test',
        active: true,
      });

      const patched = await service.patchUser(created.id, {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'replace', path: 'active', value: false },
        ],
      });

      expect(patched.active).toBe(false);
    });

    test('deletes a user', async () => {
      const created = await service.createUser({
        userName: 'delete-test',
        active: true,
      });

      await service.deleteUser(created.id);
      const user = await service.getUser(created.id);
      expect(user).toBeNull();
    });

    test('rejects duplicate userName', async () => {
      await service.createUser({ userName: 'duplicate', active: true });
      
      await expect(
        service.createUser({ userName: 'duplicate', active: true })
      ).rejects.toMatchObject({ status: '409' });
    });
  });

  describe('Group Operations', () => {
    test('creates a group', async () => {
      const group = await service.createGroup({
        displayName: 'Engineering',
      });

      expect(group.id).toBeDefined();
      expect(group.displayName).toBe('Engineering');
      expect(group.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:Group');
    });

    test('adds members to group', async () => {
      const user = await service.createUser({ userName: 'member1', active: true });
      const group = await service.createGroup({
        displayName: 'Team',
        members: [{ value: user.id }],
      });

      expect(group.members).toHaveLength(1);
      expect(group.members?.[0].value).toBe(user.id);
    });

    test('patches group members', async () => {
      const user = await service.createUser({ userName: 'member2', active: true });
      const group = await service.createGroup({ displayName: 'Patch Team' });

      const patched = await service.patchGroup(group.id, {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'add', path: 'members', value: [{ value: user.id }] },
        ],
      });

      expect(patched.members).toHaveLength(1);
    });

    test('user shows group membership', async () => {
      const user = await service.createUser({ userName: 'grouped-user', active: true });
      await service.createGroup({
        displayName: 'User Group',
        members: [{ value: user.id }],
      });

      const fetchedUser = await service.getUser(user.id);
      expect(fetchedUser?.groups?.length).toBeGreaterThan(0);
    });
  });
});

describe('Directory Sync Service', () => {
  let service: DirectorySyncService;

  beforeEach(() => {
    service = new DirectorySyncService();
  });

  test('creates a sync config', async () => {
    const config = await service.createConfig({
      name: 'Azure AD Sync',
      provider: 'azure_ad',
      baseUrl: 'https://graph.microsoft.com/scim',
      bearerToken: 'test-token',
      userId: 'admin',
    });

    expect(config.id).toBeDefined();
    expect(config.name).toBe('Azure AD Sync');
    expect(config.provider).toBe('azure_ad');
    expect(config.enabled).toBe(false);
    expect(config.userMapping.length).toBeGreaterThan(0);
  });

  test('enables and disables config', async () => {
    const config = await service.createConfig({
      name: 'Test Sync',
      provider: 'okta',
      baseUrl: 'https://test.okta.com/scim',
      bearerToken: 'token',
      userId: 'admin',
    });

    const enabled = await service.enableConfig(config.id);
    expect(enabled?.enabled).toBe(true);

    const disabled = await service.disableConfig(config.id);
    expect(disabled?.enabled).toBe(false);
  });

  test('tests connection', async () => {
    const config = await service.createConfig({
      name: 'Connection Test',
      provider: 'custom',
      baseUrl: 'https://example.com/scim',
      bearerToken: 'token',
      userId: 'admin',
    });

    const result = await service.testConnection(config);
    expect(result.success).toBe(true);
  });

  test('runs full sync', async () => {
    const config = await service.createConfig({
      name: 'Full Sync Test',
      provider: 'azure_ad',
      baseUrl: 'https://graph.microsoft.com/scim',
      bearerToken: 'token',
      userId: 'admin',
    });

    const event = await service.runFullSync(config.id);
    expect(event.id).toBeDefined();
    expect(event.type).toBe('full');
    expect(['success', 'partial', 'failed']).toContain(event.status);
  });

  test('tracks sync history', async () => {
    const config = await service.createConfig({
      name: 'History Test',
      provider: 'okta',
      baseUrl: 'https://test.okta.com/scim',
      bearerToken: 'token',
      userId: 'admin',
    });

    await service.runFullSync(config.id);
    await service.runFullSync(config.id);

    const history = await service.getSyncHistory(config.id);
    expect(history.total).toBe(2);
  });
});
