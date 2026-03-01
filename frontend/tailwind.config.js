/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1a56db', 600: '#1e429f', 700: '#1a56db' },
      },
    },
  },
  plugins: [],
};
