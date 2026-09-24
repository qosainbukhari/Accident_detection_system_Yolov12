import { useEffect, useRef, useState } from "react";

/** Counts up to `value` once, for a livelier first paint of KPIs. */
function useCountUp(value, duration = 700) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (typeof value !== "number" || Number.isNaN(value)) return undefined;
    const start = performance.now();
    const initial = from.current;
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(initial + (value - initial) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return shown;
}

export default function StatsCard({ label, value, icon: Icon, accent = "#38bdf8", sub, suffix = "", decimals = 0 }) {
  const animated = useCountUp(typeof value === "number" ? value : NaN);
  const display = typeof value === "number" ? animated.toFixed(decimals) : null;

  return (
    <div className="card card-hover relative overflow-hidden group">
      {/* Accent glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-20
                      group-hover:opacity-35 transition-opacity"
           style={{ background: accent }} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="stat-label leading-snug">{label}</p>
          <p className="text-3xl font-bold text-white mt-2 num tracking-tight">
            {display ?? <span className="text-slate-600">—</span>}
            {display !== null && suffix && <span className="text-lg text-slate-400 ml-0.5">{suffix}</span>}
          </p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
               style={{ background: `${accent}14`, borderColor: `${accent}33` }}>
            <Icon className="w-5 h-5" style={{ color: accent }} />
          </div>
        )}
      </div>
    </div>
  );
}
