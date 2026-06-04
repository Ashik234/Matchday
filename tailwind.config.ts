import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: 'var(--c-bg-deep)',
          DEFAULT: 'var(--c-bg)',
          elev1: 'var(--c-bg-elev-1)',
          elev2: 'var(--c-bg-elev-2)',
        },
        pitch: {
          DEFAULT: 'var(--c-pitch)',
          dark: 'var(--c-pitch-dark)',
          line: 'var(--c-pitch-line)',
        },
        gold: {
          DEFAULT: 'var(--c-gold)',
          light: 'var(--c-gold-light)',
        },
        text: {
          DEFAULT: 'var(--c-text)',
          dim: 'var(--c-text-dim)',
          muted: 'var(--c-text-muted)',
        },
        live: 'var(--c-live)',
        success: 'var(--c-success)',
        loss: 'var(--c-loss)',
      },
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.01em' }],
        hero: ['6rem', { lineHeight: '1', letterSpacing: '-0.01em' }],
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(.22,.61,.36,1)',
        impact: 'cubic-bezier(.55,.05,.67,.19)',
        spring: 'cubic-bezier(.34,1.56,.64,1)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '300ms',
        slow: '600ms',
        reveal: '1200ms',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        gold: 'var(--shadow-gold)',
        live: 'var(--shadow-live)',
      },
      maxWidth: { container: '1440px' },
    },
  },
  plugins: [],
};

export default config;
