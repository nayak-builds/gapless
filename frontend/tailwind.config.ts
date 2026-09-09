import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0F2747", hover: "#173A66", fg: "#F7F5F0" },
        accent: { DEFAULT: "#2A6F6A", muted: "#E4F0EE" },
        canvas: "#F4F1EA",
        surface: "#FFFCF7",
        ink: { DEFAULT: "#1C1917", muted: "#57534E" },
        line: "#E7E0D6",
        success: "#2F6F4E",
        warning: "#A16207",
        danger: "#B42318",
      },
      fontFamily: {
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 39 71 / 0.06), 0 1px 3px rgb(15 39 71 / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
