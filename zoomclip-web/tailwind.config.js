/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f0f',
        panel: '#181818',
        panel2: '#1f1f1f',
        text: '#f5f5f5',
        muted: '#a0a0a0',
        accent: '#ff4d4d',
        green: '#38d86f',
        error: '#ff6b6b',
        cardBorder: 'rgba(255,255,255,0.06)',
        inputBorder: 'rgba(255,255,255,0.1)',
        marker: '#ffb020',
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
};
