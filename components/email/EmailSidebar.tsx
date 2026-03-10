'use client';

import { useEmailStore } from '@/lib/stores/email-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { EmailFolder } from '@/types/email';
import {
  Inbox,
  FileEdit,
  Send,
  Archive,
  Trash2,
  PenSquare,
} from 'lucide-react';

const folders: { key: EmailFolder; label: string; icon: typeof Inbox }[] = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'drafts', label: 'Drafts', icon: FileEdit },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'archive', label: 'Archive', icon: Archive },
  { key: 'trash', label: 'Trash', icon: Trash2 },
];

export function EmailSidebar() {
  const { currentFolder, setFolder, counts, openCompose } = useEmailStore();

  return (
    <div className="w-56 flex-shrink-0 border-r border-border-primary bg-background-secondary p-3 flex flex-col">
      <Button
        className="w-full mb-4"
        onClick={() => openCompose('new')}
      >
        <PenSquare className="w-4 h-4 mr-2" />
        Compose
      </Button>

      <nav className="flex flex-col gap-0.5">
        {folders.map(({ key, label, icon: Icon }) => {
          const count = counts[key] || 0;
          const isActive = currentFolder === key;

          return (
            <button
              key={key}
              onClick={() => setFolder(key)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-background-elevated text-accent-primary'
                  : 'text-text-secondary hover:bg-background-elevated hover:text-text-primary'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                    isActive
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'bg-background-primary text-text-tertiary'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
