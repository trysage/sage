import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        mint: {
          50:  "#EAFBF2",
          100: "#CFF5DF",
          200: "#A8ECC4",
          300: "#7CDFA5",
          400: "#5BD18E",
          500: "#3FBE76",
          700: "#1F7A48",
          900: "#0D3B23",
        },
        ink: {
          0:   "#FBFBF7",
          50:  "#F2F2EB",
          100: "#E5E6DD",
          200: "#C8CBBE",
          300: "#8E938A",
          500: "#4A4F49",
          700: "#1F2421",
          800: "#14181A",
          850: "#0F1314",
          900: "#0A0D0E",
          950: "#06090A",
        },
        watch:  "#F0B33C",
        danger: "#E5524F",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "-apple-system", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
