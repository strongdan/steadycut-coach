import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f6f1e8",
        ink: "#1b1f1c",
        moss: "#17311f",
        clay: "#9a5d35",
        sand: "#efe0c8",
        leaf: "#5b7c55",
      },
      boxShadow: {
        card: "0 16px 40px rgba(23, 49, 31, 0.08)",
      },
      fontFamily: {
        sans: ["'Avenir Next'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
