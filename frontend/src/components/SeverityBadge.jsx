import { CLASS_CONFIG } from "../utils/constants";

export default function SeverityBadge({ cls, confidence, size = "md", pulse = false }) {
  const cfg = CLASS_CONFIG[cls] ?? CLASS_CONFIG.no_detection;

  const sizes = {
    xs: "text-[10px] px-1.5 py-0.5 gap-1",
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold
        ${cfg.badge} ${sizes[size] ?? sizes.md}
        ${pulse && ["fire", "moderate", "severe"].includes(cls) ? "animate-pulse" : ""}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
      {cfg.label}
      {confidence !== undefined && (
        <span className="opacity-60 font-normal">
          {(confidence * 100).toFixed(1)}%
        </span>
      )}
    </span>
  );
}
