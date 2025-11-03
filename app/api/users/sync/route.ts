import { auth, currentUser } from '@clerk/nextjs/server';
import { syncUserFromClerk } from '@/app/db/user-utils';
import { NextResponse } from 'next/server';

/**
 * API route to sync the current authenticated user from Clerk to the database
 * This should be called when a user signs in or when their profile is accessed
 */
export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current user from Clerk
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json(
        { error: 'Failed to fetch user from Clerk' },
        { status: 500 }
      );
    }

    // Extract user data from Clerk user object
    const email = clerkUser.emailAddresses[0]?.emailAddress || '';
    const name = clerkUser.firstName && clerkUser.lastName
      ? `${clerkUser.firstName} ${clerkUser.lastName}`
      : clerkUser.username || clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress || 'User';
    const profileImageUrl = clerkUser.imageUrl || undefined;

    // Sync user to database
    const user = await syncUserFromClerk(userId, {
      email,
      name,
      profileImageUrl,
    });

    return NextResponse.json({ user, message: 'User synced successfully' });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

