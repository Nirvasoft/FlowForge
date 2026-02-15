/**
 * FlowForge App Builder Service
 * Prisma-backed CRUD for apps, pages, and components
 */

import { randomUUID } from 'crypto';
import { prisma } from '../../utils/prisma.js';
import { componentRegistry } from './component-registry';

// ============================================================================
// Types for the definition JSON structure
// ============================================================================

interface AppDefinition {
  type?: string;
  theme?: any;
  navigation?: any[];
  pages?: any[];
  dataSources?: any[];
  [key: string]: any;
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_THEME = {
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
  spacing: { unit: 4, xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
  borders: { radiusSmall: '4px', radiusMedium: '8px', radiusLarge: '12px', radiusFull: '9999px', width: '1px' },
};

const DEFAULT_PAGE_SETTINGS = {
  fullWidth: false,
  padding: 'medium',
  requireAuth: true,
  showInNavigation: true,
};

// ============================================================================
// Helper: Convert Prisma App record to Application shape for frontend
// ============================================================================

function toApplication(record: any): any {
  const def: AppDefinition = (record.definition as any) || {};

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description,
    icon: record.icon,
    type: def.type || 'internal',
    pages: record.pages
      ? record.pages.map((p: any) => {
        const layoutObj = p.layout || { rows: [] };
        // Extract components from layout.rows[].columns[].components[]
        const extractedComponents: any[] = [];
        if (layoutObj.rows && Array.isArray(layoutObj.rows)) {
          layoutObj.rows.forEach((row: any, rowIdx: number) => {
            if (row.columns && Array.isArray(row.columns)) {
              let colOffset = 0;
              row.columns.forEach((col: any) => {
                if (col.components && Array.isArray(col.components)) {
                  col.components.forEach((comp: any) => {
                    extractedComponents.push({
                      id: comp.id || `${p.id}-comp-${extractedComponents.length}`,
                      type: comp.type,
                      name: comp.props?.title || comp.type,
                      position: { row: rowIdx, column: colOffset, width: col.width || 12 },
                      props: comp.props || {},
                    });
                  });
                }
                colOffset += (col.width || 12);
              });
            }
          });
        }
        return {
          id: p.id,
          name: p.name,
          route: p.route,
          slug: p.route,
          icon: p.icon,
          layout: layoutObj,
          components: extractedComponents.length > 0 ? extractedComponents : (p.components || []),
          dataSources: p.dataSources || [],
          title: p.title,
          description: p.description,
        };
      })
      : (def.pages || []),
    navigation: def.navigation
      ? { type: 'sidebar', position: 'left', collapsed: false, items: def.navigation }
      : { type: 'sidebar', position: 'left', collapsed: false, items: [] },
    settings: {
      showNavigation: true,
      enableSearch: true,
      enableNotifications: true,
      enableOfflineMode: false,
      sessionTimeout: 3600,
      requireAuth: true,
      ...(record.settings as any || {}),
    },
    theme: def.theme || { ...DEFAULT_THEME },
    dataSources: def.dataSources || [],
    version: record.version,
    status: record.status?.toLowerCase() || 'draft',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy,
    publishedAt: record.publishedAt,
  };
}

// ============================================================================
// App Builder Service (Prisma-backed)
// ============================================================================

export class AppBuilderService {

  // ==========================================================================
  // Application CRUD
  // ==========================================================================

  async createApp(input: {
    accountId: string;
    name: string;
    description?: string;
    type?: 'internal' | 'portal';
    createdBy: string;
  }): Promise<any> {
    const homePageId = randomUUID();
    const definition: AppDefinition = {
      type: input.type || 'internal',
      theme: { ...DEFAULT_THEME },
      navigation: [
        { id: randomUUID(), type: 'page', label: 'Home', icon: 'home', pageId: homePageId },
      ],
      pages: [
        {
          id: homePageId,
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
        },
      ],
      dataSources: [],
    };

    const record = await prisma.app.create({
      data: {
        accountId: input.accountId,
        name: input.name,
        slug: this.generateSlug(input.name),
        description: input.description,
        definition: definition as any,
        settings: {},
        permissions: {},
        status: 'DRAFT',
        version: 1,
        createdBy: input.createdBy,
      },
    });

    return toApplication(record);
  }

