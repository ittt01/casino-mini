'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Sparkles, RotateCcw } from 'lucide-react';
import { useGameSounds } from '@/hooks/useGameSounds';

interface GameResult {
  win: boolean;
  winAmount: number;
  outcome: string;
  dice: number[];
  sum: number;
}

interface DiamondDiceProps {
  balance: number;
  minBet: number;
  maxBet: number;
  onPlay: (bet: number, prediction?: { type: string; value: number }) => Promise<GameResult>;
  onClose: () => void;
}

// Prediction options for dice sum
const PREDICTION_OPTIONS = [
  { type: 'over', value: 7, label: 'Over 7', payout: '2x' },
  { type: 'under', value: 7, label: 'Under 7', payout: '2x' },
  { type: 'exact', value: 7, label: 'Exactly 7', payout: '6x' },
];

// Dot positions for each dice face using 3x3 grid cell indices (0-8)
// Grid layout: 0 1 2
//              3 4 5
//              6 7 8
const DICE_DOT_CELLS: Record<number, number[]> = {
  1: [4],                              // center only
  2: [0, 8],                           // top-left, bottom-right
  3: [0, 4, 8],                        // diagonal
  4: [0, 2, 6, 8],                     // all corners
  5: [0, 2, 4, 6, 8],                  // corners + center
  6: [0, 3, 6, 2, 5, 8],               // left column (0,3,6) + right column (2,5,8)
};

