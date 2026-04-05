import { Request, Response } from 'express';
import { Game } from '../models/Game';
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

    // CRITICAL: Calculate game result on backend using admin-configured win rate
    const winRate = game.winRate; // Admin configured win rate (0-100)
    const randomNumber = Math.random() * 100; // 0-100
    const win = randomNumber <= winRate;

    // Calculate win amount (2x for simple games, customizable per game)
    const multiplier = game.category === 'slots' ? 3 : 2;
    const winAmount = win ? bet * multiplier : 0;

    // Update user balance
    user.balance -= bet;
    if (win) {
      user.balance += winAmount;
    }
    await user.save();

    // Generate outcome description based on game category
    let outcome = '';
    if (game.category === 'slots') {
      outcome = win ? 'Three matching symbols!' : 'No match';
    } else if (game.category === 'dice') {
      outcome = win ? `Rolled ${Math.floor(Math.random() * 6) + 4}` : `Rolled ${Math.floor(Math.random() * 3) + 1}`;
    } else if (game.category === 'table') {
      outcome = win ? 'Ball landed on red' : 'Ball landed on black';
    } else {
      outcome = win ? 'You won!' : 'You lost';
    }

    // Save game result
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
