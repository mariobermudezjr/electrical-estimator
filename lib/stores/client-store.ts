import { create } from 'zustand';
import { Client } from '@/types/client';

interface ClientStore {
  clients: Client[];
  isLoading: boolean;
  error: string | null;

  fetchClients: () => Promise<void>;
  addClient: (client: { name: string; email?: string; phone?: string }) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  getClient: (id: string) => Client | undefined;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

function parseClientDates(client: any): Client {
  return {
    ...client,
    createdAt: new Date(client.createdAt),
    updatedAt: new Date(client.updatedAt),
  };
}

export const useClientStore = create<ClientStore>((set, get) => ({
  clients: [],
  isLoading: false,
  error: null,

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchClients: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      const { data } = await response.json();
      const clients = data.map(parseClientDates);
      set({ clients, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  addClient: async (clientData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create client');
      }

      const { data } = await response.json();
      const client = parseClientDates(data);

      set((state) => ({
        clients: [...state.clients, client].sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: false,
      }));

      return client;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateClient: async (id, updates) => {
    const previousClients = get().clients;
    set((state) => ({
      clients: state.clients.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
      ),
    }));

    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        set({ clients: previousClients });
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update client');
      }

      const { data } = await response.json();
      const client = parseClientDates(data);

      set((state) => ({
        clients: state.clients.map((c) => (c.id === id ? client : c)),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
      throw error;
    }
  },

  deleteClient: async (id) => {
    const previousClients = get().clients;
    set((state) => ({
      clients: state.clients.filter((c) => c.id !== id),
    }));

    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        set({ clients: previousClients });
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete client');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
      throw error;
    }
  },

  getClient: (id) => {
    return get().clients.find((c) => c.id === id);
  },
}));
