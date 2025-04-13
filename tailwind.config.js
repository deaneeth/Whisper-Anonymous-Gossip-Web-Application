// tailwind.config.js
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary color palette - vibrant blue
        primary: {
          50: '#eef9ff',
          100: '#def1ff',
          200: '#b6e4ff',
          300: '#75d1ff',
          400: '#34b8ff',
          500: '#089df7',
          600: '#007ce0',
          700: '#0062b3',
          800: '#065493',
          900: '#0c4679',
        },
        // Secondary color - purple for accent elements
        secondary: {
          50: '#fcf4ff',
          100: '#f7e8ff',
          200: '#f0d6ff',
          300: '#e6b6ff',
          400: '#d580ff',
          500: '#c156f6',
          600: '#a436d9',
          700: '#8928b0',
          800: '#712790',
          900: '#5f2277',
        },
        // Warm accent color for highlights
        accent: {
          50: '#fff8ed',
          100: '#ffefd3',
          200: '#ffd9a6',
          300: '#ffbc6d',
          400: '#ff933e',
          500: '#fc7318',
          600: '#e85c0c',
          700: '#c14509',
          800: '#9c3810',
          900: '#7e3111',
        },
        // Enhanced gray palette for better contrast
        whisper: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      // Gradient backgrounds for visual appeal
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, var(--tw-colors-primary-500) 0%, var(--tw-colors-primary-700) 100%)',
        'gradient-secondary': 'linear-gradient(135deg, var(--tw-colors-secondary-400) 0%, var(--tw-colors-secondary-600) 100%)',
        'gradient-accent': 'linear-gradient(135deg, var(--tw-colors-accent-400) 0%, var(--tw-colors-accent-600) 100%)',
      },
      // Shadow effects for depth
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
        'card': '0 2px 10px rgba(0, 0, 0, 0.05), 0 0 1px rgba(0, 0, 0, 0.1)',
        'button': '0 2px 5px rgba(0, 0, 0, 0.1)'
      },
    },
  },
  plugins: [
    forms,
  ],
}