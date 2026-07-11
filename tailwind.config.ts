import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef2f2",
          100: "#fde3e3",
          200: "#fbcdcd",
          300: "#f7a9a9",
          400: "#f07676",
          500: "#e54848",
          600: "#d21f2a",
          700: "#b0141f",
          800: "#92141d",
          900: "#79161e",
          950: "#42060b"
        },
        navy: {
          400: "#9699b7",
          500: "#43477c",
          600: "#343867",
          700: "#262a52",
          800: "#1d2145",
          900: "#151834",
          950: "#0e102a"
        }
      },
      fontFamily: {
        kanit: ["var(--font-kanit)", "sans-serif"]
      }
    }
  },
  plugins: []
};
export default config;
