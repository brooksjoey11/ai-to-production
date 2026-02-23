// tailwind.config.js (if needed, but not requested – just for reference)
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderWidth: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
};
