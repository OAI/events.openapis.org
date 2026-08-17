/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      sm: '640px',
      md: '1024px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        onest: ['var(--font-onest)', 'Onest', 'sans-serif'],
      },
      colors: {
        brand: {
          bg: 'var(--brand-bg)',
          green: '#65D100',
          'green-dark': '#50BD00',
          'green-light': '#76DD2A',
          'green-pressed': '#356D00',
          card: 'var(--brand-card)',
          separator: 'var(--brand-separator)',
          muted: 'var(--brand-muted)',
          'card-dark': 'var(--brand-card-dark)',
          placeholder: 'var(--brand-placeholder)',
        },
      },
      borderRadius: {
        '4xl': '40px',
        '5xl': '80px',
      },
      letterSpacing: {
        oai: '-0.04em',
      },
    },
  },
  plugins: [],
};
