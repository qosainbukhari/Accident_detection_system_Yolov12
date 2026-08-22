import { useEffect, useState } from "react";
import { alertApi } from "../api/alertApi";
import StatsCard from "../components/StatsCard";
import SeverityBadge from "../components/SeverityBadge";
import { fmtDate } from "../utils/helpers";
import { CHART_COLORS, CLASS_CONFIG } from "../utils/constants";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  EyeIcon, BellAlertIcon, PhoneIcon, CalendarDaysIcon,
} from "@heroicons/react/24/outline";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161b27] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [stats,    setStats]    = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([alertApi.getStats(), alertApi.getTimeline(7)])
      .then(([s, t]) => { setStats(s.data); setTimeline(t.data); })
      .finally(() => setLoading(false));
  }, []);

  // Timeline map
  const timelineMap = {};
  timeline.forEach(({ date, class: cls, count }) => {
    if (!timelineMap[date]) timelineMap[date] = { date };
    timelineMap[date][cls] = count;
  });
  const areaData = Object.values(timelineMap).slice(-7);

  // Pie data
  const pieData = stats
    ? Object.entries(CLASS_CONFIG)
        .filter(([k]) => k !== "no_detection")
        .map(([k, v]) => ({ name: v.label, value: stats.class_counts?.[k] ?? 0, color: v.color }))
        .filter(d => d.value > 0)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-5 anim-fade-up">

      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">System overview and detection analytics</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatsCard label="Total Detections" value={stats?.total}       icon={EyeIcon}          accent="#6366f1" />
        <StatsCard label="Today"            value={stats?.today}       icon={CalendarDaysIcon}  accent="#10b981" />
        <StatsCard label="Email Alerts"     value={stats?.alerts_sent} icon={BellAlertIcon}     accent="#ef4444" />
        <StatsCard label="Emergency Calls"  value={stats?.calls_made}  icon={PhoneIcon}         accent="#8b5cf6" />
      </div>

      {/* Confidence bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Avg Detection Confidence</p>
          <span className="text-lg font-bold text-white">{stats?.avg_confidence ?? 0}%</span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
               style={{ width: `${stats?.avg_confidence ?? 0}%` }} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid xl:grid-cols-5 gap-4">

        {/* Area — 3/5 */}
        <div className="card xl:col-span-3">
          <p className="text-sm font-semibold text-slate-200 mb-4">Detections — Last 7 Days</p>
          {areaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={areaData}>
                <defs>
                  {Object.entries(CHART_COLORS).map(([k, c]) => (
                    <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={c} stopOpacity={0}    />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {Object.entries(CHART_COLORS).map(([k, c]) => (
                  <Area key={k} type="monotone" dataKey={k} name={k}
                    stroke={c} strokeWidth={2}
                    fill={`url(#g-${k})`} dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Run some detections to see trends" />
          )}
        </div>

        {/* Pie — 2/5 */}
        <div className="card xl:col-span-2 flex flex-col">
          <p className="text-sm font-semibold text-slate-200 mb-4">Class Distribution</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%"
                    innerRadius={48} outerRadius={72}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, "Events"]}
                    contentStyle={{ background: "#161b27", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-slate-400">{d.name}</span>
                    </div>
                    <span className="text-slate-300 font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState text="No detections yet" />
          )}
        </div>
      </div>

      {/* Recent events */}
      {stats?.recent_events?.length > 0 && (
        <div className="card">
          <p className="text-sm font-semibold text-slate-200 mb-3">Recent Detections</p>
          <div className="divide-y divide-white/[0.04]">
            {stats.recent_events.map(ev => (
              <div key={ev.id} className="flex items-center justify-between py-2.5 gap-3">
                <SeverityBadge cls={ev.detected_class} confidence={ev.confidence} size="sm" />
                <span className="text-xs text-slate-600 capitalize flex-1">{ev.media_type}</span>
                <span className="text-[11px] text-slate-600">{fmtDate(ev.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex-1 flex items-center justify-center py-10">
      <p className="text-xs text-slate-600">{text}</p>
    </div>
  );
}