  async getApp(id: string): Promise<any | null> {
    const record = await prisma.app.findUnique({
      where: { id },
      include: { pages: true },
    });
    if (!record) return null;
    return toApplication(record);
  }

  async getAppBySlug(accountId: string, slug: string): Promise<any | null> {
    const record = await prisma.app.findUnique({
      where: { accountId_slug: { accountId, slug } },
    });
    if (!record) return null;
    return toApplication(record);
  }

  async listApps(accountId: string, options: {
    type?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ apps: any[]; total: number }> {
    const where: any = { accountId };

    if (options.status) {
      where.status = options.status.toUpperCase();
    }
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const page = options.page || 1;
    const pageSize = options.pageSize || 50;

    const [records, total] = await Promise.all([
      prisma.app.findMany({
        where,
        include: { pages: { select: { id: true, name: true, route: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.app.count({ where }),
    ]);

    let apps = records.map(toApplication);

    // Filter by type from definition JSON (can't filter in Prisma query directly)
    if (options.type) {
      apps = apps.filter((a: any) => a.type === options.type);
    }

    return { apps, total };
  }

  async updateApp(id: string, input: any): Promise<any | null> {
    const existing = await prisma.app.findUnique({ where: { id } });
    if (!existing) return null;

    const def: AppDefinition = (existing.definition as any) || {};
    const updateData: any = { updatedAt: new Date() };

    if (input.name) {
      updateData.name = input.name;
      updateData.slug = this.generateSlug(input.name);
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.settings) {
      updateData.settings = { ...(existing.settings as any || {}), ...input.settings };
    }

    // Update definition fields
    let defChanged = false;
    if (input.theme) {
      def.theme = { ...(def.theme || {}), ...input.theme };
      defChanged = true;
    }
    if (input.navigation) {
      // Accept both { items: [...] } and raw array
      def.navigation = Array.isArray(input.navigation) ? input.navigation : input.navigation.items || input.navigation;
      defChanged = true;
    }
    if (input.pages) {
      def.pages = input.pages;
      defChanged = true;
    }
    if (defChanged) {
      updateData.definition = def as any;
    }

    const record = await prisma.app.update({ where: { id }, data: updateData });
    return toApplication(record);
  }

  async deleteApp(id: string): Promise<boolean> {
    try {
      await prisma.app.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async publishApp(id: string, publishedBy: string): Promise<any | null> {
    const existing = await prisma.app.findUnique({ where: { id } });
    if (!existing) return null;

    const record = await prisma.app.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        version: existing.version + 1,
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return toApplication(record);
  }

  async unpublishApp(id: string): Promise<any | null> {
    const existing = await prisma.app.findUnique({ where: { id } });
    if (!existing) return null;

    const record = await prisma.app.update({
      where: { id },
      data: { status: 'DRAFT', updatedAt: new Date() },
    });
    return toApplication(record);
  }

  async duplicateApp(appId: string, newName: string, accountId: string, createdBy: string): Promise<any | null> {
    const original = await prisma.app.findUnique({ where: { id: appId } });
    if (!original) return null;

    const def: AppDefinition = JSON.parse(JSON.stringify(original.definition || {}));

    // Regenerate page IDs and component IDs
    const pageIdMap = new Map<string, string>();
    if (def.pages) {
      def.pages = def.pages.map((page: any) => {
        const newPageId = randomUUID();
        pageIdMap.set(page.id, newPageId);
        return {
          ...page,
          id: newPageId,
          components: this.regenerateComponentIds(page.components || []),
        };
      });
    }

    // Update navigation page references
    if (def.navigation) {
      def.navigation = def.navigation.map((item: any) => ({
        ...item,
        id: randomUUID(),
        pageId: item.pageId ? (pageIdMap.get(item.pageId) || item.pageId) : undefined,
      }));
    }

    const record = await prisma.app.create({
      data: {
        accountId,
        name: newName,
        slug: this.generateSlug(newName),
        description: original.description,
        icon: original.icon,
        definition: def as any,
        settings: original.settings || {},
        permissions: original.permissions || {},
        status: 'DRAFT',
        version: 1,
        createdBy,
      },
    });

    return toApplication(record);
  }

  // ==========================================================================
  // Page Management (operates on definition.pages)
  // ==========================================================================

  async addPage(appId: string, page: any): Promise<any | null> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return null;

    const def: AppDefinition = (existing.definition as any) || {};
    const pages = def.pages || [];

    const newPage = {
      ...page,
      id: page.id || randomUUID(),
      slug: page.slug || this.generateSlug(page.name),
      settings: page.settings || { ...DEFAULT_PAGE_SETTINGS },
      components: page.components || [],
      pageVariables: page.pageVariables || [],
    };

    pages.push(newPage);
    def.pages = pages;

    // Add to navigation
    if (newPage.settings?.showInNavigation !== false) {
      const nav = def.navigation || [];
      nav.push({ id: randomUUID(), type: 'page', label: newPage.name, icon: newPage.icon, pageId: newPage.id });
      def.navigation = nav;
    }

    await prisma.app.update({ where: { id: appId }, data: { definition: def as any, updatedAt: new Date() } });
    return newPage;
  }

  async getPage(appId: string, pageId: string): Promise<any | null> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return null;

    const def: AppDefinition = (existing.definition as any) || {};
    return (def.pages || []).find((p: any) => p.id === pageId) || null;
  }

  async updatePage(appId: string, pageId: string, updates: any): Promise<any | null> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return null;

    const def: AppDefinition = (existing.definition as any) || {};
    const pages = def.pages || [];
    const page = pages.find((p: any) => p.id === pageId);
    if (!page) return null;

    Object.assign(page, updates);
    if (updates.name && !updates.slug) {
      page.slug = this.generateSlug(updates.name);
    }
    def.pages = pages;

    await prisma.app.update({ where: { id: appId }, data: { definition: def as any, updatedAt: new Date() } });
    return page;
  }

  async deletePage(appId: string, pageId: string): Promise<boolean> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return false;

    const def: AppDefinition = (existing.definition as any) || {};
    const pages = def.pages || [];
    const idx = pages.findIndex((p: any) => p.id === pageId);
    if (idx === -1) return false;

    pages.splice(idx, 1);
    def.pages = pages;

    // Remove from navigation
    if (def.navigation) {
      def.navigation = def.navigation.filter((item: any) => item.pageId !== pageId);
    }

    await prisma.app.update({ where: { id: appId }, data: { definition: def as any, updatedAt: new Date() } });
    return true;
  }

  async reorderPages(appId: string, pageIds: string[]): Promise<boolean> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return false;

    const def: AppDefinition = (existing.definition as any) || {};
    const pages = def.pages || [];
    const pageMap = new Map(pages.map((p: any) => [p.id, p]));
    def.pages = pageIds.map(id => pageMap.get(id)).filter(Boolean) as any[];

    await prisma.app.update({ where: { id: appId }, data: { definition: def as any, updatedAt: new Date() } });
    return true;
  }

  // ==========================================================================
  // Component Management (operates on definition.pages[].components)
  // ==========================================================================

  async addComponent(appId: string, pageId: string, component: any): Promise<any | null> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return null;

    const def: AppDefinition = (existing.definition as any) || {};
    const page = (def.pages || []).find((p: any) => p.id === pageId);
    if (!page) return null;

    const definition = componentRegistry.getComponent(component.type);
    const defaultProps = definition?.defaultProps || {};

    const newComponent = {
      ...component,
      id: randomUUID(),
      props: { ...defaultProps, ...component.props },
      visible: component.visible ?? true,
    };

    page.components = page.components || [];
    page.components.push(newComponent);

    await prisma.app.update({ where: { id: appId }, data: { definition: def as any, updatedAt: new Date() } });
    return newComponent;
  }

  async getComponent(appId: string, pageId: string, componentId: string): Promise<any | null> {
    const page = await this.getPage(appId, pageId);
    if (!page) return null;

    const findComp = (components: any[]): any | null => {
      for (const comp of components) {
        if (comp.id === componentId) return comp;
        if (comp.children) {
          const found = findComp(comp.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findComp(page.components || []);
  }

  async updateComponent(appId: string, pageId: string, componentId: string, updates: any): Promise<any | null> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return null;

    const def: AppDefinition = (existing.definition as any) || {};
    const page = (def.pages || []).find((p: any) => p.id === pageId);
    if (!page) return null;

    const updateInList = (components: any[]): boolean => {
      for (const comp of components) {
        if (comp.id === componentId) {
          Object.assign(comp, updates);
          return true;
        }
        if (comp.children && updateInList(comp.children)) return true;
      }
      return false;
    };

    if (!updateInList(page.components || [])) return null;

    await prisma.app.update({ where: { id: appId }, data: { definition: def as any, updatedAt: new Date() } });
    return this.getComponent(appId, pageId, componentId);
  }

  async deleteComponent(appId: string, pageId: string, componentId: string): Promise<boolean> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return false;

    const def: AppDefinition = (existing.definition as any) || {};
    const page = (def.pages || []).find((p: any) => p.id === pageId);
    if (!page) return false;

    const deleteFromList = (components: any[]): boolean => {
      const index = components.findIndex((c: any) => c.id === componentId);
      if (index !== -1) { components.splice(index, 1); return true; }
      for (const comp of components) {
        if (comp.children && deleteFromList(comp.children)) return true;
      }
      return false;
    };

    if (!deleteFromList(page.components || [])) return false;

    await prisma.app.update({ where: { id: appId }, data: { definition: def as any, updatedAt: new Date() } });
    return true;
  }

  async moveComponent(appId: string, pageId: string, componentId: string, newPosition: any): Promise<any | null> {
    return this.updateComponent(appId, pageId, componentId, {
      position: { ...newPosition, width: newPosition.width || 12 },
    });
  }

  // ==========================================================================
  // Data Source Management
  // ==========================================================================

  async addDataSource(appId: string, dataSource: any): Promise<any | null> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return null;

    const def: AppDefinition = (existing.definition as any) || {};
    const dataSources = def.dataSources || [];
    const newDs = { ...dataSource, id: randomUUID() };
    dataSources.push(newDs);
    def.dataSources = dataSources;

    await prisma.app.update({ where: { id: appId }, data: { definition: def as any, updatedAt: new Date() } });
    return newDs;
  }

  async updateDataSource(appId: string, dataSourceId: string, updates: any): Promise<any | null> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return null;

    const def: AppDefinition = (existing.definition as any) || {};
    const ds = (def.dataSources || []).find((d: any) => d.id === dataSourceId);
    if (!ds) return null;

    Object.assign(ds, updates);
    await prisma.app.update({ where: { id: appId }, data: { definition: def as any, updatedAt: new Date() } });
    return ds;
  }

  async deleteDataSource(appId: string, dataSourceId: string): Promise<boolean> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return false;

    const def: AppDefinition = (existing.definition as any) || {};
    const dataSources = def.dataSources || [];
    const idx = dataSources.findIndex((d: any) => d.id === dataSourceId);
    if (idx === -1) return false;

    dataSources.splice(idx, 1);
    def.dataSources = dataSources;
    await prisma.app.update({ where: { id: appId }, data: { definition: def as any, updatedAt: new Date() } });
    return true;
  }

  // ==========================================================================
  // Theme Management
  // ==========================================================================

  async updateTheme(appId: string, theme: any): Promise<any | null> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return null;

    const def: AppDefinition = (existing.definition as any) || {};
    const currentTheme = def.theme || { ...DEFAULT_THEME };
    def.theme = {
      ...currentTheme,
      ...theme,
      colors: { ...currentTheme.colors, ...theme.colors },
      typography: { ...currentTheme.typography, ...theme.typography },
      spacing: { ...currentTheme.spacing, ...theme.spacing },
      borders: { ...currentTheme.borders, ...theme.borders },
    };

    await prisma.app.update({ where: { id: appId }, data: { definition: def as any, updatedAt: new Date() } });
    return def.theme;
  }

