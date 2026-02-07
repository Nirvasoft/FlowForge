/**
 * FlowForge Apps & Portal Tests
 */

import { AppBuilderService } from '../src/services/apps/app-builder.service';
import { ComponentRegistry } from '../src/services/apps/component-registry';
import type { Application, AppPage } from '../src/types/apps';

describe('App Builder Service', () => {
  let service: AppBuilderService;

  beforeEach(() => {
    service = new AppBuilderService();
  });

  describe('Application CRUD', () => {
    test('creates an app with default page', async () => {
      const app = await service.createApp({
        name: 'My App',
        description: 'Test app',
        createdBy: 'user-1',
      });

      expect(app.id).toBeDefined();
      expect(app.name).toBe('My App');
      expect(app.slug).toBe('my-app');
      expect(app.status).toBe('draft');
      expect(app.pages).toHaveLength(1);
      expect(app.pages[0].name).toBe('Home');
      expect(app.navigation.items).toHaveLength(1);
    });

    test('gets an app by ID', async () => {
      const created = await service.createApp({ name: 'Test', createdBy: 'user-1' });
      const app = await service.getApp(created.id);
      expect(app?.name).toBe('Test');
    });

    test('lists apps with filters', async () => {
      await service.createApp({ name: 'App A', type: 'internal', createdBy: 'user-1' });
      await service.createApp({ name: 'App B', type: 'portal', createdBy: 'user-1' });

      const internal = await service.listApps({ type: 'internal' });
      expect(internal.apps.some(a => a.name === 'App A')).toBe(true);
      expect(internal.apps.some(a => a.name === 'App B')).toBe(false);
    });

    test('updates an app', async () => {
      const app = await service.createApp({ name: 'Original', createdBy: 'user-1' });
      const updated = await service.updateApp(app.id, { name: 'Updated', description: 'New desc' });
      
      expect(updated?.name).toBe('Updated');
      expect(updated?.description).toBe('New desc');
    });

    test('publishes and unpublishes an app', async () => {
      const app = await service.createApp({ name: 'Publish Test', createdBy: 'user-1' });
      
      const published = await service.publishApp(app.id, 'user-1');
      expect(published?.status).toBe('published');
      expect(published?.version).toBe(2);

      const unpublished = await service.unpublishApp(app.id);
      expect(unpublished?.status).toBe('draft');
    });

    test('duplicates an app', async () => {
      const original = await service.createApp({ name: 'Original App', createdBy: 'user-1' });
      await service.addPage(original.id, { name: 'Page 2', slug: 'page-2', layout: 'single-column', components: [], settings: { fullWidth: false, padding: 'medium', requireAuth: true, showInNavigation: true }, pageVariables: [] });

      const duplicate = await service.duplicateApp(original.id, 'Copy of App', 'user-2');

      expect(duplicate?.name).toBe('Copy of App');
      expect(duplicate?.id).not.toBe(original.id);
      expect(duplicate?.pages).toHaveLength(2);
      expect(duplicate?.pages[0].id).not.toBe(original.pages[0].id);
    });
  });

  describe('Page Management', () => {
    let app: Application;

    beforeEach(async () => {
      app = await service.createApp({ name: 'Page Test', createdBy: 'user-1' });
    });

    test('adds a page', async () => {
      const page = await service.addPage(app.id, {
        name: 'About',
        slug: 'about',
        layout: 'single-column',
        components: [],
        settings: { fullWidth: false, padding: 'medium', requireAuth: true, showInNavigation: true },
        pageVariables: [],
      });

      expect(page?.id).toBeDefined();
      expect(page?.name).toBe('About');

      const updated = await service.getApp(app.id);
      expect(updated?.pages).toHaveLength(2);
      expect(updated?.navigation.items).toHaveLength(2);
    });

    test('updates a page', async () => {
      const pageId = app.pages[0].id;
      const updated = await service.updatePage(app.id, pageId, { name: 'Dashboard' });
      
      expect(updated?.name).toBe('Dashboard');
      expect(updated?.slug).toBe('dashboard');
    });

    test('deletes a page', async () => {
      const page = await service.addPage(app.id, {
        name: 'To Delete',
        slug: 'delete',
        layout: 'single-column',
        components: [],
        settings: { fullWidth: false, padding: 'medium', requireAuth: true, showInNavigation: true },
        pageVariables: [],
      });

      const deleted = await service.deletePage(app.id, page!.id);
      expect(deleted).toBe(true);

      const updated = await service.getApp(app.id);
      expect(updated?.pages).toHaveLength(1);
    });
  });

  describe('Component Management', () => {
    let app: Application;
    let pageId: string;

    beforeEach(async () => {
      app = await service.createApp({ name: 'Component Test', createdBy: 'user-1' });
      pageId = app.pages[0].id;
    });

    test('adds a component', async () => {
      const component = await service.addComponent(app.id, pageId, {
        type: 'button',
        name: 'Submit Button',
        position: { row: 0, column: 0, width: 3 },
        props: { label: 'Submit', variant: 'primary' },
      });

      expect(component?.id).toBeDefined();
      expect(component?.type).toBe('button');
      expect(component?.props.label).toBe('Submit');
    });

    test('updates a component', async () => {
      const component = await service.addComponent(app.id, pageId, {
        type: 'text',
        name: 'Text',
        position: { row: 0, column: 0, width: 12 },
        props: { content: 'Hello' },
      });

      const updated = await service.updateComponent(app.id, pageId, component!.id, {
        props: { content: 'Updated text' },
      });

      expect(updated?.props.content).toBe('Updated text');
    });

    test('deletes a component', async () => {
      const component = await service.addComponent(app.id, pageId, {
        type: 'button',
        name: 'Button',
        position: { row: 0, column: 0, width: 3 },
        props: {},
      });

      const deleted = await service.deleteComponent(app.id, pageId, component!.id);
      expect(deleted).toBe(true);

      const found = await service.getComponent(app.id, pageId, component!.id);
      expect(found).toBeNull();
    });

    test('moves a component', async () => {
      const component = await service.addComponent(app.id, pageId, {
        type: 'card',
        name: 'Card',
        position: { row: 0, column: 0, width: 6 },
        props: {},
      });

      const moved = await service.moveComponent(app.id, pageId, component!.id, {
        row: 2,
        column: 6,
        width: 4,
      });

      expect(moved?.position.row).toBe(2);
      expect(moved?.position.column).toBe(6);
      expect(moved?.position.width).toBe(4);
    });
  });

  describe('Data Sources', () => {
    let app: Application;

    beforeEach(async () => {
      app = await service.createApp({ name: 'DS Test', createdBy: 'user-1' });
    });

    test('adds a data source', async () => {
      const ds = await service.addDataSource(app.id, {
        name: 'Users',
        type: 'dataset',
        config: { datasetId: 'ds-users' },
        cacheEnabled: true,
        cacheDuration: 60000,
      });

      expect(ds?.id).toBeDefined();
      expect(ds?.name).toBe('Users');
    });

    test('updates a data source', async () => {
      const ds = await service.addDataSource(app.id, {
        name: 'Products',
        type: 'api',
        config: { url: '/api/products' },
        cacheEnabled: false,
      });

      const updated = await service.updateDataSource(app.id, ds!.id, {
        cacheEnabled: true,
        cacheDuration: 30000,
      });

      expect(updated?.cacheEnabled).toBe(true);
      expect(updated?.cacheDuration).toBe(30000);
    });
  });

  describe('Theme Management', () => {
    test('updates theme', async () => {
      const app = await service.createApp({ name: 'Theme Test', createdBy: 'user-1' });
      
      const theme = await service.updateTheme(app.id, {
        colors: { primary: '#FF5500' },
      });

      expect(theme?.colors.primary).toBe('#FF5500');
    });

    test('resets theme to default', async () => {
      const app = await service.createApp({ name: 'Reset Test', createdBy: 'user-1' });
      await service.updateTheme(app.id, { colors: { primary: '#000000' } });

      const reset = await service.resetTheme(app.id);
      expect(reset?.colors.primary).toBe('#3B82F6');
    });
  });

  describe('Portal', () => {
    test('creates a portal', async () => {
      const portal = await service.createPortal({
        name: 'Customer Portal',
        description: 'Self-service portal',
        customDomain: 'portal.example.com',
        createdBy: 'user-1',
      });

      expect(portal.type).toBe('portal');
      expect(portal.portalSettings).toBeDefined();
      expect(portal.isPublic).toBe(true);
    });

    test('updates portal settings', async () => {
      const portal = await service.createPortal({
        name: 'Portal',
        createdBy: 'user-1',
      });

      const settings = await service.updatePortalSettings(portal.id, {
        showFooter: true,
        footerContent: '© 2024 Company',
        privacyPolicyUrl: '/privacy',
      });

      expect(settings?.footerContent).toBe('© 2024 Company');
    });
  });
});

