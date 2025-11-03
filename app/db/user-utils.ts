import { db } from '@/app/config/database';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import type { UserInsert, UserSelect } from './schema';

/**
 * Creates or updates a user in the database based on Clerk authentication
 * This should be called when a user signs in with Clerk
 */
export async function syncUserFromClerk(
  clerkUserId: string,
  clerkData: {
    email: string;
    name: string;
    profileImageUrl?: string;
  }
): Promise<UserSelect> {
  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.userId, clerkUserId))
    .limit(1);

  if (existingUser.length > 0) {
    // Update existing user
    const [updatedUser] = await db
      .update(users)
      .set({
        email: clerkData.email,
        name: clerkData.name,
        profileImageUrl: clerkData.profileImageUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(users.userId, clerkUserId))
      .returning();

    return updatedUser;
  } else {
    // Create new user
    const newUser: UserInsert = {
      userId: clerkUserId,
      email: clerkData.email,
      name: clerkData.name,
      profileImageUrl: clerkData.profileImageUrl || null,
      theme: 'modern', // Default theme
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [createdUser] = await db.insert(users).values(newUser).returning();
    return createdUser;
  }
}

/**
 * Gets a user by their Clerk user ID
 */
export async function getUserByClerkId(clerkUserId: string): Promise<UserSelect | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.userId, clerkUserId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Updates user UI preferences
 */
export async function updateUserPreferences(
  clerkUserId: string,
  preferences: {
    theme?: string;
    customFont?: string;
    uiPreferences?: string;
  }
): Promise<UserSelect | null> {
  try {
    const result = await db
      .update(users)
      .set({
        ...preferences,
        updatedAt: new Date(),
      })
      .where(eq(users.userId, clerkUserId))
      .returning();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Database error updating user preferences:', error);
    throw error;
  }
}

/**
 * Updates user profile information
 */
export async function updateUserProfile(
  clerkUserId: string,
  profileData: {
    name?: string;
    location?: string;
    profileImageUrl?: string;
  }
): Promise<UserSelect | null> {
  try {
    const result = await db
      .update(users)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(users.userId, clerkUserId))
      .returning();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Database error updating user profile:', error);
    throw error;
  }
}

