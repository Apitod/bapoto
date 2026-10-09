/** @type {import('tailwindcss').Config} */
// Tema identik dengan konfigurasi Tailwind Play CDN di index.html lama.
export default {
    content: ['./index.html', './src/**/*.js'],
    theme: {
        extend: {
            colors: {
                brutalPink: '#FF2A7A',
                brutalYellow: '#FFD700',
                brutalBlue: '#0055FF',
                brutalGreen: '#00E676',
                brutalBg: '#F4F4F0',
                brutalDark: '#111111'
            },
            boxShadow: {
                'neo': '4px 4px 0px #111111',
                'neo-lg': '8px 8px 0px #111111',
                'neo-hover': '2px 2px 0px #111111',
                'neo-active': '0px 0px 0px #111111'
            },
            fontFamily: {
                'sans': ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            }
        }
    },
    plugins: []
};
