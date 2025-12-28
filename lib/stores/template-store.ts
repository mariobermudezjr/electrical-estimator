import { create } from 'zustand';
import { ScopeTemplate, CreateTemplateInput, UpdateTemplateInput } from '@/types/template';
import { WorkType } from '@/types/estimate';

interface TemplateStore {
  templates: ScopeTemplate[];
  isLoading: boolean;
  error: string | null;

  // CRUD operations
  fetchTemplates: (workType?: WorkType, sortBy?: 'createdAt' | 'usageCount' | 'name') => Promise<void>;
  addTemplate: (template: CreateTemplateInput) => Promise<ScopeTemplate>;
  updateTemplate: (id: string, updates: UpdateTemplateInput) => Promise<void>;
  deleteTemplate: (id: string, hardDelete?: boolean) => Promise<void>;
  useTemplate: (id: string) => Promise<ScopeTemplate>; // Increment usage & return template
  getTemplate: (id: string) => ScopeTemplate | undefined;

  // Filtering helpers
  getTemplatesByWorkType: (workType: WorkType) => ScopeTemplate[];
  getPopularTemplates: (limit?: number) => ScopeTemplate[];

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAll: () => void;
}

// Helper function to parse dates
function parseTemplateDates(template: any): ScopeTemplate {
  return {
    ...template,
    createdAt: new Date(template.createdAt),
    updatedAt: new Date(template.updatedAt),
  };
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  isLoading: false,
  error: null,

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchTemplates: async (workType?, sortBy = 'createdAt') => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({
        sortBy,
        activeOnly: 'true',
      });
      if (workType) params.set('workType', workType);

      const response = await fetch(`/api/templates?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const { data } = await response.json();
      const templates = data.map(parseTemplateDates);
      set({ templates, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  addTemplate: async (templateData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create template');
      }

      const { data } = await response.json();
      const template = parseTemplateDates(data);

      set((state) => ({
        templates: [template, ...state.templates],
        isLoading: false,
      }));

      return template;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateTemplate: async (id, updates) => {
    const previousTemplates = get().templates;

    // Optimistic update
    set((state) => ({
      templates: state.templates.map((tpl) =>
        tpl.id === id ? { ...tpl, ...updates, updatedAt: new Date() } : tpl
      ),
    }));

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        set({ templates: previousTemplates });
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update template');
      }

      const { data } = await response.json();
      const template = parseTemplateDates(data);

      set((state) => ({
        templates: state.templates.map((tpl) => (tpl.id === id ? template : tpl)),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
      throw error;
    }
  },

  deleteTemplate: async (id, hardDelete = false) => {
    const previousTemplates = get().templates;

    // Optimistic delete (remove from list)
    set((state) => ({
      templates: state.templates.filter((tpl) => tpl.id !== id),
    }));

    try {
      const url = hardDelete ? `/api/templates/${id}?hard=true` : `/api/templates/${id}`;
      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        set({ templates: previousTemplates });
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
      throw error;
    }
  },

  useTemplate: async (id) => {
    try {
      const response = await fetch(`/api/templates/${id}/use`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to track template usage');
      }

      const { data } = await response.json();
      const template = parseTemplateDates(data);

      // Update usage count in store
      set((state) => ({
        templates: state.templates.map((tpl) =>
          tpl.id === id ? template : tpl
        ),
      }));

      return template;
    } catch (error) {
      console.error('Error tracking template usage:', error);
      // Non-critical error, return template from store
      const template = get().getTemplate(id);
      if (!template) throw new Error('Template not found');
      return template;
    }
  },

  getTemplate: (id) => {
    return get().templates.find((tpl) => tpl.id === id);
  },

  getTemplatesByWorkType: (workType) => {
    return get().templates.filter((tpl) =>
      tpl.isActive && tpl.workTypes.includes(workType)
    );
  },

  getPopularTemplates: (limit = 5) => {
    return [...get().templates]
      .filter((tpl) => tpl.isActive)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  },

  clearAll: () => set({ templates: [], error: null }),
}));
