'use client';

import { useEmailStore } from '@/lib/stores/email-store';
import { Button } from '@/components/ui/button';
import {
  Reply,
  Forward,
  Archive,
  Trash2,
  Star,
  Mail,
  Paperclip,
  ArrowLeft,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { format } from 'date-fns';

export function EmailDetail() {
  const {
    selectedEmail,
    selectedEmailId,
    isLoadingDetail,
    selectEmail,
    archiveEmail,
    deleteEmail,
    permanentDeleteEmail,
    toggleStar,
    openCompose,
    currentFolder,
  } = useEmailStore();

  if (!selectedEmailId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background-primary">
        <Mail className="w-16 h-16 text-text-tertiary mb-4" />
        <p className="text-text-secondary">Select an email to read</p>
      </div>
    );
  }

  if (isLoadingDetail && !selectedEmail) {
    return (
      <div className="flex-1 bg-background-primary p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-background-elevated rounded w-3/4" />
          <div className="h-4 bg-background-elevated rounded w-1/2" />
          <div className="h-px bg-border-primary my-4" />
          <div className="space-y-2">
            <div className="h-4 bg-background-elevated rounded w-full" />
            <div className="h-4 bg-background-elevated rounded w-5/6" />
            <div className="h-4 bg-background-elevated rounded w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!selectedEmail) return null;

  const email = selectedEmail;
  let dateStr = '';
  try {
    dateStr = format(new Date(email.date), 'MMM d, yyyy h:mm a');
  } catch {
    dateStr = email.date;
  }

  const handleReply = () => {
    openCompose('reply', {
      to: email.type === 'inbound' ? email.from : email.to?.[0] || '',
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      html: `<br/><br/><div style="border-left: 2px solid #ccc; padding-left: 12px; color: #666;">
        <p>On ${dateStr}, ${email.from} wrote:</p>
        ${email.html || `<p>${(email.text || '').replace(/\n/g, '<br/>')}</p>`}
      </div>`,
    });
  };

  const handleForward = () => {
    openCompose('forward', {
      subject: email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`,
      html: `<br/><br/><div style="border-left: 2px solid #ccc; padding-left: 12px; color: #666;">
        <p>---------- Forwarded message ----------</p>
        <p>From: ${email.from}<br/>Date: ${dateStr}<br/>Subject: ${email.subject}<br/>To: ${email.to?.join(', ')}</p>
        <br/>
        ${email.html || `<p>${(email.text || '').replace(/\n/g, '<br/>')}</p>`}
      </div>`,
    });
  };

  const handleDownloadAttachment = (attachment: { filename: string; originalName: string; mimeType: string; data?: string }) => {
    if (!attachment.data) return;
    const byteChars = atob(attachment.data);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: attachment.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.originalName || attachment.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDraft = email.type === 'outbound' && email.folder === 'draft';

  return (
    <div className="flex-1 flex flex-col bg-background-primary overflow-hidden">
      {/* Action bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-primary bg-background-secondary">
        <button
          onClick={() => selectEmail(null)}
          className="p-1.5 rounded hover:bg-background-elevated text-text-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {!isDraft && (
          <>
            <Button variant="ghost" size="sm" onClick={handleReply}>
              <Reply className="w-4 h-4 mr-1" />
              Reply
            </Button>
            <Button variant="ghost" size="sm" onClick={handleForward}>
              <Forward className="w-4 h-4 mr-1" />
              Forward
            </Button>
          </>
        )}

        {isDraft && (
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              openCompose('new', {
                to: email.to?.join(', ') || '',
                cc: email.cc?.join(', ') || '',
                bcc: email.bcc?.join(', ') || '',
                subject: email.subject,
                html: email.html || '',
                text: email.text || '',
              });
            }}
          >
            Edit Draft
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => archiveEmail(email.id)}
        >
          <Archive className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            currentFolder === 'trash'
              ? permanentDeleteEmail(email.id)
              : deleteEmail(email.id)
          }
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        <button
          onClick={() => toggleStar(email.id)}
          className="p-1.5 rounded hover:bg-background-elevated"
        >
          <Star
            className={cn(
              'w-4 h-4',
              email.isStarred
                ? 'fill-accent-warning text-accent-warning'
                : 'text-text-tertiary'
            )}
          />
        </button>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Subject */}
        <h1 className="text-xl font-semibold text-text-primary mb-3">
          {email.subject || '(no subject)'}
        </h1>

        {/* From / To / Date */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="text-sm">
              <span className="text-text-tertiary">From: </span>
              <span className="text-text-primary font-medium">
                {email.fromName ? `${email.fromName} <${email.from}>` : email.from}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-text-tertiary">To: </span>
              <span className="text-text-secondary">{email.to?.join(', ')}</span>
            </div>
            {email.cc && email.cc.length > 0 && (
              <div className="text-sm">
                <span className="text-text-tertiary">Cc: </span>
                <span className="text-text-secondary">{email.cc.join(', ')}</span>
              </div>
            )}
          </div>
          <span className="text-xs text-text-tertiary flex-shrink-0">{dateStr}</span>
        </div>

        <div className="h-px bg-border-primary my-4" />

        {/* Body */}
        {email.html ? (
          <div
            className="prose prose-invert prose-sm max-w-none text-text-primary
              [&_a]:text-accent-primary [&_a]:underline
              [&_blockquote]:border-l-2 [&_blockquote]:border-border-primary [&_blockquote]:pl-3 [&_blockquote]:text-text-tertiary"
            dangerouslySetInnerHTML={{ __html: email.html }}
          />
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-text-primary font-sans">
            {email.text}
          </pre>
        )}

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border-primary">
            <h3 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              {email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}
            </h3>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((att, i) => (
                <button
                  key={i}
                  onClick={() => handleDownloadAttachment(att)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-primary bg-background-secondary hover:bg-background-elevated transition-colors text-sm"
                >
                  <Download className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-text-primary">
                    {att.originalName || att.filename}
                  </span>
                  {att.size > 0 && (
                    <span className="text-text-tertiary text-xs">
                      ({formatBytes(att.size)})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
