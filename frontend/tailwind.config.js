/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // App shell
        shell:   "#0f1117",
        surface: "#161b27",
        border:  "rgba(255,255,255,0.06)",

        // Accent
        accent:  { DEFAULT: "#6366f1", hover: "#818cf8", dim: "#6366f120" },

        // Severity
        fire:     { DEFAULT: "#ef4444", dim: "#ef444415", text: "#fca5a5" },
        moderate: { DEFAULT: "#f97316", dim: "#f9731615", text: "#fdba74" },
        severe:   { DEFAULT: "#dc2626", dim: "#dc262615", text: "#fca5a5" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        card:   "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        glow:   "0 0 20px rgba(99,102,241,0.25)",
        "glow-red": "0 0 20px rgba(239,68,68,0.25)",
      },
    },
  },
  plugins: [],
};
