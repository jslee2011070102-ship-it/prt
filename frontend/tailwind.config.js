/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f5fa',
          100: '#e6eef5',
          200: '#ccdaea',
          300: '#99b5d4',
          400: '#6690bf',
          500: '#2E75B6',
          600: '#2557A0',
          700: '#1e4480',
          800: '#163260',
          900: '#0f2440',
        },
        light: {
          bg: '#EBF3FB',
        }
      },
    },
  },
  plugins: [],
}
