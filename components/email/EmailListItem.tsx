'use client';

import { EmailMessage } from '@/types/email';
import { useEmailStore } from '@/lib/stores/email-store';
import { cn } from '@/lib/utils/cn';
import { Star, Paperclip } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EmailListItemProps {
  email: EmailMessage;
}

export function EmailListItem({ email }: EmailListItemProps) {
  const { selectedEmailId, selectEmail, toggleStar } = useEmailStore();
  const isSelected = selectedEmailId === email.id;
  const isUnread = !email.isRead;

  const displayName =
    email.type === 'inbound'
      ? email.fromName || email.from
      : `To: ${email.to?.[0] || 'Unknown'}`;

  let dateStr: string;
  try {
    dateStr = formatDistanceToNow(new Date(email.date), { addSuffix: true });
  } catch {
    dateStr = '';
  }

  return (
    <div
      onClick={() => selectEmail(email.id)}
      className={cn(
        'flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border-secondary transition-colors',
        isSelected
          ? 'bg-background-elevated'
          : 'hover:bg-background-secondary',
        isUnread && 'border-l-2 border-l-accent-primary'
      )}
    >
      {/* Star */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleStar(email.id);
        }}
        className="mt-0.5 flex-shrink-0"
      >
        <Star
          className={cn(
            'w-4 h-4 transition-colors',
            email.isStarred
              ? 'fill-accent-warning text-accent-warning'
              : 'text-text-tertiary hover:text-text-secondary'
          )}
        />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-sm truncate',
              isUnread ? 'font-semibold text-text-primary' : 'text-text-secondary'
            )}
          >
            {displayName}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {email.hasAttachments && (
              <Paperclip className="w-3 h-3 text-text-tertiary" />
            )}
            <span className="text-xs text-text-tertiary whitespace-nowrap">
              {dateStr}
            </span>
          </div>
        </div>
        <div
          className={cn(
            'text-sm truncate',
            isUnread ? 'text-text-primary' : 'text-text-secondary'
          )}
        >
          {email.subject || '(no subject)'}
        </div>
        <div className="text-xs text-text-tertiary truncate mt-0.5">
          {email.preview || '\u00A0'}
        </div>
      </div>
    </div>
  );
}
