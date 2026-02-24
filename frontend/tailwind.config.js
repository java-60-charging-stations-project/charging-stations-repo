export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'sans-serif'],
      },
      colors: {
        ios: {
          green: '#30D158',
          blue: '#0A84FF',
          purple: '#BF5AF2',
          red: '#FF453A',
          orange: '#FF9F0A',
          teal: '#5AC8FA',
          indigo: '#5E5CE6',
          label: '#1C1C1E',
          secondary: 'rgba(60,60,67,0.6)',
          tertiary: 'rgba(60,60,67,0.3)',
          fill: 'rgba(120,120,128,0.12)',
          separator: 'rgba(60,60,67,0.12)',
          bg: '#F2F2F7',
        },
        primary: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0',
          300: '#86efac', 400: '#4ade80', 500: '#30D158',
          600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d',
        },
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      backdropBlur: {
        xs: '4px',
        '3xl': '60px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.9) inset',
        'glass-lg': '0 20px 60px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.9) inset',
        'glow-green': '0 4px 20px rgba(48,209,88,0.4)',
        'glow-blue': '0 4px 20px rgba(10,132,255,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'drift': 'drift 20s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' }, '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
