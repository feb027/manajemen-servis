/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Mencakup semua file JS/TS/JSX/TSX di dalam src
  ],
  theme: {
    colors: {
       'brand': {
          light: '#38bdf8', // sky-400
          DEFAULT: '#0ea5e9', // sky-500
          dark: '#0284c7', // sky-600
       },
       transparent: 'transparent',
       current: 'currentColor',
       black: '#000',
       white: '#fff',
       gray: {
         50: '#F9FAFB',
         100: '#F3F4F6',
         200: '#E5E7EB',
         300: '#D1D5DB',
         400: '#9CA3AF',
         500: '#6B7280',
         600: '#4B5563',
         700: '#374151',
         800: '#1F2937',
         900: '#111827',
       },
       red: {
         50: '#FEF2F2',
         100: '#FEE2E2',
         300: '#FCA5A5',
         400: '#F87171',
         800: '#991B1B',
       },
       blue: {
         500: '#3B82F6',
         600: '#2563EB',
         700: '#1D4ED8',
       }
    },
    // Anda juga bisa extend font family di sini jika mau
    // fontFamily: {
    //   sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
    // },
  },
  plugins: [],
} 