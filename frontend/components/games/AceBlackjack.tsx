'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Sparkles, RotateCcw } from 'lucide-react';
import { useGameSounds } from '@/hooks/useGameSounds';

interface GameResult {
  win: boolean;
  winAmount: number;
  outcome: string;
  playerCards: Card[];
  dealerCards: Card[];
  playerTotal: number;
  dealerTotal: number;
}

interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string;
  numericValue: number;
}

interface AceBlackjackProps {
  balance: number;
  minBet: number;
  maxBet: number;
  onPlay: (bet: number, action?: string) => Promise<GameResult>;
  onClose: () => void;
}

const SUITS = {
  hearts: { symbol: '♥', color: 'text-red-500', bgColor: 'bg-red-50' },
  diamonds: { symbol: '♦', color: 'text-red-500', bgColor: 'bg-red-50' },
  clubs: { symbol: '♣', color: 'text-gray-900', bgColor: 'bg-gray-50' },
  spades: { symbol: '♠', color: 'text-gray-900', bgColor: 'bg-gray-50' },
};

const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const AceBlackjack: React.FC<AceBlackjackProps> = ({
  balance,
  minBet,
  maxBet,
  onPlay,
  onClose,
}) => {
  const [bet, setBet] = useState(minBet);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [dealingCards, setDealingCards] = useState(false);
  const [showWinEffect, setShowWinEffect] = useState(false);
  const [showLoseEffect, setShowLoseEffect] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [showDealerCards, setShowDealerCards] = useState(false);
  const [isBlackjack, setIsBlackjack] = useState(false);

  const {
    playButtonClick,
    playCardDeal,
    playCardFlip,
    playWin,
    playLose,
    playSuspense,
  } = useGameSounds();

  // Generate random card
  const generateCard = (): Card => {
    const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const value = VALUES[Math.floor(Math.random() * VALUES.length)];
    const numericValue = value === 'A' ? 11 : ['J', 'Q', 'K'].includes(value) ? 10 : parseInt(value);

    return { suit, value, numericValue };
  };

  // Handle bet changes
  const decreaseBet = useCallback(() => {
    playButtonClick();
    setBet((prev) => Math.max(minBet, prev - 10));
  }, [minBet, playButtonClick]);

  const increaseBet = useCallback(() => {
    playButtonClick();
    setBet((prev) => Math.min(maxBet, prev + 10));
  }, [maxBet, playButtonClick]);

  // Deal cards with animation
  const dealHand = async () => {
    if (isPlaying || bet > balance) return;

    setIsPlaying(true);
    setResult(null);
    setShowWinEffect(false);
    setShowLoseEffect(false);
    setConfetti(false);
    setPlayerCards([]);
    setDealerCards([]);
    setShowDealerCards(false);
    setIsBlackjack(false);
    setDealingCards(true);

    // Generate cards
    const pCard1 = generateCard();
    const dCard1 = generateCard();
    const pCard2 = generateCard();
    const dCard2 = generateCard();

    // Deal animation sequence
    // Card 1: Player
    playCardDeal();
    setPlayerCards([pCard1]);
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Card 2: Dealer (face down initially)
    playCardDeal();
    setDealerCards([dCard1, { suit: 'spades', value: '?', numericValue: 0 }]);
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Card 3: Player
    playCardDeal();
    setPlayerCards([pCard1, pCard2]);
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Card 4: Dealer
    playCardDeal();
    setDealerCards([dCard1, dCard2]);
    await new Promise((resolve) => setTimeout(resolve, 400));

    setDealingCards(false);

    // Check for blackjack (21 on first two cards)
    const playerTotal = pCard1.numericValue + pCard2.numericValue;
    if (playerTotal === 21) {
      setIsBlackjack(true);
    }

    // Play game
    try {
      const gameResult = await onPlay(bet);

      // Reveal dealer cards
      setShowDealerCards(true);
      playCardFlip();
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Update with actual results
      setPlayerCards(gameResult.playerCards);
      setDealerCards(gameResult.dealerCards);

      // Suspense before result
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
    } catch (error) {
      console.error('Game error:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Render a card with 3D flip effect
  const renderCard = (card: Card, index: number, isDealer: boolean, isHidden: boolean = false) => {
    const suit = SUITS[card.suit];
    const rotation = isDealer ? index * 5 : index * -5; // Slight fan effect

    return (
      <motion.div
        key={`${isDealer ? 'dealer' : 'player'}-${index}`}
        className="relative w-16 h-24 cursor-pointer"
        initial={{
          x: isDealer ? 300 : -300,
          y: -100,
          opacity: 0,
          rotate: isDealer ? 30 : -30,
        }}
        animate={{
          x: index * 20,
          y: 0,
          opacity: 1,
          rotate: rotation,
        }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 20,
          delay: index * 0.1,
        }}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Card container with flip */}
        <motion.div
          className={`w-full h-full relative ${isBlackjack && !isDealer ? 'card-21-flash' : ''}`}
          animate={{ rotateY: isHidden ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Card Front */}
          <div
            className={`absolute inset-0 rounded-lg border-2 border-casino-gold/30 ${
              suit ? suit.bgColor : 'bg-casino-card'
            } shadow-lg overflow-hidden`}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)',
            }}
          >
            {!isHidden && suit && (
              <>
                {/* Top left */}
                <div className={`absolute top-1 left-1 text-xs font-bold ${suit.color}`}>
                  {card.value}
                </div>
                <div className={`absolute top-4 left-1 text-sm ${suit.color}`}>
                  {suit.symbol}
                </div>

                {/* Center */}
                <div className={`absolute inset-0 flex items-center justify-center text-4xl ${suit.color}`}>
                  {suit.symbol}
                </div>

                {/* Bottom right (rotated) */}
                <div className={`absolute bottom-1 right-1 text-xs font-bold rotate-180 ${suit.color}`}>
                  {card.value}
                </div>
                <div className={`absolute bottom-4 right-1 text-sm rotate-180 ${suit.color}`}>
                  {suit.symbol}
                </div>
              </>
            )}

            {/* Glass reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          </div>

          {/* Card Back */}
          <div
            className="absolute inset-0 rounded-lg border-2 border-casino-gold/50 bg-gradient-to-br from-casino-card to-casino-dark shadow-lg"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {/* Pattern */}
            <div className="absolute inset-2 border border-casino-gold/30 rounded"
              style={{
                background: `
                  repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 5px,
                    rgba(212,175,55,0.1) 5px,
                    rgba(212,175,55,0.1) 10px
                  )
                `,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-casino-gold/50 flex items-center justify-center">
                <span className="text-casino-gold text-xs">★</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Calculate total
  const calculateTotal = (cards: Card[]) => {
    let total = 0;
    let aces = 0;

    cards.forEach((card) => {
      if (card.value === 'A') {
        aces++;
        total += 11;
      } else if (['J', 'Q', 'K'].includes(card.value)) {
        total += 10;
      } else {
        total += card.numericValue || 0;
      }
    });

    // Adjust for aces
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return total;
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
          Ace Blackjack
        </h2>
        <p className="text-casino-text-secondary text-sm">
          Beat the dealer to 21!
        </p>
      </div>

      {/* Game Table */}
      <div className="relative mb-8">
        <div className="bg-gradient-to-br from-green-900 via-green-800 to-green-900 rounded-2xl p-6 border-4 border-casino-gold/30 shadow-2xl min-h-[320px]"
        >
          {/* Felt texture */}
          <div className="absolute inset-0 rounded-2xl opacity-20 bg-[radial-gradient(circle_at_50%_50%,_#ffffff_1px,_transparent_1px)] bg-[length:6px_6px]"
          />

          {/* Dealer Section */}
          <div className="relative mb-8">
            <div className="text-center mb-2">
              <span className="text-xs text-casino-text-secondary uppercase tracking-wider">Dealer</span>
              {showDealerCards && result && (
                <span className="ml-2 text-casino-gold font-bold">({result.dealerTotal})</span>
              )}
            </div>
            <div className="flex justify-center items-center h-28">
              {dealerCards.length > 0 ? (
                <div className="flex items-center">
                  {dealerCards.map((card, index) =>
                    renderCard(card, index, true, !showDealerCards && index === 1)
                  )}
                </div>
              ) : (
                <div className="text-casino-text-muted text-sm">Waiting...</div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-casino-gold/30 to-transparent mb-6"
          />

          {/* Player Section */}
          <div className="relative">
            <div className="text-center mb-2">
              <span className="text-xs text-casino-text-secondary uppercase tracking-wider">Your Hand</span>
              {playerCards.length > 0 && (
                <span className="ml-2 text-casino-gold font-bold">({calculateTotal(playerCards)})</span>
              )}
            </div>
            <div className="flex justify-center items-center h-28">
              {playerCards.length > 0 ? (
                <div className="flex items-center">
                  {playerCards.map((card, index) => renderCard(card, index, false))}
                </div>
              ) : (
                <div className="text-casino-text-muted text-sm">Click Deal to play</div>
              )}
            </div>
          </div>

          {/* Blackjack notification */}
          <AnimatePresence>
            {isBlackjack && !result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-casino-gold text-casino-dark font-casino font-bold text-2xl px-6 py-3 rounded-full shadow-lg glow-gold-strong z-10"
              >
                BLACKJACK!
              </motion.div>
            )}
          </AnimatePresence>
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
                'Dealer Wins'
              )}
            </motion.div>
            <p className="text-sm text-casino-text-secondary mt-1">
              {result.outcome}
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

        {/* Deal Button */}
        <motion.button
          onClick={dealHand}
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
              <span>Dealing...</span>
            </span>
          ) : bet > balance ? (
            'Insufficient Balance'
          ) : (
            <span className="flex items-center justify-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>DEAL CARDS</span>
              <Sparkles className="w-5 h-5" />
            </span>
          )}
        </motion.button>

        {/* Payout Info */}
        <div className="mt-6 pt-4 border-t border-casino-gold/20">
          <p className="text-xs text-casino-text-muted text-center">
            Blackjack pays 3:2 • Win pays 1:1 • Push returns bet
          </p>
        </div>
      </div>
    </div>
  );
};

export default AceBlackjack;
