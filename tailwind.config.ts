import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: { brand: { DEFAULT: "#d32f2f", dark: "#ff8a80" } },
    },
  },
  plugins: [],
};
export default config;
