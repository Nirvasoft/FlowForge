/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Primary brand colors
                primary: {
                    50: '#f0f4ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                // Accent colors
                accent: {
                    50: '#fdf4ff',
                    100: '#fae8ff',
                    200: '#f5d0fe',
                    300: '#f0abfc',
                    400: '#e879f9',
                    500: '#d946ef',
                    600: '#c026d3',
                    700: '#a21caf',
                    800: '#86198f',
                    900: '#701a75',
                    950: '#4a044e',
                },
                // Surface colors using CSS variables for theme switching
                surface: {
                    50: 'rgb(var(--color-surface-50) / <alpha-value>)',
                    100: 'rgb(var(--color-surface-100) / <alpha-value>)',
                    200: 'rgb(var(--color-surface-200) / <alpha-value>)',
                    300: 'rgb(var(--color-surface-300) / <alpha-value>)',
                    400: 'rgb(var(--color-surface-400) / <alpha-value>)',
                    500: 'rgb(var(--color-surface-500) / <alpha-value>)',
                    600: 'rgb(var(--color-surface-600) / <alpha-value>)',
                    700: 'rgb(var(--color-surface-700) / <alpha-value>)',
                    800: 'rgb(var(--color-surface-800) / <alpha-value>)',
                    900: 'rgb(var(--color-surface-900) / <alpha-value>)',
                    950: 'rgb(var(--color-surface-950) / <alpha-value>)',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                'glow': 'var(--shadow-glow)',
                'glow-lg': 'var(--shadow-glow-lg)',
                'glass': 'var(--shadow-glass)',
            },
            backdropBlur: {
                'xs': '2px',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'spin-slow': 'spin 3s linear infinite',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: 'var(--shadow-glow)' },
                    '50%': { boxShadow: 'var(--shadow-glow-lg)' },
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
    ],
}
