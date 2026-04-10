'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, RotateCcw, Coins, Sparkles, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGameSounds } from '@/hooks/useGameSounds';
import {
  GoldenSlots,
  RoyalRoulette,
  DiamondDice,
  AceBlackjack,
  LuckyWheel,
} from './games';

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
  // Additional fields per game type
  reels?: string[];
  winningNumber?: number;
  winningColor?: string;
  dice?: number[];
  sum?: number;
  playerCards?: any[];
  dealerCards?: any[];
  playerTotal?: number;
  dealerTotal?: number;
  segment?: number;
  multiplier?: number;
  guaranteedWin?: boolean;
}

// Win celebration component
const WinCelebration: React.FC<{ amount: number; onComplete: () => void }> = ({
  amount,
  onComplete,
}) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      {/* Gold flash overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 bg-casino-gold"
      />

      {/* Win text */}
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{
          scale: [0, 1.2, 1],
          rotate: [0, 5, 0],
        }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative"
      >
        <div className="text-center">
          <motion.div
            animate={{
              textShadow: [
                '0 0 20px #D4AF37',
                '0 0 40px #FFD700',
                '0 0 60px #D4AF37',
                '0 0 20px #D4AF37',
              ],
            }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Trophy className="w-20 h-20 text-casino-gold mx-auto mb-4" />
          </motion.div>

          <motion.h2
            className="text-5xl font-casino font-bold text-gold-gradient mb-2"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            BIG WIN!
          </motion.h2>

          <motion.p
            className="text-3xl font-bold text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            +${amount}
          </motion.p>
        </div>
      </motion.div>

      {/* Confetti particles */}
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{
            backgroundColor: ['#FFD700', '#D4AF37', '#FFA500', '#FF6B00', '#FFE5B4'][i % 5],
            left: `${50 + (Math.random() - 0.5) * 60}%`,
            top: `${50 + (Math.random() - 0.5) * 40}%`,
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [1, 0.5, 0],
            x: (Math.random() - 0.5) * 400,
            y: (Math.random() - 0.5) * 400 + 200,
            rotate: Math.random() * 720,
          }}
          transition={{
            duration: 2 + Math.random(),
            ease: 'easeOut',
          }}
        />
      ))}
    </motion.div>
  );
};

// Screen shake overlay for losses
const LoseEffect: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.2, 0] }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 bg-red-900/30 pointer-events-none z-40"
    />
  );
};

export const GameModal: React.FC<GameModalProps> = ({ game, onClose }) => {
  const { user, updateBalance } = useAuth();
  const [showWinCelebration, setShowWinCelebration] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [showLoseEffect, setShowLoseEffect] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const { playButtonClick, playWin, playLose } = useGameSounds();

  // Game play handler with suspense delay
  const handlePlay = async (bet: number, prediction?: { type: string; value: string | number }): Promise<GameResult> => {
    // This is a placeholder - in real implementation, this would be handled by the individual game components
    // But we keep the API call structure here for consistency
    const response = await api.post('/games/play', {
      gameId: game._id,
      bet: bet,
      prediction: prediction,
    });

    const gameResult = response.data;

    // Update balance
    updateBalance(gameResult.newBalance);

    return gameResult;
  };

  // Close handler with sound
  const handleClose = () => {
    playButtonClick();
    onClose();
  };

  // Handle win/lose effects
  const handleResult = (result: GameResult) => {
    if (result.win) {
      setWinAmount(result.winAmount);
      setShowWinCelebration(true);
      playWin(result.winAmount, 0);
    } else {
      setShowLoseEffect(true);
      playLose();
      setTimeout(() => setShowLoseEffect(false), 500);
    }
  };

  // Render specific game component based on game category/slug
  const renderGameComponent = () => {
    const gameProps = {
      balance: user?.balance || 0,
      minBet: game.minBet,
      maxBet: game.maxBet,
      onPlay: handlePlay,
      onClose: handleClose,
    };

    switch (game.slug) {
      case 'slots':
        return <GoldenSlots {...gameProps} />;
      case 'roulette':
        return <RoyalRoulette {...gameProps} />;
      case 'dice':
        return <DiamondDice {...gameProps} />;
      case 'blackjack':
        return <AceBlackjack {...gameProps} />;
      case 'wheel':
        return <LuckyWheel {...gameProps} />;
      default:
        // Fallback to generic game UI
        return (
          <div className="text-center py-12">
            <p className="text-casino-text-secondary">Game not implemented yet.</p>
          </div>
        );
    }
  };

  // Game-specific header gradient
  const getHeaderGradient = () => {
    switch (game.category) {
      case 'slots':
        return 'from-red-600/20 to-yellow-600/20';
      case 'table':
        return 'from-green-600/20 to-emerald-600/20';
      case 'dice':
        return 'from-blue-600/20 to-cyan-600/20';
      case 'cards':
        return 'from-purple-600/20 to-pink-600/20';
      default:
        return 'from-casino-gold/20 to-casino-gold-dark/20';
    }
  };

  return (
    <>
      <AnimatePresence>
        {showWinCelebration && (
          <WinCelebration
            amount={winAmount}
            onComplete={() => setShowWinCelebration(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={handleClose}
        />

        {/* Modal Container */}
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-lg ${showLoseEffect ? 'shake-screen' : ''}`}
        >
          {/* Lose effect overlay */}
          <LoseEffect active={showLoseEffect} />

          {/* Main Modal */}
          <div className="relative bg-gradient-to-b from-casino-panel to-casino-dark rounded-2xl border border-casino-gold/30 overflow-hidden shadow-2xl">
            {/* Header with gradient */}
            <div className={`relative bg-gradient-to-r ${getHeaderGradient()} p-4 sm:p-6 border-b border-casino-gold/30`}>
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,_#D4AF37_1px,_transparent_1px)] bg-[length:20px_20px]" />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-casino-card/80 border border-casino-gold/30 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-casino-gold" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-casino font-bold text-white">
                      {game.name}
                    </h2>
                    <p className="text-sm text-casino-text-secondary">
                      {game.description}
                    </p>
                  </div>
                </div>

                <motion.button
                  onClick={handleClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-xl bg-casino-card/50 border border-casino-border text-casino-text-secondary hover:text-casino-gold hover:border-casino-gold/50 transition-colors"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Balance display */}
              {user && (
                <div className="absolute -bottom-3 left-6">
                  <div className="flex items-center space-x-2 bg-casino-dark border border-casino-gold/30 px-4 py-1.5 rounded-full">
                    <Coins className="w-4 h-4 text-casino-gold" />
                    <span className="text-sm font-bold text-casino-gold">
                      ${user.balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Game Content */}
            <div className="p-4 sm:p-6 pt-6 sm:pt-8">
              {renderGameComponent()}
            </div>

            {/* Bottom decoration */}
            <div className="h-1 bg-gradient-to-r from-transparent via-casino-gold/50 to-transparent" />
          </div>

          {/* Outer glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-casino-gold/20 via-transparent to-casino-gold/20 rounded-2xl blur-xl -z-10" />
        </motion.div>
      </motion.div>
    </>
  );
};

export default GameModal;
