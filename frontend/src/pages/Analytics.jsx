import { useEffect, useState } from "react";
import { alertApi } from "../api/alertApi";
import PageHeader, { EmptyState } from "../components/PageHeader";
import ChartTooltip from "../components/ChartTooltip";
import { buildDailySeries } from "../utils/helpers";
import { CHART_AXIS, CHART_COLORS, CHART_GRID, CLASS_CONFIG } from "../utils/constants";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { ChartBarIcon } from "@heroicons/react/24/outline";

const RANGES = [7, 14, 30, 90];

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

  const lineData = buildDailySeries(timeline, days);

  const pieData = stats
    ? Object.entries(CLASS_CONFIG)
        .filter(([k]) => k !== "no_detection")
        .map(([k, v]) => ({ key: k, name: v.label, value: stats.class_counts?.[k] ?? 0, color: v.color }))
        .filter(d => d.value > 0)
    : [];
  const hasConf = confDist.some(d => d.count > 0);

  const summary = [
    { label: "Total incidents", val: stats?.total,                   color: "#38bdf8" },
    { label: "Severe",          val: stats?.class_counts?.severe,    color: CLASS_CONFIG.severe.color },
    { label: "Fire",            val: stats?.class_counts?.fire,      color: CLASS_CONFIG.fire.color },
    { label: "Moderate",        val: stats?.class_counts?.moderate,  color: CLASS_CONFIG.moderate.color },
  ];

  return (
    <div className="space-y-6 anim-fade-up">
      <PageHeader
        eyebrow="Overview"
        title="Analytics"
        subtitle="Detection trends, model confidence and alert delivery."
        actions={
          <div className="segmented">
            {RANGES.map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`segmented-item ${days === d ? "segmented-item-active" : ""}`}>{d}d</button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        {summary.map(({ label, val, color }) => (
          <div key={label} className="card card-hover relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />
            <p className="stat-label">{label}</p>
            <p className="text-3xl font-bold text-white mt-2 num">{loading ? "—" : (val ?? 0)}</p>
          </div>
        ))}
      </div>

      <div className={`grid xl:grid-cols-2 gap-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
        <ChartCard title="Incident trend" subtitle={`Daily detections per class · last ${days} days`}>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={lineData} margin={{ left: -18, right: 20, top: 8 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="label" tick={CHART_AXIS} axisLine={false} tickLine={false} dy={8} />
                <YAxis allowDecimals={false} tick={CHART_AXIS} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(148,163,184,0.25)" }} />
                {Object.entries(CHART_COLORS).map(([k, c]) => (
                  <Line key={k} type="monotone" dataKey={k} name={k} stroke={c} strokeWidth={2.5}
                    dot={days <= 14 ? { r: 3, strokeWidth: 0, fill: c } : false} activeDot={{ r: 6, strokeWidth: 0 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Confidence distribution" subtitle="How certain the model was across all incidents">
          {hasConf ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={confDist} margin={{ left: -18, right: 20, top: 8 }}>
                <defs>
                  <linearGradient id="conf-bar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="range" tick={{ ...CHART_AXIS, fontSize: 10 }} axisLine={false} tickLine={false} dy={8} />
                <YAxis allowDecimals={false} tick={CHART_AXIS} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
                <Bar dataKey="count" name="Incidents" fill="url(#conf-bar)" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Class distribution" subtitle="Share of incidents by severity">
          {pieData.length > 0 ? (
            <div className="grid sm:grid-cols-2 items-center gap-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                    paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
                    {pieData.map(e => <Cell key={e.key} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {pieData.map(d => (
                  <div key={d.key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="flex items-center gap-2.5 text-sm text-slate-200">
                      <span className="w-3 h-3 rounded" style={{ background: d.color }} />{d.name}
                    </span>
                    <span className="text-lg font-bold text-white num">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Alert delivery" subtitle="Notifications compared with total incidents">
          {stats ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart layout="vertical" margin={{ left: 10, right: 24 }}
                data={[
                  { name: "Incidents",   value: stats.total ?? 0,         fill: "#38bdf8" },
                  { name: "Email",       value: stats.alerts_sent ?? 0,   fill: "#f97316" },
                  { name: "WhatsApp",    value: stats.whatsapp_sent ?? 0, fill: "#22c55e" },
                  { name: "AI reports",  value: stats.ai_reports ?? 0,    fill: "#c084fc" },
                  { name: "Calls",       value: stats.calls_made ?? 0,    fill: "#a78bfa" },
                ]}>
                <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={CHART_AXIS} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ ...CHART_AXIS, fill: "#cbd5e1" }} axisLine={false} tickLine={false} width={84} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
                <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]} maxBarSize={26}>
                  {["#38bdf8", "#f97316", "#22c55e", "#c084fc", "#a78bfa"].map(c => <Cell key={c} fill={c} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>
      </div>
    </div>
  );
}

const ChartCard = ({ title, subtitle, children }) => (
  <div className="card p-0">
    <div className="card-header">
      <div>
        <p className="card-title">{title}</p>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Empty = () => (
  <EmptyState icon={ChartBarIcon} title="No data yet" text="Charts fill in as detections are recorded." className="h-[260px] py-0" />
);
