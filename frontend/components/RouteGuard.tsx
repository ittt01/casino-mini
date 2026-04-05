'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

/**
 * Route Guard Component
 *
 * Handles authentication and authorization checks client-side.
 * Prevents flash of content by waiting for auth state to load.
 *
 * Usage:
 * <RouteGuard requireAuth>
 *   <ProtectedPage />
 * </RouteGuard>
 *
 * <RouteGuard requireAuth requireAdmin>
 *   <AdminPage />
 * </RouteGuard>
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = false,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    // Don't make decisions while auth is still loading from localStorage
    if (isLoading) {
      return;
    }

    // Auth has finished loading, now we can check authorization
    if (requireAuth && !isAuthenticated) {
      // Not authenticated, redirect to login
      const loginUrl = new URL('/login', window.location.origin);
      loginUrl.searchParams.set('redirect', pathname);
      router.replace(loginUrl.toString());
      return;
    }

    if (requireAdmin && !isAdmin) {
      // Not admin, redirect to home
      router.replace('/');
      return;
    }

    // All checks passed
    setIsAuthorized(true);
    setShowLoading(false);
  }, [isLoading, isAuthenticated, isAdmin, requireAuth, requireAdmin, pathname, router]);

  // Show loading spinner while checking auth state
  // This prevents the "flash" of protected content before redirect
  if (isLoading || showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center animated-bg">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-casino-gold animate-spin" />
          <p className="text-casino-text-secondary">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Not authorized and we're not redirecting yet
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center animated-bg">
        <div className="flex flex-col items-center space-y-4">
          <Lock className="w-12 h-12 text-casino-gold" />
          <p className="text-casino-text-secondary">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  // Authorized - render the protected content
  return <>{children}</>;
};

export default RouteGuard;
