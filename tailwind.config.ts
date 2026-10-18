import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clinic: {
          50: "#f0f7ff",
          100: "#dbeafe",
          600: "#0b5fff",
          700: "#0846c2",
          900: "#0a1f44",
        },
      },
    },
  },
  plugins: [],
};

export default config;
