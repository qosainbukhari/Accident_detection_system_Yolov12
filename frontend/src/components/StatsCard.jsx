export default function StatsCard({ label, value, icon: Icon, accent = "#6366f1", sub }) {
  return (
    <div className="card flex items-center gap-4 hover:border-white/10 transition-all duration-200">
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: accent + "18" }}
      >
        {Icon && <Icon className="w-5 h-5" style={{ color: accent }} />}
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="text-[12px] text-slate-500 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-white leading-tight mt-0.5">
          {value ?? <span className="text-slate-600">—</span>}
        </p>
        {sub && <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
