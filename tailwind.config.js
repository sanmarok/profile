/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./app.js",
    "./pages/**/*.html",
    "./component/**/*.html",
  ],
  darkMode: 'class', // Muy importante para que funcione tu switch de modo oscuro
  theme: {
    extend: {},
  },
  plugins: [],
}
