'use client';

import { useEffect, useRef } from 'react';
import { useEmailStore } from '@/lib/stores/email-store';
import { EmailListItem } from './EmailListItem';
import { Input } from '@/components/ui/input';
import { Search, Mail } from 'lucide-react';

export function EmailList() {
  const { emails, isLoading, currentFolder, searchQuery, setSearchQuery } =
    useEmailStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const folderLabels: Record<string, string> = {
    inbox: 'Inbox',
    drafts: 'Drafts',
    sent: 'Sent',
    archive: 'Archive',
    trash: 'Trash',
  };

  return (
    <div className="w-80 flex-shrink-0 border-r border-border-primary bg-background-primary flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border-primary">
        <h2 className="text-sm font-semibold text-text-primary mb-2">
          {folderLabels[currentFolder] || currentFolder}
        </h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <Input
            placeholder="Search emails..."
            defaultValue={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-background-elevated rounded w-3/4 mb-1.5" />
                <div className="h-3 bg-background-elevated rounded w-full mb-1" />
                <div className="h-3 bg-background-elevated rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Mail className="w-10 h-10 text-text-tertiary mb-3" />
            <p className="text-sm text-text-secondary text-center">
              {searchQuery
                ? 'No emails match your search'
                : `No emails in ${folderLabels[currentFolder]?.toLowerCase()}`}
            </p>
          </div>
        ) : (
          emails.map((email) => (
            <EmailListItem key={email.id} email={email} />
          ))
        )}
      </div>
    </div>
  );
}
