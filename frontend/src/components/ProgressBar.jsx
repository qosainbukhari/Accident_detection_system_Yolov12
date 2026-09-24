export default function ProgressBar({ progress = 0, label = "Processing…" }) {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center gap-4 text-sm">
        <span className="text-slate-300 font-medium truncate">{label}</span>
        <span className="text-brand-300 font-mono font-semibold num">{progress}%</span>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400
                     transition-[width] duration-500 ease-out overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
