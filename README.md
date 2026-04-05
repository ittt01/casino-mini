# Golden Casino Mini-Game Platform

A full-stack casino-style mini-game platform built with Next.js, Express, and MongoDB. Features a professional casino aesthetic with dark theme, gold accents, and role-based access control.

## Features

### User Features (Player View)
- Dark themed casino lobby with gold accents (#D4AF37)
- Responsive design optimized for mobile and desktop
- Game cards with animated hover effects
- Real-time recent winners ticker
- Game play interface with visual animations (slots, dice, roulette, cards)
- Secure JWT-based authentication
- Balance tracking and game history

### Admin Features (Management View)
- Secure admin control panel
- Configure global win rates (0-100%) for each game
- Game activation/deactivation controls
- Statistics dashboard showing total games, active games, and average win rate
- Real-time win rate updates

### Security Features
- Role-Based Access Control (RBAC) middleware
- JWT authentication with 24h expiration
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Helmet.js security headers
- CORS configuration

## Technical Stack

### Frontend
- Next.js 14 (React 18)
- TypeScript
- Tailwind CSS with custom casino theme
- Lucide React icons
- Axios for API calls
- React Hot Toast for notifications

### Backend
- Express.js
- TypeScript
- MongoDB with Mongoose
- JWT for authentication
- bcrypt.js for password hashing
- Express Validator for input validation
- Helmet for security headers
- Express Rate Limit for API protection

## Project Structure

```
casino-mini/
├── frontend/
│   ├── app/                    # Next.js app router
│   │   ├── page.tsx           # Casino lobby (home)
│   │   ├── games/page.tsx     # Games listing
│   │   ├── admin/page.tsx     # Admin control panel
│   │   ├── login/page.tsx     # Login page
│   │   ├── register/page.tsx  # Registration page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles with casino theme
│   ├── components/
│   │   ├── Header.tsx         # Navigation header with balance
│   │   ├── GameCard.tsx       # Animated game cards
│   │   ├── GameModal.tsx      # Game play interface
│   │   └── WinnersTicker.tsx  # Recent winners ticker
│   ├── contexts/
│   │   └── AuthContext.tsx    # Authentication context
│   ├── middleware.ts          # Next.js middleware for route protection
│   ├── tailwind.config.ts     # Tailwind with casino colors
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.ts   # Auth logic
│   │   │   └── gameController.ts   # Game logic with win rate calculation
│   │   ├── middleware/
│   │   │   └── auth.ts             # RBAC middleware
│   │   ├── models/
│   │   │   ├── User.ts             # User schema
│   │   │   ├── Game.ts             # Game configuration schema
│   │   │   └── GameResult.ts       # Game results schema
│   │   ├── routes/
│   │   │   ├── auth.ts             # Auth routes
│   │   │   └── games.ts            # Game routes
│   │   └── server.ts               # Express server entry
│   ├── package.json
│   └── tsconfig.json
├── .env.example
└── package.json (root with dev scripts)
```

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally or MongoDB Atlas

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

### 2. Environment Configuration

```bash
# Copy example env files
cp .env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# Edit the files with your configuration
# Backend: MongoDB URI, JWT Secret
# Frontend: API URL
```

### 3. Seed the Database

```bash
cd backend
npm run dev
# Then in another terminal or via API call:
curl http://localhost:5000/api/games/seed \
  -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. Run Development Servers

```bash
# From root directory
npm run dev

# Or run separately:
npm run dev:backend  # Terminal 1 (Port 5000)
npm run dev:frontend # Terminal 2 (Port 3000)
```

## Usage

### Demo Credentials

- **User Account**: user@example.com / password
- **Admin Account**: admin@example.com / password

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (authenticated)
- `PATCH /api/auth/balance` - Update balance (authenticated)

#### Games (User)
- `GET /api/games` - List active games
- `GET /api/games/:slug` - Get game details
- `POST /api/games/play` - Play a game (authenticated)
- `GET /api/games/recent-winners` - Get recent winners

#### Games (Admin)
- `GET /api/games/admin/all` - List all games (admin only)
- `PATCH /api/games/:gameId/win-rate` - Update win rate (admin only)
- `POST /api/games/seed` - Seed default games (admin only)

### Win Rate Logic

The game result calculation happens entirely on the backend:

```typescript
const winRate = game.winRate; // Admin configured (0-100)
const randomNumber = Math.random() * 100;
const win = randomNumber <= winRate;
```

This ensures:
- Users cannot manipulate game outcomes
- Admins can control the house edge
- Results are consistent and fair per the configured rate

## Customization

### Adding New Games

1. Add game configuration to the seed function in `backend/src/controllers/gameController.ts`
2. Create game visual in `frontend/components/GameModal.tsx`
3. Add icon mapping in `frontend/components/GameCard.tsx`

### Modifying Win Rates

Win rates can be adjusted in real-time from the Admin Panel at `/admin`. Changes take effect immediately for all new game rounds.

### Styling

The casino theme is defined in `frontend/tailwind.config.ts`. Key colors:
- Background: `#0a0a0a` (dark), `#1a1a1a` (panel)
- Gold accent: `#D4AF37`
- Text: `#ffffff` (primary), `#A3A3A3` (secondary)

## Security Considerations

1. **Change JWT Secret**: Update `JWT_SECRET` in production
2. **HTTPS**: Use HTTPS in production
3. **Rate Limiting**: Configure appropriate limits for your use case
4. **CORS**: Restrict to your frontend domain in production
5. **Passwords**: Enforce strong password policies

## License

MIT License
"# casino-mini" 
"# casino-mini" 
