/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#ededed",
        card: "#111111",
        neon: {
          cyan: "#00f3ff",
          purple: "#bc00ff",
        },
      },
      backgroundImage: {
        'neon-gradient': 'linear-gradient(to right, #00f3ff, #bc00ff)',
      },
      boxShadow: {
        'neon-glow': '0 0 10px #00f3ff, 0 0 20px #bc00ff',
      }
    },
  },
  plugins: [],
};
