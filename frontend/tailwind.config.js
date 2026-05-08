/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FBF8F2",
        border: "#E2D9C8",
        mint: {
          DEFAULT: "#4AB89A",
          light: "#E8F7F3",
          dark: "#2D8A70",
        },
        amber: {
          DEFAULT: "#E8A030",
          light: "#FEF4E0",
          dark: "#B87010",
        },
        sky: {
          DEFAULT: "#5A9ED4",
          light: "#EBF4FC",
          dark: "#3070A8",
        },
        indigo: {
          DEFAULT: "#3D4F8C",
          light: "#ECEFFE",
          dark: "#263070",
        },
        rose: {
          DEFAULT: "#D4607A",
          light: "#FAEAEE",
          dark: "#A83050",
        },
        lavender: {
          DEFAULT: "#9B7EC8",
          light: "#F0ECFB",
          dark: "#6A50A0",
        },
        green: {
          DEFAULT: "#5AA870",
          light: "#EBF5EE",
          dark: "#2D7840",
        },
        danger: {
          DEFAULT: "#D84040",
          light: "#FDEAEA",
        },
        gray: {
          50: "#FAF9F7",
          100: "#F2EEE8",
          200: "#E4DDD0",
          300: "#C8BFB0",
          400: "#9C9080",
          500: "#6E6860",
          600: "#4A4438",
          900: "#1C1810",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['"Noto Sans SC"', "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        sm: "10px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 2px 14px rgba(50,35,10,.07)",
        "card-lg": "0 6px 28px rgba(50,35,10,.13)",
      },
    },
  },
  plugins: [],
};
