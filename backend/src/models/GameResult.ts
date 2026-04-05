import mongoose, { Document, Schema } from 'mongoose';

export interface IGameResult extends Document {
  userId: mongoose.Types.ObjectId;
  gameId: mongoose.Types.ObjectId;
  bet: number;
  win: boolean;
  winAmount: number;
  outcome: string;
  playedAt: Date;
}

const gameResultSchema = new Schema<IGameResult>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  gameId: {
    type: Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
    index: true,
  },
  bet: {
    type: Number,
    required: true,
    min: 0,
  },
  win: {
    type: Boolean,
    required: true,
  },
  winAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  outcome: {
    type: String,
    required: true,
  },
  playedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for querying recent winners
gameResultSchema.index({ win: 1, playedAt: -1 });
gameResultSchema.index({ userId: 1, playedAt: -1 });

export const GameResult = mongoose.model<IGameResult>('GameResult', gameResultSchema);
