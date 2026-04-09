import { Request, Response } from 'express';
import { Game, WheelAdvancedConfig, BlackjackAdvancedConfig } from '../models/Game';
import { GameResult } from '../models/GameResult';
import { User } from '../models/User';

// Get all active games (for users)
export const getGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const games = await Game.find({ isActive: true }).select('-__v');
    res.json({ games });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ message: 'Server error fetching games' });
  }
};

// Get all games including inactive (for admin)
export const getAllGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const games = await Game.find().select('-__v');
    res.json({ games });
  } catch (error) {
    console.error('Get all games error:', error);
    res.status(500).json({ message: 'Server error fetching games' });
  }
};

// Get single game
export const getGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const game = await Game.findOne({ slug, isActive: true });

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    res.json({ game });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ message: 'Server error fetching game' });
  }
};

// Wheel segment definitions — must stay in sync with frontend WHEEL_SEGMENTS order
const WHEEL_SEGMENTS = [
  { id: 0,  multiplier: 0   },
  { id: 1,  multiplier: 0.5 },
  { id: 2,  multiplier: 2   },
  { id: 3,  multiplier: 1   },
  { id: 4,  multiplier: 3   },
  { id: 5,  multiplier: 0.5 },
  { id: 6,  multiplier: 5   },
  { id: 7,  multiplier: 1   },
  { id: 8,  multiplier: 2   },
  { id: 9,  multiplier: 10  },
  { id: 10, multiplier: 1   },
  { id: 11, multiplier: 2   },
];

// Segments where the player earns back more than they bet (net profit)
const WHEEL_WIN_SEGMENTS  = WHEEL_SEGMENTS.filter(s => s.multiplier > 1);  // ids 2,4,6,8,9,11
const WHEEL_LOSE_SEGMENTS = WHEEL_SEGMENTS.filter(s => s.multiplier <= 1); // ids 0,1,3,5,7,10

