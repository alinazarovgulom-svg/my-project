/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#08080f',
          800: '#0d0d18',
          700: '#11111e',
          600: '#16162a',
          500: '#1e1e35',
        },
        accent: {
          blue: '#4f8ef7',
          green: '#22c55e',
          red: '#ef4444',
          yellow: '#f59e0b',
          purple: '#a855f7',
        }
      }
    }
  },
  plugins: []
}