  async resetTheme(appId: string): Promise<any | null> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return null;

    const def: AppDefinition = (existing.definition as any) || {};
    def.theme = { ...DEFAULT_THEME };
    await prisma.app.update({ where: { id: appId }, data: { definition: def as any, updatedAt: new Date() } });
    return def.theme;
  }

  // ==========================================================================
  // Portal-Specific
  // ==========================================================================

  async createPortal(input: {
    accountId: string;
    name: string;
    description?: string;
    customDomain?: string;
    createdBy: string;
  }): Promise<any> {
    const app = await this.createApp({ ...input, type: 'portal' });
    // Store portal settings in the definition
    const existing = await prisma.app.findUnique({ where: { id: app.id } });
    if (existing) {
      const def: AppDefinition = (existing.definition as any) || {};
      def.portalSettings = { showFooter: true, showHeader: true };
      def.registrationEnabled = false;
      def.isPublic = true;
      await prisma.app.update({ where: { id: app.id }, data: { definition: def as any } });
    }
    return app;
  }

  async updatePortalSettings(appId: string, settings: any): Promise<any | null> {
    const existing = await prisma.app.findUnique({ where: { id: appId } });
    if (!existing) return null;

    const def: AppDefinition = (existing.definition as any) || {};
    if (def.type !== 'portal') return null;

    def.portalSettings = { ...(def.portalSettings || {}), ...settings };
    await prisma.app.update({ where: { id: appId }, data: { definition: def as any, updatedAt: new Date() } });
    return def.portalSettings;
  }

