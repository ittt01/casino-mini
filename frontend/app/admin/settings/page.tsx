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
  SlidersHorizontal,
  RotateCcw,
  TrendingUp,
  X,
  Zap,
  Info,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type definitions ─────────────────────────────────────────────────────────

interface WheelAdvancedConfig {
  wheelWeights: Record<string, number>;
}

interface BlackjackAdvancedConfig {
  houseEdge: number;
  blackjackPays: number;
  dealerHitsSoft17: boolean;
}

type AdvancedConfig = WheelAdvancedConfig | BlackjackAdvancedConfig | Record<string, never>;

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
  advancedConfig?: AdvancedConfig;
}

// ── Static wheel metadata (mirrors frontend WHEEL_SEGMENTS) ──────────────────

const WHEEL_SEGMENTS_META = [
  { id: 0,  label: '0x',   color: '#DC2626', note: 'Lose all' },
  { id: 1,  label: '0.5x', color: '#7C3AED', note: 'Lose half' },
  { id: 2,  label: '2x',   color: '#16A34A', note: 'Double' },
  { id: 3,  label: '1x',   color: '#3B82F6', note: 'Break even' },
  { id: 4,  label: '3x',   color: '#D4AF37', note: 'Triple' },
  { id: 5,  label: '0.5x', color: '#7C3AED', note: 'Lose half' },
  { id: 6,  label: '5x',   color: '#FFD700', note: '5× payout' },
  { id: 7,  label: '1x',   color: '#3B82F6', note: 'Break even' },
  { id: 8,  label: '2x',   color: '#16A34A', note: 'Double' },
  { id: 9,  label: '10x',  color: '#FF6B00', note: '10× jackpot' },
  { id: 10, label: '1x',   color: '#3B82F6', note: 'Break even' },
  { id: 11, label: '2x',   color: '#16A34A', note: 'Double' },
];

// Default weights: broadly mirrors a standard wheel with the jackpot at ~1%
const DEFAULT_WHEEL_WEIGHTS: Record<string, number> = {
  '0': 30, '1': 15, '2': 12, '3': 8, '4': 8,
  '5': 10, '6': 5,  '7': 4,  '8': 3, '9': 1, '10': 2, '11': 2,
};

const DEFAULT_BLACKJACK_CONFIG: BlackjackAdvancedConfig = {
  houseEdge: 2,
  blackjackPays: 1.5,
  dealerHitsSoft17: true,
};

const BLACKJACK_PAYOUT_OPTIONS = [
  { value: 1.5, label: '3:2  (1.5× — Standard)' },
  { value: 1.2, label: '6:5  (1.2× — Higher house edge)' },
  { value: 1.0, label: 'Even Money  (1:1)' },
];

// Games that support advanced configuration
const ADVANCED_SLUGS = ['wheel', 'blackjack'];
const isComplexGame = (slug: string) => ADVANCED_SLUGS.includes(slug);

// ── Helper: sum of all wheel weights ─────────────────────────────────────────
const getTotalWeight = (weights: Record<string, number>) =>
  Object.values(weights).reduce((s, w) => s + w, 0);

