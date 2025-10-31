import { defineConfig } from '@tailwindcss/postcss'

export default defineConfig({
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'polza-primary': '#00D4FF',
        'polza-secondary': '#5DADE2', 
        'polza-accent': '#85E3FF'
      },
      backgroundImage: {
        'polza-gradient': 'linear-gradient(135deg, #00D4FF 0%, #5DADE2 50%, #85E3FF 100%)',
        'polza-gradient-hover': 'linear-gradient(135deg, #00B8E6 0%, #4A9BD1 50%, #6BCCE6 100%)'
      }
    }
  }
})