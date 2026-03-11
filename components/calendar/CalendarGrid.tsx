'use client';

import { useCalendarStore } from '@/lib/stores/calendar-store';
import { cn } from '@/lib/utils/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CalendarGrid() {
  const { currentMonth, currentYear, setMonth, jobs, selectedDate, selectDate, fetchJobs } =
    useCalendarStore();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Build calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  // Previous month fill
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const m = currentMonth === 0 ? 11 : currentMonth - 1;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: currentMonth, year: currentYear, isCurrentMonth: true });
  }

  // Next month fill
  const remaining = 42 - cells.length; // 6 rows
  for (let d = 1; d <= remaining; d++) {
    const m = currentMonth === 11 ? 0 : currentMonth + 1;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  const getDateStr = (cell: typeof cells[0]) =>
    `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;

  const getJobsForDate = (dateStr: string) => {
    return jobs.filter((j) => {
      const jDate = new Date(j.scheduledDate);
      const jStr = `${jDate.getFullYear()}-${String(jDate.getMonth() + 1).padStart(2, '0')}-${String(jDate.getDate()).padStart(2, '0')}`;
      return jStr === dateStr;
    });
  };

  const handlePrev = () => {
    const m = currentMonth === 0 ? 11 : currentMonth - 1;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    setMonth(m, y);
    setTimeout(() => fetchJobs(), 0);
  };

  const handleNext = () => {
    const m = currentMonth === 11 ? 0 : currentMonth + 1;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    setMonth(m, y);
    setTimeout(() => fetchJobs(), 0);
  };

  const handleToday = () => {
    const now = new Date();
    setMonth(now.getMonth(), now.getFullYear());
    setTimeout(() => fetchJobs(), 0);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
        <div className="flex items-center gap-2">
          <button onClick={handlePrev} className="p-1.5 rounded hover:bg-background-elevated text-text-secondary">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-text-primary min-w-[200px] text-center">
            {MONTHS[currentMonth]} {currentYear}
          </h2>
          <button onClick={handleNext} className="p-1.5 rounded hover:bg-background-elevated text-text-secondary">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={handleToday}>
          Today
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border-primary">
        {DAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-xs font-medium text-text-tertiary text-center">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1">
        {cells.map((cell, i) => {
          const dateStr = getDateStr(cell);
          const dayJobs = getJobsForDate(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={i}
              onClick={() => selectDate(dateStr)}
              className={cn(
                'flex flex-col items-start p-1.5 border-b border-r border-border-secondary min-h-[80px] transition-colors text-left',
                !cell.isCurrentMonth && 'opacity-40',
                isSelected && 'bg-background-elevated',
                !isSelected && 'hover:bg-background-secondary'
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                  isToday && 'bg-accent-primary text-white',
                  !isToday && cell.isCurrentMonth && 'text-text-primary',
                  !isToday && !cell.isCurrentMonth && 'text-text-tertiary'
                )}
              >
                {cell.day}
              </span>
              {/* Job dots */}
              <div className="flex flex-col gap-0.5 mt-1 w-full">
                {dayJobs.slice(0, 3).map((job) => (
                  <div
                    key={job.id}
                    className={cn(
                      'text-[10px] leading-tight px-1 py-0.5 rounded truncate w-full',
                      job.status === 'scheduled' && 'bg-accent-primary/20 text-accent-primary',
                      job.status === 'completed' && 'bg-accent-success/20 text-accent-success',
                      job.status === 'cancelled' && 'bg-accent-danger/20 text-accent-danger line-through'
                    )}
                  >
                    {job.startTime} {job.clientName}
                  </div>
                ))}
                {dayJobs.length > 3 && (
                  <span className="text-[10px] text-text-tertiary px-1">
                    +{dayJobs.length - 3} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
