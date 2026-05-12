/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // OrionCart Brand Palette: Electric Blue & Warm Orange
                primary: {
                    DEFAULT: '#007AFF', // Electric Blue
                    hover: '#0056b3',
                    light: '#e0f0ff',
                },
                secondary: {
                    DEFAULT: '#FF9500', // Warm Orange
                    hover: '#e08300',
                    light: '#fff5e0',
                },
                accent: '#00C853', // Fresh Green for success/stock
                dark: '#0f172a', // Slate 900
                light: '#f8fafc', // Slate 50
                // Design token colors
                'token-primary': '#007AFF',
                'token-accent': '#FF9500',
                'token-success': '#00C853',
                'token-danger': '#FF3B30',
            },
            fontFamily: {
                sans: ['Outfit', 'Inter', 'sans-serif'],
            },
            spacing: {
                'token-1': '4px',
                'token-2': '8px',
                'token-3': '12px',
                'token-4': '16px',
                'token-5': '24px',
                'token-6': '32px',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
        },
    },
    plugins: [],
}
