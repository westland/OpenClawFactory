import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Share Tech Mono', 'Courier New', 'monospace'],
      },
      colors: {
        factory: {
          bg:      '#0a0e1a',
          panel:   '#0f1629',
          border:  '#1e2d4a',
          accent:  '#22d3ee',
          green:   '#4ade80',
          amber:   '#fbbf24',
          purple:  '#a78bfa',
          pink:    '#f472b6',
          red:     '#f87171',
        }
      },
      animation: {
        'bob':    'bob 2s ease-in-out infinite',
        'rock':   'rock 0.7s ease-in-out infinite',
        'glow':   'glow 2s ease-in-out infinite',
        'scan':   'scan 2s linear infinite',
        'blink':  'blink 1s step-end infinite',
      },
      keyframes: {
        bob:   { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        rock:  { '0%,100%': { transform: 'rotate(0deg)' }, '25%': { transform: 'rotate(-8deg)' }, '75%': { transform: 'rotate(8deg)' } },
        glow:  { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
        scan:  { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(400%)' } },
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
      }
    },
  },
  plugins: [],
}

export default config
