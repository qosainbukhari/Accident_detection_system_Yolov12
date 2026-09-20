import { useState } from "react";
import { detectionApi } from "../api/detectionApi";
import { pollAgentReport } from "../api/agentApi";
import AgentReportCard from "../components/AgentReportCard";
import DropZone from "../components/DropZone";
import SeverityBadge from "../components/SeverityBadge";
import { showEmergencyToast } from "../components/AlertToast";
import toast from "react-hot-toast";
import { API_BASE } from "../utils/constants";
import { fmtConf } from "../utils/helpers";
import { ArrowDownTrayIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const ACCEPT = { "image/*": [".jpg", ".jpeg", ".png", ".webp"] };

export default function ImageDetect() {
  const [file,    setFile]    = useState(null);
  const [preview, setPreview] = useState(null);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);

  const onFile = (f) => { setFile(f); setPreview(URL.createObjectURL(f)); setResult(null); setReport(null); setAgentLoading(false); };
  const reset  = ()  => { setFile(null); setPreview(null); setResult(null); setReport(null); setAgentLoading(false); };

  const detect = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const { data } = await detectionApi.detectImage(file);
      setResult(data);
      if (data.agent_pending && data.event_id) {
        setAgentLoading(true);
        pollAgentReport(data.event_id)
          .then(r => { setReport(r); if (r?.whatsapp_sent) toast.success("WhatsApp alert submitted for delivery"); })
          .catch(() => toast.error("AI emergency report could not be loaded"))
          .finally(() => setAgentLoading(false));
      }
      data.alert_triggered
        ? showEmergencyToast(data.detected_class, data.confidence)
        : toast.success("Detection complete");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Detection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 anim-fade-up max-w-4xl">
      <div>
        <h1 className="page-title">Image Detection</h1>
        <p className="page-subtitle">Upload an image to run YOLOv12 accident analysis</p>
      </div>

      {!preview ? (
        <div className="card p-0 overflow-hidden">
          <DropZone onFile={onFile} accept={ACCEPT}
            label="Drop an accident image here"
            sublabel="or click to browse · JPG, PNG, WEBP" />
        </div>
      ) : (
        <div className="space-y-4">

          {/* Image row */}
          <div className={`grid gap-4 ${result ? "md:grid-cols-2" : ""}`}>
            <ImgPanel label="Original" src={preview} />
            {result && (
              <ImgPanel label="Annotated" src={`${API_BASE}${result.processed_url}`} highlight />
            )}
          </div>

          {/* Action */}
          {!result && (
            <div className="flex gap-3">
              <button onClick={detect} disabled={loading} className="btn-primary flex-1 py-2.5">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analysing…</>
                  : "Run Detection"
                }
              </button>
              <button onClick={reset} className="btn-ghost px-3">
                <ArrowPathIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3 anim-fade-up">

              {/* Top bar */}
              <div className="card flex items-center justify-between flex-wrap gap-3 py-4">
                <div className="flex items-center gap-3">
                  <SeverityBadge cls={result.detected_class} confidence={result.confidence}
                    size="lg" pulse={result.alert_triggered} />
                  <span className="text-xs text-slate-600">{result.processing_ms}ms</span>
                </div>
                {result.alert_triggered && (
                  <span className="text-xs font-semibold text-rose-400 bg-rose-500/10
                                   border border-rose-500/20 px-3 py-1 rounded-full">
                    🚨 Emergency Dispatched
                  </span>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Objects",    result.bounding_boxes?.length ?? 0],
                  ["Confidence", fmtConf(result.confidence)],
                  ["Alert",      result.alert_triggered ? "Sent ✓" : "None"],
                ].map(([k, v]) => (
                  <div key={k} className="card-sm text-center">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">{k}</p>
                    <p className="text-sm font-bold text-slate-200">{v}</p>
                  </div>
                ))}
              </div>

              {/* Bbox table */}
              <AgentReportCard report={report} loading={agentLoading} />
              {result.bounding_boxes?.length > 0 && (
                <div className="card p-0 overflow-hidden">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>#</th><th>Class</th><th>Confidence</th><th>Bounding Box</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.bounding_boxes.map((b, i) => (
                        <tr key={i}>
                          <td className="text-slate-600">{i + 1}</td>
                          <td><SeverityBadge cls={b.class} size="xs" /></td>
                          <td className="font-mono">{fmtConf(b.confidence)}</td>
                          <td className="font-mono text-slate-600 text-[11px]">
                            [{b.x1},{b.y1}]→[{b.x2},{b.y2}]
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <a href={`${API_BASE}${result.processed_url}`} download
                   className="btn btn-ghost text-xs">
                  <ArrowDownTrayIcon className="w-4 h-4" /> Download Annotated
                </a>
                <button onClick={reset} className="btn btn-ghost text-xs">
                  <ArrowPathIcon className="w-4 h-4" /> New Image
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ImgPanel({ label, src, highlight }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">{label}</p>
      <div className={`rounded-xl overflow-hidden border
        ${highlight ? "border-indigo-500/30" : "border-white/[0.06]"}`}>
        <img src={src} alt={label} className="w-full object-contain max-h-72 bg-[#0f1117]" />
      </div>
    </div>
  );
}
