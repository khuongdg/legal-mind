/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        legal: {
          50: "#f0f5fa",
          100: "#e1ecf4",
          200: "#c7dbe9",
          300: "#9fc3d9",
          400: "#6fa6c5",
          500: "#498ab0",
          600: "#366e92",
          700: "#2d5877",
          800: "#1e3c54",
          900: "#0f2030",
          950: "#08131e",
        },
        gold: {
          400: "#f6cf70",
          500: "#eab308",
          600: "#ca8a04",
          700: "#a16207",
        }
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        serif: ["Merriweather", "Georgia", "serif"],
      }
    },
  },
  plugins: [],
};
