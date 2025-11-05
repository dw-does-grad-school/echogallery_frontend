'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { getCurrentUser } from '@/app/actions/user-actions';

export default function ProfilePage() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      if (clerkLoaded && clerkUser) {
        try {
          const result = await getCurrentUser();
          if (result.error) {
            console.error('Error fetching user:', result.error);
          } else {
            setDbUser(result.user);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      } else if (clerkLoaded && !clerkUser) {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [clerkLoaded, clerkUser]);

  if (!clerkLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="text-lg text-fg/60">Loading...</div>
      </div>
    );
  }

  if (!clerkUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-fg mb-4 font-display">Please sign in</h1>
          <p className="text-fg/60 font-body">You need to be signed in to view your profile.</p>
        </div>
      </div>
    );
  }

  const userImage = clerkUser.imageUrl || '/favicon.ico';
  const displayName = dbUser?.name || clerkUser.fullName || clerkUser.firstName || 'User';
  const email = clerkUser.primaryEmailAddress?.emailAddress || dbUser?.email || 'Not set';
  const location = dbUser?.location || 'Not set';

  return (
    <div className="min-h-screen bg-bg overflow-hidden">
      <div className="flex min-h-full">
        {/* Main Content Area - Left side, blank for now */}
        <div className="flex-1 p-8">
          {/* Empty for now as requested */}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 min-h-[calc(100vh-64px)] bg-card border-l border-border shadow-sm text-fg">
          <div className="p-6">
            {/* Profile Header */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <Image
                  src={userImage}
                  alt={displayName}
                  width={96}
                  height={96}
                  className="rounded-full border-4 border-border bg-card"
                  unoptimized={userImage.startsWith('http')}
                />
              </div>
              <h2 className="text-xl font-semibold text-fg mb-1 font-display">{displayName}</h2>
              <p className="text-sm text-fg/60 font-body">{email}</p>
            </div>

            {/* Edit Button */}
            <div className="mb-6">
              <Link
                href="/profile/settings"
                className="w-full block text-center px-4 py-2 bg-accent text-white rounded-md shadow-sm hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-card transition"
              >
                Edit
              </Link>
            </div>

            {/* Profile Information */}
            <div className="space-y-4 border-t border-border pt-6">
              <div>
                <h3 className="text-xs font-semibold text-fg/60 uppercase tracking-wider mb-3">
                  Profile Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-fg/60 mb-1">Email</p>
                    <p className="text-sm text-fg">{email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-fg/60 mb-1">Location</p>
                    <p className="text-sm text-fg">{location}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-fg/60 mb-1">Favorite Museum</p>
                    <p className="text-sm text-fg">The Metropolitan Museum of Art</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-fg/60 mb-1">Favorite Movement</p>
                    <p className="text-sm text-fg">Post Impressionism</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