  // ==========================================================================
  // Data Source Resolution — fetch live workflow data at runtime
  // ==========================================================================

  async resolveDataSource(
    dataSource: { type: string; config: Record<string, unknown> }
  ): Promise<{ data: any[]; total: number }> {
    const { type, config } = dataSource;

    switch (type) {
      case 'tasks': {
        const where: any = {};
        if (config.status) where.status = config.status;
        if (config.workflowId) where.processId = config.workflowId;
        if (config.assigneeId) where.assigneeId = config.assigneeId;

        const [items, total] = await Promise.all([
          prisma.taskInstance.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: (config.pageSize as number) || 50,
            skip: (config.offset as number) || 0,
          }),
          prisma.taskInstance.count({ where }),
        ]);
        return { data: items, total };
      }

      case 'instances': {
        const where: any = {};
        if (config.status) where.status = config.status;
        if (config.workflowId) where.processId = config.workflowId;

        const [items, total] = await Promise.all([
          prisma.processInstance.findMany({
            where,
            orderBy: { startedAt: 'desc' },
            include: { process: { select: { name: true } } },
            take: (config.pageSize as number) || 50,
            skip: (config.offset as number) || 0,
          }),
          prisma.processInstance.count({ where }),
        ]);
        return { data: items, total };
      }

      case 'formData': {
        const where: any = {};
        if (config.formId) where.formId = config.formId;

        const [items, total] = await Promise.all([
          prisma.formSubmission.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: (config.pageSize as number) || 50,
            skip: (config.offset as number) || 0,
          }),
          prisma.formSubmission.count({ where }),
        ]);
        return { data: items, total };
      }

      default:
        return { data: [], total: 0 };
    }
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private regenerateComponentIds(components: any[]): any[] {
    return components.map((comp: any) => ({
      ...comp,
      id: randomUUID(),
      children: comp.children ? this.regenerateComponentIds(comp.children) : undefined,
    }));
  }
}

export const appBuilderService = new AppBuilderService();
