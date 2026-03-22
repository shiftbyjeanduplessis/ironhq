import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // IronHQ industrial palette — zinc base, no decoration
        brand: {
          bg:      '#09090b', // zinc-950 — primary background
          surface: '#18181b', // zinc-900 — cards, inputs, panels
          border:  '#27272a', // zinc-800 — grid lines, dividers
          muted:   '#3f3f46', // zinc-700 — inactive borders
          text:    '#fafafa', // zinc-50  — primary text
          dim:     '#71717a', // zinc-500 — labels, secondary text
          ghost:   '#52525b', // zinc-600 — placeholder, ghost text
        },
        status: {
          success: '#22c55e', // green-500
          warning: '#eab308', // yellow-500
          error:   '#ef4444', // red-500
          info:    '#3b82f6', // blue-500
        },
      },
      fontFamily: {
        // Mono for all data: sets, reps, load, deltas, timestamps
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        // Sans for UI chrome: nav, labels, headings
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Compact scale for high-density coach UI
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        xs:    ['0.75rem',  { lineHeight: '1rem'     }], // 12px
        sm:    ['0.875rem', { lineHeight: '1.25rem'  }], // 14px
      },
      spacing: {
        // Tight spacing tokens for dense desktop grids
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
      },
      borderRadius: {
        // IronHQ uses sharp edges — no rounded corners
        DEFAULT: '0',
        none:    '0',
        sm:      '0',
        md:      '0',
        lg:      '0',
        xl:      '0',
        full:    '9999px', // pills only when explicitly needed
      },
      letterSpacing: {
        tightest: '-0.075em',
        tighter:  '-0.05em',
        tight:    '-0.025em',
        widest:   '0.15em',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'   },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1'   },
          '50%':      { opacity: '0.5' },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.15s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
