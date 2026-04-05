import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware
 *
 * IMPORTANT: This middleware runs SERVER-SIDE only and cannot access localStorage.
 * We use a dual approach:
 * 1. Middleware: Basic cookie check (catches unauthenticated server requests)
 * 2. RouteGuard Component: Client-side auth check with proper loading states
 *
 * For routes like /admin, we allow the request through and let the RouteGuard
 * component handle the client-side authentication check to avoid hydration issues.
 */

// Public routes that don't need auth
const publicRoutes = ['/login', '/register', '/'];

// Protected routes - require authentication
const protectedRoutes = ['/profile'];

// Admin routes - require admin role (handled client-side by RouteGuard)
const adminRoutes = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith('/api/'))) {
    return NextResponse.next();
  }

  // Check if it's a protected route (non-admin)
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  // For admin routes, we DO NOT check auth here - let RouteGuard handle it client-side
  // This avoids hydration mismatches between server and client
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  // Only do server-side redirect for non-admin protected routes
  if (isProtected && !isAdminRoute) {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // For admin routes and all other routes, let them through
  // The RouteGuard component will handle client-side auth checks
  return NextResponse.next();
}

export const config = {
  // Match all routes except static files and api
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
