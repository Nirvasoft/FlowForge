/**
 * AppBuilder - Visual low-code app builder canvas
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Play,
    Eye,
    Plus,
    Loader2,
    Trash2,
    GripVertical,
} from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { cn } from '../../lib/utils';
import { ComponentPalette } from './components/ComponentPalette';
import { ComponentPropertiesPanel } from './components/ComponentPropertiesPanel';
import { PageCanvas } from './components/PageCanvas';
import { getApp, updateApp, addPage, deletePage, addComponent, updateComponent, deleteComponent } from '../../api/apps';
import type { Application, AppPage, PageComponent, ComponentDefinition } from '../../types';

export function AppBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();

    // App state
    const [app, setApp] = useState<Application | null>(null);
    const [currentPage, setCurrentPage] = useState<AppPage | null>(null);
    const [selectedComponent, setSelectedComponent] = useState<PageComponent | null>(null);

    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    // Reserved for future page list toggle
    // const [showPageList, setShowPageList] = useState(true);

    // Load app
    useEffect(() => {
        async function loadApp() {
            if (!id) {
                setIsLoading(false);
                return;
            }

            try {
                const loadedApp = await getApp(id);
                setApp(loadedApp);
                if (loadedApp.pages.length > 0) {
                    setCurrentPage(loadedApp.pages[0]);
                }
            } catch (error) {
                console.error('Failed to load app:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadApp();
    }, [id]);

    // Save app
    const handleSave = useCallback(async () => {
        if (!app || !id) return;

        setIsSaving(true);
        try {
            await updateApp(id, {
                name: app.name,
                description: app.description,
                pages: app.pages,
                navigation: app.navigation,
                settings: app.settings,
                theme: app.theme,
            });
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Failed to save app:', error);
        } finally {
            setIsSaving(false);
        }
    }, [app, id]);

    // Add new page
    const handleAddPage = useCallback(async () => {
        if (!app || !id) return;

        try {
            const newPage = await addPage(id, {
                name: `Page ${app.pages.length + 1}`,
                layout: 'single-column',
            });

            const updatedApp = { ...app, pages: [...app.pages, newPage] };
            setApp(updatedApp);
            setCurrentPage(newPage);
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to add page:', error);
        }
    }, [app, id]);

    // Delete page
    const handleDeletePage = useCallback(async (pageId: string) => {
        if (!app || !id || app.pages.length <= 1) return;
        if (!confirm('Are you sure you want to delete this page?')) return;

        try {
            await deletePage(id, pageId);
            const updatedPages = app.pages.filter((p) => p.id !== pageId);
            const updatedApp = { ...app, pages: updatedPages };
            setApp(updatedApp);

            if (currentPage?.id === pageId) {
                setCurrentPage(updatedPages[0] || null);
            }
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to delete page:', error);
        }
    }, [app, id, currentPage]);

    // Add component to canvas
    const handleAddComponent = useCallback(async (componentDef: ComponentDefinition, position: { row: number; column: number }) => {
        if (!app || !id || !currentPage) return;

        try {
            const newComponent = await addComponent(id, currentPage.id, {
                type: componentDef.type,
                name: componentDef.name,
                position: { ...position, width: 12 },
                props: componentDef.defaultProps,
            });

            const updatedPage = {
                ...currentPage,
                components: [...currentPage.components, newComponent],
            };

            const updatedPages = app.pages.map((p) =>
                p.id === currentPage.id ? updatedPage : p
            );

            setApp({ ...app, pages: updatedPages });
            setCurrentPage(updatedPage);
            setSelectedComponent(newComponent);
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to add component:', error);
        }
    }, [app, id, currentPage]);

    // Update component
    const handleUpdateComponent = useCallback(async (componentId: string, updates: Partial<PageComponent>) => {
        if (!app || !id || !currentPage) return;

        try {
            const updatedComponent = await updateComponent(id, currentPage.id, componentId, updates);

            const updatedComponents = currentPage.components.map((c) =>
                c.id === componentId ? updatedComponent : c
            );

            const updatedPage = { ...currentPage, components: updatedComponents };
            const updatedPages = app.pages.map((p) =>
                p.id === currentPage.id ? updatedPage : p
            );

            setApp({ ...app, pages: updatedPages });
            setCurrentPage(updatedPage);
            setSelectedComponent(updatedComponent);
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to update component:', error);
        }
    }, [app, id, currentPage]);

    // Delete component
    const handleDeleteComponent = useCallback(async (componentId: string) => {
        if (!app || !id || !currentPage) return;

        try {
            await deleteComponent(id, currentPage.id, componentId);

            const updatedComponents = currentPage.components.filter((c) => c.id !== componentId);
            const updatedPage = { ...currentPage, components: updatedComponents };
            const updatedPages = app.pages.map((p) =>
                p.id === currentPage.id ? updatedPage : p
            );

            setApp({ ...app, pages: updatedPages });
            setCurrentPage(updatedPage);
            setSelectedComponent(null);
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to delete component:', error);
        }
    }, [app, id, currentPage]);

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-surface-950">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (!app) {
        return (
            <div className="h-screen flex items-center justify-center bg-surface-950">
                <div className="text-center">
                    <h2 className="text-xl font-medium text-surface-200 mb-2">App not found</h2>
                    <Button variant="secondary" onClick={() => navigate('/apps')}>
                        Back to Apps
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-surface-950">
            {/* Top Toolbar */}
            <div className="h-14 bg-surface-900 border-b border-surface-700 flex items-center justify-between px-4">
                {/* Left */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/apps')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-surface-700" />
                    <div className="flex items-center gap-2">
                        <Input
                            value={app.name}
                            onChange={(e) => {
                                setApp({ ...app, name: e.target.value });
                                setHasUnsavedChanges(true);
                            }}
                            className="bg-transparent border-transparent hover:border-surface-600 focus:border-primary-500 text-surface-100 font-medium w-48"
                        />
                        {hasUnsavedChanges && (
                            <span className="text-xs text-amber-400">Unsaved</span>
                        )}
                    </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving || !hasUnsavedChanges}
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save
                    </Button>
                    <Button variant="primary" size="sm">
                        <Play className="w-4 h-4 mr-2" />
                        Publish
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Pages & Components */}
                <div className="w-64 bg-surface-900 border-r border-surface-700 flex flex-col">
                    {/* Pages Section */}
                    <div className="p-3 border-b border-surface-700">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide">
                                Pages
                            </h3>
                            <button
                                onClick={handleAddPage}
                                className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-1">
                            {app.pages.map((page) => (
                                <div
                                    key={page.id}
                                    className={cn(
                                        'flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer group',
                                        currentPage?.id === page.id
                                            ? 'bg-primary-500/20 text-primary-300'
                                            : 'text-surface-300 hover:bg-surface-800'
                                    )}
                                    onClick={() => {
                                        setCurrentPage(page);
                                        setSelectedComponent(null);
                                    }}
                                >
                                    <GripVertical className="w-3 h-3 text-surface-600 opacity-0 group-hover:opacity-100" />
                                    <span className="flex-1 truncate">{page.name}</span>
                                    {app.pages.length > 1 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeletePage(page.id);
                                            }}
                                            className="p-1 rounded hover:bg-surface-700 text-surface-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Components Palette */}
                    <div className="flex-1 overflow-y-auto">
                        <ComponentPalette onDragComponent={handleAddComponent} />
                    </div>
                </div>

                {/* Center Canvas */}
                <div className="flex-1 bg-surface-950 overflow-auto">
                    {currentPage ? (
                        <PageCanvas
                            page={currentPage}
                            selectedComponent={selectedComponent}
                            onSelectComponent={setSelectedComponent}
                            onDeleteComponent={handleDeleteComponent}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <p className="text-surface-500">No page selected</p>
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Properties */}
                {selectedComponent && (
                    <div className="w-72 bg-surface-900 border-l border-surface-700">
                        <ComponentPropertiesPanel
                            component={selectedComponent}
                            onUpdate={(updates: Partial<PageComponent>) => handleUpdateComponent(selectedComponent.id, updates)}
                            onDelete={() => handleDeleteComponent(selectedComponent.id)}
                            onClose={() => setSelectedComponent(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
