import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand coral (from the PDFForge design).
        brand: {
          50: "#fef0eb",
          100: "#fbd9cd",
          200: "#f5a88f",
          300: "#f5623b",
          400: "#f14e2b",
          500: "#f14e2b",
          600: "#e23c17",
          700: "#d63e1d",
          800: "#b8320f",
          900: "#8f2810",
        },
        // Navy ink used for text + dark surfaces.
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#dde0e7",
          300: "#c4c9d2",
          400: "#a0a6b2",
          500: "#7b8394",
          600: "#5a6172",
          700: "#3a4256",
          800: "#2b3242",
          900: "#10182b",
        },
        gold: { bg: "#fbefdd", fg: "#c77b2e" },
        grass: { bg: "#e7f4ee", fg: "#1f8a5b" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem", // 14px
        "2xl": "1.125rem", // 18px
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,43,0.05)",
        "card-hover": "0 2px 6px rgba(16,24,43,0.08)",
        pop: "0 4px 14px rgba(16,24,43,0.08)",
        brand: "0 1px 2px rgba(226,60,23,0.15)",
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(135deg,#f5623b,#e23c17)",
        "brand-soft": "linear-gradient(135deg,#fef0eb,#fde3d9)",
      },
    },
  },
  plugins: [],
};

export default config;
