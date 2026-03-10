import { create } from 'zustand';
import {
  EmailMessage,
  EmailFolder,
  FolderCounts,
  ComposeEmailData,
  InboundEmail,
  OutboundEmail,
} from '@/types/email';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeInbound(e: InboundEmail): EmailMessage {
  const text = e.text || '';
  const previewSource = text || (e.html ? stripHtml(e.html) : '');
  return {
    id: e.id,
    type: 'inbound',
    folder: e.folder,
    from: e.fromName || e.from,
    fromName: e.fromName,
    to: e.to,
    cc: e.cc,
    subject: e.subject,
    html: e.html,
    text: e.text,
    preview: previewSource.slice(0, 120).replace(/\n/g, ' '),
    attachments: e.attachments,
    isRead: e.isRead,
    isStarred: e.isStarred,
    date: e.receivedAt || e.createdAt,
    estimateId: e.estimateId,
    hasAttachments: e.attachments?.length > 0,
  };
}

function normalizeOutbound(e: OutboundEmail): EmailMessage {
  const text = e.text || '';
  const previewSource = text || (e.html ? stripHtml(e.html) : '');
  return {
    id: e.id,
    type: 'outbound',
    folder: e.folder,
    from: e.from,
    to: e.to,
    cc: e.cc,
    bcc: e.bcc,
    subject: e.subject,
    html: e.html,
    text: e.text,
    preview: previewSource.slice(0, 120).replace(/\n/g, ' '),
    attachments: e.attachments,
    isRead: e.isRead ?? true,
    isStarred: e.isStarred ?? false,
    date: e.sentAt || e.createdAt,
    estimateId: e.estimateId,
    hasAttachments: e.attachments?.length > 0,
  };
}

interface EmailStore {
  // State
  currentFolder: EmailFolder;
  emails: EmailMessage[];
  selectedEmailId: string | null;
  selectedEmail: EmailMessage | null;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;
  counts: FolderCounts;
  composeOpen: boolean;
  composeMode: 'new' | 'reply' | 'forward';
  composePrefill: Partial<ComposeEmailData> | null;
  searchQuery: string;

