import { CLASS_CONFIG } from "./constants";

/** Format confidence as percentage string */
export const fmtConf = (c) => `${(c * 100).toFixed(1)}%`;

/** Format datetime string to human-readable local time */
export const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

/** Get class config safely */
export const getClassCfg = (cls) =>
  CLASS_CONFIG[cls] ?? CLASS_CONFIG["no_detection"];

/** Whether this class triggers an alert */
export const isAlertClass = (cls) => ["fire", "moderate", "severe"].includes(cls);

/** Return appropriate Tailwind text colour class for a class name */
export const classTextColor = (cls) => getClassCfg(cls).text;

/** Return hex colour for charts */
export const classColor = (cls) => getClassCfg(cls).color;

/** Truncate filename for display */
export const truncate = (str, n = 30) =>
  str && str.length > n ? str.slice(0, n) + "…" : str;

/**
 * Turn /dashboard/timeline rows ({date, class, count}) into one point per day
 * for the last `days` days, zero-filling gaps so charts draw a real trend.
 * Dates are UTC (YYYY-MM-DD) to match the backend's DATE(created_at).
 */
export const buildDailySeries = (rows, days, classes = ["severe", "fire", "moderate"]) => {
  const byDate = {};
  rows.forEach(({ date, class: cls, count }) => {
    byDate[date] = { ...(byDate[date] || {}), [cls]: count };
  });
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    const point = { date: key, label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }) };
    classes.forEach((c) => { point[c] = byDate[key]?.[c] ?? 0; });
    out.push(point);
  }
  return out;
};
