'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Sparkles, RotateCcw, Gift, Star } from 'lucide-react';
import { useGameSounds } from '@/hooks/useGameSounds';

interface GameResult {
  win: boolean;
  winAmount: number;
  outcome: string;
  segment?: number;
  multiplier?: number;
}

interface LuckyWheelProps {
  balance: number;
  minBet: number;
  maxBet: number;
  onPlay: (bet: number, prediction?: { type: string; value: string | number }) => Promise<GameResult>;
  onClose: () => void;
}

// Wheel segments with different multipliers
const WHEEL_SEGMENTS = [
  { id: 0, label: '0x', multiplier: 0, color: '#DC2626', size: 1 },      // Red
  { id: 1, label: '0.5x', multiplier: 0.5, color: '#7C3AED', size: 1 }, // Purple
  { id: 2, label: '2x', multiplier: 2, color: '#16A34A', size: 2 },    // Green
  { id: 3, label: '1x', multiplier: 1, color: '#3B82F6', size: 2 },     // Blue
  { id: 4, label: '3x', multiplier: 3, color: '#D4AF37', size: 1 },     // Gold
  { id: 5, label: '0.5x', multiplier: 0.5, color: '#7C3AED', size: 1 }, // Purple
  { id: 6, label: '5x', multiplier: 5, color: '#FFD700', size: 1 },      // Yellow
  { id: 7, label: '1x', multiplier: 1, color: '#3B82F6', size: 2 },    // Blue
  { id: 8, label: '2x', multiplier: 2, color: '#16A34A', size: 2 },    // Green
  { id: 9, label: '10x', multiplier: 10, color: '#FF6B00', size: 0.5 }, // Orange
  { id: 10, label: '1x', multiplier: 1, color: '#3B82F6', size: 2 },    // Blue
  { id: 11, label: '2x', multiplier: 2, color: '#16A34A', size: 2 },    // Green
];

