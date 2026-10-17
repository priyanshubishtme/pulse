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
          700: '#123A63',
          600: '#173E61'
        },
        cream: '#FFFDF8',
        sand: '#EDE9E3',
        line: '#DAD8D1',
        primary: '#0F5BE6',
        accent: '#F26B0F',
        success: '#206649',
        warning: '#F26B0F',
        danger: '#AD3534',
        textPrimary: '#092844',
        textMuted: '#5F6B75',
        ink: '#092844',
        app: '#F4F1EC',
        paleBlue: '#E8EFFE',
        paleGreen: '#E4EFE5',
        paleOrange: '#FBE8D5'
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif']
      }
    },
  },
  plugins: [],
}
