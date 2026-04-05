import { Game } from '../models/Game';

interface SeedGame {
  name: string;
  slug: string;
  description: string;
  winRate: number;
  minBet: number;
  maxBet: number;
  category: 'slots' | 'table' | 'dice' | 'cards';
  icon: string;
}

const gamesToSeed: SeedGame[] = [
  {
    name: 'Golden Slots',
    slug: 'slots',
    description: 'Classic 3-reel slot machine with golden symbols',
    winRate: 45,
    minBet: 1,
    maxBet: 100,
    category: 'slots',
    icon: 'Gamepad2',
  },
  {
    name: 'Royal Roulette',
    slug: 'roulette',
    description: 'European roulette with single zero',
    winRate: 48,
    minBet: 5,
    maxBet: 500,
    category: 'table',
    icon: 'CircleDot',
  },
  {
    name: 'Diamond Dice',
    slug: 'dice',
    description: 'Roll the dice and win big',
    winRate: 50,
    minBet: 1,
    maxBet: 200,
    category: 'dice',
    icon: 'Dice5',
  },
  {
    name: 'Ace Blackjack',
    slug: 'blackjack',
    description: 'Classic card game, beat the dealer',
    winRate: 42,
    minBet: 10,
    maxBet: 1000,
    category: 'cards',
    icon: 'Club',
  },
  {
    name: 'Lucky Wheel',
    slug: 'wheel',
    description: 'Spin the wheel of fortune',
    winRate: 40,
    minBet: 5,
    maxBet: 300,
    category: 'table',
    icon: 'RotateCw',
  },
];

/**
 * Seed initial games into the database
 * Checks if game exists by slug before creating to avoid duplicates
 */
export const seedGames = async (): Promise<void> => {
  try {
    console.log('[Seed] Checking for initial games...');

    for (const gameData of gamesToSeed) {
      // Check if game already exists by slug
      const existingGame = await Game.findOne({ slug: gameData.slug });

      if (existingGame) {
        console.log(`[Seed] Game '${gameData.name}' already exists, skipping...`);
        continue;
      }

      // Create new game
      const newGame = new Game({
        name: gameData.name,
        slug: gameData.slug,
        description: gameData.description,
        winRate: gameData.winRate,
        minBet: gameData.minBet,
        maxBet: gameData.maxBet,
        category: gameData.category,
        icon: gameData.icon,
        isActive: true,
      });

      await newGame.save();

      console.log(`[Seed] Created game: ${gameData.name} (${gameData.category}) - Win Rate: ${gameData.winRate}%`);
    }

    console.log('[Seed] Game seeding completed successfully');
  } catch (error) {
    console.error('[Seed] Error seeding games:', error);
  }
};
