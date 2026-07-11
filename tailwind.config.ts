import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B0D12",
        paper: "#F6F4EE",
        accent: "#2F5D50",
        accent2: "#C97B3C",
        line: "#E4E0D6",
        darkbg: "#0B0D12",
        darkcard: "#13161c",
        darkborder: "#212735",
      },
      fontFamily: {
        serif: ["Lora", "Georgia", "Cambria", "Times New Roman", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;

