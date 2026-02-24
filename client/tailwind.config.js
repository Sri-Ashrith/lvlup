/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gta-dark': '#050505',
        'gta-darker': '#020202',
        'gta-surface': '#0C0C0C',
        'gta-surface-2': '#141414',
        'gta-purple': '#7B3FE4',
        'gta-pink': '#f472b6',
        'gta-cyan': '#22d3ee',
        'gta-red': '#FF3B3B',
        'gta-orange': '#FF6B35',
        'gta-gold': '#D4AF37',
        'gta-green': '#00FF9C',
        'gta-yellow': '#D4AF37',
        'neon-green': '#00FF9C',
        'neon-pink': '#f472b6',
        'neon-blue': '#22d3ee',
        'neon-purple': '#7B3FE4',
        'vice-pink': '#FF6B9D',
        'vice-blue': '#22d3ee',
      },
      fontFamily: {
        'gta': ['Pricedown', 'Impact', 'Arial Black', 'sans-serif'],
        'vice': ['Abril Fatface', 'cursive'],
        'digital': ['Orbitron', 'monospace'],
        'mono': ['JetBrains Mono', 'monospace'],
        'condensed': ['Oswald', 'Impact', 'Arial Narrow', 'sans-serif'],
      },
      animation: {
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'flicker': 'flicker 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'shake': 'shake 0.5s ease-in-out',
        'spin-slow': 'spin 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'grain': 'grain 8s steps(10) infinite',
        'gradient-x': 'gradientX 15s ease infinite',
        'fade-in-blur': 'fadeInBlur 1s ease-out forwards',
        'text-flicker': 'textFlicker 4s ease-in-out infinite',
        'scanner': 'scanner 4s linear infinite',
        'neon-pulse': 'neonPulse 2.5s ease-in-out infinite',
        'smoke': 'smoke 20s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0,255,156,0.3), 0 0 20px rgba(0,255,156,0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(0,255,156,0.6), 0 0 40px rgba(0,255,156,0.3)' },
        },
        neonPulse: {
          '0%, 100%': { opacity: 0.4, filter: 'blur(20px)' },
          '50%': { opacity: 0.8, filter: 'blur(30px)' },
        },
        flicker: {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': { opacity: 1 },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': { opacity: 0.4 },
        },
        glow: {
          '0%': { textShadow: '0 0 10px rgba(0,255,156,0.5), 0 0 20px rgba(0,255,156,0.3)' },
          '100%': { textShadow: '0 0 20px rgba(0,255,156,0.8), 0 0 40px rgba(0,255,156,0.5), 0 0 60px rgba(0,255,156,0.3)' },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(30px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        smoke: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: 0.3 },
          '50%': { transform: 'translateY(-30px) scale(1.1)', opacity: 0.15 },
          '100%': { transform: 'translateY(0) scale(1)', opacity: 0.3 },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0,0)' },
          '10%': { transform: 'translate(-5%,-10%)' },
          '20%': { transform: 'translate(-15%,5%)' },
          '30%': { transform: 'translate(7%,-25%)' },
          '40%': { transform: 'translate(-5%,25%)' },
          '50%': { transform: 'translate(-15%,10%)' },
          '60%': { transform: 'translate(15%,0%)' },
          '70%': { transform: 'translate(0%,15%)' },
          '80%': { transform: 'translate(3%,35%)' },
          '90%': { transform: 'translate(-10%,10%)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        fadeInBlur: {
          '0%': { opacity: 0, filter: 'blur(10px)' },
          '100%': { opacity: 1, filter: 'blur(0px)' },
        },
        textFlicker: {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': { opacity: 1, textShadow: '0 0 10px rgba(0,255,156,0.7), 0 0 20px rgba(0,255,156,0.4)' },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': { opacity: 0.6, textShadow: 'none' },
        },
        scanner: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100vh)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0,255,156,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,156,0.04) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'sunset-gradient': 'linear-gradient(180deg, #00FF9C 0%, #007A4A 25%, #0A2A1A 50%, #050505 75%, #020202 100%)',
        'gta-hero': 'linear-gradient(135deg, #020202 0%, #0C0C0C 30%, #0A1A12 50%, #0C0C0C 70%, #020202 100%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
}
