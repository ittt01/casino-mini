'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { Header } from '@/components/Header';
import { GameCard } from '@/components/GameCard';
import { GameModal } from '@/components/GameModal';
import { WinnersTicker } from '@/components/WinnersTicker';
import { Sparkles } from 'lucide-react';

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

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await api.get('/games');
        setGames(response.data.games);
      } catch (error) {
        console.error('Failed to fetch games:', error);
        // Fallback data
        setGames([
          {
            _id: '1',
            name: 'Golden Slots',
            slug: 'slots',
            description: 'Classic 3-reel slot machine with golden symbols',
            category: 'slots',
            minBet: 1,
            maxBet: 100,
            icon: 'Slot',
          },
          {
            _id: '2',
            name: 'Royal Roulette',
            slug: 'roulette',
            description: 'European roulette with single zero',
            category: 'table',
            minBet: 5,
            maxBet: 500,
            icon: 'CircleDot',
          },
          {
            _id: '3',
            name: 'Diamond Dice',
            slug: 'dice',
            description: 'Roll the dice and win big',
            category: 'dice',
            minBet: 1,
            maxBet: 200,
            icon: 'Dice5',
          },
          {
            _id: '4',
            name: 'Ace Blackjack',
            slug: 'blackjack',
            description: 'Classic card game, beat the dealer',
            category: 'cards',
            minBet: 10,
            maxBet: 1000,
            icon: 'Club',
          },
          {
            _id: '5',
            name: 'Lucky Wheel',
            slug: 'wheel',
            description: 'Spin the wheel of fortune',
            category: 'table',
            minBet: 5,
            maxBet: 300,
            icon: 'RotateCw',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  return (
    <div className="min-h-screen animated-bg pb-20">
      <Header />

      {/* Hero Section */}
      <section className="relative py-16 px-4 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-casino-gold/5 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-casino-gold/10 border border-casino-gold/30 mb-6">
            <Sparkles className="w-4 h-4 text-casino-gold" />
            <span className="text-sm text-casino-gold font-medium">Welcome to Premium Gaming</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-white">Experience the</span>
            <br />
            <span className="text-gold-gradient">Thrill of Winning</span>
          </h1>

          <p className="text-xl text-casino-text-secondary max-w-2xl mx-auto mb-8">
            Play our exclusive collection of premium casino mini-games.
            Beautiful design, fair odds, and instant wins await.
          </p>

          <div className="flex items-center justify-center space-x-8 text-sm text-casino-text-muted">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-casino-green" />
              <span>Fair Play</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-casino-gold" />
              <span>Instant Wins</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-casino-green" />
              <span>Secure Platform</span>
            </div>
          </div>
        </div>
      </section>

      {/* Games Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Popular Games</h2>
            <p className="text-casino-text-secondary mt-1">Choose your game and start winning</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-casino-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {games.map((game) => (
              <GameCard
                key={game._id}
                game={game}
                onClick={() => setSelectedGame(game)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Winners Ticker */}
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
