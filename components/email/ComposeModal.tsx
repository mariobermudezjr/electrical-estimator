'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useEmailStore } from '@/lib/stores/email-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Paperclip, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'link'],
    ['clean'],
  ],
};

const QUILL_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'list',
  'bullet',
  'blockquote',
  'link',
];

export function ComposeModal() {
  const { composeOpen, composeMode, composePrefill, closeCompose, sendEmail, saveDraft } =
    useEmailStore();

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens with new prefill
  useEffect(() => {
    if (composeOpen) {
      setTo(composePrefill?.to || '');
      setCc(composePrefill?.cc || '');
      setBcc(composePrefill?.bcc || '');
      setSubject(composePrefill?.subject || '');
      setHtml(composePrefill?.html || '');
      setAttachments([]);
      setError('');
      setSending(false);
      if (composePrefill?.cc || composePrefill?.bcc) {
        setShowCcBcc(true);
      }
    }
  }, [composeOpen, composePrefill]);

  const handleSend = useCallback(async () => {
    if (!to.trim()) {
      setError('Please enter a recipient');
      return;
    }
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }

    setSending(true);
    setError('');

    try {
      // Strip HTML tags for plain text version
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const text = tempDiv.textContent || tempDiv.innerText || '';

      await sendEmail({ to, cc, bcc, subject, html, text, attachments });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
      setSending(false);
    }
  }, [to, cc, bcc, subject, html, attachments, sendEmail]);

  const handleSaveDraft = useCallback(async () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const text = tempDiv.textContent || tempDiv.innerText || '';

      await saveDraft({ to, cc, bcc, subject, html, text, attachments });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    }
  }, [to, cc, bcc, subject, html, attachments, saveDraft]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  if (!composeOpen) return null;

  const modeLabel =
    composeMode === 'reply' ? 'Reply' : composeMode === 'forward' ? 'Forward' : 'New Message';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-background-tertiary border border-border-primary rounded-lg shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary bg-background-secondary rounded-t-lg">
          <h3 className="text-sm font-semibold text-text-primary">{modeLabel}</h3>
          <button
            onClick={closeCompose}
            className="p-1 rounded hover:bg-background-elevated text-text-tertiary hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-3 space-y-2">
            {/* To */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-tertiary w-8">To</label>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 h-8 text-sm"
              />
              <button
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-xs text-text-tertiary hover:text-text-secondary flex items-center gap-0.5"
              >
                Cc/Bcc
                {showCcBcc ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>

            {/* CC / BCC */}
            {showCcBcc && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-tertiary w-8">Cc</label>
                  <Input
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="cc@example.com"
                    className="flex-1 h-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-tertiary w-8">Bcc</label>
                  <Input
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="bcc@example.com"
                    className="flex-1 h-8 text-sm"
                  />
                </div>
              </>
            )}

            {/* Subject */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-tertiary w-8">Subj</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 h-8 text-sm"
              />
            </div>
          </div>

          {/* Rich text editor */}
          <div className="px-4 pt-3">
            <div className="compose-editor rounded-lg border border-border-primary overflow-hidden">
              <ReactQuill
                theme="snow"
                value={html}
                onChange={setHtml}
                modules={QUILL_MODULES}
                formats={QUILL_FORMATS}
                placeholder="Write your message..."
              />
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-4 pt-3">
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-background-elevated border border-border-primary text-xs"
                  >
                    <Paperclip className="w-3 h-3 text-text-tertiary" />
                    <span className="text-text-secondary max-w-[150px] truncate">
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="text-text-tertiary hover:text-accent-danger"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 text-xs text-accent-danger">{error}</div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
          <div className="flex items-center gap-2">
            <Button onClick={handleSend} size="sm" disabled={sending}>
              {sending ? 'Sending...' : 'Send'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={sending}>
              Save Draft
            </Button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded hover:bg-background-elevated text-text-tertiary hover:text-text-secondary"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <button
            onClick={closeCompose}
            className="p-2 rounded hover:bg-background-elevated text-text-tertiary hover:text-accent-danger"
            title="Discard"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
