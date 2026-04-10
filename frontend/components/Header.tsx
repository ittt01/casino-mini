'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Coins, User, LogOut, Crown, Settings, Menu, X, Music, VolumeX } from 'lucide-react';
import { useBGM } from '@/contexts/BGMContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Header: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { isMuted, toggleMute } = useBGM();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const navLinks = [
    { href: '/', label: 'Lobby' },
    { href: '/games', label: 'Games' },
    ...(isAdmin ? [{ href: '/admin/settings', label: 'Admin' }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group shrink-0">
            <Crown className="w-7 h-7 sm:w-8 sm:h-8 text-casino-gold group-hover:animate-pulse-gold transition-all" />
            <span className="text-lg sm:text-2xl font-bold text-gold-gradient">
              Golden Casino
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-casino-gold flex items-center space-x-1 ${
                  pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href))
                    ? 'text-casino-gold'
                    : 'text-casino-text-secondary'
                }`}
              >
                {link.href === '/admin/settings' && <Settings className="w-4 h-4" />}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {isAuthenticated ? (
              <>
                {/* Balance Display */}
                <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-casino-card rounded-full border border-casino-gold/30">
                  <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-casino-gold" />
                  <span className="text-casino-gold font-semibold text-xs sm:text-sm">
                    {formatCurrency(user?.balance || 0)}
                  </span>
                </div>

                {/* User avatar + logout — always visible */}
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-casino-card transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-casino-gold to-casino-gold-dark flex items-center justify-center">
                      <User className="w-4 h-4 text-casino-dark" />
                    </div>
                    <span className="text-sm text-casino-text-primary">
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
              <div className="hidden sm:flex items-center space-x-3">
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

            {/* BGM Toggle */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg hover:bg-casino-card transition-colors"
              aria-label={isMuted ? 'Unmute music' : 'Mute music'}
              title={isMuted ? 'Unmute music' : 'Mute music'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-casino-text-secondary" />
              ) : (
                <Music className="w-5 h-5 text-casino-gold animate-pulse" />
              )}
            </button>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-lg hover:bg-casino-card text-casino-text-secondary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-t border-casino-gold/20">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href))
                    ? 'bg-casino-gold/10 text-casino-gold'
                    : 'text-casino-text-secondary hover:bg-casino-card hover:text-white'
                }`}
              >
                {link.href === '/admin/settings' && <Settings className="w-4 h-4" />}
                <span>{link.label}</span>
              </Link>
            ))}

            {/* Mobile auth / user section */}
            <div className="pt-2 border-t border-casino-gold/10 mt-2">
              {isAuthenticated ? (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-casino-gold to-casino-gold-dark flex items-center justify-center">
                      <User className="w-4 h-4 text-casino-dark" />
                    </div>
                    <span className="text-sm text-casino-text-primary">{user?.username}</span>
                  </div>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="flex items-center space-x-1 text-sm text-casino-text-secondary hover:text-casino-red transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 px-4">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-lg border border-casino-gold/30 text-casino-gold text-sm font-medium hover:bg-casino-gold/10 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 bg-gradient-to-r from-casino-gold to-casino-gold-dark text-casino-dark font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
