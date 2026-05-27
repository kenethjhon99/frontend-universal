/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src-saas/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f7ec",
          100: "#e5edd4",
          200: "#cdddab",
          300: "#b1c97d",
          400: "#94b554",
          500: "#76963d",
          600: "#5b742f",
          700: "#455923",
          800: "#313f18",
          900: "#1b250c",
        },
      },
      boxShadow: {
        panel: "0 24px 60px rgba(17, 24, 39, 0.14)",
      },
    },
  },
  plugins: [],
};

