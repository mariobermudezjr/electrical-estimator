import { create } from 'zustand';
import { ScheduledJob, ScheduledJobFormData } from '@/types/calendar';

interface CalendarStore {
  jobs: ScheduledJob[];
  selectedDate: string | null; // ISO date string YYYY-MM-DD
  selectedJob: ScheduledJob | null;
  currentMonth: number; // 0-11
  currentYear: number;
  isLoading: boolean;
  error: string | null;
  formOpen: boolean;
  formEditId: string | null;

  // Actions
  fetchJobs: () => Promise<void>;
  setMonth: (month: number, year: number) => void;
  selectDate: (date: string | null) => void;
  selectJob: (job: ScheduledJob | null) => void;
  createJob: (data: ScheduledJobFormData) => Promise<void>;
  updateJob: (id: string, data: Partial<ScheduledJobFormData & { status: string }>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  sendReminder: (id: string) => Promise<void>;
  openForm: (editId?: string) => void;
  closeForm: () => void;
}

const now = new Date();

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  jobs: [],
  selectedDate: null,
  selectedJob: null,
  currentMonth: now.getMonth(),
  currentYear: now.getFullYear(),
  isLoading: false,
  error: null,
  formOpen: false,
  formEditId: null,

  fetchJobs: async () => {
    const { currentMonth, currentYear } = get();
    set({ isLoading: true, error: null });

    try {
      const res = await fetch(
        `/api/calendar?month=${currentMonth + 1}&year=${currentYear}`
      );
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const { data } = await res.json();
      set({ jobs: data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  setMonth: (month, year) => {
    set({ currentMonth: month, currentYear: year, selectedDate: null, selectedJob: null });
    // fetchJobs will be called by the component via useEffect
  },

  selectDate: (date) => {
    set({ selectedDate: date, selectedJob: null });
  },

  selectJob: (job) => {
    set({ selectedJob: job });
  },

  createJob: async (data) => {
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create job');
    }
    set({ formOpen: false, formEditId: null });
    get().fetchJobs();
  },

  updateJob: async (id, data) => {
    const res = await fetch(`/api/calendar/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update job');
    }
    set({ formOpen: false, formEditId: null, selectedJob: null });
    get().fetchJobs();
  },

  deleteJob: async (id) => {
    const res = await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete job');
    set({ selectedJob: null });
    get().fetchJobs();
  },

  sendReminder: async (id) => {
    const res = await fetch(`/api/calendar/${id}/notify`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send reminder');
    }
    get().fetchJobs();
  },

  openForm: (editId) => {
    set({ formOpen: true, formEditId: editId || null });
  },

  closeForm: () => {
    set({ formOpen: false, formEditId: null });
  },
}));
