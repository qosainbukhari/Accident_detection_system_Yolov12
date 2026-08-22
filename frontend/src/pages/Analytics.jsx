import { useEffect, useState } from "react";
import { alertApi } from "../api/alertApi";
import { CHART_COLORS, CLASS_CONFIG } from "../utils/constants";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161b27] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-slate-500 mb-1">{label}</p>}
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [stats,    setStats]    = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [confDist, setConfDist] = useState([]);
  const [days,     setDays]     = useState(30);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([alertApi.getStats(), alertApi.getTimeline(days), alertApi.getConfDist()])
      .then(([s, t, c]) => { setStats(s.data); setTimeline(t.data); setConfDist(c.data); })
      .finally(() => setLoading(false));
  }, [days]);

  const timelineMap = {};
  timeline.forEach(({ date, class: cls, count }) => {
    if (!timelineMap[date]) timelineMap[date] = { date };
    timelineMap[date][cls] = count;
  });
  const lineData = Object.values(timelineMap);

  const pieData = stats
    ? Object.entries(CLASS_CONFIG)
        .filter(([k]) => k !== "no_detection")
        .map(([k, v]) => ({ name: v.label, value: stats.class_counts?.[k] ?? 0, color: v.color }))
        .filter(d => d.value > 0)
    : [];

  if (loading) return (
    <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
  );

  return (
    <div className="space-y-5 anim-fade-up">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Detection trends and statistics</p>
        </div>
        <select value={days} onChange={e => setDays(+e.target.value)}
          className="input w-auto text-xs py-1.5 px-3">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total",    val: stats?.total,                color: "#6366f1" },
          { label: "Fire",     val: stats?.class_counts?.fire,   color: CLASS_CONFIG.fire.color    },
          { label: "Moderate", val: stats?.class_counts?.moderate,color:CLASS_CONFIG.moderate.color },
          { label: "Severe",   val: stats?.class_counts?.severe, color: CLASS_CONFIG.severe.color  },
        ].map(({ label, val, color }) => (
          <div key={label} className="card-sm text-center">
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-xl font-bold" style={{ color }}>{val ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid xl:grid-cols-2 gap-4">
        <ChartCard title={`Trend — last ${days} days`}>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                {Object.entries(CHART_COLORS).map(([k,c]) => (
                  <Line key={k} type="monotone" dataKey={k} name={k}
                    stroke={c} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Confidence Distribution">
          {confDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={confDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="range" tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="count" name="Events" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid xl:grid-cols-2 gap-4">
        <ChartCard title="Class Distribution">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((e,i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<Tip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={v => <span className="text-slate-400 text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Alerts vs Calls">
          {stats ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { name:"Email Alerts", value: stats.alerts_sent ?? 0, fill:"#ef4444" },
                { name:"Phone Calls",  value: stats.calls_made  ?? 0, fill:"#8b5cf6" },
                { name:"Total Events", value: stats.total       ?? 0, fill:"#6366f1" },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {[
                    { fill:"#ef4444" }, { fill:"#8b5cf6" }, { fill:"#6366f1" }
                  ].map((e,i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>
      </div>
    </div>
  );
}

const ChartCard = ({ title, children }) => (
  <div className="card">
    <p className="text-sm font-semibold text-slate-300 mb-4">{title}</p>
    {children}
  </div>
);

const Empty = () => (
  <div className="h-[200px] flex items-center justify-center">
    <p className="text-xs text-slate-700">No data yet</p>
  </div>
);
