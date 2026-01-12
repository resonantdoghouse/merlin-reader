/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        merlin: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          500: "#0ea5e9", // Sky blue-ish
          900: "#0c4a6e",
        },
        dragon: {
          900: "#1a1a1a", // Dark background
        },
      },
    },
  },
  plugins: [],
};
