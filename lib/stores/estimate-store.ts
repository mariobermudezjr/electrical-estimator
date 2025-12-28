import { create } from 'zustand';
import { Estimate } from '@/types/estimate';

interface EstimateStore {
  estimates: Estimate[];
  isLoading: boolean;
  error: string | null;

  // CRUD operations (async with API calls)
  fetchEstimates: () => Promise<void>;
  addEstimate: (estimate: Omit<Estimate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEstimate: (id: string, updates: Partial<Estimate>) => Promise<void>;
  deleteEstimate: (id: string) => Promise<void>;
  getEstimate: (id: string) => Estimate | undefined;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAll: () => void;
}

// Helper function to parse dates in API responses
function parseEstimateDates(estimate: any): Estimate {
  return {
    ...estimate,
    createdAt: new Date(estimate.createdAt),
    updatedAt: new Date(estimate.updatedAt),
    aiPricing: estimate.aiPricing
      ? {
          ...estimate.aiPricing,
          lastUpdated: new Date(estimate.aiPricing.lastUpdated),
        }
      : undefined,
  };
}

export const useEstimateStore = create<EstimateStore>((set, get) => ({
  estimates: [],
  isLoading: false,
  error: null,

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchEstimates: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/estimates');
      if (!response.ok) {
        throw new Error('Failed to fetch estimates');
      }

      const { data } = await response.json();
      const estimates = data.map(parseEstimateDates);
      set({ estimates, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  addEstimate: async (estimateData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create estimate');
      }

      const { data } = await response.json();
      const estimate = parseEstimateDates(data);

      set((state) => ({
        estimates: [estimate, ...state.estimates],
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateEstimate: async (id, updates) => {
    // Optimistic update
    const previousEstimates = get().estimates;
    set((state) => ({
      estimates: state.estimates.map((est) =>
        est.id === id ? { ...est, ...updates, updatedAt: new Date() } : est
      ),
    }));

    try {
      const response = await fetch(`/api/estimates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        // Rollback on error
        set({ estimates: previousEstimates });
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update estimate');
      }

      const { data } = await response.json();
      const estimate = parseEstimateDates(data);

      set((state) => ({
        estimates: state.estimates.map((est) => (est.id === id ? estimate : est)),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
      throw error;
    }
  },

  deleteEstimate: async (id) => {
    // Optimistic delete
    const previousEstimates = get().estimates;
    set((state) => ({
      estimates: state.estimates.filter((est) => est.id !== id),
    }));

    try {
      const response = await fetch(`/api/estimates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Rollback
        set({ estimates: previousEstimates });
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete estimate');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
      throw error;
    }
  },

  getEstimate: (id) => {
    return get().estimates.find((est) => est.id === id);
  },

  clearAll: () => set({ estimates: [], error: null }),
}));