// ── Inner component ───────────────────────────────────────────────────────────
function AdminDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();

  // ── Basic game list state
  const [games, setGames] = useState<GameConfig[]>([]);
  const [filteredGames, setFilteredGames] = useState<GameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedRates, setEditedRates] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [globalWinRate, setGlobalWinRate] = useState<number>(50);
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [applyingGlobal, setApplyingGlobal] = useState(false);

  // ── Advanced config state
  const [showAdvancedModal, setShowAdvancedModal] = useState<string | null>(null); // gameId
  const [draftConfigs, setDraftConfigs] = useState<Record<string, AdvancedConfig>>({});
  const [savingAdvanced, setSavingAdvanced] = useState(false);

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

  // ── Simple win-rate handlers ──────────────────────────────────────────────

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

  const applyGlobalWinRate = async () => {
    setApplyingGlobal(true);
    try {
      await api.patch('/games/admin/win-rate-global', { winRate: globalWinRate });
      toast.success(`Applied ${globalWinRate}% win rate to all games`);
      const newRates: Record<string, number> = {};
      games.forEach(g => { newRates[g._id] = globalWinRate; });
      setEditedRates(newRates);
      await fetchGames();
      setShowGlobalModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to apply global win rate');
    } finally {
      setApplyingGlobal(false);
    }
  };

  // ── Advanced config handlers ──────────────────────────────────────────────

  const openAdvancedModal = (game: GameConfig) => {
    let draft: AdvancedConfig;
    if (game.slug === 'wheel') {
      const saved = (game.advancedConfig as WheelAdvancedConfig)?.wheelWeights;
      draft = { wheelWeights: saved ? { ...saved } : { ...DEFAULT_WHEEL_WEIGHTS } };
    } else if (game.slug === 'blackjack') {
      draft = { ...DEFAULT_BLACKJACK_CONFIG, ...(game.advancedConfig ?? {}) };
    } else {
      draft = {};
    }
    setDraftConfigs(prev => ({ ...prev, [game._id]: draft }));
    setShowAdvancedModal(game._id);
  };

  const handleWheelWeightChange = (gameId: string, segId: string, value: string) => {
    const num = Math.max(0, parseFloat(value) || 0);
    const current = draftConfigs[gameId] as WheelAdvancedConfig;
    setDraftConfigs(prev => ({
      ...prev,
      [gameId]: { wheelWeights: { ...current.wheelWeights, [segId]: num } },
    }));
  };

  const handleBlackjackConfigChange = (
    gameId: string,
    field: keyof BlackjackAdvancedConfig,
    value: number | boolean,
  ) => {
    const current = (draftConfigs[gameId] ?? DEFAULT_BLACKJACK_CONFIG) as BlackjackAdvancedConfig;
    setDraftConfigs(prev => ({ ...prev, [gameId]: { ...current, [field]: value } }));
  };

  const resetWheelWeightsToDefault = (gameId: string) => {
    setDraftConfigs(prev => ({
      ...prev,
      [gameId]: { wheelWeights: { ...DEFAULT_WHEEL_WEIGHTS } },
    }));
  };

  const saveAdvancedConfig = async (gameId: string) => {
    setSavingAdvanced(true);
    try {
      await api.patch(`/games/${gameId}/advanced-config`, {
        advancedConfig: draftConfigs[gameId],
      });
      toast.success('Advanced configuration saved');
      setShowAdvancedModal(null);
      await fetchGames();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSavingAdvanced(false);
    }
  };

  const hasAdvancedConfig = (game: GameConfig): boolean => {
    if (!game.advancedConfig) return false;
    if (game.slug === 'wheel') return !!(game.advancedConfig as WheelAdvancedConfig)?.wheelWeights;
    if (game.slug === 'blackjack') return typeof (game.advancedConfig as BlackjackAdvancedConfig)?.houseEdge === 'number';
    return false;
  };

  // ── Modal content helpers ─────────────────────────────────────────────────

  const modalGame = showAdvancedModal ? games.find(g => g._id === showAdvancedModal) : null;
  const modalDraft = showAdvancedModal ? draftConfigs[showAdvancedModal] : null;

  const renderWheelModal = (gameId: string) => {
    const draft = modalDraft as WheelAdvancedConfig;
    if (!draft?.wheelWeights) return null;
    const total = getTotalWeight(draft.wheelWeights);
    const isNear100 = Math.abs(total - 100) < 0.1;

    return (
      <div className="space-y-4">
        {/* Info banner */}
        <div className="flex items-start space-x-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-blue-200">
            Weights are <strong>relative</strong> — they don&apos;t need to sum to 100%, but keeping the
            total at 100% makes it easy to read each weight as a percentage probability.
          </p>
        </div>

        {/* Total bar */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-casino-text-secondary">Total weight</span>
          <div className="flex items-center space-x-2">
            <div className="w-32 h-2 rounded-full bg-casino-card overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isNear100 ? 'bg-casino-gold' : total > 100 ? 'bg-red-500' : 'bg-yellow-500'}`}
                style={{ width: `${Math.min(100, (total / 100) * 100)}%` }}
              />
            </div>
            <span className={`text-sm font-bold ${isNear100 ? 'text-casino-gold' : 'text-yellow-400'}`}>
              {total.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Segment rows */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {WHEEL_SEGMENTS_META.map(seg => {
            const w = draft.wheelWeights[String(seg.id)] ?? 0;
            const pct = total > 0 ? ((w / total) * 100).toFixed(1) : '0.0';
            return (
              <div key={seg.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="w-10 text-sm font-bold text-white">{seg.label}</span>
                <span className="w-20 text-xs text-casino-text-muted hidden sm:block">{seg.note}</span>
                <input
                  type="range" min="0" max="100" step="0.5" value={w}
                  onChange={e => handleWheelWeightChange(gameId, String(seg.id), e.target.value)}
                  className="flex-1 accent-casino-gold"
                />
                <input
                  type="number" min="0" max="100" step="0.5" value={w}
                  onChange={e => handleWheelWeightChange(gameId, String(seg.id), e.target.value)}
                  className="w-16 px-2 py-1 bg-casino-card border border-casino-border rounded text-white text-center text-sm focus:border-casino-gold transition-colors"
                />
                <span className="w-14 text-xs text-casino-text-muted text-right">~{pct}%</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => resetWheelWeightsToDefault(gameId)}
          className="text-xs text-casino-text-muted hover:text-white transition-colors underline"
        >
          Reset to defaults
        </button>
      </div>
    );
  };

  const renderBlackjackModal = (gameId: string) => {
    const draft = modalDraft as BlackjackAdvancedConfig;
    if (!draft) return null;
    const effectiveWinRate = (100 - (draft.houseEdge ?? 2)).toFixed(1);

    return (
      <div className="space-y-6">
        {/* House edge */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-casino-text-secondary">House Edge</label>
            <span className="text-xs text-casino-text-muted">
              Player win rate: <strong className="text-casino-gold">{effectiveWinRate}%</strong>
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="range" min="0" max="25" step="0.1"
              value={draft.houseEdge ?? 2}
              onChange={e => handleBlackjackConfigChange(gameId, 'houseEdge', parseFloat(e.target.value))}
              className="flex-1 accent-casino-gold"
            />
            <input
              type="number" min="0" max="25" step="0.1"
              value={draft.houseEdge ?? 2}
              onChange={e => handleBlackjackConfigChange(gameId, 'houseEdge', parseFloat(e.target.value) || 0)}
              className="w-20 px-3 py-2 bg-casino-card border border-casino-border rounded-lg text-white text-center focus:border-casino-gold transition-colors"
            />
            <span className="text-casino-text-secondary">%</span>
          </div>
          <p className="mt-1 text-xs text-casino-text-muted">
            Standard Vegas single-deck blackjack ≈ 0.5% — 2%. Double-deck ≈ 0.6%.
          </p>
        </div>

        {/* Blackjack payout */}
        <div>
          <label className="block text-sm font-medium text-casino-text-secondary mb-2">
            Blackjack Pays
          </label>
          <div className="grid grid-cols-3 gap-2">
            {BLACKJACK_PAYOUT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleBlackjackConfigChange(gameId, 'blackjackPays', opt.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                  (draft.blackjackPays ?? 1.5) === opt.value
                    ? 'bg-casino-gold/20 border-casino-gold text-casino-gold'
                    : 'bg-casino-card border-casino-border text-casino-text-secondary hover:border-casino-gold/50'
                }`}
              >
                {opt.label.split('(')[0].trim()}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-casino-text-muted">
            {BLACKJACK_PAYOUT_OPTIONS.find(o => o.value === (draft.blackjackPays ?? 1.5))?.label}
          </p>
        </div>

        {/* Dealer hits soft 17 */}
        <div className="flex items-center justify-between p-4 bg-casino-card/50 rounded-xl border border-casino-border">
          <div>
            <p className="text-sm font-medium text-white">Dealer Hits Soft 17</p>
            <p className="text-xs text-casino-text-muted mt-0.5">
              Adds ~0.2% to house edge when enabled
            </p>
          </div>
          <button
            onClick={() =>
              handleBlackjackConfigChange(gameId, 'dealerHitsSoft17', !draft.dealerHitsSoft17)
            }
            className="flex items-center space-x-2 transition-colors"
          >
            {draft.dealerHitsSoft17 ? (
              <ToggleRight className="w-8 h-8 text-casino-gold" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-casino-text-muted" />
            )}
            <span className={`text-sm font-medium ${draft.dealerHitsSoft17 ? 'text-casino-gold' : 'text-casino-text-muted'}`}>
              {draft.dealerHitsSoft17 ? 'Yes' : 'No'}
            </span>
          </button>
        </div>
      </div>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen animated-bg pb-20">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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

            <button
              onClick={() => setShowGlobalModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-casino-gold to-casino-gold/80 text-casino-dark font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Global Settings</span>
            </button>
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
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-casino-text-muted">
                {filteredGames.length} of {games.length} games
              </span>
              <span className="inline-flex items-center space-x-1 text-casino-text-muted">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-purple-400">= Advanced Config active</span>
              </span>
            </div>
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
                    <th className="px-6 py-4 text-left text-xs font-medium text-casino-text-secondary uppercase tracking-wider">
                      Win Rate <span className="normal-case font-normal">(fallback)</span>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-casino-text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-casino-border">
                  {filteredGames.map(game => (
                    <tr key={game._id} className="hover:bg-casino-card/30 transition-colors">
                      {/* Game name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-white font-medium">{game.name}</p>
                              {isComplexGame(game.slug) && hasAdvancedConfig(game) && (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs">
                                  <Zap className="w-3 h-3" />
                                  <span>Advanced</span>
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-casino-text-muted">{game.description}</p>
                          </div>
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
                        <div>
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
                          {/* Note for complex games that have active advanced config */}
                          {isComplexGame(game.slug) && hasAdvancedConfig(game) && (
                            <p className="text-xs text-purple-400 mt-1">
                              Overridden by Advanced Config
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
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

                          {/* Advanced Config button — only for complex games */}
                          {isComplexGame(game.slug) && (
                            <button
                              onClick={() => openAdvancedModal(game)}
                              className={`inline-flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                                hasAdvancedConfig(game)
                                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30'
                                  : 'bg-casino-card border-casino-border text-casino-text-secondary hover:border-purple-500/50 hover:text-purple-300'
                              }`}
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Advanced</span>
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
                  The <strong className="text-white">Win Rate slider</strong> is a simple 0–100% chance and is used
                  for Slots, Dice, and Roulette. For <strong className="text-white">Lucky Wheel</strong> and{' '}
                  <strong className="text-white">Blackjack</strong>, click <strong className="text-purple-300">Advanced</strong> to
                  configure per-segment weights or house edge rules — these override the simple slider.
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

      {/* ── Global Win Rate Modal ─────────────────────────────────────────── */}
      {showGlobalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-casino-panel rounded-2xl border border-casino-border max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-casino-gold" />
                <h3 className="text-xl font-bold text-white">Global Win Rate</h3>
              </div>
              <button onClick={() => setShowGlobalModal(false)} className="p-2 text-casino-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-casino-text-secondary mb-6">
              Sets the <strong className="text-white">Win Rate slider</strong> for all games. Advanced configurations
              for Lucky Wheel and Blackjack are not affected.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-casino-text-secondary mb-2">
                Global Win Rate (%)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range" min="0" max="100" value={globalWinRate}
                  onChange={e => setGlobalWinRate(parseInt(e.target.value))}
                  className="flex-1 accent-casino-gold"
                />
                <input
                  type="number" min="0" max="100" value={globalWinRate}
                  onChange={e => setGlobalWinRate(parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 bg-casino-card border border-casino-border rounded-lg text-white text-center focus:border-casino-gold transition-colors"
                />
                <span className="text-casino-text-secondary">%</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowGlobalModal(false)}
                className="flex-1 px-4 py-3 border border-casino-border text-white rounded-lg hover:bg-casino-card transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyGlobalWinRate}
                disabled={applyingGlobal}
                className="flex-1 px-4 py-3 bg-casino-gold text-casino-dark font-medium rounded-lg hover:bg-casino-gold/90 transition-colors disabled:opacity-50"
              >
                {applyingGlobal ? 'Applying...' : 'Apply to All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Advanced Config Modal ─────────────────────────────────────────── */}
      {showAdvancedModal && modalGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-casino-panel rounded-2xl border border-casino-border w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 bg-casino-panel border-b border-casino-border px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Advanced Configuration</h3>
                  <p className="text-xs text-casino-text-muted">{modalGame.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdvancedModal(null)}
                className="p-2 text-casino-text-muted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6">
              {modalGame.slug === 'wheel' && renderWheelModal(modalGame._id)}
              {modalGame.slug === 'blackjack' && renderBlackjackModal(modalGame._id)}
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 bg-casino-panel border-t border-casino-border px-6 py-4 flex space-x-3">
              <button
                onClick={() => setShowAdvancedModal(null)}
                className="flex-1 px-4 py-3 border border-casino-border text-white rounded-lg hover:bg-casino-card transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveAdvancedConfig(modalGame._id)}
                disabled={savingAdvanced}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {savingAdvanced ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Advanced Config</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
