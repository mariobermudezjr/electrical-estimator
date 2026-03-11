'use client';

import { useCalendarStore } from '@/lib/stores/calendar-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Clock,
  MapPin,
  User,
  Bell,
  Trash2,
  CheckCircle,
  XCircle,
  Edit,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function DayDetail() {
  const {
    selectedDate,
    selectedJob,
    jobs,
    selectJob,
    deleteJob,
    updateJob,
    sendReminder,
    openForm,
  } = useCalendarStore();

  if (!selectedDate) {
    return (
      <div className="w-80 flex-shrink-0 border-l border-border-primary bg-background-secondary flex flex-col items-center justify-center p-6">
        <CalendarDays className="w-12 h-12 text-text-tertiary mb-3" />
        <p className="text-sm text-text-secondary text-center">
          Select a date to view or schedule jobs
        </p>
      </div>
    );
  }

  const dayJobs = jobs.filter((j) => {
    const jDate = new Date(j.scheduledDate);
    const jStr = `${jDate.getFullYear()}-${String(jDate.getMonth() + 1).padStart(2, '0')}-${String(jDate.getDate()).padStart(2, '0')}`;
    return jStr === selectedDate;
  });

  const dateObj = new Date(selectedDate + 'T12:00:00');
  const dateLabel = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const statusVariant = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default' as const;
      case 'completed': return 'success' as const;
      case 'cancelled': return 'danger' as const;
      default: return 'outline' as const;
    }
  };

  // If a job is selected, show detail view
  if (selectedJob) {
    return (
      <div className="w-80 flex-shrink-0 border-l border-border-primary bg-background-secondary flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border-primary">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => selectJob(null)}
              className="text-xs text-text-tertiary hover:text-text-primary"
            >
              &larr; Back
            </button>
            <Badge variant={statusVariant(selectedJob.status)}>
              {selectedJob.status}
            </Badge>
          </div>
          <h3 className="text-sm font-semibold text-text-primary">{selectedJob.title}</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <User className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-text-primary">{selectedJob.clientName}</div>
              {selectedJob.clientEmail && (
                <div className="text-text-tertiary text-xs">{selectedJob.clientEmail}</div>
              )}
              {selectedJob.clientPhone && (
                <div className="text-text-tertiary text-xs">{selectedJob.clientPhone}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            <span className="text-text-primary">
              {selectedJob.startTime} — {selectedJob.endTime}
            </span>
          </div>

          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
            <span className="text-text-primary">{selectedJob.location}</span>
          </div>

          {selectedJob.description && (
            <div className="text-sm text-text-secondary mt-2">
              {selectedJob.description}
            </div>
          )}

          {selectedJob.notes && (
            <div className="text-xs text-text-tertiary mt-2 p-2 rounded bg-background-primary">
              {selectedJob.notes}
            </div>
          )}

          <div className="text-xs text-text-tertiary space-y-1 mt-3">
            <div>Day-before reminder: {selectedJob.reminderDayBeforeSent ? 'Sent' : 'Pending'}</div>
            <div>Morning-of reminder: {selectedJob.reminderMorningOfSent ? 'Sent' : 'Pending'}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 border-t border-border-primary space-y-2">
          {selectedJob.status === 'scheduled' && (
            <>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openForm(selectedJob.id)}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => sendReminder(selectedJob.id)}
                >
                  <Bell className="w-3 h-3 mr-1" />
                  Remind
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-accent-success"
                  onClick={() => updateJob(selectedJob.id, { status: 'completed' })}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Complete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-accent-danger"
                  onClick={() => updateJob(selectedJob.id, { status: 'cancelled' })}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-accent-danger"
            onClick={() => deleteJob(selectedJob.id)}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    );
  }

  // Show day's job list
  return (
    <div className="w-80 flex-shrink-0 border-l border-border-primary bg-background-secondary flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border-primary">
        <h3 className="text-sm font-semibold text-text-primary">{dateLabel}</h3>
        <p className="text-xs text-text-tertiary mt-0.5">
          {dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''} scheduled
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {dayJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <CalendarDays className="w-8 h-8 text-text-tertiary mb-2" />
            <p className="text-xs text-text-secondary text-center">No jobs scheduled</p>
          </div>
        ) : (
          <div className="divide-y divide-border-secondary">
            {dayJobs.map((job) => (
              <button
                key={job.id}
                onClick={() => selectJob(job)}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-background-elevated transition-colors'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-primary truncate">
                    {job.title}
                  </span>
                  <Badge variant={statusVariant(job.status)} className="text-[10px] ml-2">
                    {job.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {job.startTime}—{job.endTime}
                  </span>
                  <span className="flex items-center gap-1 truncate">
                    <User className="w-3 h-3" />
                    {job.clientName}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border-primary">
        <Button className="w-full" size="sm" onClick={() => openForm()}>
          <Plus className="w-4 h-4 mr-1" />
          Schedule Job
        </Button>
      </div>
    </div>
  );
}
