/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'], // use .dark on <html>
    content: ['./src/**/*.{ts,tsx,js,jsx,mdx,html}'],
    theme: {
      extend: {
        colors: {
          bg: 'hsl(var(--bg) / <alpha-value>)',
          fg: 'hsl(var(--fg) / <alpha-value>)',
          muted: 'hsl(var(--muted) / <alpha-value>)',
          card: 'hsl(var(--card) / <alpha-value>)',
          accent: 'hsl(var(--accent) / <alpha-value>)',
          accent2: 'hsl(var(--accent2) / <alpha-value>)',
          border: 'hsl(var(--border) / <alpha-value>)',
          ring: 'hsl(var(--ring) / <alpha-value>)',
        },
        fontFamily: {
          display: ['var(--font-display)', 'ui-serif', 'serif'],
          body: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
          mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        },
        boxShadow: {
          neo: '6px 6px 0 0 hsl(var(--fg) / 0.15)',
        },
        borderRadius: {
          xl2: '1.25rem',
        },
      },
    },
    plugins: [],
  };
  