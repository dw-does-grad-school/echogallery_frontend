'use client';

import { useEffect, useState } from 'react';

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

export function ThemeSwitcher() {
  const [theme, setTheme] = useState('theme-modern');
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const html = document.documentElement;
    THEMES.forEach(t => html.classList.remove(t));
    html.classList.remove('dark');
    html.classList.add(theme);
    if (dark) html.classList.add('dark');
  }, [theme, dark]);

  return (
    <div className="fixed bottom-4 right-4 bg-card text-fg border border-border rounded-xl2 shadow-neo p-3 flex items-center gap-2">
      <select
        className="bg-card text-fg border border-border rounded-md px-2 py-1"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
      >
        {THEMES.map(t => <option key={t} value={t}>{t.replace('theme-','')}</option>)}
      </select>
      <button
        className="px-3 py-1 rounded-md border border-border hover:bg-muted"
        onClick={() => setDark(d => !d)}
      >
        {dark ? 'Dark' : 'Light'}
      </button>
    </div>
  );
}

