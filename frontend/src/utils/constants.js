// ── Severity class config ────────────────────────────────────────
export const CLASS_CONFIG = {
  fire: {
    label: "Fire",       icon: "🔥", severity: "CRITICAL",
    color: "#ef4444",   dim: "#ef444418",  text: "#fca5a5",
    badge: "bg-red-500/20 text-red-300 border border-red-500/30",
    dot:   "bg-red-500",
  },

  moderate: {
    label: "Moderate",   icon: "🟠",  severity: "MEDIUM",
    color: "#f97316",   dim: "#f9731618", text: "#fdba74",
    badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    dot:   "bg-orange-500",
  },
  severe: {
    label: "Severe",     icon: "🚨",  severity: "HIGH",
    color: "#dc2626",   dim: "#dc262618", text: "#fca5a5",
    badge: "bg-rose-600/20 text-rose-300 border border-rose-600/30",
    dot:   "bg-rose-600",
  },
  no_detection: {
    label: "None",       icon: "✓",   severity: "NONE",
    color: "#64748b",   dim: "#64748b18", text: "#94a3b8",
    badge: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
    dot:   "bg-slate-500",
  },
};

export const ALERT_CLASSES = ["fire", "severe", "moderate"];

export const CHART_COLORS = {
  fire:     "#ef4444",
  moderate: "#f97316",
  severe:   "#dc2626",
};

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const PAGE_SIZE = 20;
