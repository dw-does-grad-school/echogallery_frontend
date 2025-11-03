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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!clerkUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be signed in to view your profile.</p>
        </div>
      </div>
    );
  }

  const userImage = clerkUser.imageUrl || '/favicon.ico';
  const displayName = dbUser?.name || clerkUser.fullName || clerkUser.firstName || 'User';
  const email = clerkUser.primaryEmailAddress?.emailAddress || dbUser?.email || 'Not set';
  const location = dbUser?.location || 'Not set';

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <div className="flex h-full">
        {/* Main Content Area - Left side, blank for now */}
        <div className="flex-1 p-8">
          {/* Empty for now as requested */}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 h-full bg-white border-l border-gray-200 shadow-sm">
          <div className="p-6">
            {/* Profile Header */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <Image
                  src={userImage}
                  alt={displayName}
                  width={96}
                  height={96}
                  className="rounded-full border-4 border-gray-200"
                  unoptimized={userImage.startsWith('http')}
                />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">{displayName}</h2>
              <p className="text-sm text-gray-500">{email}</p>
            </div>

            {/* Edit Button */}
            <div className="mb-6">
              <Link
                href="/profile/settings"
                className="w-full block text-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                Edit
              </Link>
            </div>

            {/* Profile Information */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Profile Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                    <p className="text-sm text-gray-900">{email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Location</p>
                    <p className="text-sm text-gray-900">{location}</p>
                  </div>
                  {dbUser?.theme && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Theme</p>
                      <p className="text-sm text-gray-900 capitalize">
                        {dbUser.theme.replace('theme-', '').replace('-', ' ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