// Play game - CRITICAL: Win rate logic on backend
export const playGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId, bet } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Validate bet
    if (!bet || bet <= 0) {
      res.status(400).json({ message: 'Invalid bet amount' });
      return;
    }

    // Get game configuration
    const game = await Game.findById(gameId);
    if (!game || !game.isActive) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    // Check bet limits
    if (bet < game.minBet || bet > game.maxBet) {
      res.status(400).json({
        message: `Bet must be between $${game.minBet} and $${game.maxBet}`,
      });
      return;
    }

    // Get user and check balance
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.balance < bet) {
      res.status(400).json({ message: 'Insufficient balance' });
      return;
    }

    // --- Game-specific outcome -------------------------------------------------
    let win: boolean;
    let winAmount: number;
    let outcome: string;
    let extraFields: Record<string, unknown> = {};

    if (game.slug === 'wheel') {
      // ── Lucky Wheel ──────────────────────────────────────────────────────────
      // Use admin-configured per-segment weights when available; fall back to
      // the simple win/lose pool derived from game.winRate.
      const cfg = game.advancedConfig as WheelAdvancedConfig | undefined;
      const weights = cfg?.wheelWeights;

      let chosen: typeof WHEEL_SEGMENTS[0];

      if (weights && typeof weights === 'object' && Object.keys(weights).length > 0) {
        // Weighted random: each key is the segment id (as string), value is the weight.
        const totalWeight = WHEEL_SEGMENTS.reduce(
          (sum, seg) => sum + (weights[String(seg.id)] ?? 0),
          0,
        );

        if (totalWeight > 0) {
          let rand = Math.random() * totalWeight;
          // Default to last segment in case of floating-point edge cases
          chosen = WHEEL_SEGMENTS[WHEEL_SEGMENTS.length - 1];
          for (const seg of WHEEL_SEGMENTS) {
            rand -= weights[String(seg.id)] ?? 0;
            if (rand <= 0) {
              chosen = seg;
              break;
            }
          }
        } else {
          // All weights are zero — fall back to pool logic
          const isWin = Math.random() * 100 <= game.winRate;
          const pool = isWin ? WHEEL_WIN_SEGMENTS : WHEEL_LOSE_SEGMENTS;
          chosen = pool[Math.floor(Math.random() * pool.length)];
        }
      } else {
        // No advanced config — use simple win/lose pool
        const isWin = Math.random() * 100 <= game.winRate;
        const pool = isWin ? WHEEL_WIN_SEGMENTS : WHEEL_LOSE_SEGMENTS;
        chosen = pool[Math.floor(Math.random() * pool.length)];
      }

      winAmount = bet * chosen.multiplier;
      win = chosen.multiplier > 1;
      outcome = `Landed on ${chosen.multiplier}x`;
      extraFields = { segment: chosen.id, multiplier: chosen.multiplier };

    } else if (game.slug === 'blackjack') {
      // ── Ace Blackjack ────────────────────────────────────────────────────────
      // The frontend handles card logic and overrides win/winAmount in its own
      // calculation. The backend determines the authoritative balance change and
      // passes blackjackPays so the frontend can use the admin-configured payout.
      const cfg = game.advancedConfig as BlackjackAdvancedConfig | undefined;

      // houseEdge 0-25%; default derived from winRate for backwards compatibility
      const houseEdge = typeof cfg?.houseEdge === 'number' ? cfg.houseEdge : (100 - game.winRate);
      const effectiveWinRate = Math.max(0, Math.min(100, 100 - houseEdge));
      const blackjackPays = typeof cfg?.blackjackPays === 'number' ? cfg.blackjackPays : 1.5;

      const isWin = Math.random() * 100 <= effectiveWinRate;
      win = isWin;
      // Backend uses standard 2× for balance tracking; frontend may apply
      // the actual blackjackPays multiplier for display purposes.
      winAmount = win ? bet * 2 : 0;
      outcome = win ? 'Player wins!' : 'Dealer wins';
      // Return blackjackPays so AceBlackjack.tsx can use the configured payout
      extraFields = { blackjackPays };

    } else {
      // ── Generic (slots, dice, roulette) ──────────────────────────────────────
      const isWin = Math.random() * 100 <= game.winRate;
      const multiplier = game.category === 'slots' ? 3 : 2;
      win = isWin;
      winAmount = win ? bet * multiplier : 0;

      if (game.category === 'slots') {
        outcome = win ? 'Three matching symbols!' : 'No match';
      } else if (game.category === 'dice') {
        outcome = win
          ? `Rolled ${Math.floor(Math.random() * 6) + 4}`
          : `Rolled ${Math.floor(Math.random() * 3) + 1}`;
      } else if (game.category === 'table') {
        outcome = win ? 'Ball landed on red' : 'Ball landed on black';
      } else {
        outcome = win ? 'You won!' : 'You lost';
      }
    }
    // --------------------------------------------------------------------------

    // Update user balance: player always pays `bet`, always receives `winAmount`
    // (winAmount is 0 for a total loss, bet*multiplier for any return)
    user.balance = user.balance - bet + winAmount;
    await user.save();

    // Save game result (DB model stores generic fields only)
    const gameResult = new GameResult({
      userId,
      gameId,
      bet,
      win,
      winAmount,
      outcome,
    });
    await gameResult.save();

    res.json({
      success: true,
      win,
      winAmount,
      outcome,
      newBalance: user.balance,
      playedAt: gameResult.playedAt,
      ...extraFields,  // segment + multiplier for wheel; empty for other games
    });
  } catch (error) {
    console.error('Play game error:', error);
    res.status(500).json({ message: 'Server error playing game' });
  }
};

// Update game win rate (admin only)
export const updateWinRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { winRate } = req.body;

    // Validate win rate
    if (winRate === undefined || winRate < 0 || winRate > 100) {
      res.status(400).json({ message: 'Win rate must be between 0 and 100' });
      return;
    }

    const game = await Game.findById(gameId);
    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    game.winRate = winRate;
    await game.save();

    res.json({
      message: 'Win rate updated successfully',
      game: {
        id: game._id,
        name: game.name,
        winRate: game.winRate,
      },
    });
  } catch (error) {
    console.error('Update win rate error:', error);
    res.status(500).json({ message: 'Server error updating win rate' });
  }
};

// Update win rate for all games (admin only)
export const updateGlobalWinRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { winRate } = req.body;

    // Validate win rate
    if (winRate === undefined || winRate < 0 || winRate > 100) {
      res.status(400).json({ message: 'Win rate must be between 0 and 100' });
      return;
    }

    // Update all games with the new win rate
    const result = await Game.updateMany({}, { winRate });

    res.json({
      message: 'Global win rate applied successfully',
      winRate,
      gamesUpdated: result.modifiedCount,
    });
  } catch (error) {
    console.error('Update global win rate error:', error);
    res.status(500).json({ message: 'Server error updating global win rate' });
  }
};

