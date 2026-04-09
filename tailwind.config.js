/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4d4d4f', // Using the dark gray from the logo text/right peak
        secondary: '#fdc300', // Using the yellow from the logo left peak
        success: '#16a34a',
        danger: '#dc2626',
      }
    },
  },
  plugins: [],
}
