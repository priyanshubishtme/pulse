/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#04213F',
          800: '#0B2A4A',
          700: '#123A63'
        },
        cream: '#FFFDF8',
        sand: '#EDE9E3',
        line: '#D9D4CB',
        primary: '#0F5BE6',
        accent: '#F26B0F',
        success: '#1E8E4E',
        warning: '#E8A317',
        danger: '#D93025',
        textPrimary: '#0B2240',
        textMuted: '#5B6B7F'
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}