export const DiamondDice: React.FC<DiamondDiceProps> = ({
  balance,
  minBet,
  maxBet,
  onPlay,
  onClose,
}) => {
  const [bet, setBet] = useState(minBet);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [diceValues, setDiceValues] = useState<number[]>([1, 1]);
  const [isShaking, setIsShaking] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [showWinEffect, setShowWinEffect] = useState(false);
  const [showLoseEffect, setShowLoseEffect] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(PREDICTION_OPTIONS[0]);
  // Track displayed dice values separately from final values (for animation)
  const [displayedDiceValues, setDisplayedDiceValues] = useState<number[]>([1, 1]);

  const {
    playButtonClick,
    playDiceShake,
    playDiceRoll,
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

  // Roll dice with animation
  const rollDice = async () => {
    if (isPlaying || bet > balance) return;

    setIsPlaying(true);
    setResult(null);
    setShowWinEffect(false);
    setShowLoseEffect(false);
    setConfetti(false);

    // Reset displayed dice to default for animation
    setDisplayedDiceValues([1, 1]);

    // Phase 1: Shake dice vigorously
    setIsShaking(true);
    playDiceShake();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsShaking(false);

    // Phase 2: Start rolling
    setIsRolling(true);
    playDiceRoll();

    // Helper to generate dice that sum to a specific value (moved outside try block)
    const generateDiceWithSum = (targetSum: number): number[] => {
      const combinations: number[][] = [];
      for (let d1 = 1; d1 <= 6; d1++) {
        for (let d2 = 1; d2 <= 6; d2++) {
          if (d1 + d2 === targetSum) {
            combinations.push([d1, d2]);
          }
        }
      }
      if (combinations.length > 0) {
        return combinations[Math.floor(Math.random() * combinations.length)];
      }
      return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    };

    try {
      const gameResult = await onPlay(bet, {
        type: selectedPrediction.type,
        value: selectedPrediction.value,
      });

      // Wait for roll animation (1.5s) - diceValues update happens AFTER animation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate dice values based STRICTLY on win/loss result from backend
      // Backend returns { win: boolean, winAmount: number, outcome: string, dice?: number[] }
      // Frontend must generate dice values that match the win status if not provided
      let finalDice: number[];

      if (gameResult.dice && Array.isArray(gameResult.dice) && gameResult.dice.length === 2) {
        // Use dice from backend if provided, STRICTLY clamped to valid dice range 1-6
        finalDice = gameResult.dice.map(d => {
          const clamped = Math.max(1, Math.min(6, d));
          return isNaN(clamped) ? Math.floor(Math.random() * 6) + 1 : clamped;
        });
      } else {
        // Generate dice based on prediction type and win status
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const sum = die1 + die2;

        switch (selectedPrediction.type) {
          case 'over':
            if (gameResult.win) {
              // Win: Sum must be 8-12
              finalDice = sum > 7 ? [die1, die2] : generateDiceWithSum(Math.floor(Math.random() * 5) + 8);
            } else {
              // Loss: Sum must be 2-7
              finalDice = sum <= 7 ? [die1, die2] : generateDiceWithSum(Math.floor(Math.random() * 6) + 2);
            }
            break;
          case 'under':
            if (gameResult.win) {
              // Win: Sum must be 2-6
              finalDice = sum <= 6 ? [die1, die2] : generateDiceWithSum(Math.floor(Math.random() * 5) + 2);
            } else {
              // Loss: Sum must be 7-12
              finalDice = sum >= 7 ? [die1, die2] : generateDiceWithSum(Math.floor(Math.random() * 6) + 7);
            }
            break;
          case 'exact':
            if (gameResult.win) {
              // Win: Sum must be exactly 7
              finalDice = sum === 7 ? [die1, die2] : generateDiceWithSum(7);
            } else {
              // Loss: Sum must NOT be 7
              finalDice = sum !== 7 ? [die1, die2] : generateDiceWithSum(
                Math.random() < 0.5 ? Math.floor(Math.random() * 5) + 2 : Math.floor(Math.random() * 5) + 8
              );
            }
            break;
          default:
            finalDice = [die1, die2];
        }
      }

      // SAFETY: Absolutely guarantee dice values are 1-6
      const safeDice: number[] = finalDice.map(d => {
        if (d < 1 || d > 6 || isNaN(d)) {
          return Math.floor(Math.random() * 6) + 1;
        }
        return d;
      });

      // SINGLE SOURCE OF TRUTH: Set dice values AFTER animation completes
      setDiceValues(safeDice);
      setDisplayedDiceValues(safeDice);
      setIsRolling(false);

      // Suspense delay before showing result text
      playSuspense();
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Create a synchronized result object with the ACTUAL dice values displayed
      const synchronizedResult: GameResult = {
        ...gameResult,
        dice: safeDice,
        sum: safeDice[0] + safeDice[1],
      };

      // Show result
      setResult(synchronizedResult);

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
    } catch (error) {
      console.error('Game error:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Render a single die with perfect 3x3 grid dot pattern
  const renderDie = (value: number, index: number) => {
    // Safety clamp: ensure value is 1-6, fallback to 1 if invalid
    const safeValue = Math.max(1, Math.min(6, value)) || 1;
    const dotCells = DICE_DOT_CELLS[safeValue] || DICE_DOT_CELLS[1];

    // Create array of 9 cells (3x3 grid), true = has dot
    const cells = Array(9).fill(false);
    dotCells.forEach((cellIndex) => {
      if (cellIndex >= 0 && cellIndex < 9) {
        cells[cellIndex] = true;
      }
    });

    return (
      <motion.div
        key={index}
        className={`relative w-24 h-24 ${isShaking ? 'animate-shake' : ''}`}
        animate={
          isRolling
            ? {
                rotateX: [0, 360, 720],
                rotateY: [0, 180, 360],
                scale: [1, 1.1, 1],
              }
            : isShaking
            ? {
                x: [0, -5, 5, -8, 8, -5, 5, 0],
                y: [0, -5, 5, 0, -5, 5, 0, 0],
                rotate: [0, -15, 15, -20, 20, -10, 10, 0],
              }
            : { rotateX: 0, rotateY: 0, scale: 1 }
        }
        transition={
          isRolling
            ? { duration: 1.5, ease: 'easeOut' }
            : isShaking
            ? { duration: 0.4, repeat: 2, ease: 'easeInOut' }
            : { duration: 0.3, ease: 'easeOut' }
        }
      >
        <div
          className={`w-full h-full rounded-xl bg-gradient-to-br from-white to-gray-200 border-2 border-gray-300 shadow-lg grid grid-cols-3 grid-rows-3 p-2 gap-1 ${
            showWinEffect ? 'ring-4 ring-casino-gold' : ''
          }`}
        >
          {/* Render 9 cells, some with dots */}
          {cells.map((hasDot, i) => (
            <div key={i} className="flex items-center justify-center w-full h-full">
              {hasDot && (
                <div className="w-4 h-4 rounded-full bg-black shadow-inner" />
              )}
            </div>
          ))}
        </div>

        {/* Diamond accent border */}
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            border: '2px solid rgba(212,175,55,0.4)',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, transparent 50%, rgba(212,175,55,0.1) 100%)',
          }}
        />
      </motion.div>
    );
  };

  // Confetti effect
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
      {renderConfetti()}

      {/* Game Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-casino font-bold text-gold-gradient mb-2">
          Diamond Dice
        </h2>
        <p className="text-casino-text-secondary text-sm">
          Roll the dice and predict the sum!
        </p>
      </div>

      {/* Dice Table */}
      <div className="relative mb-8">
        {/* Table surface */}
        <div className="relative bg-gradient-to-br from-green-900 to-green-800 rounded-2xl p-8 border-4 border-casino-gold/30 shadow-2xl"
        >
          {/* Felt texture pattern */}
          <div className="absolute inset-0 rounded-2xl opacity-10 bg-[radial-gradient(circle_at_50%_50%,_#ffffff_1px,_transparent_1px)] bg-[length:8px_8px]"
          />

          {/* Dice container - uses displayedDiceValues for rendering */}
          <div className="relative flex justify-center items-center space-x-8">
            {displayedDiceValues.map((value, index) => renderDie(value, index))}
          </div>
        </div>
      </div>

      {/* Prediction Selection */}
      <div className="glass-panel rounded-xl p-4 mb-6">
        <p className="text-sm text-casino-text-secondary text-center mb-3">Bet on the sum:</p>
        <div className="grid grid-cols-3 gap-3">
          {PREDICTION_OPTIONS.map((option) => (
            <motion.button
              key={option.type}
              onClick={() => {
                playButtonClick();
                setSelectedPrediction(option);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isPlaying}
              className={`py-3 px-2 rounded-xl text-center transition-all ${
                selectedPrediction === option
                  ? 'bg-gradient-to-r from-casino-gold to-casino-gold-dark text-casino-dark border-2 border-casino-gold glow-gold'
                  : 'bg-casino-card text-casino-text-primary border border-casino-border hover:border-casino-gold/50'
              }`}
            >
              <span className="block font-bold">{option.label}</span>
              <span className="text-xs opacity-80">Pays {option.payout}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Result Display - Single Source of Truth for total */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`text-center py-4 px-6 rounded-xl mb-6 border-2 ${
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
                'Roll Again!'
              )}
            </motion.div>
            <p className="text-sm text-casino-text-secondary mt-1">
              Rolled {displayedDiceValues[0] + displayedDiceValues[1]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bet Controls */}
      <div className="space-y-4">
        <div className="glass-panel rounded-xl p-4">
          <label className="block text-sm text-casino-text-secondary mb-3 text-center">
            Bet Amount
          </label>
          <div className="flex items-center justify-center space-x-4">
            <motion.button
              onClick={decreaseBet}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              disabled={isPlaying || bet <= minBet}
              className="w-12 h-12 rounded-full bg-casino-card border border-casino-gold/30 text-casino-gold font-bold text-xl hover:border-casino-gold hover:glow-gold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              -
            </motion.button>

            <div className="flex items-center space-x-2 px-6 py-3 bg-casino-dark rounded-xl border border-casino-gold/30 min-w-[140px] justify-center">
              <Coins className="w-5 h-5 text-casino-gold" />
              <span className="text-2xl font-bold text-white">{bet}</span>
            </div>

            <motion.button
              onClick={increaseBet}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              disabled={isPlaying || bet >= maxBet || bet >= balance}
              className="w-12 h-12 rounded-full bg-casino-card border border-casino-gold/30 text-casino-gold font-bold text-xl hover:border-casino-gold hover:glow-gold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              +
            </motion.button>
          </div>

          <div className="flex justify-between text-xs text-casino-text-muted mt-3 px-4">
            <span>Min: {minBet}</span>
            <span>Max: {Math.min(maxBet, balance)}</span>
          </div>
        </div>

        {/* Roll Button */}
        <motion.button
          onClick={rollDice}
          disabled={isPlaying || bet > balance}
          whileHover={!isPlaying && bet <= balance ? { scale: 1.02 } : {}}
          whileTap={!isPlaying && bet <= balance ? { scale: 0.98 } : {}}
          className={`w-full py-5 rounded-xl font-casino font-bold text-xl transition-all relative overflow-hidden ${
            isPlaying || bet > balance
              ? 'bg-casino-card text-casino-text-muted cursor-not-allowed'
              : 'bg-gradient-to-r from-casino-gold to-casino-gold-dark text-casino-dark btn-premium'
          }`}
        >
          {isPlaying ? (
            <span className="flex items-center justify-center space-x-2">
              <RotateCcw className="w-6 h-6 spinner" />
              <span>Rolling...</span>
            </span>
          ) : bet > balance ? (
            'Insufficient Balance'
          ) : (
            <span className="flex items-center justify-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>ROLL DICE</span>
              <Sparkles className="w-5 h-5" />
            </span>
          )}
        </motion.button>

        {/* Payout Info */}
        <div className="mt-6 pt-4 border-t border-casino-gold/20">
          <p className="text-xs text-casino-text-muted text-center">
            Over 7 (8-12) pays 2x • Under 7 (2-6) pays 2x • Exactly 7 pays 6x
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiamondDice;
