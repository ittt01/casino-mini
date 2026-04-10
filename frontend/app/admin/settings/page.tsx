'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { RouteGuard } from '@/components/RouteGuard';
import { Header } from '@/components/Header';
import {
  Shield,
  Gamepad2,
  Save,
  AlertCircle,
  CheckCircle,
  Percent,
  Settings,
  Search,
  RotateCcw,
  TrendingUp,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type definitions ─────────────────────────────────────────────────────────

interface GameConfig {
  _id: string;
  name: string;
  slug: string;
  description: string;
  winRate: number;
  category: 'slots' | 'table' | 'dice' | 'cards';
  isActive: boolean;
  minBet: number;
  maxBet: number;
  icon: string;
}

// ── Inner component ───────────────────────────────────────────────────────────
function AdminDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();

  const [games, setGames] = useState<GameConfig[]>([]);
  const [filteredGames, setFilteredGames] = useState<GameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedRates, setEditedRates] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchGames(); }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredGames(games);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredGames(
        games.filter(g => g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q))
      );
    }
  }, [searchQuery, games]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchGames = async () => {
    try {
      const response = await api.get('/games/admin/all');
      const fetched: GameConfig[] = response.data.games;
      setGames(fetched);
      setFilteredGames(fetched);

      const rates: Record<string, number> = {};
      fetched.forEach(g => { rates[g._id] = g.winRate; });
      setEditedRates(rates);
    } catch (error: any) {
      console.error('Failed to fetch games:', error);
      toast.error(error.response?.data?.message || 'Failed to load game configuration');
    } finally {
      setLoading(false);
    }
  };

  // ── Win-rate handlers ─────────────────────────────────────────────────────

  const handleWinRateChange = (gameId: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setEditedRates({ ...editedRates, [gameId]: num });
    }
  };

  const updateWinRate = async (gameId: string) => {
    setSaving(gameId);
    try {
      await api.patch(`/games/${gameId}/win-rate`, { winRate: editedRates[gameId] });
      toast.success('Win rate updated successfully');
      setGames(games.map(g => g._id === gameId ? { ...g, winRate: editedRates[gameId] } : g));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update win rate');
    } finally {
      setSaving(null);
    }
  };

  const resetChanges = (gameId: string) => {
    const game = games.find(g => g._id === gameId);
    if (game) setEditedRates({ ...editedRates, [gameId]: game.winRate });
  };

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen animated-bg pb-20">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-casino-gold/20 to-casino-gold/5 border border-casino-gold/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-casino-gold" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-casino-text-secondary">
                Welcome back, {user?.username} • Manage Golden Casino game settings
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-casino-panel rounded-xl border border-casino-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-casino-text-secondary">Total Games</p>
                <p className="text-2xl font-bold text-white">{games.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-casino-panel rounded-xl border border-casino-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-casino-text-secondary">Active Games</p>
                <p className="text-2xl font-bold text-casino-green">
                  {games.filter(g => g.isActive).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-casino-panel rounded-xl border border-casino-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-casino-text-secondary">Avg Win Rate</p>
                <p className="text-2xl font-bold text-casino-gold">
                  {games.length > 0
                    ? (games.reduce((acc, g) => acc + g.winRate, 0) / games.length).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-casino-gold/10 flex items-center justify-center">
                <Percent className="w-6 h-6 text-casino-gold" />
              </div>
            </div>
          </div>

          <div className="bg-casino-panel rounded-xl border border-casino-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-casino-text-secondary">Total Max Bets</p>
                <p className="text-2xl font-bold text-purple-400">
                  ${games.reduce((acc, g) => acc + g.maxBet, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-casino-text-muted" />
            <input
              type="text"
              placeholder="Search games by name or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-casino-panel border border-casino-border rounded-xl text-white placeholder-casino-text-muted focus:border-casino-gold focus:ring-1 focus:ring-casino-gold/20 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-casino-text-muted hover:text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Game Configuration Table */}
        <div className="bg-casino-panel rounded-xl border border-casino-border overflow-hidden">
          <div className="px-6 py-4 border-b border-casino-border flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-casino-gold" />
              <h2 className="text-lg font-semibold text-white">Game Configuration</h2>
            </div>
            <span className="text-sm text-casino-text-muted">
              {filteredGames.length} of {games.length} games
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-casino-gold/30 border-t-casino-gold rounded-full spinner mx-auto" />
              <p className="text-casino-text-secondary mt-4">Loading games...</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="p-8 text-center">
              <Gamepad2 className="w-12 h-12 text-casino-text-muted mx-auto mb-4" />
              <p className="text-casino-text-secondary">No games found matching your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-casino-card/50">
                    <th className="px-6 py-4 text-left text-xs font-medium text-casino-text-secondary uppercase tracking-wider">Game</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-casino-text-secondary uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-casino-text-secondary uppercase tracking-wider">Bet Range</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-casino-text-secondary uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-casino-text-secondary uppercase tracking-wider">Win Rate</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-casino-text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-casino-border">
                  {filteredGames.map(game => (
                    <tr key={game._id} className="hover:bg-casino-card/30 transition-colors">
                      {/* Game name */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{game.name}</p>
                          <p className="text-sm text-casino-text-muted">{game.description}</p>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-casino-card text-casino-text-secondary capitalize">
                          {game.category}
                        </span>
                      </td>

                      {/* Bet range */}
                      <td className="px-6 py-4">
                        <span className="text-casino-text-secondary text-sm">
                          ${game.minBet} – ${game.maxBet}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          game.isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {game.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Win rate slider */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <input
                            type="range" min="0" max="100"
                            value={editedRates[game._id] ?? game.winRate}
                            onChange={e => handleWinRateChange(game._id, e.target.value)}
                            className="w-24 accent-casino-gold"
                          />
                          <input
                            type="number" min="0" max="100"
                            value={editedRates[game._id] ?? game.winRate}
                            onChange={e => handleWinRateChange(game._id, e.target.value)}
                            className="w-16 px-2 py-1 bg-casino-card border border-casino-border rounded text-white text-center text-sm focus:border-casino-gold transition-colors"
                          />
                          <span className="text-casino-text-secondary">%</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateWinRate(game._id)}
                            disabled={saving === game._id || editedRates[game._id] === game.winRate}
                            className="inline-flex items-center space-x-1 px-4 py-2 bg-casino-gold text-casino-dark rounded-lg hover:bg-casino-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                          >
                            {saving === game._id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-casino-dark/30 border-t-casino-dark rounded-full spinner" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                <span>Save</span>
                              </>
                            )}
                          </button>

                          {editedRates[game._id] !== game.winRate && (
                            <button
                              onClick={() => resetChanges(game._id)}
                              className="p-2 text-casino-text-muted hover:text-white transition-colors"
                              title="Reset changes"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-1 text-blue-400">How Win Rates Work</p>
                <p className="text-casino-text-secondary">
                  The <strong className="text-white">Win Rate slider (0–100%)</strong> is the single factor
                  controlling game outcomes for all games — Slots, Dice, Roulette, Blackjack, and Lucky Wheel.
                  Set to <strong className="text-white">100%</strong> to guarantee every round is a win;
                  set to <strong className="text-white">0%</strong> to guarantee every round is a loss.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-casino-gold/5 border border-casino-gold/20 rounded-xl">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-casino-gold mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-1 text-casino-gold">Security Notice</p>
                <p className="text-casino-text-secondary">
                  All changes are logged and require admin JWT authentication.
                  Changes take effect immediately for all new game rounds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Page export (wrapped in RouteGuard) ───────────────────────────────────────
export default function AdminSettingsPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminDashboardContent />
    </RouteGuard>
  );
}
