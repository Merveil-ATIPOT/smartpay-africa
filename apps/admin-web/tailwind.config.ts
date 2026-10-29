import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#0B1F17",
        gold: "#F4B942",
      },
    },
  },
  plugins: [],
};

export default config;
