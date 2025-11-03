'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { getCurrentUser, updateProfile, updatePreferences } from '@/app/actions/user-actions';

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
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Apply theme changes in real-time
  useEffect(() => {
    const html = document.documentElement;
    THEMES.forEach(t => html.classList.remove(t));
    html.classList.remove('dark');
    html.classList.add(theme);
    if (dark) html.classList.add('dark');
  }, [theme, dark]);

  // Load user data from database on mount
  useEffect(() => {
    async function loadUserData() {
      if (isLoaded && user) {
        try {
          const result = await getCurrentUser();
          if (result.user) {
            // Set location
            if (result.user.location) {
              setLocation(result.user.location);
            }
            // Set theme from database
            if (result.user.theme) {
              const themeValue = result.user.theme.startsWith('theme-') 
                ? result.user.theme 
                : `theme-${result.user.theme}`;
              setTheme(themeValue);
            } else {
              // Fallback to HTML element theme if not in database
              const html = document.documentElement;
              const currentTheme = THEMES.find(t => html.classList.contains(t)) || 'theme-modern';
              setTheme(currentTheme);
            }
            // Parse uiPreferences for favoriteMuseum
            if (result.user.uiPreferences) {
              try {
                const prefs = JSON.parse(result.user.uiPreferences);
                if (prefs.favoriteMuseum) {
                  setFavoriteMuseum(prefs.favoriteMuseum);
                }
              } catch (e) {
                console.error('Error parsing uiPreferences:', e);
              }
            }
          } else {
            // If no user data, initialize from HTML element
            const html = document.documentElement;
            const currentTheme = THEMES.find(t => html.classList.contains(t)) || 'theme-modern';
            setTheme(currentTheme);
          }
          // Set dark mode from HTML element
          const html = document.documentElement;
          const isDark = html.classList.contains('dark');
          setDark(isDark);
        } catch (error) {
          console.error('Error loading user data:', error);
          // Fallback to HTML element theme on error
          const html = document.documentElement;
          const currentTheme = THEMES.find(t => html.classList.contains(t)) || 'theme-modern';
          setTheme(currentTheme);
        }
      }
    }

    loadUserData();
  }, [isLoaded, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);

    try {
      // Update location
      const profileResult = await updateProfile({
        location: location || undefined,
      });

      if (profileResult.error) {
        throw new Error(profileResult.error);
      }

      // Prepare uiPreferences JSON with favoriteMuseum
      const uiPreferences = {
        favoriteMuseum: favoriteMuseum || undefined,
      };

      // Update theme and preferences
      const preferencesResult = await updatePreferences({
        theme: theme,
        uiPreferences: JSON.stringify(uiPreferences),
      });

      if (preferencesResult.error) {
        throw new Error(preferencesResult.error);
      }

      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save settings' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="text-lg text-fg font-body">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted to-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-card rounded-lg shadow-xl p-8 border border-border">
          <h1 className="text-3xl font-bold text-fg mb-2 font-display">
            Profile Settings
          </h1>
          <p className="text-fg/70 mb-8 font-body">
            Manage your profile information and preferences
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Location Input */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-fg mb-2 font-body"
              >
                Where do you live?
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter your location (e.g., New York, NY)"
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-card text-fg placeholder-fg/50 font-body"
              />
            </div>

            {/* Favorite Museum Input */}
            <div>
              <label
                htmlFor="favoriteMuseum"
                className="block text-sm font-medium text-fg mb-2 font-body"
              >
                Your Favorite Museum
              </label>
              <input
                type="text"
                id="favoriteMuseum"
                value={favoriteMuseum}
                onChange={(e) => setFavoriteMuseum(e.target.value)}
                placeholder="Enter your favorite museum"
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-card text-fg placeholder-fg/50 font-body"
              />
            </div>

            {/* Theme Selection */}
            <div>
              <label
                htmlFor="theme"
                className="block text-sm font-medium text-fg mb-2 font-body"
              >
                Current Theme
              </label>
              <div className="relative">
                <select
                  id="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-card text-fg appearance-none cursor-pointer font-body"
                >
                  {THEMES.map(t => (
                    <option key={t} value={t}>
                      {t.replace('theme-', '').charAt(0).toUpperCase() + t.replace('theme-', '').slice(1)}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className="h-5 w-5 text-fg/50"
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
              <p className="mt-2 text-sm text-fg/60 font-body">
                Select the theme you are currently working with for your art curation
              </p>
            </div>

            {/* Dark Mode Toggle */}
            <div>
              <label className="block text-sm font-medium text-fg mb-2 font-body">
                Appearance
              </label>
              <button
                type="button"
                onClick={() => setDark(d => !d)}
                className="w-full sm:w-auto px-6 py-3 bg-muted text-fg font-medium rounded-lg hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all duration-200 font-body"
              >
                {dark ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </button>
              <p className="mt-2 text-sm text-fg/60 font-body">
                Toggle between dark and light appearance
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4 space-y-2">
              {saveMessage && (
                <div
                  className={`p-3 rounded-lg text-sm font-body ${
                    saveMessage.type === 'success'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {saveMessage.text}
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-accent to-accent2 text-white font-medium rounded-lg shadow-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-body"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* User Info Display */}
          {user && (
            <div className="mt-8 pt-8 border-t border-border">
              <h2 className="text-lg font-semibold text-fg mb-4 font-display">
                Account Information
              </h2>
              <div className="space-y-2 text-sm font-body">
                <p className="text-fg/80">
                  <span className="font-medium">Name:</span> {user.fullName || user.firstName || 'Not set'}
                </p>
                <p className="text-fg/80">
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

