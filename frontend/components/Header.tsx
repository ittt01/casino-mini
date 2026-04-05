'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Coins, User, LogOut, Crown, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Header: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const pathname = usePathname();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <Crown className="w-8 h-8 text-casino-gold group-hover:animate-pulse-gold transition-all" />
            <span className="text-2xl font-bold text-gold-gradient">
              Golden Casino
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-casino-gold ${
                pathname === '/' ? 'text-casino-gold' : 'text-casino-text-secondary'
              }`}
            >
              Lobby
            </Link>
            <Link
              href="/games"
              className={`text-sm font-medium transition-colors hover:text-casino-gold ${
                pathname === '/games' ? 'text-casino-gold' : 'text-casino-text-secondary'
              }`}
            >
              Games
            </Link>
            {isAdmin && (
              <Link
                href="/admin/settings"
                className={`text-sm font-medium transition-colors hover:text-casino-gold flex items-center space-x-1 ${
                  pathname.startsWith('/admin') ? 'text-casino-gold' : 'text-casino-text-secondary'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}
          </nav>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Balance Display */}
                <div className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-casino-card rounded-full border border-casino-gold/30">
                  <Coins className="w-5 h-5 text-casino-gold" />
                  <span className="text-casino-gold font-semibold">
                    {formatCurrency(user?.balance || 0)}
                  </span>
                </div>

                {/* User Menu */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-casino-card transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-casino-gold to-casino-gold-dark flex items-center justify-center">
                      <User className="w-4 h-4 text-casino-dark" />
                    </div>
                    <span className="hidden sm:block text-sm text-casino-text-primary">
                      {user?.username}
                    </span>
                  </div>

                  <button
                    onClick={logout}
                    className="p-2 rounded-lg hover:bg-casino-card text-casino-text-secondary hover:text-casino-red transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-casino-text-secondary hover:text-casino-gold transition-colors text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-gradient-to-r from-casino-gold to-casino-gold-dark text-casino-dark font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