export const LuckyWheel: React.FC<LuckyWheelProps> = ({
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
  const [showWinEffect, setShowWinEffect] = useState(false);
  const [showLoseEffect, setShowLoseEffect] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [tickerAngle, setTickerAngle] = useState(0);
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null);

  const wheelRef = useRef<HTMLDivElement>(null);
  const tickerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    playButtonClick,
    playWheelSpin,
    playWheelTick,
    playWin,
    playLose,
    playSuspense,
  } = useGameSounds();

  // Calculate segment angles
  const totalSize = WHEEL_SEGMENTS.reduce((acc, seg) => acc + seg.size, 0);
  let currentAngle = 0;
  const segmentAngles = WHEEL_SEGMENTS.map((seg) => {
    const startAngle = currentAngle;
    const angleSize = (seg.size / totalSize) * 360;
    currentAngle += angleSize;
    return { ...seg, startAngle, endAngle: currentAngle, angleSize };
  });

  // Handle bet changes
  const decreaseBet = useCallback(() => {
    playButtonClick();
    setBet((prev) => Math.max(minBet, prev - 10));
  }, [minBet, playButtonClick]);

  const increaseBet = useCallback(() => {
    playButtonClick();
    setBet((prev) => Math.min(maxBet, prev + 10));
  }, [maxBet, playButtonClick]);

  // Calculate winning segment
  const getWinningSegment = (rotation: number) => {
    // Normalize rotation to 0-360
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    // The pointer is at the top (270 degrees in SVG coordinate system)
    // So we need to find which segment is at that position
    const pointerAngle = (360 - normalizedRotation + 270) % 360;

    for (const seg of segmentAngles) {
      if (pointerAngle >= seg.startAngle && pointerAngle < seg.endAngle) {
        return seg.id;
      }
    }
    return 0;
  };

  // Spin the wheel
  const spinWheel = async () => {
    if (isPlaying || bet > balance) return;

    setIsPlaying(true);
    setResult(null);
    setShowWinEffect(false);
    setShowLoseEffect(false);
    setConfetti(false);
    setHighlightedSegment(null);

    playWheelSpin();

    try {
      const gameResult = await onPlay(bet);

      // Calculate target rotation
      const minSpins = 5;
      const baseRotation = minSpins * 360;

      // Find the target segment
      const targetSegment = segmentAngles.find(seg => seg.id === gameResult.segment);
      if (!targetSegment) return;

      // Calculate the angle to land on target segment
      // The pointer is at top (270 degrees), so we rotate opposite direction
      const targetAngle = targetSegment.startAngle + targetSegment.angleSize / 2;
      const finalRotation = baseRotation + (360 - targetAngle + 270) % 360;

      // Start ticker clicking effect during spin
      let tickCount = 0;
      const maxTicks = 40; // Approximate number of segments passed
      tickerIntervalRef.current = setInterval(() => {
        tickCount++;
        if (tickCount < maxTicks) {
          // Calculate current ticker angle based on wheel rotation speed
          const progress = tickCount / maxTicks;
          // Ease-out speed curve
          const speed = 1 - Math.pow(progress, 3);
          setTickerAngle(Math.sin(tickCount * 0.5) * 15 * speed);
          playWheelTick();
        } else {
          if (tickerIntervalRef.current) {
            clearInterval(tickerIntervalRef.current);
          }
          setTickerAngle(0);
        }
      }, 100);

      // Start spinning
      setWheelRotation(finalRotation);

      // Wait for spin to complete (4 seconds)
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Clear ticker
      if (tickerIntervalRef.current) {
        clearInterval(tickerIntervalRef.current);
      }
      setTickerAngle(0);

      // Highlight winning segment
      setHighlightedSegment(gameResult.segment ?? null);

      // Suspense delay
      playSuspense();
      await new Promise((resolve) => setTimeout(resolve, 800));

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

      // Reset wheel position after delay
      setTimeout(() => {
        setWheelRotation(finalRotation % 360);
        setHighlightedSegment(null);
      }, 3000);
    } catch (error) {
      console.error('Game error:', error);
      if (tickerIntervalRef.current) {
        clearInterval(tickerIntervalRef.current);
      }
    } finally {
      setIsPlaying(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tickerIntervalRef.current) {
        clearInterval(tickerIntervalRef.current);
      }
    };
  }, []);

  // Generate wheel SVG segments
  const generateWheelSegments = () => {
    const radius = 140;
    const centerX = 150;
    const centerY = 150;

    return segmentAngles.map((seg) => {
      const startRad = (seg.startAngle * Math.PI) / 180;
      const endRad = (seg.endAngle * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = seg.angleSize > 180 ? 1 : 0;
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ');

      // Calculate text position (middle of segment)
      const midAngle = (seg.startAngle + seg.endAngle) / 2;
      const midRad = (midAngle * Math.PI) / 180;
      const textRadius = radius * 0.7;
      const textX = centerX + textRadius * Math.cos(midRad);
      const textY = centerY + textRadius * Math.sin(midRad);

      return { ...seg, pathData, textX, textY };
    });
  };

  const wheelSegments = generateWheelSegments();

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
          Lucky Wheel
        </h2>
        <p className="text-casino-text-secondary text-sm">
          Spin the wheel and multiply your bet!
        </p>
      </div>

      {/* Lucky Wheel */}
      <div className="relative mb-8 flex justify-center">
        <div className="relative w-80 h-80">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-casino-gold/30 via-casino-gold/10 to-casino-gold/30 blur-xl" />

          {/* Wheel container */}
          <div
            ref={wheelRef}
            className="absolute inset-4 rounded-full overflow-hidden border-4 border-casino-gold/50 shadow-2xl"
            style={{
              transform: `rotate(${wheelRotation}deg)`,
              transition: isPlaying ? 'transform 4s cubic-bezier(0.1, 0.3, 0.3, 1)' : 'transform 0.5s ease-out',
            }}
          >
            <svg viewBox="0 0 300 300" className="w-full h-full">
              {wheelSegments.map((seg) => (
                <g key={seg.id}>
                  <path
                    d={seg.pathData}
                    fill={seg.color}
                    stroke="#1a1a1a"
                    strokeWidth="2"
                    className={highlightedSegment === seg.id ? 'slot-highlight' : ''}
                  />
                  <text
                    x={seg.textX}
                    y={seg.textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                    style={{
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      transform: `rotate(${seg.angleSize / 2}deg)`,
                      transformOrigin: `${seg.textX}px ${seg.textY}px`,
                    }}
                  >
                    {seg.label}
                  </text>
                </g>
              ))}

              {/* Center hub */}
              <circle cx="150" cy="150" r="30" fill="#D4AF37" />
              <circle cx="150" cy="150" r="25" fill="#1a1a1a" />
              <Star className="w-8 h-8" x="142" y="142" fill="#D4AF37" />
            </svg>
          </div>

          {/* Ticker/Pointer */}
          <motion.div
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-20"
            animate={{ rotate: tickerAngle }}
            transition={{ duration: 0.1 }}
          >
            <div className="relative">
              {/* Ticker body */}
              <div className="w-8 h-12 bg-gradient-to-b from-casino-gold to-casino-gold-dark rounded-t-full border-2 border-white/30 shadow-lg">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white/50" />
                </div>
              </div>
              {/* Ticker point */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[16px] border-l-transparent border-r-transparent border-t-casino-gold-dark" />
              </div>
            </div>
          </motion.div>

          {/* Decorative lights */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                top: '10px',
                left: '50%',
                transform: `rotate(${i * 30}deg) translateX(-50%) translateY(0)`,
                transformOrigin: '0 150px',
                backgroundColor: i % 2 === 0 ? '#D4AF37' : '#FF6B00',
                boxShadow: '0 0 10px currentColor',
                animation: `pulse 1s ease-in-out ${i * 0.1}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Multiplier Preview */}
      <div className="glass-panel rounded-xl p-4 mb-6">
        <p className="text-sm text-casino-text-secondary text-center mb-3">Possible Multipliers</p>
        <div className="flex flex-wrap justify-center gap-2">
          {WHEEL_SEGMENTS.filter((seg, idx, arr) => arr.findIndex(s => s.multiplier === seg.multiplier) === idx)
            .sort((a, b) => a.multiplier - b.multiplier)
            .map((seg) => (
              <div
                key={seg.id}
                className="flex items-center space-x-1 px-2 py-1 rounded bg-casino-card text-xs"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className={seg.multiplier >= 5 ? 'text-casino-gold font-bold' : 'text-casino-text-secondary'}>
                  {seg.multiplier}x
                </span>
              </div>
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
                'Better luck next spin!'
              )}
            </motion.div>

            <div className="mt-2 flex items-center justify-center space-x-2">
              <span className="text-sm text-casino-text-secondary">Landed on:</span>
              <span
                className="font-bold text-lg px-3 py-1 rounded"
                style={{
                  backgroundColor: WHEEL_SEGMENTS.find(s => s.id === result.segment)?.color,
                }}
              >
                {result.multiplier}x
              </span>
            </div>
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

        {/* Spin Button */}
        <motion.button
          onClick={spinWheel}
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
              <span>Spinning...</span>
            </span>
          ) : bet > balance ? (
            'Insufficient Balance'
          ) : (
            <span className="flex items-center justify-center space-x-2">
              <Gift className="w-5 h-5" />
              <span>SPIN THE WHEEL</span>
              <Gift className="w-5 h-5" />
            </span>
          )}
        </motion.button>

        {/* Payout Info */}
        <div className="mt-6 pt-4 border-t border-casino-gold/20">
          <p className="text-xs text-casino-text-muted text-center">
            Multipliers: 0x to 10x • Higher multipliers have lower chances
          </p>
        </div>
      </div>
    </div>
  );
};

export default LuckyWheel;
