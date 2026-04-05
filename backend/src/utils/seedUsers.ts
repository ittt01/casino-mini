import bcrypt from 'bcryptjs';
import { User } from '../models/User';

interface SeedUser {
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  balance: number;
}

const usersToSeed: SeedUser[] = [
  {
    username: 'admin',
    email: 'admin@goldencasino.com',
    password: 'admin1234',
    role: 'admin',
    balance: 10000, // Admin gets more balance
  },
  {
    username: 'player01',
    email: 'player@goldencasino.com',
    password: 'user1234',
    role: 'user',
    balance: 1000,
  },
];

/**
 * Seed initial users into the database
 * Checks if user exists by username before creating to avoid duplicates
 */
export const seedUsers = async (): Promise<void> => {
  try {
    console.log('[Seed] Checking for initial users...');

    for (const userData of usersToSeed) {
      // Check if user already exists by username
      const existingUser = await User.findOne({ username: userData.username });

      if (existingUser) {
        console.log(`[Seed] User '${userData.username}' already exists, skipping...`);
        continue;
      }

      // Check if email already exists
      const existingEmail = await User.findOne({ email: userData.email });
      if (existingEmail) {
        console.log(`[Seed] Email '${userData.email}' already exists, skipping...`);
        continue;
      }

      // Hash password with bcrypt (10 salt rounds)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create new user with hashed password
      const newUser = new User({
        username: userData.username,
        email: userData.email,
        password: hashedPassword, // Pre-hashed password
        role: userData.role,
        balance: userData.balance,
      });

      // Save user (password will not be re-hashed because it's already bcrypt format)
      await newUser.save();

      console.log(`[Seed] Created ${userData.role} account: ${userData.username} (${userData.email})`);
    }

    console.log('[Seed] User seeding completed successfully');
  } catch (error) {
    console.error('[Seed] Error seeding users:', error);
    // Don't throw error - we don't want to crash the server if seeding fails
    // But log it for debugging
  }
};

/**
 * Alternative seed function that uses the model's pre-save hook
 * This creates the user with plain password and lets the model hash it
 */
export const seedUsersWithHook = async (): Promise<void> => {
  try {
    console.log('[Seed] Checking for initial users (using model hook)...');

    for (const userData of usersToSeed) {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ username: userData.username }, { email: userData.email }],
      });

      if (existingUser) {
        console.log(`[Seed] User '${userData.username}' or email already exists, skipping...`);
        continue;
      }

      // Create user with plain password - the pre-save hook will hash it
      const newUser = new User({
        username: userData.username,
        email: userData.email,
        password: userData.password, // Plain password - hook will hash
        role: userData.role,
        balance: userData.balance,
      });

      await newUser.save();

      console.log(`[Seed] Created ${userData.role} account: ${userData.username}`);
    }

    console.log('[Seed] User seeding completed');
  } catch (error) {
    console.error('[Seed] Error seeding users:', error);
  }
};
