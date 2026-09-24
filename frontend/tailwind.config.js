import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral "command centre" surfaces, darkest → lightest.
        ink: {
          950: "#060a13",
          900: "#0a101d",
          850: "#0d1424",
          800: "#111a2e",
          750: "#16203a",
          700: "#1d2946",
          600: "#2a385c",
        },
        // Primary interactive accent. Deliberately not red so it never
        // competes with the severity colours below.
        brand: colors.sky,

        // Severity, ordered by the backend's incident levels:
        // severe → CRITICAL, fire → HIGH, moderate → MODERATE.
        severe:   { DEFAULT: "#ef4444", soft: "#fca5a5" },
        fire:     { DEFAULT: "#f97316", soft: "#fdba74" },
        moderate: { DEFAULT: "#eab308", soft: "#fde047" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card:  "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        lift:  "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 16px 40px -16px rgba(0,0,0,0.7)",
        brand: "0 8px 24px -8px rgba(14,165,233,0.55)",
        danger: "0 8px 24px -8px rgba(239,68,68,0.55)",
      },
      keyframes: {
        scan: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        ping2: {
          "75%, 100%": { transform: "scale(2.2)", opacity: "0" },
        },
        shimmer: {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        scan: "scan 1.8s cubic-bezier(.4,0,.6,1) infinite",
        ping2: "ping2 1.6s cubic-bezier(0,0,.2,1) infinite",
        shimmer: "shimmer 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};
