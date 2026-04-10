'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Sparkles, RotateCcw } from 'lucide-react';
import { useGameSounds } from '@/hooks/useGameSounds';

interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string;
  numericValue: number;
}

interface GameResult {
  win: boolean;
  winAmount: number;
  outcome: string;
  playerCards?: Card[];
  dealerCards?: Card[];
  playerTotal?: number;
  dealerTotal?: number;
  guaranteedWin?: boolean;
}

interface AceBlackjackProps {
  balance: number;
  minBet: number;
  maxBet: number;
  onPlay: (bet: number, prediction?: { type: string; value: string | number }) => Promise<GameResult>;
  onClose: () => void;
}

const SUITS = {
  hearts: { symbol: '♥', color: 'text-red-500', bgColor: 'bg-red-50' },
  diamonds: { symbol: '♦', color: 'text-red-500', bgColor: 'bg-red-50' },
  clubs: { symbol: '♣', color: 'text-gray-900', bgColor: 'bg-gray-50' },
  spades: { symbol: '♠', color: 'text-gray-900', bgColor: 'bg-gray-50' },
};

const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ── Module-level helpers (used by both component logic and pre-deal rigging) ──

const calculateTotal = (cards: Card[]): number => {
  let total = 0;
  let aces = 0;
  cards.forEach((card) => {
    if (card.value === 'A') { aces++; total += 11; }
    else if (['J', 'Q', 'K'].includes(card.value)) { total += 10; }
    else { total += card.numericValue || 0; }
  });
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
};

// Returns a random card from VALUES that will NOT bust the given hand.
// Used for forced-loss draws so the dealer never busts mid-animation.
const generateNoBustCard = (currentHand: Card[]): Card => {
  const SUIT_LIST: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const rSuit = (): Card['suit'] => SUIT_LIST[Math.floor(Math.random() * 4)];

  const valid: { value: string; numericValue: number }[] = [];
  for (const v of VALUES) {
    const numericValue = v === 'A' ? 11 : ['J', 'Q', 'K'].includes(v) ? 10 : parseInt(v);
    if (calculateTotal([...currentHand, { suit: 'spades', value: v, numericValue }]) <= 21) {
      valid.push({ value: v, numericValue });
    }
  }
  // Ace always works as a soft 1 — use as ultimate fallback
  if (valid.length === 0) return { suit: rSuit(), value: 'A', numericValue: 11 };
  const p = valid[Math.floor(Math.random() * valid.length)];
  return { suit: rSuit(), value: p.value, numericValue: p.numericValue };
};

