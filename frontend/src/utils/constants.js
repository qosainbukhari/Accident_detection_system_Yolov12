// ── Severity class config ────────────────────────────────────────
// Colours follow the backend's incident levels so the UI reads as a
// consistent scale: severe (CRITICAL, red) → fire (HIGH, orange) →
// moderate (MODERATE, amber).
export const CLASS_CONFIG = {
  severe: {
    label: "Severe", severity: "CRITICAL",
    color: "#ef4444", text: "#fca5a5",
    badge: "bg-red-500/10 text-red-300 border-red-500/30",
    dot:   "bg-red-500",
    desc:  "Major crash, rollover or head-on collision — high risk of casualties.",
  },
  fire: {
    label: "Fire", severity: "HIGH",
    color: "#f97316", text: "#fdba74",
    badge: "bg-orange-500/10 text-orange-300 border-orange-500/30",
    dot:   "bg-orange-500",
    desc:  "Vehicle or surroundings on fire — fire service response required.",
  },
  moderate: {
    label: "Moderate", severity: "MODERATE",
    color: "#eab308", text: "#fde047",
    badge: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
    dot:   "bg-yellow-500",
    desc:  "Collision with visible damage — verify and dispatch support.",
  },
  no_detection: {
    label: "No incident", severity: "NONE",
    color: "#64748b", text: "#94a3b8",
    badge: "bg-slate-500/10 text-slate-300 border-slate-500/30",
    dot:   "bg-slate-500",
    desc:  "No accident detected in the frame.",
  },
};

export const ALERT_CLASSES = ["severe", "fire", "moderate"];

export const CHART_COLORS = {
  severe:   "#ef4444",
  fire:     "#f97316",
  moderate: "#eab308",
};

// Shared chart styling so every Recharts instance looks the same.
export const CHART_AXIS = { fill: "#94a3b8", fontSize: 11 };
export const CHART_GRID = "rgba(148,163,184,0.08)";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const PAGE_SIZE = 20;