describe('Component Registry', () => {
  const registry = new ComponentRegistry();

  test('returns all components', () => {
    const components = registry.getAllComponents();
    expect(components.length).toBeGreaterThan(20);
  });

  test('gets component by type', () => {
    const button = registry.getComponent('button');
    expect(button).toBeDefined();
    expect(button?.name).toBe('Button');
    expect(button?.category).toBe('navigation');
  });

  test('filters by category', () => {
    const charts = registry.getComponentsByCategory('charts');
    expect(charts.length).toBeGreaterThan(0);
    expect(charts.every(c => c.category === 'charts')).toBe(true);
  });

  test('gets container components', () => {
    const containers = registry.getContainerComponents();
    expect(containers.every(c => c.isContainer === true)).toBe(true);
    expect(containers.some(c => c.type === 'container')).toBe(true);
    expect(containers.some(c => c.type === 'card')).toBe(true);
  });

  test('components have required properties', () => {
    const components = registry.getAllComponents();
    
    for (const comp of components) {
      expect(comp.type).toBeDefined();
      expect(comp.name).toBeDefined();
      expect(comp.category).toBeDefined();
      expect(comp.icon).toBeDefined();
      expect(comp.defaultProps).toBeDefined();
      expect(Array.isArray(comp.propDefinitions)).toBe(true);
      expect(Array.isArray(comp.eventDefinitions)).toBe(true);
    }
  });
});
