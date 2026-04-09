'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Sparkles, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGameSounds } from '@/hooks/useGameSounds';

interface GameResult {
  win: boolean;
  winAmount: number;
  outcome: string;
  reels?: string[];
}

interface GoldenSlotsProps {
  balance: number;
  minBet: number;
  maxBet: number;
  onPlay: (bet: number, prediction?: { type: string; value: string | number }) => Promise<GameResult>;
  onClose: () => void;
}

// Slot symbols with their visual representations
const SYMBOLS = [
  { id: 'seven', icon: '7️⃣', name: 'Seven', value: 50 },
  { id: 'diamond', icon: '💎', name: 'Diamond', value: 30 },
  { id: 'bar', icon: '🎰', name: 'Bar', value: 20 },
  { id: 'bell', icon: '🔔', name: 'Bell', value: 15 },
  { id: 'cherry', icon: '🍒', name: 'Cherry', value: 10 },
  { id: 'lemon', icon: '🍋', name: 'Lemon', value: 5 },
];

// Generate reel strip with symbols repeated for animation
const REEL_STRIP = [...SYMBOLS, ...SYMBOLS, ...SYMBOLS];

export const GoldenSlots: React.FC<GoldenSlotsProps> = ({
  balance,
  minBet,
  maxBet,
  onPlay,
  onClose,
}) => {
  const [bet, setBet] = useState(minBet);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [reelStates, setReelStates] = useState([0, 1, 2]); // Current visible symbol indices
  const [spinningReels, setSpinningReels] = useState<boolean[]>([false, false, false]);
  const [showWinEffect, setShowWinEffect] = useState(false);
  const [showLoseEffect, setShowLoseEffect] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const reelsRef = useRef<HTMLDivElement[]>([]);

  const {
    playButtonClick,
    playSpinStart,
    playReelStop,
    playWin,
    playLose,
    playSuspense,
  } = useGameSounds();

  // Handle bet changes
  const decreaseBet = useCallback(() => {
    playButtonClick();
    setBet((prev) => Math.max(minBet, prev - 10));
  }, [minBet, playButtonClick]);

  const increaseBet = useCallback(() => {
    playButtonClick();
    setBet((prev) => Math.min(maxBet, prev + 10));
  }, [maxBet, playButtonClick]);

  // Spin reels with sequential stopping
  const spinReels = async () => {
    if (isPlaying || bet > balance) return;

    // Reset states
    setIsPlaying(true);
    setResult(null);
    setShowWinEffect(false);
    setShowLoseEffect(false);
    setConfetti(false);

    // Start spinning all reels
    setSpinningReels([true, true, true]);
    playSpinStart();

    try {
      // Start the game
      const gameResult = await onPlay(bet);

      // Sequential reel stopping (Reel 1 -> Reel 2 -> Reel 3)
      const stopSequence = async () => {
        // Generate symbols based STRICTLY on win/loss result from backend
        // Backend returns { win: boolean, winAmount: number, outcome: string }
        // Frontend must generate symbols that match the win status
        let targets: number[];

        if (gameResult.win) {
          // WIN: Pick ONE random symbol and duplicate it across all 3 reels
          const winningSymbolIndex = Math.floor(Math.random() * SYMBOLS.length);
          targets = [winningSymbolIndex, winningSymbolIndex, winningSymbolIndex];
        } else {
          // LOSS: Generate 3 DIFFERENT symbols (guaranteed non-matching)
          const firstIndex = Math.floor(Math.random() * SYMBOLS.length);
          let secondIndex = Math.floor(Math.random() * SYMBOLS.length);
          let thirdIndex = Math.floor(Math.random() * SYMBOLS.length);

          // Ensure second symbol is different from first
          while (secondIndex === firstIndex) {
            secondIndex = Math.floor(Math.random() * SYMBOLS.length);
          }

          // Ensure third symbol is different from both first and second
          while (thirdIndex === firstIndex || thirdIndex === secondIndex) {
            thirdIndex = Math.floor(Math.random() * SYMBOLS.length);
          }

          targets = [firstIndex, secondIndex, thirdIndex];
        }

        // Validate targets (ensure no -1 from findIndex)
        const validTargets = targets.map(t => (t >= 0 ? t : 0));

        try {
          // Stop reel 1 after ~1.5s
          await new Promise((resolve) => setTimeout(resolve, 1500));
          setSpinningReels((prev) => [false, prev[1], prev[2]]);
          setReelStates((prev) => [validTargets[0], prev[1], prev[2]]);
          playReelStop(0);

          // Stop reel 2 after ~0.5s more (building suspense)
          await new Promise((resolve) => setTimeout(resolve, 600));
          setSpinningReels((prev) => [prev[0], false, prev[2]]);
          setReelStates((prev) => [prev[0], validTargets[1], prev[2]]);
          playReelStop(1);

          // Suspense delay before last reel
          playSuspense();
          await new Promise((resolve) => setTimeout(resolve, 800));

          // Stop reel 3
          setSpinningReels([false, false, false]);
          setReelStates(validTargets);
          playReelStop(2);

          // Final suspense before showing result
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Show result
          setResult(gameResult);

          if (gameResult.win) {
            setShowWinEffect(true);
            setConfetti(true);
            playWin(gameResult.winAmount, bet);
            setTimeout(() => setConfetti(false), 5000);
          } else {
            setShowLoseEffect(true);
            playLose();
            setTimeout(() => setShowLoseEffect(false), 500);
          }
        } catch (innerError) {
          // If anything goes wrong during the stop sequence, ensure reels stop
          console.error('Error during stop sequence:', innerError);
          setSpinningReels([false, false, false]);
          throw innerError;
        }
      };

      await stopSequence();
    } catch (error) {
      console.error('Game error:', error);
      // Ensure reels stop spinning even on error
      setSpinningReels([false, false, false]);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsPlaying(false);
    }
  };

  // Confetti particles for win
  const renderConfetti = () => {
    if (!confetti) return null;
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ['#D4AF37', '#FFD700', '#E5C158', '#FFF4A8'][Math.floor(Math.random() * 4)],
            }}
            initial={{ y: -20, opacity: 1, rotate: 0 }}
            animate={{
              y: 400,
              opacity: 0,
              rotate: 360,
              x: (Math.random() - 0.5) * 200,
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              ease: 'easeOut',
              delay: Math.random() * 0.5,
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`relative ${showLoseEffect ? 'shake-screen' : ''}`}>
      {/* Confetti Effect */}
      {renderConfetti()}

      {/* Game Header */}
      <div className="text-center mb-3 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-casino font-bold text-gold-gradient mb-1 sm:mb-2">
          Golden Slots
        </h2>
        <p className="text-casino-text-secondary text-xs sm:text-sm">
          Match three symbols to win big!
        </p>
      </div>

      {/* Slot Machine Display */}
      <div className="relative mb-4 sm:mb-8">
        {/* Outer Frame */}
        <div className="relative bg-gradient-to-b from-casino-card to-casino-dark rounded-2xl p-2 sm:p-4 border-2 border-casino-gold/50 shadow-2xl">
          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-casino-gold rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-casino-gold rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-casino-gold rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-casino-gold rounded-br-lg" />

          {/* Reels Container */}
          <div className="flex justify-center space-x-2 bg-black/50 rounded-xl p-2 sm:p-4 border border-casino-gold/30">
            {[0, 1, 2].map((reelIndex) => (
              <div
                key={reelIndex}
                className="relative w-20 h-28 sm:w-24 sm:h-32 overflow-hidden rounded-lg border-2 border-casino-gold/40 bg-gradient-to-b from-casino-card to-casino-dark"
              >
                {/* Blur overlay during spin */}
                {spinningReels[reelIndex] && (
                  <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-casino-gold/10 to-transparent animate-pulse" />
                )}

                {/* Reel Strip */}
                <motion.div
                  ref={(el) => { if (el) reelsRef.current[reelIndex] = el; }}
                  className="flex flex-col"
                  animate={{
                    y: spinningReels[reelIndex] ? [0, -50, 0] : 0,
                  }}
                  transition={{
                    duration: 0.1,
                    repeat: spinningReels[reelIndex] ? Infinity : 0,
                    ease: 'linear',
                  }}
                >
                  {spinningReels[reelIndex] ? (
                    // Show blurred scrolling strip while spinning
                    <div className="flex flex-col items-center py-2 filter blur-sm">
                      {REEL_STRIP.map((symbol, idx) => (
                        <div
                          key={idx}
                          className="w-16 h-24 sm:w-20 sm:h-28 flex items-center justify-center text-4xl sm:text-5xl"
                        >
                          {symbol.icon}
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Show actual symbol when stopped
                    <motion.div
                      className={`w-16 h-24 sm:w-20 sm:h-28 mx-auto flex items-center justify-center text-5xl sm:text-6xl ${
                        showWinEffect ? 'win-glow' : ''
                      }`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      {SYMBOLS[reelStates[reelIndex]]?.icon}
                    </motion.div>
                  )}
                </motion.div>

                {/* Glass reflection */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
              </div>
            ))}
          </div>

          {/* Win Lines Indicator */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-40px)] h-0.5 bg-gradient-to-r from-transparent via-casino-gold/50 to-transparent opacity-0"
            style={{ opacity: showWinEffect ? 1 : 0 }}
          />
        </div>

        {/* Light decorations */}
        <div className="absolute -top-2 left-4 w-3 h-3 rounded-full bg-casino-gold animate-pulse-gold" />
        <div className="absolute -top-2 right-4 w-3 h-3 rounded-full bg-casino-gold animate-pulse-gold" />
        <div className="absolute -bottom-2 left-4 w-3 h-3 rounded-full bg-casino-gold animate-pulse-gold" />
        <div className="absolute -bottom-2 right-4 w-3 h-3 rounded-full bg-casino-gold animate-pulse-gold" />
      </div>

      {/* Result Display */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`text-center py-3 sm:py-4 px-4 sm:px-6 rounded-xl mb-3 sm:mb-6 border-2 ${
              result.win
                ? 'bg-gradient-to-r from-casino-gold/20 to-casino-gold/10 border-casino-gold glow-gold-strong'
                : 'bg-red-900/20 border-red-500/50'
            }`}
          >
            <motion.div
              className={`text-2xl font-bold font-casino ${
                result.win ? 'text-gold-gradient glow-text-gold' : 'text-red-400'
              }`}
              animate={result.win ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: result.win ? 2 : 0, duration: 0.3 }}
            >
              {result.win ? (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  YOU WON ${result.winAmount}!
                  <Sparkles className="w-6 h-6" />
                </span>
              ) : (
                'Try Again!'
              )}
            </motion.div>
            <p className="text-sm text-casino-text-secondary mt-1">
              {result.outcome}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bet Controls */}
      <div className="space-y-3 sm:space-y-4">
        <div className="glass-panel rounded-xl p-3 sm:p-4">
          <label className="block text-xs sm:text-sm text-casino-text-secondary mb-2 sm:mb-3 text-center">
            Bet Amount
          </label>
          <div className="flex items-center justify-center space-x-3 sm:space-x-4">
            <motion.button
              onClick={decreaseBet}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              disabled={isPlaying || bet <= minBet}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-casino-card border border-casino-gold/30 text-casino-gold font-bold text-xl hover:border-casino-gold hover:glow-gold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              -
            </motion.button>

            <div className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-casino-dark rounded-xl border border-casino-gold/30 min-w-[110px] sm:min-w-[140px] justify-center">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-casino-gold" />
              <span className="text-xl sm:text-2xl font-bold text-white">{bet}</span>
            </div>

            <motion.button
              onClick={increaseBet}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              disabled={isPlaying || bet >= maxBet || bet >= balance}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-casino-card border border-casino-gold/30 text-casino-gold font-bold text-xl hover:border-casino-gold hover:glow-gold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              +
            </motion.button>
          </div>

          <div className="flex justify-between text-xs text-casino-text-muted mt-2 sm:mt-3 px-4">
            <span>Min: {minBet}</span>
            <span>Max: {Math.min(maxBet, balance)}</span>
          </div>
        </div>

        {/* Spin Button */}
        <motion.button
          onClick={spinReels}
          disabled={isPlaying || bet > balance}
          whileHover={!isPlaying && bet <= balance ? { scale: 1.02 } : {}}
          whileTap={!isPlaying && bet <= balance ? { scale: 0.98 } : {}}
          className={`w-full py-3 sm:py-5 rounded-xl font-casino font-bold text-base sm:text-xl transition-all relative overflow-hidden ${
            isPlaying || bet > balance
              ? 'bg-casino-card text-casino-text-muted cursor-not-allowed'
              : 'bg-gradient-to-r from-casino-gold to-casino-gold-dark text-casino-dark btn-premium'
          }`}
        >
          {isPlaying ? (
            <span className="flex items-center justify-center space-x-2">
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 spinner" />
              <span>Spinning...</span>
            </span>
          ) : bet > balance ? (
            'Insufficient Balance'
          ) : (
            <span className="flex items-center justify-center space-x-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>SPIN TO WIN</span>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default GoldenSlots;
