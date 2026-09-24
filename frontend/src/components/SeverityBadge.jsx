import { CLASS_CONFIG } from "../utils/constants";

export default function SeverityBadge({ cls, confidence, size = "md", pulse = false }) {
  const cfg = CLASS_CONFIG[cls] ?? CLASS_CONFIG.no_detection;
  const alerting = pulse && cls in CLASS_CONFIG && cls !== "no_detection";

  const sizes = {
    xs: "text-[10px] px-2 py-0.5 gap-1",
    sm: "text-[11px] px-2 py-0.5 gap-1.5",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3.5 py-1.5 gap-2",
  };

  return (
    <span className={`inline-flex items-center rounded-full font-semibold border backdrop-blur-sm
                      ${cfg.badge} ${sizes[size] ?? sizes.md}`}>
      <span className="relative flex w-1.5 h-1.5 shrink-0">
        {alerting && <span className={`absolute inset-0 rounded-full ${cfg.dot} animate-ping2`} />}
        <span className={`relative w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      </span>
      {cfg.label}
      {confidence !== undefined && confidence !== null && (
        <span className="opacity-70 font-medium num">{(confidence * 100).toFixed(1)}%</span>
      )}
    </span>
  );
}
