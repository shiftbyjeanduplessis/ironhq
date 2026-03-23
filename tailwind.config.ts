import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#0b1020',
        panel: '#121a31',
        line: '#24304d',
        ink: '#e8eefc',
        muted: '#9daccc',
        brand: '#7c9cff',
        success: '#35c68b',
        warning: '#f7b955',
        danger: '#f67d7d',
      },
      boxShadow: {
        panel: '0 10px 30px rgba(0, 0, 0, 0.18)',
      },
      borderRadius: {
        panel: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
