import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        "fg-muted": "rgb(var(--fg-muted) / <alpha-value>)",
        "fg-subtle": "rgb(var(--fg-subtle) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        "ink-fixed": "#1A1410",
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          2: "rgb(var(--accent-2) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          2: "rgb(var(--success-2) / <alpha-value>)",
        },
        warn: {
          DEFAULT: "rgb(var(--warn) / <alpha-value>)",
          2: "rgb(var(--warn-2) / <alpha-value>)",
        },
        review: {
          DEFAULT: "rgb(var(--review) / <alpha-value>)",
          2: "rgb(var(--review-2) / <alpha-value>)",
        },
        gold: "rgb(var(--gold) / <alpha-value>)",
        silver: "rgb(var(--silver) / <alpha-value>)",
        bronze: "rgb(var(--bronze) / <alpha-value>)",
        "pq-attempted": "rgb(var(--pq-attempted) / <alpha-value>)",
        "pq-not-attempted": "rgb(var(--pq-not-attempted) / <alpha-value>)",
        "pq-marked": {
          DEFAULT: "rgb(var(--pq-marked) / <alpha-value>)",
          2: "rgb(var(--pq-marked-2) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 50% 0%, rgb(var(--accent) / 0.14), transparent 60%)",
      },
    },
  },
  plugins: [],
};
export default config;
