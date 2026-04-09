import { Router } from 'express';
import { body } from 'express-validator';
import {
  getGames,
  getAllGames,
  getGame,
  playGame,
  updateWinRate,
  updateGlobalWinRate,
  updateAdvancedConfig,
  getRecentWinners,
  seedGames,
} from '../controllers/gameController';
import { authenticate, requireUser, requireAdmin, isAdmin } from '../middleware/auth';

const router = Router();

// Public routes (but authenticated)
router.get('/', authenticate, requireUser, getGames);
router.get('/recent-winners', getRecentWinners);
router.get('/:slug', authenticate, requireUser, getGame);

// Game play route
router.post(
  '/play',
  authenticate,
  requireUser,
  [
    body('gameId').notEmpty().withMessage('Game ID is required'),
    body('bet').isFloat({ min: 0.01 }).withMessage('Valid bet amount is required'),
  ],
  playGame
);

// Admin routes
router.get('/admin/all', authenticate, requireAdmin, getAllGames);
router.patch('/admin/win-rate-global', authenticate, requireAdmin, [
  body('winRate').isFloat({ min: 0, max: 100 }).withMessage('Win rate must be between 0 and 100'),
], updateGlobalWinRate);
router.patch('/:gameId/win-rate', authenticate, requireAdmin, updateWinRate);
// Advanced per-game configuration (wheel segment weights, blackjack house rules, etc.)
router.patch('/:gameId/advanced-config', authenticate, requireAdmin, updateAdvancedConfig);
router.post('/seed', authenticate, requireAdmin, seedGames);

export default router;
