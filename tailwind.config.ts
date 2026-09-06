import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0A0B0E",
          light: "#15171B",
          lighter: "#1E2226",
        },
        lime: {
          DEFAULT: "#C6F135",
          light: "#DFFF6B",
        },
        ember: {
          DEFAULT: "#FF6A3D",
          light: "#FF9466",
        },
        sky: {
          DEFAULT: "#4CC9F0",
          light: "#8AE0FF",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 50% 0%, rgba(198,241,53,0.12), transparent 60%)",
      },
    },
  },
  plugins: [],
};
export default config;
