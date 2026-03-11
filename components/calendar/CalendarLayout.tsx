'use client';

import { useEffect } from 'react';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { CalendarGrid } from './CalendarGrid';
import { DayDetail } from './DayDetail';
import { JobFormModal } from './JobFormModal';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function CalendarLayout() {
  const { fetchJobs } = useCalendarStore();

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return (
    <div className="h-screen flex flex-col bg-background-primary">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border-primary bg-background-secondary">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <span className="text-text-tertiary">|</span>
        <h1 className="text-sm font-semibold text-text-primary">Calendar</h1>
      </div>

      {/* Two-panel layout: calendar + day detail */}
      <div className="flex flex-1 overflow-hidden">
        <CalendarGrid />
        <DayDetail />
      </div>

      {/* Job form modal */}
      <JobFormModal />
    </div>
  );
}
