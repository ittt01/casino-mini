'use client';

import React from 'react';
import { Gamepad2, CircleDot, Dice5, Club, RotateCw } from 'lucide-react';

interface Game {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: 'slots' | 'table' | 'dice' | 'cards';
  minBet: number;
  maxBet: number;
  icon: string;
}

interface GameCardProps {
  game: Game;
  onClick: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  Slot: Gamepad2,
  CircleDot: CircleDot,
  Dice5: Dice5,
  Club: Club,
  RotateCw: RotateCw,
};

const categoryColors: Record<string, string> = {
  slots: 'from-red-500/20 to-red-600/20 border-red-500/30',
  table: 'from-green-500/20 to-green-600/20 border-green-500/30',
  dice: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  cards: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
};

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const IconComponent = iconMap[game.icon] || Gamepad2;
  const gradientClass = categoryColors[game.category] || categoryColors.slots;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${gradientClass}
        p-6 cursor-pointer card-casino hover:border-casino-gold/50`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,_#D4AF37_1px,_transparent_1px)] bg-[length:20px_20px]" />

      {/* Shine Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-casino-card/80 border border-casino-gold/30 group-hover:scale-110 transition-transform duration-300">
          <IconComponent className="w-7 h-7 text-casino-gold" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-casino-text-primary mb-2 group-hover:text-casino-gold transition-colors">
          {game.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-casino-text-secondary mb-4 line-clamp-2">
          {game.description}
        </p>

        {/* Bet Range */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-casino-text-muted">
            Min: ${game.minBet}
          </span>
          <span className="text-casino-text-muted">
            Max: ${game.maxBet}
          </span>
        </div>

        {/* Play Button */}
        <div className="mt-4">
          <button className="w-full py-2.5 bg-casino-gold/10 border border-casino-gold/30 text-casino-gold font-semibold rounded-lg
            group-hover:bg-casino-gold group-hover:text-casino-dark transition-all duration-300"
          >
            Play Now
          </button>
        </div>
      </div>

      {/* Corner Decoration */}
      <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-casino-gold/5 group-hover:bg-casino-gold/10 transition-colors" />
    </div>
  );
};
