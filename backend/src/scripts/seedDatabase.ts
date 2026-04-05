/**
 * Standalone Database Seed Script
 * Run this manually with: npx ts-node src/scripts/seedDatabase.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedUsersWithHook } from '../utils/seedUsers';
import { seedGames } from '../utils/seedGames';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino-mini';

const seedDatabase = async (): Promise<void> => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\n=== Starting Database Seed ===\n');

    // Seed users
    await seedUsersWithHook();

    console.log('');

    // Seed games
    await seedGames();

    console.log('\n=== Database Seed Completed ===\n');

    // List created accounts
    const { User } = await import('../models/User');
    const users = await User.find({}, { username: 1, email: 1, role: 1, balance: 1 });

    console.log('Current Users in Database:');
    console.log('--------------------------');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Balance: $${user.balance}`);
      console.log('');
    });

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run seed
seedDatabase();
