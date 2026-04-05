import mongoose, { Document, Schema } from 'mongoose';

export interface IGame extends Document {
  name: string;
  slug: string;
  description: string;
  winRate: number; // 0-100 percentage
  minBet: number;
  maxBet: number;
  icon: string;
  isActive: boolean;
  category: 'slots' | 'table' | 'dice' | 'cards';
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
    default: 45, // Default 45% win rate
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
}, {
  timestamps: true,
});

export const Game = mongoose.model<IGame>('Game', gameSchema);
