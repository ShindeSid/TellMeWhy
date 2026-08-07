import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        trust: {
          low: "#c2410c",
          medium: "#a16207",
          high: "#15803d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
