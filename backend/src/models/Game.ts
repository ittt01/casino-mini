import mongoose, { Document, Schema } from 'mongoose';

// ── Advanced config shapes (stored as Schema.Types.Mixed) ──────────────────
export interface WheelAdvancedConfig {
  /** Relative probability weight for each wheel segment (key = segment id as string) */
  wheelWeights: Record<string, number>;
}

export interface BlackjackAdvancedConfig {
  /** House edge percentage (0–25). Effective player win rate = 100 - houseEdge */
  houseEdge: number;
  /** Blackjack payout multiplier: 1.5 = 3:2, 1.2 = 6:5, 1.0 = even money */
  blackjackPays: number;
  /** Whether the dealer hits on soft 17 (increases house edge ~0.2%) */
  dealerHitsSoft17: boolean;
}

export type AdvancedConfig = WheelAdvancedConfig | BlackjackAdvancedConfig | Record<string, never>;

// ── Main game interface ────────────────────────────────────────────────────
export interface IGame extends Document {
  name: string;
  slug: string;
  description: string;
  winRate: number; // 0-100 — used as fallback when advancedConfig is not set
  minBet: number;
  maxBet: number;
  icon: string;
  isActive: boolean;
  category: 'slots' | 'table' | 'dice' | 'cards';
  advancedConfig: AdvancedConfig;
  createdAt: Date;
  updatedAt: Date;
}

const gameSchema = new Schema<IGame>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  winRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 45,
  },
  minBet: {
    type: Number,
    default: 1,
    min: 0,
  },
  maxBet: {
    type: Number,
    default: 1000,
    min: 0,
  },
  icon: {
    type: String,
    default: 'Gamepad2',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  category: {
    type: String,
    enum: ['slots', 'table', 'dice', 'cards'],
    default: 'slots',
  },
  // Stores game-specific configuration as free-form JSON.
  // markModified('advancedConfig') must be called before save() when mutating sub-fields.
  advancedConfig: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

export const Game = mongoose.model<IGame>('Game', gameSchema);
