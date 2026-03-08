/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        orange: {
          primary: '#FC5D36',
        },
        amber: {
          primary: '#FDB352',
        },
        lat: {
          orange: '#FC5D36',
          amber: '#FDB352',
          peach: '#FFF6EA',
          warmBg: '#FAF9F5',
          announceBg: '#F9BA54',
          text: '#060B13',
          muted: '#363636',
          card: 'rgba(253,179,82,0.12)',
        },
      },
      fontFamily: {
        display: ['"General Sans"', 'sans-serif'],
        body: ['"Instrument Sans"', 'sans-serif'],
        ui: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
