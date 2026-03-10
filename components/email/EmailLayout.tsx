'use client';

import { useEffect } from 'react';
import { useEmailStore } from '@/lib/stores/email-store';
import { EmailSidebar } from './EmailSidebar';
import { EmailList } from './EmailList';
import { EmailDetail } from './EmailDetail';
import { ComposeModal } from './ComposeModal';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function EmailLayout() {
  const { fetchEmails, fetchCounts } = useEmailStore();

  useEffect(() => {
    fetchEmails();
    fetchCounts();
  }, [fetchEmails, fetchCounts]);

  return (
    <div className="h-screen flex flex-col bg-background-primary">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border-primary bg-background-secondary">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <span className="text-text-tertiary">|</span>
        <h1 className="text-sm font-semibold text-text-primary">Mail</h1>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        <EmailSidebar />
        <EmailList />
        <EmailDetail />
      </div>

      {/* Compose modal overlay */}
      <ComposeModal />
    </div>
  );
}
