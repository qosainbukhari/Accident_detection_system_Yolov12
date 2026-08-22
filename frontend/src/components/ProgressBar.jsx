export default function ProgressBar({ progress = 0, label = "Processing…", color = "#6366f1" }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="text-slate-500 font-mono">{progress}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%`, background: color }}
        />
      </div>
    </div>
  );
}
