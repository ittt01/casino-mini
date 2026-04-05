'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Admin root page - redirects to settings
 * The actual admin dashboard is at /admin/settings
 */
export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/settings');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center animated-bg">
      <div className="w-8 h-8 border-2 border-casino-gold/30 border-t-casino-gold rounded-full spinner" />
    </div>
  );
}
