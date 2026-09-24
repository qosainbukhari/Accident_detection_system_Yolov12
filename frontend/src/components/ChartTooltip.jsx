const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink-800/95 backdrop-blur border border-white/10 rounded-xl px-3.5 py-2.5 text-xs shadow-2xl">
      {label && <p className="text-slate-400 mb-1.5 font-medium">{label}</p>}
      {payload.map(p => (
        <p key={p.name} className="flex items-center gap-2 text-slate-100 font-semibold capitalize">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.color }} />
          {p.name}: <span className="num">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default ChartTooltip;
