/**
 * FlowForge App Builder Service
 * CRUD operations for apps, pages, and components
 */

import { randomUUID } from 'crypto';
import type {
  Application,
  AppPage,
  PageComponent,
  NavigationConfig,
  ThemeConfig,
  DataSourceConfig,
  AppSettings,
  PageSettings,
  Portal,
  PortalSettings,
} from '../../types/apps';
import { componentRegistry } from './component-registry';

// ============================================================================
// In-Memory Storage
// ============================================================================

const apps = new Map<string, Application>();

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_THEME: ThemeConfig = {
  name: 'Default',
  mode: 'light',
  colors: {
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryDark: '#2563EB',
    secondary: '#6B7280',
    accent: '#8B5CF6',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontFamilyMono: 'JetBrains Mono, monospace',
    fontSizeBase: '16px',
    fontSizeSmall: '14px',
    fontSizeLarge: '18px',
    fontWeightNormal: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    lineHeight: 1.5,
  },
  spacing: {
    unit: 4,
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  borders: {
    radiusSmall: '4px',
    radiusMedium: '8px',
    radiusLarge: '12px',
    radiusFull: '9999px',
    width: '1px',
  },
};

const DEFAULT_SETTINGS: AppSettings = {
  showNavigation: true,
  enableSearch: true,
  enableNotifications: true,
  enableOfflineMode: false,
  sessionTimeout: 3600,
  requireAuth: true,
};

const DEFAULT_PAGE_SETTINGS: PageSettings = {
  fullWidth: false,
  padding: 'medium',
  requireAuth: true,
  showInNavigation: true,
};

// ============================================================================
// App Builder Service
// ============================================================================

export class AppBuilderService {

  // ============================================================================
  // Application CRUD
  // ============================================================================

  async createApp(input: {
    name: string;
    description?: string;
    type?: 'internal' | 'portal';
    createdBy: string;
  }): Promise<Application> {
    const id = randomUUID();
    const now = new Date();

    const homePage: AppPage = {
      id: randomUUID(),
      name: 'Home',
      slug: 'home',
      icon: 'home',
      layout: 'single-column',
      components: [
        {
          id: randomUUID(),
          type: 'heading',
          name: 'Welcome',
          position: { row: 0, column: 0, width: 12 },
          props: { content: `Welcome to ${input.name}`, level: 'h1', align: 'center' },
        },
        {
          id: randomUUID(),
          type: 'text',
          name: 'Description',
          position: { row: 1, column: 0, width: 12 },
          props: { content: 'Start building your app by adding components to this page.', align: 'center' },
        },
      ],
      settings: { ...DEFAULT_PAGE_SETTINGS },
      pageVariables: [],
    };

    const app: Application = {
      id,
      name: input.name,
      slug: this.generateSlug(input.name),
      description: input.description,
      type: input.type || 'internal',
      pages: [homePage],
      navigation: {
        type: 'sidebar',
        position: 'left',
        collapsed: false,
        items: [
          { id: randomUUID(), type: 'page', label: 'Home', icon: 'home', pageId: homePage.id },
        ],
      },
      settings: { ...DEFAULT_SETTINGS, defaultPage: homePage.id },
      theme: { ...DEFAULT_THEME },
      dataSources: [],
      version: 1,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    apps.set(id, app);
    return app;
  }

  async getApp(id: string): Promise<Application | null> {
    return apps.get(id) || null;
  }

  async getAppBySlug(slug: string): Promise<Application | null> {
    for (const app of apps.values()) {
      if (app.slug === slug) return app;
    }
    return null;
  }

  async listApps(options: {
    type?: 'internal' | 'portal';
    status?: 'draft' | 'published' | 'archived';
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ apps: Application[]; total: number }> {
    let items = Array.from(apps.values());

    if (options.type) {
      items = items.filter(a => a.type === options.type);
    }
    if (options.status) {
      items = items.filter(a => a.status === options.status);
    }
    if (options.search) {
      const search = options.search.toLowerCase();
      items = items.filter(a =>
        a.name.toLowerCase().includes(search) ||
        a.description?.toLowerCase().includes(search)
      );
    }

    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const start = (page - 1) * pageSize;

    return {
      apps: items.slice(start, start + pageSize),
      total: items.length,
    };
  }

  async updateApp(
    id: string,
    input: Partial<Pick<Application, 'name' | 'description' | 'settings' | 'theme' | 'navigation'>>
  ): Promise<Application | null> {
    const app = apps.get(id);
    if (!app) return null;

    if (input.name) {
      app.name = input.name;
      app.slug = this.generateSlug(input.name);
    }
    if (input.description !== undefined) app.description = input.description;
    if (input.settings) app.settings = { ...app.settings, ...input.settings };
    if (input.theme) app.theme = { ...app.theme, ...input.theme };
    if (input.navigation) app.navigation = input.navigation;

    app.updatedAt = new Date();
    apps.set(id, app);
    return app;
  }

  async deleteApp(id: string): Promise<boolean> {
    return apps.delete(id);
  }

  async publishApp(id: string, publishedBy: string): Promise<Application | null> {
    const app = apps.get(id);
    if (!app) return null;

    app.status = 'published';
    app.version++;
    app.publishedAt = new Date();
    app.publishedBy = publishedBy;
    app.updatedAt = new Date();

    apps.set(id, app);
    return app;
  }

  async unpublishApp(id: string): Promise<Application | null> {
    const app = apps.get(id);
    if (!app) return null;

    app.status = 'draft';
    app.updatedAt = new Date();
    apps.set(id, app);
    return app;
  }

  // ============================================================================
  // Page Management
  // ============================================================================

  async addPage(appId: string, page: Omit<AppPage, 'id'>): Promise<AppPage | null> {
    const app = apps.get(appId);
    if (!app) return null;

    const newPage: AppPage = {
      ...page,
      id: randomUUID(),
      slug: page.slug || this.generateSlug(page.name),
      settings: page.settings || { ...DEFAULT_PAGE_SETTINGS },
      components: page.components || [],
      pageVariables: page.pageVariables || [],
    };

    app.pages.push(newPage);

    // Add to navigation
    if (newPage.settings.showInNavigation) {
      app.navigation.items.push({
        id: randomUUID(),
        type: 'page',
        label: newPage.name,
        icon: newPage.icon,
        pageId: newPage.id,
      });
    }

    app.updatedAt = new Date();
    apps.set(appId, app);
    return newPage;
  }

  async getPage(appId: string, pageId: string): Promise<AppPage | null> {
    const app = apps.get(appId);
    if (!app) return null;
    return app.pages.find(p => p.id === pageId) || null;
  }

  async updatePage(
    appId: string,
    pageId: string,
    updates: Partial<Omit<AppPage, 'id'>>
  ): Promise<AppPage | null> {
    const app = apps.get(appId);
    if (!app) return null;

    const page = app.pages.find(p => p.id === pageId);
    if (!page) return null;

    Object.assign(page, updates);
    if (updates.name && !updates.slug) {
      page.slug = this.generateSlug(updates.name);
    }

    app.updatedAt = new Date();
    apps.set(appId, app);
    return page;
  }

  async deletePage(appId: string, pageId: string): Promise<boolean> {
    const app = apps.get(appId);
    if (!app) return false;

    const index = app.pages.findIndex(p => p.id === pageId);
    if (index === -1) return false;

    app.pages.splice(index, 1);

    // Remove from navigation
    app.navigation.items = app.navigation.items.filter(item => item.pageId !== pageId);

    app.updatedAt = new Date();
    apps.set(appId, app);
    return true;
  }

  async reorderPages(appId: string, pageIds: string[]): Promise<boolean> {
    const app = apps.get(appId);
    if (!app) return false;

    const pageMap = new Map(app.pages.map(p => [p.id, p]));
    app.pages = pageIds.map(id => pageMap.get(id)).filter(Boolean) as AppPage[];

    app.updatedAt = new Date();
    apps.set(appId, app);
    return true;
  }

  // ============================================================================
  // Component Management
  // ============================================================================

  async addComponent(
    appId: string,
    pageId: string,
    component: Omit<PageComponent, 'id'>
  ): Promise<PageComponent | null> {
    const app = apps.get(appId);
    if (!app) return null;

    const page = app.pages.find(p => p.id === pageId);
    if (!page) return null;

    // Get default props from registry
    const definition = componentRegistry.getComponent(component.type);
    const defaultProps = definition?.defaultProps || {};

    const newComponent: PageComponent = {
      ...component,
      id: randomUUID(),
      props: { ...defaultProps, ...component.props },
      visible: component.visible ?? true,
    };

    page.components.push(newComponent);
    app.updatedAt = new Date();
    apps.set(appId, app);
    return newComponent;
  }

  async getComponent(appId: string, pageId: string, componentId: string): Promise<PageComponent | null> {
    const page = await this.getPage(appId, pageId);
    if (!page) return null;

    const findComponent = (components: PageComponent[]): PageComponent | null => {
      for (const comp of components) {
        if (comp.id === componentId) return comp;
        if (comp.children) {
          const found = findComponent(comp.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findComponent(page.components);
  }

  async updateComponent(
    appId: string,
    pageId: string,
    componentId: string,
    updates: Partial<Omit<PageComponent, 'id'>>
  ): Promise<PageComponent | null> {
    const app = apps.get(appId);
    if (!app) return null;

    const page = app.pages.find(p => p.id === pageId);
    if (!page) return null;

    const updateInList = (components: PageComponent[]): boolean => {
      for (let i = 0; i < components.length; i++) {
        const comp = components[i]!;
        if (comp.id === componentId) {
          Object.assign(comp, updates);
          return true;
        }
        if (comp.children && updateInList(comp.children)) {
          return true;
        }
      }
      return false;
    };

    if (!updateInList(page.components)) return null;

    app.updatedAt = new Date();
    apps.set(appId, app);
    return this.getComponent(appId, pageId, componentId);
  }

  async deleteComponent(appId: string, pageId: string, componentId: string): Promise<boolean> {
    const app = apps.get(appId);
    if (!app) return false;

    const page = app.pages.find(p => p.id === pageId);
    if (!page) return false;

    const deleteFromList = (components: PageComponent[]): boolean => {
      const index = components.findIndex(c => c.id === componentId);
      if (index !== -1) {
        components.splice(index, 1);
        return true;
      }
      for (const comp of components) {
        if (comp.children && deleteFromList(comp.children)) {
          return true;
        }
      }
      return false;
    };

    if (!deleteFromList(page.components)) return false;

    app.updatedAt = new Date();
    apps.set(appId, app);
    return true;
  }

  async moveComponent(
    appId: string,
    pageId: string,
    componentId: string,
    newPosition: { row: number; column: number; width?: number }
  ): Promise<PageComponent | null> {
    return this.updateComponent(appId, pageId, componentId, {
      position: { ...newPosition, width: newPosition.width || 12 },
    });
  }

  // ============================================================================
  // Data Source Management
  // ============================================================================

  async addDataSource(appId: string, dataSource: Omit<DataSourceConfig, 'id'>): Promise<DataSourceConfig | null> {
    const app = apps.get(appId);
    if (!app) return null;

    const newDataSource: DataSourceConfig = {
      ...dataSource,
      id: randomUUID(),
    };

    app.dataSources.push(newDataSource);
    app.updatedAt = new Date();
    apps.set(appId, app);
    return newDataSource;
  }

  async updateDataSource(
    appId: string,
    dataSourceId: string,
    updates: Partial<Omit<DataSourceConfig, 'id'>>
  ): Promise<DataSourceConfig | null> {
    const app = apps.get(appId);
    if (!app) return null;

    const ds = app.dataSources.find(d => d.id === dataSourceId);
    if (!ds) return null;

    Object.assign(ds, updates);
    app.updatedAt = new Date();
    apps.set(appId, app);
    return ds;
  }

  async deleteDataSource(appId: string, dataSourceId: string): Promise<boolean> {
    const app = apps.get(appId);
    if (!app) return false;

    const index = app.dataSources.findIndex(d => d.id === dataSourceId);
    if (index === -1) return false;

    app.dataSources.splice(index, 1);
    app.updatedAt = new Date();
    apps.set(appId, app);
    return true;
  }

  // ============================================================================
  // Theme Management
  // ============================================================================

  async updateTheme(appId: string, theme: Partial<ThemeConfig>): Promise<ThemeConfig | null> {
    const app = apps.get(appId);
    if (!app) return null;

    app.theme = {
      ...app.theme,
      ...theme,
      colors: { ...app.theme.colors, ...theme.colors },
      typography: { ...app.theme.typography, ...theme.typography },
      spacing: { ...app.theme.spacing, ...theme.spacing },
      borders: { ...app.theme.borders, ...theme.borders },
    };

    app.updatedAt = new Date();
    apps.set(appId, app);
    return app.theme;
  }

  async resetTheme(appId: string): Promise<ThemeConfig | null> {
    const app = apps.get(appId);
    if (!app) return null;

    app.theme = { ...DEFAULT_THEME };
    app.updatedAt = new Date();
    apps.set(appId, app);
    return app.theme;
  }

  // ============================================================================
  // Portal-Specific
  // ============================================================================

  async createPortal(input: {
    name: string;
    description?: string;
    customDomain?: string;
    createdBy: string;
  }): Promise<Portal> {
    const app = await this.createApp({
      ...input,
      type: 'portal',
    }) as Portal;

    app.portalSettings = {
      showFooter: true,
      showHeader: true,
    };
    app.registrationEnabled = false;
    app.isPublic = true;

    apps.set(app.id, app);
    return app;
  }

  async updatePortalSettings(
    appId: string,
    settings: Partial<PortalSettings>
  ): Promise<PortalSettings | null> {
    const app = apps.get(appId) as Portal;
    if (!app || app.type !== 'portal') return null;

    app.portalSettings = { ...app.portalSettings, ...settings };
    app.updatedAt = new Date();
    apps.set(appId, app);
    return app.portalSettings;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async duplicateApp(appId: string, newName: string, createdBy: string): Promise<Application | null> {
    const original = apps.get(appId);
    if (!original) return null;

    const duplicate: Application = JSON.parse(JSON.stringify(original));
    duplicate.id = randomUUID();
    duplicate.name = newName;
    duplicate.slug = this.generateSlug(newName);
    duplicate.status = 'draft';
    duplicate.version = 1;
    duplicate.createdAt = new Date();
    duplicate.updatedAt = new Date();
    duplicate.createdBy = createdBy;
    delete duplicate.publishedAt;
    delete duplicate.publishedBy;

    // Generate new IDs for pages and components
    duplicate.pages = duplicate.pages.map(page => ({
      ...page,
      id: randomUUID(),
      components: this.regenerateComponentIds(page.components),
    }));

    // Update navigation page references
    const pageIdMap = new Map<string, string>();
    original.pages.forEach((op, i) => {
      pageIdMap.set(op.id, duplicate.pages[i]!.id);
    });
    duplicate.navigation.items = duplicate.navigation.items.map(item => ({
      ...item,
      id: randomUUID(),
      pageId: item.pageId ? pageIdMap.get(item.pageId) : undefined,
    }));

    apps.set(duplicate.id, duplicate);
    return duplicate;
  }

  private regenerateComponentIds(components: PageComponent[]): PageComponent[] {
    return components.map(comp => ({
      ...comp,
      id: randomUUID(),
      children: comp.children ? this.regenerateComponentIds(comp.children) : undefined,
    }));
  }
}

export const appBuilderService = new AppBuilderService();
