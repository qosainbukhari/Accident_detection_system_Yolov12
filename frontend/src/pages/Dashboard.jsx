import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { alertApi } from "../api/alertApi";
import { useAuth } from "../context/AuthContext";
import StatsCard from "../components/StatsCard";
import SeverityBadge from "../components/SeverityBadge";
import PageHeader, { EmptyState } from "../components/PageHeader";
import ChartTooltip from "../components/ChartTooltip";
import { buildDailySeries, fmtDate } from "../utils/helpers";
import { CHART_AXIS, CHART_COLORS, CHART_GRID, CLASS_CONFIG } from "../utils/constants";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  ShieldExclamationIcon, EnvelopeIcon, CalendarDaysIcon, SparklesIcon,
  ChatBubbleLeftRightIcon, ViewfinderCircleIcon, PhotoIcon, VideoCameraIcon,
  ArrowRightIcon, ChartPieIcon, ArrowTrendingUpIcon, InboxIcon,
} from "@heroicons/react/24/outline";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats,    setStats]    = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([alertApi.getStats(), alertApi.getTimeline(7)])
      .then(([s, t]) => { setStats(s.data); setTimeline(t.data); })
      .finally(() => setLoading(false));
  }, []);

  const areaData = buildDailySeries(timeline, 7);

  const pieData = stats
    ? Object.entries(CLASS_CONFIG)
        .filter(([k]) => k !== "no_detection")
        .map(([k, v]) => ({ key: k, name: v.label, value: stats.class_counts?.[k] ?? 0, color: v.color }))
    : [];
  const pieTotal = pieData.reduce((sum, d) => sum + d.value, 0);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 anim-fade-up">
      <PageHeader
        eyebrow="Command centre"
        title={`${greeting()}, ${user?.username ?? "operator"}`}
        subtitle="Live overview of detections, alerts and AI emergency assessments."
        actions={<>
          <Link to="/detect/video" className="btn-ghost btn-sm"><VideoCameraIcon className="w-4 h-4" /> Analyse video</Link>
          <Link to="/detect/image" className="btn-primary btn-sm"><PhotoIcon className="w-4 h-4" /> Analyse image</Link>
        </>}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 stagger">
        <StatsCard label="Total detections" value={stats?.total}         icon={ViewfinderCircleIcon}    accent="#38bdf8" />
        <StatsCard label="Today"            value={stats?.today}         icon={CalendarDaysIcon}        accent="#a78bfa" />
        <StatsCard label="Avg confidence"   value={stats?.avg_confidence} icon={ArrowTrendingUpIcon}    accent="#34d399" suffix="%" decimals={1} />
        <StatsCard label="Email alerts"     value={stats?.alerts_sent}   icon={EnvelopeIcon}            accent="#f97316" />
        <StatsCard label="AI reports"       value={stats?.ai_reports}    icon={SparklesIcon}            accent="#c084fc" />
        <StatsCard label="WhatsApp sent"    value={stats?.whatsapp_sent} icon={ChatBubbleLeftRightIcon} accent="#22c55e" />
      </div>

      {/* Charts */}
      <div className="grid xl:grid-cols-3 gap-4">
        <div className="card xl:col-span-2 p-0">
          <div className="card-header">
            <div>
              <p className="card-title">Detection activity</p>
              <p className="card-subtitle">Incidents per class over the last 7 days</p>
            </div>
            <Legend />
          </div>
          <div className="p-5 pt-4">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={areaData} margin={{ left: -18, right: 20, top: 8 }}>
                  <defs>
                    {Object.entries(CHART_COLORS).map(([k, c]) => (
                      <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={c} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={c} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="label" tick={CHART_AXIS} axisLine={false} tickLine={false} dy={8} />
                  <YAxis allowDecimals={false} tick={CHART_AXIS} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(148,163,184,0.25)" }} />
                  {Object.entries(CHART_COLORS).map(([k, c]) => (
                    <Area key={k} type="monotone" dataKey={k} name={k} stroke={c} strokeWidth={2.5}
                      fill={`url(#g-${k})`} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={ArrowTrendingUpIcon} title="No activity yet" text="Run a detection to start building the trend." />
            )}
          </div>
        </div>

        <div className="card p-0 flex flex-col">
          <div className="card-header">
            <div>
              <p className="card-title">Class distribution</p>
              <p className="card-subtitle">All-time share by severity</p>
            </div>
          </div>
          {pieTotal > 0 ? (
            <div className="p-5 flex-1 flex flex-col">
              <div className="relative">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={pieData.filter(d => d.value > 0)} cx="50%" cy="50%"
                      innerRadius={62} outerRadius={86} paddingAngle={3} dataKey="value"
                      stroke="none" cornerRadius={4}>
                      {pieData.filter(d => d.value > 0).map(e => <Cell key={e.key} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-bold text-white num">{pieTotal}</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">incidents</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {pieData.map(d => {
                  const pct = pieTotal ? Math.round((d.value / pieTotal) * 100) : 0;
                  return (
                    <div key={d.key}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="flex items-center gap-2 text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />{d.name}
                        </span>
                        <span className="text-slate-100 font-semibold num">{d.value}
                          <span className="text-slate-500 font-normal ml-1.5">{pct}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: d.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState icon={ChartPieIcon} title="No detections yet" />
          )}
        </div>
      </div>

      {/* Recent events */}
      <div className="card p-0 overflow-hidden">
        <div className="card-header">
          <div>
            <p className="card-title">Recent incidents</p>
            <p className="card-subtitle">Latest detections across images and video</p>
          </div>
          <Link to="/history" className="text-xs font-semibold text-brand-300 hover:text-brand-200 flex items-center gap-1">
            View all <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
        {stats?.recent_events?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Incident</th><th>Classification</th><th>Source</th><th>Priority</th><th>Email alert</th><th className="text-right">Detected</th></tr></thead>
              <tbody>
                {stats.recent_events.map(ev => {
                  const cfg = CLASS_CONFIG[ev.detected_class] ?? CLASS_CONFIG.no_detection;
                  return (
                    <tr key={ev.id}>
                      <td className="font-mono text-slate-100 font-medium">INC-{String(ev.id).padStart(4, "0")}</td>
                      <td><SeverityBadge cls={ev.detected_class} confidence={ev.confidence} size="sm" /></td>
                      <td className="capitalize text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          {ev.media_type === "video" ? <VideoCameraIcon className="w-4 h-4 text-slate-500" /> : <PhotoIcon className="w-4 h-4 text-slate-500" />}
                          {ev.media_type}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-semibold" style={{ color: cfg.text }}>{cfg.severity}</span>
                      </td>
                      <td>
                        {ev.alert_sent
                          ? <span className="badge border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Sent</span>
                          : <span className="text-slate-500 text-xs">—</span>}
                      </td>
                      <td className="text-right text-slate-400 whitespace-nowrap">{fmtDate(ev.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={InboxIcon} title="No incidents recorded"
            text="Upload an image or video to run the YOLO model and see results here."
            action={<Link to="/detect/image" className="btn-primary btn-sm"><ShieldExclamationIcon className="w-4 h-4" /> Run first detection</Link>} />
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="hidden sm:flex items-center gap-4">
      {Object.entries(CHART_COLORS).map(([k, c]) => (
        <span key={k} className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
          {CLASS_CONFIG[k].label}
        </span>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-7 w-72" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-[108px] rounded-2xl" />)}
      </div>
      <div className="grid xl:grid-cols-3 gap-4">
        <div className="skeleton h-[340px] rounded-2xl xl:col-span-2" />
        <div className="skeleton h-[340px] rounded-2xl" />
      </div>
    </div>
  );
}
