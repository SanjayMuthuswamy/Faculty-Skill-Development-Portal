import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0efff',
          500: '#0084ff',
          600: '#0070dd',
          700: '#0066cc',
        },
      },
    },
  },
  plugins: [],
}

export default config
