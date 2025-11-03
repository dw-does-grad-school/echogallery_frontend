'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { syncUserFromClerk, updateUserProfile, updateUserPreferences, getUserByClerkId } from '@/app/db/user-utils';

/**
 * Server action to sync the current user from Clerk to the database
 * Can be called from client components or server components
 */
export async function syncCurrentUser() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { error: 'Unauthorized', user: null };
    }

    const clerkUser = await currentUser();

    if (!clerkUser) {
      return { error: 'Failed to fetch user from Clerk', user: null };
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress || '';
    const name = clerkUser.firstName && clerkUser.lastName
      ? `${clerkUser.firstName} ${clerkUser.lastName}`
      : clerkUser.username || clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress || 'User';
    const profileImageUrl = clerkUser.imageUrl || undefined;

    const user = await syncUserFromClerk(userId, {
      email,
      name,
      profileImageUrl,
    });

    return { error: null, user };
  } catch (error) {
    console.error('Error syncing user:', error);
    return { error: 'Failed to sync user', user: null };
  }
}

/**
 * Server action to get the current user from the database
 */
export async function getCurrentUser() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { error: 'Unauthorized', user: null };
    }

    const user = await getUserByClerkId(userId);

    if (!user) {
      return { error: 'User not found', user: null };
    }

    return { error: null, user };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { error: 'Failed to fetch user', user: null };
  }
}

/**
 * Server action to update user profile
 */
export async function updateProfile(data: {
  name?: string;
  location?: string;
  profileImageUrl?: string;
}) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { error: 'Unauthorized', user: null };
    }

    // Ensure user exists in database first
    let existingUser = await getUserByClerkId(userId);
    if (!existingUser) {
      // Sync user from Clerk first
      const syncResult = await syncCurrentUser();
      if (syncResult.error || !syncResult.user) {
        return { error: 'User not found. Please refresh the page.', user: null };
      }
      existingUser = syncResult.user;
    }

    const user = await updateUserProfile(userId, data);

    if (!user) {
      return { error: 'Failed to update profile', user: null };
    }

    return { error: null, user };
  } catch (error) {
    console.error('Error updating profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
    return { error: errorMessage, user: null };
  }
}

/**
 * Server action to update user UI preferences
 */
export async function updatePreferences(data: {
  theme?: string;
  customFont?: string;
  uiPreferences?: string;
}) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { error: 'Unauthorized', user: null };
    }

    // Ensure user exists in database first
    let existingUser = await getUserByClerkId(userId);
    if (!existingUser) {
      // Sync user from Clerk first
      const syncResult = await syncCurrentUser();
      if (syncResult.error || !syncResult.user) {
        return { error: 'User not found. Please refresh the page.', user: null };
      }
      existingUser = syncResult.user;
    }

    const user = await updateUserPreferences(userId, data);

    if (!user) {
      return { error: 'Failed to update preferences', user: null };
    }

    return { error: null, user };
  } catch (error) {
    console.error('Error updating preferences:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update preferences';
    return { error: errorMessage, user: null };
  }
}

