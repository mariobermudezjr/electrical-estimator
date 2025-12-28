'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

interface SignOutButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function SignOutButton({ variant = 'outline', size = 'default', className }: SignOutButtonProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <Button variant={variant} size={size} onClick={handleSignOut} className={className}>
      Sign Out
    </Button>
  );
}
