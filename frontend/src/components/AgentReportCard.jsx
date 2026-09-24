import { agentApi } from "../api/agentApi";
import toast from "react-hot-toast";
import {
  SparklesIcon, ArrowDownTrayIcon, CheckCircleIcon, ShieldExclamationIcon,
  TruckIcon, BoltIcon,
} from "@heroicons/react/24/outline";

const LEVEL_STYLES = {
  CRITICAL: { cls: "text-red-300 border-red-500/40 bg-red-500/10",          bar: "#ef4444" },
  HIGH:     { cls: "text-orange-300 border-orange-500/40 bg-orange-500/10", bar: "#f97316" },
  MODERATE: { cls: "text-yellow-300 border-yellow-500/40 bg-yellow-500/10", bar: "#eab308" },
  LOW:      { cls: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10", bar: "#10b981" },
  PENDING:  { cls: "text-violet-300 border-violet-500/40 bg-violet-500/10", bar: "#8b5cf6" },
};

export default function AgentReportCard({ report, loading }) {
  if (loading) {
    return (
      <div className="card relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-violet-300 animate-pulse" />
          </div>
          <div>
            <p className="card-title">AI emergency assessment</p>
            <p className="card-subtitle">Analysing the incident and preparing a response plan…</p>
          </div>
        </div>
        <div className="mt-5 space-y-2.5">
          <div className="skeleton h-3 w-11/12" />
          <div className="skeleton h-3 w-9/12" />
          <div className="skeleton h-3 w-10/12" />
        </div>
      </div>
    );
  }
  if (!report) return null;

  const level = report.incident_level || "UNKNOWN";
  const style = LEVEL_STYLES[level] ?? { cls: "text-slate-300 border-white/10", bar: "#64748b" };

  const downloadPdf = async () => {
    try {
      const response = await agentApi.downloadReport(report.detection_id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `incident-${report.detection_id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("The incident PDF is not ready yet");
    }
  };

  return (
    <div className="card p-0 overflow-hidden anim-fade-up">
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${style.bar}, transparent)` }} />
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <p className="card-title">AI emergency assessment</p>
            <p className="card-subtitle">
              {report.model_used === "rule-based-fallback" ? "Rule-based assessment" : report.model_used || "Automated triage"}
            </p>
          </div>
        </div>
        <span className={`badge ${style.cls}`}>
          <ShieldExclamationIcon className="w-3.5 h-3.5" /> {level}
        </span>
      </div>

      <div className="p-5 space-y-5">
        <p className="text-sm leading-relaxed text-slate-200">{report.situation_summary}</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <ReportList icon={TruckIcon} label="Recommended services" items={report.recommended_services} />
          <ReportList icon={BoltIcon} label="Immediate actions" items={report.immediate_actions} numbered />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/[0.06]">
          <div className="flex flex-wrap gap-2">
            <span className="badge border-white/10 bg-white/[0.03] text-slate-300">
              Casualty risk: <span className="capitalize text-white">{report.casualty_risk || "unknown"}</span>
            </span>
            {report.whatsapp_sent && (
              <span className="badge border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                <CheckCircleIcon className="w-3.5 h-3.5" /> WhatsApp dispatched
              </span>
            )}
          </div>
          {report.report_path && (
            <button onClick={downloadPdf} className="btn-ghost btn-sm">
              <ArrowDownTrayIcon className="w-4 h-4" /> Incident PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportList({ icon: Icon, label, items = [], numbered }) {
  const values = Array.isArray(items) ? items : [];
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
      <p className="flex items-center gap-2 stat-label mb-3">
        <Icon className="w-4 h-4 text-slate-400" /> {label}
      </p>
      <ul className="space-y-2">
        {values.map((item, index) => (
          <li key={`${String(item)}-${index}`} className="flex gap-2.5 text-sm text-slate-200">
            <span className="shrink-0 w-5 h-5 rounded-md bg-white/[0.05] text-[10px] font-bold text-slate-400
                             flex items-center justify-center mt-px">
              {numbered ? index + 1 : "•"}
            </span>
            <span>{item}</span>
          </li>
        ))}
        {values.length === 0 && <li className="text-sm text-slate-500">Not specified</li>}
      </ul>
    </div>
  );
}
