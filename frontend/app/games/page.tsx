'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { Header } from '@/components/Header';
import { GameCard } from '@/components/GameCard';
import { GameModal } from '@/components/GameModal';
import { WinnersTicker } from '@/components/WinnersTicker';

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

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await api.get('/games');
        setGames(response.data.games);
      } catch (error) {
        console.error('Failed to fetch games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const categories = [
    { id: 'slots', name: 'Slots', color: 'bg-red-500/20 text-red-400' },
    { id: 'table', name: 'Table Games', color: 'bg-green-500/20 text-green-400' },
    { id: 'dice', name: 'Dice', color: 'bg-blue-500/20 text-blue-400' },
    { id: 'cards', name: 'Cards', color: 'bg-purple-500/20 text-purple-400' },
  ];

  const filteredGames = activeCategory
    ? games.filter(game => game.category === activeCategory)
    : games;

  return (
    <div className="min-h-screen animated-bg pb-20">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">All Games</h1>
          <p className="text-casino-text-secondary text-sm sm:text-base">Browse and play our collection of mini-games</p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === null
                ? 'bg-casino-gold text-casino-dark'
                : 'bg-casino-card text-casino-text-secondary hover:text-white'
            }`}
          >
            All Games
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-casino-gold text-casino-dark'
                  : `${cat.color} hover:opacity-80`
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Games Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-casino-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredGames.map((game) => (
              <GameCard
                key={game._id}
                game={game}
                onClick={() => setSelectedGame(game)}
              />
            ))}
          </div>
        )}

        {filteredGames.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="text-casino-text-muted">No games found in this category.</p>
          </div>
        )}
      </div>

      <WinnersTicker />

      {/* Game Modal */}
      {selectedGame && (
        <GameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </div>
  );
}
