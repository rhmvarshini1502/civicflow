/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium slate-blue palette for CivicFlow
        brand: {
          50: '#f4f6fa',
          100: '#e9edf5',
          200: '#cbd5e7',
          300: '#9cb3d4',
          400: '#688dbd',
          500: '#476fa3',
          600: '#365684',
          700: '#2d456b',
          800: '#283c5a',
          900: '#25344d',
          950: '#161e2f',
        },
        severity: {
          Low: '#3b82f6',      // Blue
          Medium: '#f59e0b',   // Yellow
          High: '#ef4444',     // Red
          Critical: '#7f1d1d', // Dark Red
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(15px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
