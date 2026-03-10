export type InboxFolder = 'inbox' | 'archive' | 'deleted';
export type OutboxFolder = 'draft' | 'queued' | 'sent' | 'deleted' | 'archive';
export type EmailFolder = 'inbox' | 'drafts' | 'sent' | 'archive' | 'trash';

export interface EmailAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  data?: string; // base64 — excluded from list queries
}

export interface InboundEmail {
  id: string;
  folder: InboxFolder;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments: EmailAttachment[];
  isRead: boolean;
  isStarred: boolean;
  receivedAt: string;
  estimateId?: string;
  resendEmailId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutboundEmail {
  id: string;
  folder: OutboxFolder;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments: EmailAttachment[];
  isRead: boolean;
  isStarred: boolean;
  estimateId?: string;
  resendId?: string;
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// Normalized email for rendering in unified lists
export interface EmailMessage {
  id: string;
  type: 'inbound' | 'outbound';
  folder: string;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  preview: string;
  attachments: EmailAttachment[];
  isRead: boolean;
  isStarred: boolean;
  date: string; // receivedAt or sentAt or createdAt
  estimateId?: string;
  hasAttachments: boolean;
}

export interface ComposeEmailData {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  html: string;
  text: string;
  attachments: File[];
}

export interface FolderCounts {
  inbox: number;
  drafts: number;
  sent: number;
  archive: number;
  trash: number;
}
