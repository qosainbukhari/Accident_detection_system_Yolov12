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
