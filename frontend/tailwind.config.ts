import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        casino: {
          // Primary dark backgrounds
          dark: '#0a0a0a',
          darker: '#050505',
          panel: '#1a1a1a',
          card: '#252525',
          // Gold accents
          gold: {
            DEFAULT: '#D4AF37',
            light: '#E5C158',
            dark: '#B8960B',
            muted: '#8B7355',
          },
          // Accent colors
          red: {
            DEFAULT: '#DC2626',
            dark: '#991B1B',
            light: '#EF4444',
          },
          green: {
            DEFAULT: '#16A34A',
            dark: '#166534',
            light: '#22C55E',
          },
          // Utility
          border: '#333333',
          text: {
            primary: '#FFFFFF',
            secondary: '#A3A3A3',
            muted: '#737373',
          }
        },
      },
      fontFamily: {
        casino: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'winner-scroll': 'winnerScroll 20s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 5px #D4AF37' },
          '50%': { boxShadow: '0 0 20px #D4AF37, 0 0 40px #D4AF37' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        winnerScroll: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-gold': 'linear-gradient(135deg, #D4AF37 0%, #B8960B 50%, #D4AF37 100%)',
        'gradient-dark': 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
      },
    },
  },
  plugins: [],
}

export default config
