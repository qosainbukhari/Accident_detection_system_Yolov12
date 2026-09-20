const LEVEL_STYLES = {
  CRITICAL: "text-rose-300 border-rose-500/30 bg-rose-500/10",
  HIGH: "text-orange-300 border-orange-500/30 bg-orange-500/10",
  MODERATE: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  LOW: "text-emerald-300 border-emerald-500/10 border-emerald-500/30",
  PENDING: "text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/10",
};

export default function AgentReportCard({ report, loading }) {
  if (loading) {
    return <div className="card text-xs text-slate-500 animate-pulse">AI emergency assessment in progress…</div>;
  }
  if (!report) return null;
  const level = report.incident_level || "UNKNOWN";
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
    <div className="card border-fuchsia-500/20 bg-fuchsia-500/[0.03] space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-fuchsia-200">AI Emergency Assessment</p>
        <span className={`px-2 py-1 rounded-full border text-[10px] font-bold ${LEVEL_STYLES[level] || "text-slate-300 border-white/10"}`}>
          {level}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-slate-300">{report.situation_summary}</p>
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <ReportList label="Recommended services" items={report.recommended_services} />
        <ReportList label="Immediate actions" items={report.immediate_actions} />
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
        <span>Casualty risk: {report.casualty_risk || "unknown"}</span>
        {report.whatsapp_sent && <span className="text-emerald-400">WhatsApp submitted for delivery</span>}
      </div>
      {report.report_path && (
        <button onClick={downloadPdf} className="btn btn-ghost text-xs w-fit">
          Download incident PDF
        </button>
      )}
    </div>
  );
}

function ReportList({ label, items = [] }) {
  const values = Array.isArray(items) ? items : [];
  return (
    <div>
      <p className="text-slate-500 mb-1">{label}</p>
      <ul className="list-disc list-inside text-slate-300 space-y-0.5">
        {values.map((item, index) => <li key={`${String(item)}-${index}`}>{item}</li>)}
      </ul>
    </div>
  );
}
import { agentApi } from "../api/agentApi";
import toast from "react-hot-toast";