  // Actions
  setFolder: (folder: EmailFolder) => void;
  fetchEmails: () => Promise<void>;
  fetchCounts: () => Promise<void>;
  selectEmail: (id: string | null) => Promise<void>;
  archiveEmail: (id: string) => Promise<void>;
  deleteEmail: (id: string) => Promise<void>;
  permanentDeleteEmail: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  openCompose: (mode?: 'new' | 'reply' | 'forward', prefill?: Partial<ComposeEmailData>) => void;
  closeCompose: () => void;
  sendEmail: (data: ComposeEmailData) => Promise<void>;
  saveDraft: (data: ComposeEmailData, existingId?: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
}

// Map UI folder names to API parameters
function getFolderApiParams(folder: EmailFolder): { endpoint: string; query: string } {
  switch (folder) {
    case 'inbox':
      return { endpoint: '/api/email/inbound', query: 'folder=inbox' };
    case 'drafts':
      return { endpoint: '/api/outbound-email', query: 'folder=draft' };
    case 'sent':
      return { endpoint: '/api/outbound-email', query: 'folder=sent' };
    case 'archive':
      return { endpoint: '/api/email/archive', query: '' };
    case 'trash':
      return { endpoint: '/api/email/trash', query: '' };
  }
}

export const useEmailStore = create<EmailStore>((set, get) => ({
  currentFolder: 'inbox',
  emails: [],
  selectedEmailId: null,
  selectedEmail: null,
  isLoading: false,
  isLoadingDetail: false,
  error: null,
  counts: { inbox: 0, drafts: 0, sent: 0, archive: 0, trash: 0 },
  composeOpen: false,
  composeMode: 'new',
  composePrefill: null,
  searchQuery: '',

  setFolder: (folder) => {
    set({ currentFolder: folder, selectedEmailId: null, selectedEmail: null, searchQuery: '' });
    get().fetchEmails();
  },

  fetchEmails: async () => {
    const { currentFolder, searchQuery } = get();
    set({ isLoading: true, error: null });

    try {
      const { endpoint, query } = getFolderApiParams(currentFolder);
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const sep = query ? '?' + query + searchParam : searchParam ? '?' + searchParam.slice(1) : '';
      const res = await fetch(`${endpoint}${sep}`);
      if (!res.ok) throw new Error('Failed to fetch emails');
      const { data } = await res.json();

      let emails: EmailMessage[];
      if (currentFolder === 'inbox') {
        emails = (data as InboundEmail[]).map(normalizeInbound);
      } else if (currentFolder === 'archive' || currentFolder === 'trash') {
        // Combined endpoint returns { inbound, outbound }
        const inbound = ((data.inbound || []) as InboundEmail[]).map(normalizeInbound);
        const outbound = ((data.outbound || []) as OutboundEmail[]).map(normalizeOutbound);
        emails = [...inbound, ...outbound].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      } else {
        emails = (data as OutboundEmail[]).map(normalizeOutbound);
      }

      set({ emails, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  fetchCounts: async () => {
    try {
      const res = await fetch('/api/email/counts');
      if (!res.ok) return;
      const { data } = await res.json();
      set({ counts: data });
    } catch {
      // silent fail for counts
    }
  },

  selectEmail: async (id) => {
    if (!id) {
      set({ selectedEmailId: null, selectedEmail: null });
      return;
    }

    const { emails, currentFolder } = get();
    const email = emails.find((e) => e.id === id);
    set({ selectedEmailId: id, selectedEmail: email || null, isLoadingDetail: true });

    try {
      const isInbound = email?.type === 'inbound' ||
        currentFolder === 'inbox';
      const endpoint = isInbound
        ? `/api/email/inbound/${id}`
        : `/api/outbound-email/${id}`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch email');
      const { data } = await res.json();

      // Only update if this email is still selected (avoid race conditions)
      if (get().selectedEmailId !== id) return;

      const fullEmail = isInbound
        ? normalizeInbound(data as InboundEmail)
        : normalizeOutbound(data as OutboundEmail);

      // Merge: keep list data as fallback if detail fields are empty
      const merged: EmailMessage = {
        ...email,
        ...fullEmail,
        text: fullEmail.text || email?.text || '',
        html: fullEmail.html || email?.html || '',
        preview: fullEmail.preview || email?.preview || '',
      };

      set({ selectedEmail: merged, isLoadingDetail: false });

      // Mark as read if unread inbound
      if (isInbound && !data.isRead) {
        fetch(`/api/email/inbound/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        }).then(() => {
          set((state) => ({
            emails: state.emails.map((e) =>
              e.id === id ? { ...e, isRead: true } : e
            ),
            selectedEmail: state.selectedEmail?.id === id
              ? { ...state.selectedEmail, isRead: true }
              : state.selectedEmail,
          }));
          get().fetchCounts();
        });
      }
    } catch {
      // On error, keep the list version visible instead of clearing
      set({ isLoadingDetail: false });
    }
  },

  archiveEmail: async (id) => {
    const { emails, selectedEmailId } = get();
    const email = emails.find((e) => e.id === id);
    if (!email) return;

    // Optimistic update
    set({
      emails: emails.filter((e) => e.id !== id),
      ...(selectedEmailId === id ? { selectedEmailId: null, selectedEmail: null } : {}),
    });

    try {
      const endpoint =
        email.type === 'inbound'
          ? `/api/email/inbound/${id}`
          : `/api/outbound-email/${id}`;
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'archive' }),
      });
      get().fetchCounts();
    } catch {
      get().fetchEmails(); // rollback
    }
  },

  deleteEmail: async (id) => {
    const { emails, selectedEmailId } = get();
    const email = emails.find((e) => e.id === id);
    if (!email) return;

    set({
      emails: emails.filter((e) => e.id !== id),
      ...(selectedEmailId === id ? { selectedEmailId: null, selectedEmail: null } : {}),
    });

    try {
      const endpoint =
        email.type === 'inbound'
          ? `/api/email/inbound/${id}`
          : `/api/outbound-email/${id}`;
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'deleted' }),
      });
      get().fetchCounts();
    } catch {
      get().fetchEmails();
    }
  },

  permanentDeleteEmail: async (id) => {
    const { emails, selectedEmailId } = get();
    const email = emails.find((e) => e.id === id);
    if (!email) return;

    set({
      emails: emails.filter((e) => e.id !== id),
      ...(selectedEmailId === id ? { selectedEmailId: null, selectedEmail: null } : {}),
    });

    try {
      const endpoint =
        email.type === 'inbound'
          ? `/api/email/inbound/${id}`
          : `/api/outbound-email/${id}`;
      await fetch(endpoint, { method: 'DELETE' });
      get().fetchCounts();
    } catch {
      get().fetchEmails();
    }
  },

  toggleStar: async (id) => {
    const { emails } = get();
    const email = emails.find((e) => e.id === id);
    if (!email) return;

    const newStarred = !email.isStarred;
    set({
      emails: emails.map((e) => (e.id === id ? { ...e, isStarred: newStarred } : e)),
      selectedEmail:
        get().selectedEmail?.id === id
          ? { ...get().selectedEmail!, isStarred: newStarred }
          : get().selectedEmail,
    });

    try {
      const endpoint =
        email.type === 'inbound'
          ? `/api/email/inbound/${id}`
          : `/api/outbound-email/${id}`;
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: newStarred }),
      });
    } catch {
      get().fetchEmails();
    }
  },

  markRead: async (id) => {
    const { emails } = get();
    const email = emails.find((e) => e.id === id);
    if (!email || email.type !== 'inbound') return;

    set({
      emails: emails.map((e) => (e.id === id ? { ...e, isRead: true } : e)),
    });

    await fetch(`/api/email/inbound/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    });
    get().fetchCounts();
  },

  openCompose: (mode = 'new', prefill) => {
    set({ composeOpen: true, composeMode: mode, composePrefill: prefill || null });
  },

  closeCompose: () => {
    set({ composeOpen: false, composePrefill: null });
  },

  sendEmail: async (data) => {
    // Create draft then send
    const formData = await prepareEmailPayload(data);

    const createRes = await fetch('/api/outbound-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.error || 'Failed to create email');
    }
    const { data: draft } = await createRes.json();

    const sendRes = await fetch(`/api/outbound-email/${draft.id}/send`, {
      method: 'POST',
    });
    if (!sendRes.ok) {
      const err = await sendRes.json();
      throw new Error(err.error || 'Failed to send email');
    }

    set({ composeOpen: false, composePrefill: null });
    get().fetchEmails();
    get().fetchCounts();
  },

  saveDraft: async (data, existingId) => {
    const formData = await prepareEmailPayload(data);

    if (existingId) {
      const res = await fetch(`/api/outbound-email/${existingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to save draft');
    } else {
      const res = await fetch('/api/outbound-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to save draft');
    }

    set({ composeOpen: false, composePrefill: null });
    get().fetchEmails();
    get().fetchCounts();
  },

  setSearchQuery: (q) => {
    set({ searchQuery: q });
    get().fetchEmails();
  },
}));

async function prepareEmailPayload(data: ComposeEmailData) {
  const toList = data.to
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const ccList = data.cc
    ? data.cc
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const bccList = data.bcc
    ? data.bcc
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // Convert File objects to base64 attachments
  const attachments = await Promise.all(
    data.attachments.map(async (file) => {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((d, byte) => d + String.fromCharCode(byte), '')
      );
      return {
        filename: file.name,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        data: base64,
      };
    })
  );

  return {
    from: process.env.NEXT_PUBLIC_OUTBOUND_FROM_EMAIL || 'estimates@charlieselectric.online',
    to: toList,
    cc: ccList,
    bcc: bccList,
    subject: data.subject,
    html: data.html,
    text: data.text,
    attachments,
  };
}
