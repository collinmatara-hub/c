/** @type {import('tailwindcss').Config} */

// Colours come from CSS variables (see index.css) so the whole app can switch
// between the light and dark theme. "<alpha-value>" keeps classes like bg-forest/10 working.
const rgb = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: rgb('ink'),
        paper: rgb('paper'),
        sage: rgb('sage'),
        surface: rgb('surface'),
        navy: '#0B1E2B',
        'on-forest': rgb('on-forest'),
        forest: {
          DEFAULT: rgb('forest'),
          dark: rgb('forest-dark'),
          light: rgb('forest-light'),
        },
        gold: {
          DEFAULT: rgb('gold'),
          light: rgb('gold-light'),
          dark: rgb('gold-dark'),
        },
        clay: rgb('clay'),
      },
      fontFamily: {
        display: ['Manrope', 'DM Sans', 'sans-serif'],
        body: ['DM Sans', 'Manrope', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(19,36,54,0.06) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};
