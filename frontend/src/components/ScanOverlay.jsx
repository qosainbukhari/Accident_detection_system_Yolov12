/** Animated "scanning" overlay shown over media while inference runs. */
export default function ScanOverlay({ label = "Analysing frame…" }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-ink-950/40" />
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div className="absolute inset-x-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-brand-400/25 to-transparent">
        <div className="absolute bottom-1/2 inset-x-0 h-px bg-brand-300 shadow-[0_0_16px_2px_rgba(56,189,248,0.8)]" />
      </div>
      {["top-3 left-3 border-t-2 border-l-2", "top-3 right-3 border-t-2 border-r-2",
        "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map(c => (
        <span key={c} className={`absolute w-6 h-6 border-brand-300 ${c}`} />
      ))}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-ink-950/80 border border-brand-400/30
                      text-xs font-semibold text-brand-200 backdrop-blur">
        {label}
      </div>
    </div>
  );
}
