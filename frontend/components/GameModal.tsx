'use client';

import React, { useState } from 'react';
import { X, RotateCcw, Coins } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Game {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: 'slots' | 'table' | 'dice' | 'cards';
  minBet: number;
  maxBet: number;
}

interface GameModalProps {
  game: Game;
  onClose: () => void;
}

interface GameResult {
  win: boolean;
  winAmount: number;
  outcome: string;
  newBalance: number;
}

export const GameModal: React.FC<GameModalProps> = ({ game, onClose }) => {
  const { user, updateBalance } = useAuth();
  const [bet, setBet] = useState(game.minBet);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);

  const handlePlay = async () => {
    if (!user || bet > user.balance) {
      toast.error('Insufficient balance');
      return;
    }

    if (bet < game.minBet || bet > game.maxBet) {
      toast.error(`Bet must be between $${game.minBet} and $${game.maxBet}`);
      return;
    }

    setIsPlaying(true);
    setResult(null);

    try {
      const response = await api.post('/games/play', {
        gameId: game._id,
        bet: bet,
      });

      const gameResult = response.data;
      setResult(gameResult);
      updateBalance(gameResult.newBalance);

      if (gameResult.win) {
        toast.success(`You won $${gameResult.winAmount}!`);
      } else {
        toast('Better luck next time!', { icon: '🎰' });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Game error');
    } finally {
      setIsPlaying(false);
    }
  };

  const getGameVisual = () => {
    switch (game.category) {
      case 'slots':
        return (
          <div className="flex justify-center items-center space-x-4 py-8">
            {['7️⃣', '💎', '🍒'].map((symbol, i) => (
              <div
                key={i}
                className={`w-20 h-24 bg-casino-card rounded-lg border-2 border-casino-gold/30 flex items-center justify-center text-4xl
                  ${isPlaying ? 'animate-bounce' : ''}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {symbol}
              </div>
            ))}
          </div>
        );
      case 'dice':
        return (
          <div className="flex justify-center items-center py-8">
            <div className={`text-8xl ${isPlaying ? 'dice-rolling' : ''}`}>
              🎲
            </div>
          </div>
        );
      case 'table':
        return (
          <div className="flex justify-center items-center py-8">
            <div className={`w-32 h-32 rounded-full bg-red-600 border-4 border-casino-gold flex items-center justify-center ${isPlaying ? 'animate-spin-slow' : ''}`}>
              <div className="w-4 h-4 bg-white rounded-full" />
            </div>
          </div>
        );
      case 'cards':
        return (
          <div className="flex justify-center items-center space-x-2 py-8">
            <div className="w-16 h-24 bg-white rounded-lg border-2 border-casino-gold flex items-center justify-center text-4xl transform -rotate-6">
              🂡
            </div>
            <div className={`w-16 h-24 bg-casino-card rounded-lg border-2 border-casino-gold/30 flex items-center justify-center text-4xl ${isPlaying ? 'animate-pulse' : ''}`}>
              🂠
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-casino-panel rounded-2xl border border-casino-gold/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-casino-border">
          <div>
            <h2 className="text-2xl font-bold text-casino-gold">{game.name}</h2>
            <p className="text-sm text-casino-text-secondary">{game.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-casino-card text-casino-text-secondary hover:text-casino-gold transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Game Area */}
        <div className="p-6">
          {getGameVisual()}

          {/* Result Display */}
          {result && (
            <div className={`text-center py-4 rounded-lg mb-4 ${
              result.win ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'
            }`}>
              <p className="text-lg font-bold">
                {result.win ? (
                  <span className="text-casino-green">You Won ${result.winAmount}!</span>
                ) : (
                  <span className="text-casino-red">You Lost</span>
                )}
              </p>
              <p className="text-sm text-casino-text-secondary mt-1">{result.outcome}</p>
            </div>
          )}

          {/* Bet Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-casino-text-secondary mb-2">Bet Amount</label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setBet(Math.max(game.minBet, bet - 10))}
                  className="p-2 rounded-lg bg-casino-card border border-casino-border hover:border-casino-gold/50 transition-colors"
                  disabled={isPlaying}
                >
                  -
                </button>
                <div className="flex-1 relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-casino-gold" />
                  <input
                    type="number"
                    value={bet}
                    onChange={(e) => setBet(Number(e.target.value))}
                    min={game.minBet}
                    max={Math.min(game.maxBet, user?.balance || 0)}
                    disabled={isPlaying}
                    className="w-full pl-10 pr-4 py-2.5 bg-casino-card border border-casino-border rounded-lg text-center text-white font-semibold"
                  />
                </div>
                <button
                  onClick={() => setBet(Math.min(game.maxBet, bet + 10))}
                  className="p-2 rounded-lg bg-casino-card border border-casino-border hover:border-casino-gold/50 transition-colors"
                  disabled={isPlaying}
                >
                  +
                </button>
              </div>
              <div className="flex justify-between text-xs text-casino-text-muted mt-1">
                <span>Min: ${game.minBet}</span>
                <span>Max: ${game.maxBet}</span>
              </div>
            </div>

            {/* Play Button */}
            <button
              onClick={handlePlay}
              disabled={isPlaying || !user || bet > (user?.balance || 0)}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                isPlaying || !user || bet > (user?.balance || 0)
                  ? 'bg-casino-card text-casino-text-muted cursor-not-allowed'
                  : 'bg-gradient-to-r from-casino-gold to-casino-gold-dark text-casino-dark hover:opacity-90 btn-gold'
              }`}
            >
              {isPlaying ? (
                <span className="flex items-center justify-center space-x-2">
                  <RotateCcw className="w-5 h-5 spinner" />
                  <span>Playing...</span>
                </span>
              ) : (
                'Play Now'
              )}
            </button>

            {!user && (
              <p className="text-center text-sm text-casino-red">
                Please sign in to play
              </p>
            )}

            {user && bet > user.balance && (
              <p className="text-center text-sm text-casino-red">
                Insufficient balance
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
