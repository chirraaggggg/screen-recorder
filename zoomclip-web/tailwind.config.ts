import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        panel2: 'var(--panel2)',
        panel3: 'var(--panel3)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        green: 'var(--green)',
        amber: 'var(--amber)',
        border: 'var(--border)',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        input: '10px',
        pill: '999px',
      },
    },
  },
  plugins: [],
}

export default config
