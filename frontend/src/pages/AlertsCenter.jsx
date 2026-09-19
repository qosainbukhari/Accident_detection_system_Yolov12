import { useEffect, useState } from "react";
import { alertApi } from "../api/alertApi";
import { agentApi } from "../api/agentApi";
import { useAuth } from "../context/AuthContext";
import { fmtDate } from "../utils/helpers";
import toast from "react-hot-toast";
import {
  BellAlertIcon, PhoneIcon, CheckCircleIcon,
  XCircleIcon, ClockIcon, BeakerIcon,   InboxIcon, ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

const STATUS_MAP = {
  sent:      { cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircleIcon, label: "Sent"      },
  simulated: { cls: "text-sky-400 bg-sky-500/10 border-sky-500/20",             icon: CheckCircleIcon, label: "Simulated" },
  completed: { cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircleIcon, label: "Completed" },
  failed:    { cls: "text-rose-400 bg-rose-500/10 border-rose-500/20",          icon: XCircleIcon,     label: "Failed"    },
  pending:   { cls: "text-amber-400 bg-amber-500/10 border-amber-500/20",       icon: ClockIcon,       label: "Pending"   },
  initiated: { cls: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",    icon: ClockIcon,       label: "Initiated" },
};

const StatusPill = ({ status }) => {
  const s = STATUS_MAP[status] ?? STATUS_MAP.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
                      font-semibold border ${s.cls}`}>
      <Icon className="w-3 h-3" />{s.label}
    </span>
  );
};

export default function AlertsCenter() {
  const { isAdmin }          = useAuth();
  const [tab,     setTab]    = useState("email");
  const [emails,  setEmails] = useState([]);
  const [calls,   setCalls]  = useState([]);
  const [waLogs,  setWaLogs]  = useState([]);
  const [loading, setLoading]= useState(true);
  const [testing, setTesting]= useState(false);

  useEffect(() => {
    Promise.all([alertApi.getAlerts(), alertApi.getCallLogs(), agentApi.getReports(0, 50, true)])
      .then(([e, c, w]) => { setEmails(e.data); setCalls(c.data); setWaLogs(w.data); })
      .finally(() => setLoading(false));
  }, []);

  const triggerTest = async (type) => {
    setTesting(true);
    try {
      if (type === "email") await alertApi.testEmail();
      else if (type === "call") await alertApi.testCall();
      else await agentApi.testWhatsApp();
      toast.success(`Test ${type} dispatched!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || `Test ${type} failed`);
    } finally { setTesting(false); }
  };

  const list = tab === "email" ? emails : tab === "calls" ? calls : waLogs;

  const cols = tab === "email"
    ? ["ID", "Event #", "Recipient", "Subject", "Status", "Time"]
    : tab === "calls"
      ? ["ID", "Event #", "To", "SID", "Status", "Time"]
      : ["ID", "Event #", "Level", "Services", "Status", "Time"];

  const row = (item) => tab === "email"
    ? [
        `#${item.id}`,
        `#${item.detection_id}`,
        item.recipient_email ?? "—",
        (item.subject ?? "").replace("[EMERGENCY ALERT] ", "").slice(0, 40) + "…",
        item.status,
        fmtDate(item.created_at),
      ]
    : tab === "calls" ? [
        `#${item.id}`,
        `#${item.detection_id}`,
        item.to_number ?? "—",
        item.twilio_call_sid ? `${item.twilio_call_sid.slice(0, 16)}…` : "—",
        item.call_status,
        fmtDate(item.created_at),
      ] : [
        `#${item.id}`,
        `#${item.detection_id}`,
        item.incident_level ?? "—",
        (item.recommended_services ?? []).join(", ") || "—",
        item.whatsapp_sent ? "sent" : "failed",
        fmtDate(item.created_at),
      ];

  return (
    <div className="space-y-5 anim-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Alerts Center</h1>
        <p className="page-subtitle">Email and emergency call logs</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => triggerTest("email")} disabled={testing}
              className="btn btn-ghost text-xs">
              <BeakerIcon className="w-4 h-4" /> Test Email
            </button>
            <button onClick={() => triggerTest("call")} disabled={testing}
              className="btn btn-ghost text-xs">
              <BeakerIcon className="w-4 h-4" /> Test Call
            </button>
            <button onClick={() => triggerTest("WhatsApp")} disabled={testing}
              className="btn btn-ghost text-xs">
              <ChatBubbleLeftRightIcon className="w-4 h-4" /> Test WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#161b27] border border-white/[0.06] rounded-xl p-1 w-fit">
        {[
          { key: "email", icon: BellAlertIcon, label: "Email Alerts", count: emails.length },
          { key: "calls", icon: PhoneIcon,     label: "Call Logs",    count: calls.length  },
          { key: "whatsapp", icon: ChatBubbleLeftRightIcon, label: "WhatsApp", count: waLogs.length },
        ].map(({ key, icon: Icon, label, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${tab === key
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
                : "text-slate-500 hover:text-slate-300"
              }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            <span className="bg-white/[0.06] px-1.5 py-0.5 rounded-full text-[10px]">{count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="spinner" /></div>
      ) : list.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3">
          <InboxIcon className="w-8 h-8 text-slate-700" />
          <p className="text-slate-500 text-sm">No {tab === "email" ? "email alerts" : tab === "calls" ? "call logs" : "WhatsApp logs"} yet</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden overflow-x-auto">
          <table className="tbl">
            <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {list.map((item) => {
                const cells = row(item);
                return (
                  <tr key={item.id}>
                    {cells.map((c, j) => (
                      <td key={j}>
                        {j === 4
                          ? <StatusPill status={c} />
                          : <span className="text-slate-400">{c}</span>
                        }
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
