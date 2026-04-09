'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy } from 'lucide-react';

interface Winner {
  username: string;
  game: string;
  amount: number;
  time: string;
}

export const WinnersTicker: React.FC = () => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const response = await axios.get(`${API_URL}/games/recent-winners`);
        setWinners(response.data.winners);
      } catch (error) {
        console.error('Failed to fetch winners:', error);
        // Use mock data if API fails
        setWinners([
          { username: 'LuckyPlayer', game: 'Golden Slots', amount: 2500, time: new Date().toISOString() },
          { username: 'CasinoKing', game: 'Royal Roulette', amount: 1800, time: new Date().toISOString() },
          { username: 'GoldHunter', game: 'Diamond Dice', amount: 950, time: new Date().toISOString() },
          { username: 'JackpotJoy', game: 'Lucky Wheel', amount: 3200, time: new Date().toISOString() },
          { username: 'SpinMaster', game: 'Golden Slots', amount: 1500, time: new Date().toISOString() },
          { username: 'RoyalFlush', game: 'Ace Blackjack', amount: 2100, time: new Date().toISOString() },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchWinners();
    const interval = setInterval(fetchWinners, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Duplicate winners for seamless scrolling
  const duplicatedWinners = [...winners, ...winners];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-casino-gold/30">
      <div className="flex items-center">
        {/* Label */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-casino-gold/10 border-r border-casino-gold/30 shrink-0">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-casino-gold" />
          <span className="hidden sm:inline text-casino-gold font-semibold text-sm whitespace-nowrap">
            Recent Winners
          </span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>

        {/* Scrolling Ticker */}
        <div className="flex-1 overflow-hidden py-3">
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-casino-gold/30 border-t-casino-gold rounded-full spinner" />
            </div>
          ) : (
            <div className="flex animate-marquee whitespace-nowrap">
              {duplicatedWinners.map((winner, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-1.5 sm:space-x-2 mx-4 sm:mx-8 text-xs sm:text-sm"
                >
                  <span className="text-casino-gold font-medium">
                    {winner.username}
                  </span>
                  <span className="text-casino-text-muted">won</span>
                  <span className="text-casino-green font-semibold">
                    {formatCurrency(winner.amount)}
                  </span>
                  <span className="text-casino-text-muted">in</span>
                  <span className="text-casino-text-secondary">
                    {winner.game}
                  </span>
                  <span className="text-casino-text-muted">•</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};
