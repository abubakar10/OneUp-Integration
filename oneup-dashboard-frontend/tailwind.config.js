/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",   // ✅ all React files inside src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
