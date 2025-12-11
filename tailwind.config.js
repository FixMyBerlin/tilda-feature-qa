/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './app.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './store/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      maxWidth: {
        app: '2200px',
      },
    },
  },
  plugins: [],
}
