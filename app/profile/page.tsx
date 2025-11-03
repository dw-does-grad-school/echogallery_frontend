'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

const THEMES = [
  'theme-modern',
  'theme-impressionist',
  'theme-cubist',
  'theme-dutch',
  'theme-renaissance',
  'theme-asian',
  'theme-indigenous',
  'theme-african',
];

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [location, setLocation] = useState('');
  const [favoriteMuseum, setFavoriteMuseum] = useState('');
  const [theme, setTheme] = useState('theme-modern');
  const [dark, setDark] = useState(true);

  // Apply theme changes in real-time
  useEffect(() => {
    const html = document.documentElement;
    THEMES.forEach(t => html.classList.remove(t));
    html.classList.remove('dark');
    html.classList.add(theme);
    if (dark) html.classList.add('dark');
  }, [theme, dark]);

  // Initialize theme from HTML element on mount
  useEffect(() => {
    const html = document.documentElement;
    const currentTheme = THEMES.find(t => html.classList.contains(t)) || 'theme-modern';
    const isDark = html.classList.contains('dark');
    setTheme(currentTheme);
    setDark(isDark);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement save functionality
    console.log({ location, favoriteMuseum, theme, dark });
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Profile Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Manage your profile information and preferences
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Location Input */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Where do you live?
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter your location (e.g., New York, NY)"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* Favorite Museum Input */}
            <div>
              <label
                htmlFor="favoriteMuseum"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Your Favorite Museum
              </label>
              <input
                type="text"
                id="favoriteMuseum"
                value={favoriteMuseum}
                onChange={(e) => setFavoriteMuseum(e.target.value)}
                placeholder="Enter your favorite museum"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* Theme Selection */}
            <div>
              <label
                htmlFor="theme"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Current Theme
              </label>
              <div className="relative">
                <select
                  id="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer"
                >
                  {THEMES.map(t => (
                    <option key={t} value={t}>
                      {t.replace('theme-', '').charAt(0).toUpperCase() + t.replace('theme-', '').slice(1)}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Select the theme you are currently working with for your art curation
              </p>
            </div>

            {/* Dark Mode Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Appearance
              </label>
              <button
                type="button"
                onClick={() => setDark(d => !d)}
                className="w-full sm:w-auto px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
              >
                {dark ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </button>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Toggle between dark and light appearance
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
              >
                Save Changes
              </button>
            </div>
          </form>

          {/* User Info Display */}
          {user && (
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Account Information
              </h2>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Name:</span> {user.fullName || user.firstName || 'Not set'}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Email:</span> {user.primaryEmailAddress?.emailAddress || 'Not set'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

