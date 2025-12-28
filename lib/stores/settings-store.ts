import { create } from 'zustand';

// Settings without API keys (those are server-side only now)
export interface UserSettings {
  companyName: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  defaultHourlyRate: number;
  defaultMarkupPercentage: number;
  preferredAIProvider: 'openai' | 'anthropic';
  theme: 'dark' | 'light';
}

export const defaultSettings: UserSettings = {
  companyName: 'My Electrical Company',
  defaultHourlyRate: 75,
  defaultMarkupPercentage: 20,
  preferredAIProvider: 'openai',
  theme: 'dark',
};

interface SettingsStore {
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;

  // API operations
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  error: null,

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const { data } = await response.json();
      set({ settings: data, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateSettings: async (updates) => {
    // Optimistic update
    const previousSettings = get().settings;
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        // Rollback on error
        set({ settings: previousSettings });
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update settings');
      }

      const { data } = await response.json();
      set({ settings: data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
      throw error;
    }
  },

  resetSettings: async () => {
    await get().updateSettings(defaultSettings);
  },
}));
