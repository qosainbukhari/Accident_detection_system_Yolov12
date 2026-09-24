import { useEffect, useState } from "react";
import { alertApi } from "../api/alertApi";
import { agentApi } from "../api/agentApi";
import { useAuth } from "../context/AuthContext";
import PageHeader, { EmptyState } from "../components/PageHeader";
import { fmtDate } from "../utils/helpers";
import toast from "react-hot-toast";
import {
  EnvelopeIcon, PhoneIcon, CheckCircleIcon, XCircleIcon, ClockIcon,
  BeakerIcon, InboxIcon, ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

const STATUS_MAP = {
  sent:      { cls: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30", icon: CheckCircleIcon, label: "Sent"      },
  simulated: { cls: "text-sky-300 bg-sky-500/10 border-sky-500/30",             icon: CheckCircleIcon, label: "Simulated" },
  completed: { cls: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30", icon: CheckCircleIcon, label: "Completed" },
  failed:    { cls: "text-red-300 bg-red-500/10 border-red-500/30",             icon: XCircleIcon,     label: "Failed"    },
  skipped:   { cls: "text-slate-300 bg-slate-500/10 border-slate-500/30",       icon: ClockIcon,       label: "Skipped"   },
  pending:   { cls: "text-yellow-300 bg-yellow-500/10 border-yellow-500/30",    icon: ClockIcon,       label: "Pending"   },
  initiated: { cls: "text-sky-300 bg-sky-500/10 border-sky-500/30",             icon: ClockIcon,       label: "Initiated" },
};

const LEVEL_COLOR = { CRITICAL: "text-red-300", HIGH: "text-orange-300", MODERATE: "text-yellow-300", LOW: "text-emerald-300" };

const StatusPill = ({ status }) => {
  const s = STATUS_MAP[status] ?? STATUS_MAP.pending;
  const Icon = s.icon;
  return <span className={`badge ${s.cls}`}><Icon className="w-3.5 h-3.5" />{s.label}</span>;
};

const TABS = [
  { key: "email",    icon: EnvelopeIcon,            label: "Email",    accent: "#f97316" },
  { key: "whatsapp", icon: ChatBubbleLeftRightIcon, label: "WhatsApp", accent: "#22c55e" },
  { key: "calls",    icon: PhoneIcon,               label: "Calls",    accent: "#a78bfa" },
];

export default function AlertsCenter() {
  const { isAdmin }          = useAuth();
  const [tab,     setTab]    = useState("email");
  const [emails,  setEmails] = useState([]);
  const [calls,   setCalls]  = useState([]);
  const [waLogs,  setWaLogs]  = useState([]);
  const [loading, setLoading]= useState(true);
  const [testing, setTesting]= useState(null);

  useEffect(() => {
    Promise.all([alertApi.getAlerts(), alertApi.getCallLogs(), agentApi.getReports(0, 50, true)])
      .then(([e, c, w]) => { setEmails(e.data); setCalls(c.data); setWaLogs(w.data); })
      .finally(() => setLoading(false));
  }, []);

  const triggerTest = async (type) => {
    setTesting(type);
    try {
      if (type === "email") {
        const { data } = await alertApi.testEmail();
        data?.status === "sent" ? toast.success(data.message) : toast(data?.message || "Email test skipped");
      } else if (type === "call") {
        await alertApi.testCall();
        toast.success("Test call logged");
      } else {
        await agentApi.testWhatsApp();
        toast.success("WhatsApp test submitted for delivery");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || `Test ${type} failed`);
    } finally { setTesting(null); }
  };

  const counts = { email: emails.length, calls: calls.length, whatsapp: waLogs.length };
  const list = tab === "email" ? emails : tab === "calls" ? calls : waLogs;

  return (
    <div className="space-y-6 anim-fade-up">
      <PageHeader
        eyebrow="Response"
        title="Alerts center"
        subtitle="Delivery log for every notification channel."
        actions={isAdmin && <>
          <button onClick={() => triggerTest("email")} disabled={!!testing} className="btn-ghost btn-sm">
            <BeakerIcon className="w-4 h-4" /> {testing === "email" ? "Sending…" : "Test email"}
          </button>
          <button onClick={() => triggerTest("WhatsApp")} disabled={!!testing} className="btn-ghost btn-sm">
            <ChatBubbleLeftRightIcon className="w-4 h-4" /> {testing === "WhatsApp" ? "Sending…" : "Test WhatsApp"}
          </button>
          <button onClick={() => triggerTest("call")} disabled={!!testing} className="btn-ghost btn-sm">
            <PhoneIcon className="w-4 h-4" /> {testing === "call" ? "Logging…" : "Test call"}
          </button>
        </>}
      />

      {/* Channel cards double as tabs */}
      <div className="grid sm:grid-cols-3 gap-4">
        {TABS.map(({ key, icon: Icon, label, accent }) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)}
              className="card card-hover text-left flex items-center gap-4"
              style={active ? { borderColor: `${accent}66`, boxShadow: `0 0 0 1px ${accent}40, 0 12px 32px -16px ${accent}` } : undefined}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center border shrink-0"
                   style={{ background: `${accent}14`, borderColor: `${accent}33` }}>
                <Icon className="w-5 h-5" style={{ color: accent }} />
              </div>
              <div>
                <p className="stat-label">{label}</p>
                <p className="text-2xl font-bold text-white num">{loading ? "—" : counts[key]}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="card-header">
          <div>
            <p className="card-title">{TABS.find(t => t.key === tab).label} log</p>
            <p className="card-subtitle">Most recent first</p>
          </div>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10" />)}</div>
        ) : list.length === 0 ? (
          <EmptyState icon={InboxIcon} title={`No ${tab === "calls" ? "call" : tab === "email" ? "email" : "WhatsApp"} logs yet`}
            text="Entries appear here automatically when an incident is detected." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              {tab === "email" && <>
                <thead><tr><th>Incident</th><th>Recipient</th><th>Subject</th><th>Status</th><th className="text-right">Time</th></tr></thead>
                <tbody>{emails.map(item => (
                  <tr key={item.id}>
                    <td className="font-mono text-slate-100">INC-{String(item.detection_id).padStart(4, "0")}</td>
                    <td className="text-slate-300">{item.recipient_email ?? "—"}</td>
                    <td className="text-slate-300 max-w-[320px] truncate">{(item.subject ?? "").replace("[EMERGENCY ALERT] ", "")}</td>
                    <td><StatusPill status={item.status} /></td>
                    <td className="text-right text-slate-400 whitespace-nowrap">{fmtDate(item.created_at)}</td>
                  </tr>
                ))}</tbody>
              </>}
              {tab === "calls" && <>
                <thead><tr><th>Incident</th><th>To</th><th>Message</th><th>Status</th><th className="text-right">Time</th></tr></thead>
                <tbody>{calls.map(item => (
                  <tr key={item.id}>
                    <td className="font-mono text-slate-100">INC-{String(item.detection_id).padStart(4, "0")}</td>
                    <td className="text-slate-300">{item.to_number ?? "—"}</td>
                    <td className="text-slate-400 max-w-[360px] truncate">{item.call_message ?? "—"}</td>
                    <td><StatusPill status={item.call_status} /></td>
                    <td className="text-right text-slate-400 whitespace-nowrap">{fmtDate(item.created_at)}</td>
                  </tr>
                ))}</tbody>
              </>}
              {tab === "whatsapp" && <>
                <thead><tr><th>Incident</th><th>Priority</th><th>Recommended services</th><th>Status</th><th className="text-right">Time</th></tr></thead>
                <tbody>{waLogs.map(item => (
                  <tr key={item.id}>
                    <td className="font-mono text-slate-100">INC-{String(item.detection_id).padStart(4, "0")}</td>
                    <td className={`font-semibold text-xs ${LEVEL_COLOR[item.incident_level] ?? "text-slate-300"}`}>{item.incident_level ?? "—"}</td>
                    <td className="text-slate-300 capitalize">{(item.recommended_services ?? []).join(", ") || "—"}</td>
                    <td><StatusPill status={item.whatsapp_sent ? "sent" : "failed"} /></td>
                    <td className="text-right text-slate-400 whitespace-nowrap">{fmtDate(item.created_at)}</td>
                  </tr>
                ))}</tbody>
              </>}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