// Returns a card that will bust the given hand (total > 21).
// If no single card can bust (e.g. soft hand), returns the highest non-busting
// card to harden the hand so the next draw can bust it.
// Used for guaranteed-win mode so the dealer always busts.
const generateBustCard = (currentHand: Card[]): Card => {
  const SUIT_LIST: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const rSuit = (): Card['suit'] => SUIT_LIST[Math.floor(Math.random() * 4)];

  const busting: { value: string; numericValue: number }[] = [];
  for (const v of VALUES) {
    const numericValue = v === 'A' ? 11 : ['J', 'Q', 'K'].includes(v) ? 10 : parseInt(v);
    if (calculateTotal([...currentHand, { suit: 'spades', value: v, numericValue }]) > 21) {
      busting.push({ value: v, numericValue });
    }
  }

  if (busting.length > 0) {
    const p = busting[Math.floor(Math.random() * busting.length)];
    return { suit: rSuit(), value: p.value, numericValue: p.numericValue };
  }

  // Soft hand — can't bust in one card. Return the highest non-ace card to
  // harden the hand so the next call can bust it.
  let best = { value: '10', numericValue: 10 };
  let bestNumeric = 0;
  for (const v of VALUES) {
    if (v === 'A') continue;
    const numericValue = ['J', 'Q', 'K'].includes(v) ? 10 : parseInt(v);
    const newTotal = calculateTotal([...currentHand, { suit: 'spades', value: v, numericValue }]);
    if (newTotal <= 21 && numericValue > bestNumeric) {
      best = { value: v, numericValue };
      bestNumeric = numericValue;
    }
  }
  return { suit: rSuit(), value: best.value, numericValue: best.numericValue };
};


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
  const [cardsRevealed, setCardsRevealed] = useState(false);

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

  // Responsive card sizing — smaller on mobile to prevent overflow
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const CARD_W   = isMobile ? 90  : 128;
  const CARD_H   = isMobile ? 132 : 192;
  const CARD_STEP = isMobile ? 24  : 36;

  // Store initial cards for reveal feature
  const [initialPlayerCards, setInitialPlayerCards] = useState<Card[]>([]);

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
    setCardsRevealed(false);
    setInitialPlayerCards([]);
    setDealingCards(true);

    // Generate cards
    const pCard1 = generateCard();
    const dCard1 = generateCard();
    const pCard2 = generateCard();
    const dCard2 = generateCard();

    // Store initial player cards for later reveal
    setInitialPlayerCards([pCard1, pCard2]);

    // Deal animation sequence
    // Card 1: Player (face down)
    playCardDeal();
    setPlayerCards([{ suit: 'spades', value: '?', numericValue: 0 }]);
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Card 2: Dealer (face down initially)
    playCardDeal();
    setDealerCards([dCard1, { suit: 'spades', value: '?', numericValue: 0 }]);
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Card 3: Player (face down)
    playCardDeal();
    setPlayerCards([
      { suit: 'spades', value: '?', numericValue: 0 },
      { suit: 'spades', value: '?', numericValue: 0 },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Card 4: Dealer
    playCardDeal();
    setDealerCards([dCard1, dCard2]);
    await new Promise((resolve) => setTimeout(resolve, 400));

    setDealingCards(false);
  };

  // Dealer draws cards with optional forced-loss or forced-win mode.
  // forceLoss=true: only draw no-bust cards, keep drawing past 17 until dealer
  //   beats playerHandTotal (forced loss for the player).
  // forceWin=true: keep drawing past 17 using bust-targeted cards until dealer
  //   exceeds 21 (guaranteed win for the player).
  const drawDealerCards = async (
    currentDealerCards: Card[],
    forceLoss: boolean = false,
    forceWin: boolean = false,
    playerHandTotal: number = 0,
  ): Promise<Card[]> => {
    let dealerHand = [...currentDealerCards];

    const shouldKeepDrawing = (): boolean => {
      const score = calculateTotal(dealerHand);
      if (score > 21) return false;          // Already bust — stop
      if (score < 17) return true;           // Always draw below 17
      if (forceLoss) return score < 21 && score <= playerHandTotal;
      if (forceWin) return true;             // Keep drawing until bust
      return false;                          // Normal: stop at 17+
    };

    while (shouldKeepDrawing()) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const newCard = forceLoss
        ? generateNoBustCard(dealerHand)
        : forceWin
        ? generateBustCard(dealerHand)
        : generateCard();
      dealerHand = [...dealerHand, newCard];
      setDealerCards(dealerHand);
      playCardDeal();
    }

    return dealerHand;
  };

  // Reveal cards and continue with game
  const revealCards = async () => {
    if (initialPlayerCards.length === 0) return;

    // Flip player cards
    playCardFlip();
    setCardsRevealed(true);
    setPlayerCards(initialPlayerCards);

    // Check for blackjack (21 on first two cards)
    const initialPlayerTotal = initialPlayerCards[0].numericValue + initialPlayerCards[1].numericValue;
    if (initialPlayerTotal === 21) {
      setIsBlackjack(true);
    }

    await new Promise((resolve) => setTimeout(resolve, 600));

    // Play game
    try {
      const gameResult = await onPlay(bet);

      // ── Resolve card state ──────────────────────────────────────────────────
      let currentDealerCards = (gameResult?.dealerCards && gameResult.dealerCards.length > 0)
        ? gameResult.dealerCards
        : dealerCards;

      let currentPlayerCards = initialPlayerCards;
      if (gameResult.playerCards && gameResult.playerCards.length > 0) {
        currentPlayerCards = gameResult.playerCards;
        setPlayerCards(gameResult.playerCards);
      }

      // winRate === 100 → guaranteed win; winRate === 0 → guaranteed loss
      const isGuaranteedWin = gameResult.guaranteedWin === true;

      // ── Rig hidden dealer card BEFORE the flip animation ────────────────────
      // The hidden card (index-1) was never seen — safe to swap silently.
      // The face-up card (index-0) is already visible and must not change.
      if (currentDealerCards.length >= 2) {
        const faceUpCard = currentDealerCards[0];
        if (isGuaranteedWin) {
          // Guaranteed win: give dealer a high-value hidden card to set up a bust.
          const SUIT_LIST: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
          const highValues = ['10', 'J', 'Q', 'K'];
          const hv = highValues[Math.floor(Math.random() * highValues.length)];
          const weakHidden: Card = {
            suit: SUIT_LIST[Math.floor(Math.random() * 4)],
            value: hv,
            numericValue: 10,
          };
          currentDealerCards = [faceUpCard, weakHidden];
          setDealerCards(currentDealerCards);
        } else if (!gameResult.win) {
          // Forced-loss: give dealer a strong hidden card so they start from a
          // good position and keep drawing until they beat the player.
          const strongHidden = generateNoBustCard([faceUpCard]);
          currentDealerCards = [faceUpCard, strongHidden];
          setDealerCards(currentDealerCards);
        }
      }
      // ────────────────────────────────────────────────────────────────────────

      // Reveal dealer cards (flip animation plays now, showing the updated hidden card)
      setShowDealerCards(true);
      playCardFlip();
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Draw additional dealer cards:
      //   forceWin  → keep drawing with bust-targeted cards until dealer exceeds 21
      //   forceLoss → keep drawing (no-bust) until dealer beats player
      //   normal    → draw until 17+
      const pTotal = calculateTotal(currentPlayerCards);
      const forceLoss = !gameResult.win && !isGuaranteedWin;
      currentDealerCards = await drawDealerCards(currentDealerCards, forceLoss, isGuaranteedWin, pTotal);

      // Stop dealing state so button doesn't look stuck while player views cards
      setDealingCards(false);

      // Suspenseful delay before showing result (2.5 seconds for player to see final cards)
      playSuspense();
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Calculate final totals using the actual cards
      const playerTotal = calculateTotal(currentPlayerCards);
      const dealerTotal = calculateTotal(currentDealerCards);

      // Check for blackjack (21 on first two cards only)
      const isBlackjackWin = currentPlayerCards.length === 2 && playerTotal === 21;

      let isWin = false;
      let isPush = false;
      let correctedOutcome = '';
      let winAmount = 0;

      if (playerTotal > 21) {
        // Player busts - always lose
        isWin = false;
        isPush = false;
        winAmount = 0;
        correctedOutcome = 'Player busts! You lose.';
      } else if (dealerTotal > 21) {
        // Dealer busts - always win
        isWin = true;
        isPush = false;
        // Blackjack pays 2.5x, standard win pays 2x
        winAmount = isBlackjackWin ? Math.floor(bet * 2.5) : bet * 2;
        correctedOutcome = isBlackjackWin
          ? `Blackjack! Dealer busts! You win ${winAmount}!`
          : 'Dealer busts! You win!';
      } else if (playerTotal > dealerTotal) {
        // Player has higher score
        isWin = true;
        isPush = false;
        // Blackjack pays 2.5x, standard win pays 2x
        winAmount = isBlackjackWin ? Math.floor(bet * 2.5) : bet * 2;
        correctedOutcome = isBlackjackWin
          ? `Blackjack! You win ${winAmount}!`
          : `You win with ${playerTotal} vs Dealer's ${dealerTotal}!`;
      } else if (playerTotal < dealerTotal) {
        // Dealer has higher score - lose
        isWin = false;
        isPush = false;
        winAmount = 0;
        correctedOutcome = `Dealer wins with ${dealerTotal} vs your ${playerTotal}.`;
      } else {
        // Push (tie) - return original bet
        isWin = false;
        isPush = true;
        winAmount = bet;
        correctedOutcome = `Push! It's a tie at ${playerTotal}.`;
      }

      // Use corrected result with calculated winAmount
      const correctedResult = {
        ...gameResult,
        win: isWin,
        outcome: correctedOutcome,
        winAmount: winAmount,
      };

      setResult(correctedResult);

      if (isWin) {
        setShowWinEffect(true);
        setConfetti(true);
        playWin(winAmount, bet);
        setTimeout(() => setConfetti(false), 5000);
      } else if (isPush) {
        // Push - no win/lose effects, just return bet
        setShowWinEffect(false);
        setShowLoseEffect(false);
      } else {
        setShowLoseEffect(true);
        playLose();
        setTimeout(() => setShowLoseEffect(false), 5000);
      }
    } catch (error) {
      console.error('Game error:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Render a card with 3D flip effect
  const renderCard = (card: Card, index: number, isDealer: boolean, isHidden: boolean = false, isPlayer: boolean = false) => {
    const suit = SUITS[card.suit];
    const rotation = isDealer ? index * 5 : index * -5; // Slight fan effect

    return (
      <motion.div
        key={`${isDealer ? 'dealer' : 'player'}-${index}`}
        className="relative cursor-pointer"
        initial={{
          x: isDealer ? 300 : -300,
          y: -100,
          opacity: 0,
          rotate: isDealer ? 30 : -30,
        }}
        animate={{
          x: 0,
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
          width: `${CARD_W}px`,
          height: `${CARD_H}px`,
          flexShrink: 0,
          marginLeft: index > 0 ? `${-(CARD_W - CARD_STEP)}px` : '0px',
          zIndex: index,
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
                <div className={`absolute top-2 left-2 text-xl font-black leading-none ${suit.color}`}>
                  {card.value}
                </div>
                <div className={`absolute top-9 left-2 text-2xl leading-none ${suit.color}`}>
                  {suit.symbol}
                </div>

                {/* Center */}
                <div className={`absolute inset-0 flex items-center justify-center text-7xl ${suit.color}`}>
                  {suit.symbol}
                </div>

                {/* Bottom right (rotated) */}
                <div className={`absolute bottom-2 right-2 text-xl font-black rotate-180 leading-none ${suit.color}`}>
                  {card.value}
                </div>
                <div className={`absolute bottom-9 right-2 text-2xl rotate-180 leading-none ${suit.color}`}>
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
              <div className="w-16 h-16 rounded-full border-2 border-casino-gold/50 flex items-center justify-center">
                <span className="text-casino-gold text-2xl">★</span>
              </div>
            </div>
          </div>
        </motion.div>
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
    <div className={`relative p-3 sm:p-5 ${showLoseEffect ? 'shake-screen' : ''}`}>
      {renderConfetti()}

      {/* Game Header */}
      <div className="text-center mb-1.5">
        <h2 className="text-xl sm:text-3xl font-casino font-bold text-gold-gradient leading-tight">
          Ace Blackjack
        </h2>
        <p className="text-casino-text-secondary text-xs hidden sm:block">
          Beat the dealer to 21!
        </p>
      </div>

      {/* Game Table */}
      <div className="relative mb-2">
        <div className="bg-gradient-to-br from-green-900 via-green-800 to-green-900 rounded-2xl p-3 border-4 border-casino-gold/30 shadow-2xl"
        >
          {/* Felt texture */}
          <div className="absolute inset-0 rounded-2xl opacity-20 bg-[radial-gradient(circle_at_50%_50%,_#ffffff_1px,_transparent_1px)] bg-[length:6px_6px]"
          />

          {/* Dealer Section */}
          <div className="relative mb-2">
            <div className="text-center mb-1 flex items-center justify-center gap-2">
              <span className="text-xs text-casino-text-secondary uppercase tracking-wider">Dealer</span>
              {dealerCards.length > 0 && (
                <span className="font-bold text-casino-gold leading-none" style={{ fontSize: isMobile ? '1.4rem' : '2.5rem' }}>
                  {!showDealerCards
                    ? calculateTotal([dealerCards[0]])
                    : calculateTotal(dealerCards) || 0}
                </span>
              )}
            </div>
            <div className="flex justify-center items-center overflow-visible" style={{ height: isMobile ? '160px' : '215px' }}>
              {dealerCards.length > 0 ? (
                <div className="flex items-center overflow-visible">
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
          <div className="w-full h-px bg-gradient-to-r from-transparent via-casino-gold/30 to-transparent mb-2" />

          {/* Player Section */}
          <div className="relative">
            <div className="text-center mb-1 flex items-center justify-center gap-2">
              <span className="text-xs text-casino-text-secondary uppercase tracking-wider">Your Hand</span>
              {playerCards.length > 0 && (
                <span className="font-bold text-casino-gold leading-none" style={{ fontSize: isMobile ? '1.4rem' : '2.5rem' }}>
                  {calculateTotal(playerCards)}
                </span>
              )}
            </div>
            <div className="flex justify-center items-center overflow-visible" style={{ height: isMobile ? '160px' : '215px' }}>
              {playerCards.length > 0 ? (
                <div className="flex items-center overflow-visible">
                  {playerCards.map((card, index) => renderCard(card, index, false, !cardsRevealed, true))}
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
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-casino-gold text-casino-dark font-casino font-bold text-lg sm:text-2xl px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-lg glow-gold-strong z-10"
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
            className={`text-center py-2 px-3 rounded-xl mb-2 border-2 ${
              result.win
                ? 'bg-gradient-to-r from-casino-gold/20 to-casino-gold/10 border-casino-gold glow-gold-strong'
                : result.outcome.toLowerCase().includes('push')
                ? 'bg-blue-900/20 border-blue-500/50'
                : 'bg-red-900/20 border-red-500/50'
            }`}
          >
            <motion.div
              className={`text-2xl font-bold font-casino ${
                result.win
                  ? 'text-gold-gradient glow-text-gold'
                  : result.outcome.toLowerCase().includes('push')
                  ? 'text-casino-gold'
                  : 'text-red-400'
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
              ) : result.outcome.toLowerCase().includes('push') ? (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  PUSH - Bet Returned
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
      <div className="space-y-2">
        <div className="glass-panel rounded-xl p-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-casino-text-secondary whitespace-nowrap">Bet</label>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={decreaseBet}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                disabled={isPlaying || bet <= minBet}
                className="w-9 h-9 rounded-full bg-casino-card border border-casino-gold/30 text-casino-gold font-bold text-lg hover:border-casino-gold hover:glow-gold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                -
              </motion.button>

              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-casino-dark rounded-xl border border-casino-gold/30 min-w-[90px] justify-center">
                <Coins className="w-4 h-4 text-casino-gold" />
                <span className="text-lg font-bold text-white">{bet}</span>
              </div>

              <motion.button
                onClick={increaseBet}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                disabled={isPlaying || bet >= maxBet || bet >= balance}
                className="w-9 h-9 rounded-full bg-casino-card border border-casino-gold/30 text-casino-gold font-bold text-lg hover:border-casino-gold hover:glow-gold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                +
              </motion.button>
            </div>
            <span className="text-xs text-casino-text-muted whitespace-nowrap">Max: {Math.min(maxBet, balance)}</span>
          </div>
        </div>

        {/* Reveal Cards Button - shown when cards are dealt but not revealed */}
        {playerCards.length > 0 && !cardsRevealed && !result && !dealingCards ? (
          <motion.button
            onClick={revealCards}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl font-casino font-bold text-base sm:text-lg transition-all relative overflow-hidden bg-gradient-to-r from-casino-gold to-casino-gold-dark text-casino-dark btn-premium"
          >
            <span className="flex items-center justify-center space-x-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>REVEAL CARDS</span>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </motion.button>
        ) : (
          /* Deal Button */
          <motion.button
            onClick={dealHand}
            disabled={isPlaying || bet > balance}
            whileHover={!isPlaying && bet <= balance ? { scale: 1.02 } : {}}
            whileTap={!isPlaying && bet <= balance ? { scale: 0.98 } : {}}
            className={`w-full py-3 rounded-xl font-casino font-bold text-base sm:text-lg transition-all relative overflow-hidden ${
              isPlaying || bet > balance
                ? 'bg-casino-card text-casino-text-muted cursor-not-allowed'
                : 'bg-gradient-to-r from-casino-gold to-casino-gold-dark text-casino-dark btn-premium'
            }`}
          >
            {isPlaying ? (
              <span className="flex items-center justify-center space-x-2">
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 spinner" />
                <span>Dealing...</span>
              </span>
            ) : bet > balance ? (
              'Insufficient Balance'
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>DEAL CARDS</span>
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
            )}
          </motion.button>
        )}

        {/* Payout Info */}
        <div className="pt-1.5 border-t border-casino-gold/20">
          <p className="text-xs text-casino-text-muted text-center">
            Blackjack 3:2 • Win 1:1 • Push returns bet
          </p>
        </div>
      </div>
    </div>
  );
};

export default AceBlackjack;