// Get recent winners for ticker
export const getRecentWinners = async (req: Request, res: Response): Promise<void> => {
  try {
    const winners = await GameResult.find({ win: true })
      .sort({ playedAt: -1 })
      .limit(20)
      .populate('userId', 'username')
      .populate('gameId', 'name');

    const formatted = winners.map((w) => ({
      username: (w.userId as any).username,
      game: (w.gameId as any).name,
      amount: w.winAmount,
      time: w.playedAt,
    }));

    res.json({ winners: formatted });
  } catch (error) {
    console.error('Get recent winners error:', error);
    res.status(500).json({ message: 'Server error fetching winners' });
  }
};

// Seed games (for initial setup)
export const seedGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const defaultGames = [
      {
        name: 'Golden Slots',
        slug: 'slots',
        description: 'Classic 3-reel slot machine with golden symbols',
        winRate: 45,
        minBet: 1,
        maxBet: 100,
        category: 'slots' as const,
        icon: 'Slot',
      },
      {
        name: 'Royal Roulette',
        slug: 'roulette',
        description: 'European roulette with single zero',
        winRate: 48,
        minBet: 5,
        maxBet: 500,
        category: 'table' as const,
        icon: 'CircleDot',
      },
      {
        name: 'Diamond Dice',
        slug: 'dice',
        description: 'Roll the dice and win big',
        winRate: 50,
        minBet: 1,
        maxBet: 200,
        category: 'dice' as const,
        icon: 'Dice5',
      },
      {
        name: 'Ace Blackjack',
        slug: 'blackjack',
        description: 'Classic card game, beat the dealer',
        winRate: 42,
        minBet: 10,
        maxBet: 1000,
        category: 'cards' as const,
        icon: 'Club',
      },
      {
        name: 'Lucky Wheel',
        slug: 'wheel',
        description: 'Spin the wheel of fortune',
        winRate: 40,
        minBet: 5,
        maxBet: 300,
        category: 'table' as const,
        icon: 'RotateCw',
      },
    ];

    for (const gameData of defaultGames) {
      await Game.findOneAndUpdate(
        { slug: gameData.slug },
        gameData,
        { upsert: true, new: true }
      );
    }

    res.json({ message: 'Games seeded successfully' });
  } catch (error) {
    console.error('Seed games error:', error);
    res.status(500).json({ message: 'Server error seeding games' });
  }
};

// Update advanced configuration for a specific game (admin only)
export const updateAdvancedConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { advancedConfig } = req.body;

    if (!advancedConfig || typeof advancedConfig !== 'object') {
      res.status(400).json({ message: 'advancedConfig must be a non-null object' });
      return;
    }

    const game = await Game.findById(gameId);
    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    // ── Per-game validation ──────────────────────────────────────────────────
    if (game.slug === 'wheel') {
      const cfg = advancedConfig as WheelAdvancedConfig;
      if (!cfg.wheelWeights || typeof cfg.wheelWeights !== 'object') {
        res.status(400).json({ message: 'wheelWeights object is required for the wheel game' });
        return;
      }
      for (const [key, val] of Object.entries(cfg.wheelWeights)) {
        if (typeof val !== 'number' || val < 0 || isNaN(val)) {
          res.status(400).json({ message: `Weight for segment "${key}" must be a non-negative number` });
          return;
        }
      }
      const total = Object.values(cfg.wheelWeights).reduce((s, v) => s + v, 0);
      if (total === 0) {
        res.status(400).json({ message: 'Total wheel weight must be greater than 0' });
        return;
      }
    } else if (game.slug === 'blackjack') {
      const cfg = advancedConfig as BlackjackAdvancedConfig;
      if (typeof cfg.houseEdge !== 'number' || cfg.houseEdge < 0 || cfg.houseEdge > 25) {
        res.status(400).json({ message: 'houseEdge must be a number between 0 and 25' });
        return;
      }
      const validPayouts = [1.0, 1.2, 1.5];
      if (!validPayouts.includes(cfg.blackjackPays)) {
        res.status(400).json({ message: 'blackjackPays must be 1.0, 1.2, or 1.5' });
        return;
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    game.advancedConfig = advancedConfig;
    // Required for Mongoose Mixed fields — marks the field as dirty for saving
    game.markModified('advancedConfig');
    await game.save();

    res.json({
      message: 'Advanced configuration updated successfully',
      game: {
        id: game._id,
        name: game.name,
        slug: game.slug,
        advancedConfig: game.advancedConfig,
      },
    });
  } catch (error) {
    console.error('Update advanced config error:', error);
    res.status(500).json({ message: 'Server error updating configuration' });
  }
};
