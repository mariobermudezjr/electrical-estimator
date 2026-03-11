export type JobStatus = 'scheduled' | 'completed' | 'cancelled';

export interface ScheduledJob {
  id: string;
  estimateId?: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  title: string;
  description?: string;
  scheduledDate: string; // ISO date string
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "12:00"
  location: string;
  status: JobStatus;
  reminderDayBeforeSent: boolean;
  reminderMorningOfSent: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledJobFormData {
  estimateId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  title: string;
  description?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  location: string;
  notes?: string;
}
