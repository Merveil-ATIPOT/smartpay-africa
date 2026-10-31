import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#101828",
        "navy-deep": "#111827",
        "navy-mid": "#1F2937",
        orange: "#F7931A",
        "orange-stitch": "#FE9821",
        green: "#12B76A",
        surface: "#F9F9FF",
        muted: "#667085",
        danger: "#D92D20",
        line: "#EAECF0",
        "blue-low": "#F0F3FF",
      },
      boxShadow: {
        card: "0px 2px 8px rgba(16, 24, 40, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
