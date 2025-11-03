import { auth } from '@clerk/nextjs/server';
import { updateUserProfile, updateUserPreferences } from '@/app/db/user-utils';
import { NextResponse } from 'next/server';

/**
 * GET - Retrieve user profile from database
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Import here to avoid circular dependencies
    const { getUserByClerkId } = await import('@/app/db/user-utils');
    const user = await getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update user profile or preferences
 */
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { profile, preferences } = body;

    let updatedUser = null;

    // Update profile information if provided
    if (profile) {
      updatedUser = await updateUserProfile(userId, profile);
    }

    // Update preferences if provided
    if (preferences) {
      updatedUser = await updateUserPreferences(userId, preferences);
    }

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: updatedUser, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

