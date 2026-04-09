'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Sparkles, RotateCcw, Play } from 'lucide-react';
import { useGameSounds } from '@/hooks/useGameSounds';

interface GameResult {
  win: boolean;
  winAmount: number;
  outcome: string;
  winningNumber?: number;
  winningColor?: string;
}

interface RoyalRouletteProps {
  balance: number;
  minBet: number;
  maxBet: number;
  onPlay: (bet: number, prediction?: { type: string; value: string | number }) => Promise<GameResult>;
  onClose: () => void;
}

// Slice angle for the 37-number European wheel
const SLICE_ANGLE = 360 / 37; // ≈ 9.7297°

// Roulette numbers in order with their colors - European Roulette
// Update this array if your wheel image uses a different physical sequence.
const ROULETTE_NUMBERS = [
  { number: 0, color: 'green' },
  { number: 32, color: 'red' },
  { number: 15, color: 'black' },
  { number: 19, color: 'red' },
  { number: 4, color: 'black' },
  { number: 21, color: 'red' },
  { number: 2, color: 'black' },
  { number: 25, color: 'red' },
  { number: 17, color: 'black' },
  { number: 34, color: 'red' },
  { number: 6, color: 'black' },
  { number: 27, color: 'red' },
  { number: 13, color: 'black' },
  { number: 36, color: 'red' },
  { number: 11, color: 'black' },
  { number: 30, color: 'red' },
  { number: 8, color: 'black' },
  { number: 23, color: 'red' },
  { number: 10, color: 'black' },
  { number: 5, color: 'red' },
  { number: 24, color: 'black' },
  { number: 16, color: 'red' },
  { number: 33, color: 'black' },
  { number: 1, color: 'red' },
  { number: 20, color: 'black' },
  { number: 14, color: 'red' },
  { number: 31, color: 'black' },
  { number: 9, color: 'red' },
  { number: 22, color: 'black' },
  { number: 18, color: 'red' },
  { number: 29, color: 'black' },
  { number: 7, color: 'red' },
  { number: 28, color: 'black' },
  { number: 12, color: 'red' },
  { number: 35, color: 'black' },
  { number: 3, color: 'red' },
  { number: 26, color: 'black' },
];

// Prediction options
const PREDICTION_OPTIONS = [
  { type: 'color', value: 'red', label: 'Red', color: 'bg-red-600' },
  { type: 'color', value: 'black', label: 'Black', color: 'bg-gray-900' },
  { type: 'parity', value: 'even', label: 'Even', color: 'bg-casino-card' },
  { type: 'parity', value: 'odd', label: 'Odd', color: 'bg-casino-card' },
];

export const RoyalRoulette: React.FC<RoyalRouletteProps> = ({
  balance,
  minBet,
  maxBet,
  onPlay,
  onClose,
}) => {
  const [bet, setBet] = useState(minBet);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [accumulatedRotation, setAccumulatedRotation] = useState(0); // Track accumulated rotation to prevent snapping
  const [ballRotation, setBallRotation] = useState(0);
  const [showWinEffect, setShowWinEffect] = useState(false);
  const [showLoseEffect, setShowLoseEffect] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(PREDICTION_OPTIONS[0]);
  const [highlightedSlot, setHighlightedSlot] = useState<number | null>(null);

  const wheelRef = useRef<HTMLDivElement>(null);
  // Tracks accumulated wheel angle to avoid stale-closure issues across async spins
  const currentAngleRef = useRef(0);
  // Tracks ball's accumulated rotation so it always moves counter-clockwise (never snaps)
  const currentBallRef = useRef(0);

  const {
    playButtonClick,
    playRouletteSpin,
    playBallDrop,
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

  // Generate a logical winning number based on bet and win status
  const generateWinningNumber = (
    prediction: typeof PREDICTION_OPTIONS[0],
    isWin: boolean
  ): { number: number; color: string } => {
    let winningNum: number;
    let winningCol: string;

    if (prediction.type === 'color') {
      const targetColor = prediction.value as 'red' | 'black';
      if (isWin) {
        // Win: Must land on the bet color
        const colorNumbers = ROULETTE_NUMBERS.filter((n) => n.color === targetColor);
        const randomSlot = colorNumbers[Math.floor(Math.random() * colorNumbers.length)];
        winningNum = randomSlot.number;
        winningCol = randomSlot.color;
      } else {
        // Loss: Must land on opposite color or green
        const oppositeColor = targetColor === 'red' ? 'black' : 'red';
        // 50% chance to land on opposite color, 50% on green
        if (Math.random() < 0.5) {
          const colorNumbers = ROULETTE_NUMBERS.filter((n) => n.color === oppositeColor);
          const randomSlot = colorNumbers[Math.floor(Math.random() * colorNumbers.length)];
          winningNum = randomSlot.number;
          winningCol = randomSlot.color;
        } else {
          // Land on 0 (green)
          winningNum = 0;
          winningCol = 'green';
        }
      }
    } else if (prediction.type === 'parity') {
      const targetParity = prediction.value as 'even' | 'odd';
      if (isWin) {
        // Win: Must land on matching parity (excluding 0)
        const parityNumbers = ROULETTE_NUMBERS.filter((n) => {
          if (n.number === 0) return false;
          return targetParity === 'even' ? n.number % 2 === 0 : n.number % 2 !== 0;
        });
        const randomSlot = parityNumbers[Math.floor(Math.random() * parityNumbers.length)];
        winningNum = randomSlot.number;
        winningCol = randomSlot.color;
      } else {
        // Loss: Must land on opposite parity or green
        const oppositeParity = targetParity === 'even' ? 'odd' : 'even';
        // 50% chance for opposite parity, 50% for green
        if (Math.random() < 0.5) {
          const parityNumbers = ROULETTE_NUMBERS.filter((n) => {
            if (n.number === 0) return false;
            return oppositeParity === 'even' ? n.number % 2 === 0 : n.number % 2 !== 0;
          });
          const randomSlot = parityNumbers[Math.floor(Math.random() * parityNumbers.length)];
          winningNum = randomSlot.number;
          winningCol = randomSlot.color;
        } else {
          // Land on 0 (green)
          winningNum = 0;
          winningCol = 'green';
        }
      }
    } else {
      // Fallback - shouldn't happen
      const randomSlot = ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)];
      winningNum = randomSlot.number;
      winningCol = randomSlot.color;
    }

    return { number: winningNum, color: winningCol };
  };

  // Reset game state for Play Again
  const resetGame = () => {
    playButtonClick();
    setResult(null);
    setShowWinEffect(false);
    setShowLoseEffect(false);
    setConfetti(false);
    setHighlightedSlot(null);
    // Keep the wheel at current position, don't reset rotation to avoid visual jump
  };

  // Spin the wheel
  const spinWheel = async () => {
    if (isPlaying || bet > balance) return;

    setIsPlaying(true);
    setResult(null);
    setShowWinEffect(false);
    setShowLoseEffect(false);
    setConfetti(false);
    setHighlightedSlot(null);

    playRouletteSpin();

    try {
      const gameResult = await onPlay(bet, {
        type: selectedPrediction.type,
        value: selectedPrediction.value,
      });

      // Generate winning number that matches the bet/win logic
      // Backend returns { win: boolean, winAmount: number, outcome: string }
      // Frontend must generate a number consistent with the win status
      const generatedWin = generateWinningNumber(selectedPrediction, gameResult.win);

      // Create complete game result with generated number
      const completeResult: GameResult = {
        ...gameResult,
        winningNumber: generatedWin.number,
        winningColor: generatedWin.color,
      };

      // --- Wheel rotation (aesthetic only — purely full spins) ----------------
      // The wheel rotates clockwise for visual effect and always returns to its
      // natural orientation (0° mod 360°), so numbers stay at fixed positions.
      const extraSpins = 5 + Math.floor(Math.random() * 3);
      const newRotation = currentAngleRef.current + extraSpins * 360;
      currentAngleRef.current = newRotation;
      setAccumulatedRotation(newRotation);
      // -----------------------------------------------------------------------

      // --- Ball rotation (lands on the winning slot) -------------------------
      // In the wheel's natural orientation each slot's centre sits at:
      //   index × SLICE_ANGLE + SLICE_ANGLE/2  (clockwise from 12 o'clock)
      // The ball counter-rotates and must end at exactly that screen angle.
      //
      // Strategy: compute how many degrees counter-clockwise the ball must
      // travel from its current visual position to reach the target, then add
      // extra full counter-clockwise spins. This guarantees the ball always
      // moves in the same direction (never snaps backward).
      const winningIndex = ROULETTE_NUMBERS.findIndex(n => n.number === generatedWin.number);
      const targetBallAngle = winningIndex * SLICE_ANGLE + SLICE_ANGLE / 2; // 0–360°

      const currentBallAngle = ((currentBallRef.current % 360) + 360) % 360;
      // Counter-clockwise delta: how far CCW from currentBallAngle to targetBallAngle
      const backwardDelta = ((currentBallAngle - targetBallAngle) + 360) % 360;
      const ballExtraSpins = 7 + Math.floor(Math.random() * 4);
      const newBallRotation = currentBallRef.current - ballExtraSpins * 360 - backwardDelta;
      currentBallRef.current = newBallRotation;
      // -----------------------------------------------------------------------

      // Start spinning
      setWheelRotation(newRotation);
      setBallRotation(newBallRotation);

      // Wait for spin to complete (3 seconds animation)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Ball drop sound
      playBallDrop();

      // Suspense delay
      playSuspense();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Highlight the winning slot
      setHighlightedSlot(generatedWin.number);

      // Show result
      setResult(completeResult);

      if (completeResult.win) {
        setShowWinEffect(true);
        setConfetti(true);
        playWin(completeResult.winAmount, bet);
        setTimeout(() => setConfetti(false), 5000);
      } else {
        setShowLoseEffect(true);
        playLose();
        setTimeout(() => setShowLoseEffect(false), 500);
      }

      // Note: We DON'T reset wheelRotation to 0 anymore
      // The wheel stays at newRotation, and next spin adds to it
    } catch (error) {
      console.error('Game error:', error);
    } finally {
      setIsPlaying(false);
    }
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
      <div className="text-center mb-3 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-casino font-bold text-gold-gradient mb-1 sm:mb-2">
          Royal Roulette
        </h2>
        <p className="text-casino-text-secondary text-xs sm:text-sm">
          Place your bet and watch the wheel spin!
        </p>
      </div>

      {/* Roulette Wheel */}
      <div className="relative mb-4 sm:mb-8 flex justify-center">
        <div className="relative w-[280px] h-[280px] sm:w-80 sm:h-80">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-casino-gold/50 shadow-2xl glow-gold"
            style={{ background: 'conic-gradient(from 0deg, #1a1a1a, #2a2a2a, #1a1a1a)' }}
          />

          {/* Wheel with numbers */}
          <motion.div
            ref={wheelRef}
            className="absolute inset-2 rounded-full overflow-hidden"
            style={{
              transform: `rotate(${wheelRotation}deg)`,
              transition: isPlaying ? 'transform 3s cubic-bezier(0.1, 0.7, 0.1, 1)' : 'transform 0.5s ease-out',
            }}
          >
            {ROULETTE_NUMBERS.map((slot, index) => {
              const rotation = (index * 360) / ROULETTE_NUMBERS.length;
              const isHighlighted = highlightedSlot === slot.number;
              const degreesPerSlot = 360 / ROULETTE_NUMBERS.length;

              return (
                <div
                  key={slot.number}
                  className={`absolute w-full h-full`}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                  }}
                >
                  {/* Slot wedge background */}
                  <div
                    className={`absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[18px] border-r-[18px] border-t-[138px] ${
                      slot.color === 'green'
                        ? 'border-t-green-600'
                        : slot.color === 'red'
                        ? 'border-t-red-700'
                        : 'border-t-gray-800'
                    } ${isHighlighted ? 'brightness-150' : ''}`}
                    style={{
                      transformOrigin: 'center bottom',
                      clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)',
                    }}
                  />

                  {/* Number text - rotated to be readable */}
                  <div
                    className={`absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold ${
                      slot.color === 'green'
                        ? 'text-white'
                        : 'text-white'
                    } ${isHighlighted ? 'slot-highlight' : ''}`}
                    style={{
                      transformOrigin: 'center center',
                      transform: `rotate(${degreesPerSlot / 2}deg)`,
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                      marginTop: '8px',
                    }}
                  >
                    {slot.number}
                  </div>
                </div>
              );
            })}

            {/* Center hub */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-casino-gold to-casino-gold-dark border-4 border-casino-card shadow-lg flex items-center justify-center"
              >
                <span className="text-casino-dark font-bold text-lg">★</span>
              </div>
            </div>
          </motion.div>

          {/* Ball */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `rotate(${ballRotation}deg)`,
              transition: isPlaying ? 'transform 3s cubic-bezier(0.1, 0.7, 0.1, 1)' : 'transform 0.5s ease-out',
            }}
          >
            <div
              className="absolute top-10 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-lg"
              style={{
                boxShadow: '0 0 10px rgba(255,255,255,0.8)',
              }}
            />
          </motion.div>

        </div>
      </div>

      {/* Prediction Selection */}
      <div className="glass-panel rounded-xl p-3 sm:p-4 mb-3 sm:mb-6">
        <p className="text-xs sm:text-sm text-casino-text-secondary text-center mb-2 sm:mb-3">Bet on:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PREDICTION_OPTIONS.map((option) => (
            <motion.button
              key={`${option.type}-${option.value}`}
              onClick={() => {
                playButtonClick();
                setSelectedPrediction(option);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isPlaying || !!result}
              className={`py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                selectedPrediction === option
                  ? `${option.color} text-white border-2 border-casino-gold glow-gold`
                  : 'bg-casino-card text-casino-text-secondary border border-casino-border hover:border-casino-gold/50'
              } ${result ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
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
                'Better luck next time!'
              )}
            </motion.div>

            <div className="mt-2 flex items-center justify-center space-x-4">
              <span className="text-sm text-casino-text-secondary">Winning number:</span>
              <span
                className={`text-xl font-bold px-3 py-1 rounded ${
                  result.winningColor === 'green'
                    ? 'bg-green-600'
                    : result.winningColor === 'red'
                    ? 'bg-red-600'
                    : 'bg-gray-800'
                }`}
              >
                {result.winningNumber}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play Again Button */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <motion.button
              onClick={resetGame}
              whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(212, 175, 55, 0.5)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-xl font-casino font-bold text-lg transition-all relative overflow-hidden bg-gradient-to-r from-casino-gold to-casino-gold-dark text-casino-dark border-2 border-casino-gold shadow-lg"
            >
              <span className="flex items-center justify-center space-x-2">
                <Play className="w-5 h-5" />
                <span>PLAY AGAIN</span>
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bet Controls */}
      {!result && (
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
            onClick={spinWheel}
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
                <span>SPIN THE WHEEL</span>
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
            )}
          </motion.button>
        </div>
      )}

      {/* Payout Info */}
      <div className="mt-3 sm:mt-6 pt-2 sm:pt-4 border-t border-casino-gold/20">
        <p className="text-xs text-casino-text-muted text-center">
          Payouts: Red/Black (2x) • Even/Odd (2x) • Single Number (35x)
        </p>
      </div>
    </div>
  );
};

export default RoyalRoulette;
