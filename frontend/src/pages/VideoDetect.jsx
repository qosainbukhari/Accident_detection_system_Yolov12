import { useState } from "react";
import { detectionApi } from "../api/detectionApi";
import { pollAgentReport } from "../api/agentApi";
import AgentReportCard from "../components/AgentReportCard";
import DropZone from "../components/DropZone";
import SeverityBadge from "../components/SeverityBadge";
import ProgressBar from "../components/ProgressBar";
import { showEmergencyToast } from "../components/AlertToast";
import toast from "react-hot-toast";
import { API_BASE, CLASS_CONFIG } from "../utils/constants";
import { fmtConf } from "../utils/helpers";
import { ArrowDownTrayIcon, ArrowPathIcon, FilmIcon } from "@heroicons/react/24/outline";

const ACCEPT = { "video/*": [".mp4", ".avi", ".mov", ".mkv"] };

export default function VideoDetect() {
  const [file,    setFile]    = useState(null);
  const [result,  setResult]  = useState(null);
  const [progress,setProgress]= useState(0);
  const [stage,   setStage]   = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);

  const onFile = (f) => { setFile(f); setResult(null); setReport(null); setAgentLoading(false); setProgress(0); setStage(""); };
  const reset  = ()  => { setFile(null); setResult(null); setReport(null); setAgentLoading(false); setProgress(0); setStage(""); };

  const process = async () => {
    if (!file) return;
    setLoading(true); setStage("Uploading video…"); setProgress(5);
    try {
      const { data } = await detectionApi.detectVideo(file, "Unknown", (e) => {
        const pct = Math.round((e.loaded / e.total) * 60);
        setProgress(pct);
        if (pct >= 55) setStage("Processing frames with YOLOv12…");
      });
      setProgress(100); setStage("Complete");
      setResult(data);
      if (data.agent_pending && data.event_id) {
        setAgentLoading(true);
        pollAgentReport(data.event_id)
          .then(r => { setReport(r); if (r?.whatsapp_sent) toast.success("WhatsApp alert dispatched"); })
          .catch(() => toast.error("AI emergency report could not be loaded"))
          .finally(() => setAgentLoading(false));
      }
      data.alert_triggered
        ? showEmergencyToast(data.dominant_class, data.avg_confidence)
        : toast.success(`Done — dominant class: ${data.dominant_class}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Processing failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 anim-fade-up max-w-4xl">
      <div>
        <h1 className="page-title">Video Detection</h1>
        <p className="page-subtitle">Frame-by-frame accident analysis using YOLOv12</p>
      </div>

      {!file ? (
        <div className="card p-0 overflow-hidden">
          <DropZone onFile={onFile} accept={ACCEPT}
            label="Drop a video file here"
            sublabel="MP4, AVI, MOV, MKV · max 100MB" />
        </div>
      ) : (
        <div className="space-y-4">

          {/* File info */}
          <div className="card flex items-center gap-3 py-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <FilmIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
              <p className="text-xs text-slate-600">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            {!loading && !result && (
              <button onClick={reset} className="btn-ghost px-2 py-1 text-xs">Remove</button>
            )}
          </div>

          {/* Progress */}
          {loading && <div className="card"><ProgressBar progress={progress} label={stage} /></div>}

          {/* Process button */}
          {!loading && !result && (
            <button onClick={process} className="btn-primary w-full py-2.5">
              Process Video
            </button>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4 anim-fade-up">

              {/* Alert banner */}
              {result.alert_triggered && (
                <div className="card border-rose-500/30 bg-rose-500/5 py-3 flex items-center gap-3">
                  <span className="text-lg">🚨</span>
                  <div>
                    <p className="text-sm font-bold text-rose-300">Emergency Alert Dispatched</p>
                    <p className="text-xs text-slate-500">Email + voice call sent to emergency contacts</p>
                  </div>
                </div>
              )}

              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card-sm text-center">
                  <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">Dominant</p>
                  <SeverityBadge cls={result.dominant_class} size="sm" />
                </div>
                <div className="card-sm text-center">
                  <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">Frames</p>
                  <p className="text-sm font-bold text-slate-200">{result.total_frames}</p>
                </div>
                <div className="card-sm text-center">
                  <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">Avg Conf</p>
                  <p className="text-sm font-bold text-slate-200">{fmtConf(result.avg_confidence)}</p>
                </div>
              </div>

              {/* Class stats */}
              <AgentReportCard report={report} loading={agentLoading} />
              <div className="card">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Frame Distribution</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(result.class_stats ?? {}).map(([cls, count]) => {
                    const cfg = CLASS_CONFIG[cls] ?? CLASS_CONFIG.no_detection;
                    const total = Object.values(result.class_stats).reduce((a,b)=>a+b,0);
                    const pct = total ? Math.round(count/total*100) : 0;
                    return (
                      <div key={cls} className="rounded-xl p-3 text-center"
                           style={{ background: cfg.color + "10", border: `1px solid ${cfg.color}22` }}>
                        <p className="text-lg font-bold" style={{ color: cfg.color }}>{count}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">{pct}% · {cfg.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Video player */}
              <div className="card p-0 overflow-hidden">
                <video controls
                  className="w-full max-h-72 bg-[#0f1117]"
                  src={`${API_BASE}${result.processed_video_url}`} />
              </div>

              {/* Snapshot */}
              {result.snapshot_url && (
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
                      Best Frame
                    </p>
                  </div>
                  <img src={`${API_BASE}${result.snapshot_url}`} alt="snapshot"
                    className="w-full object-contain max-h-48 bg-[#0f1117]" />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <a href={`${API_BASE}${result.processed_video_url}`} download className="btn btn-ghost text-xs">
                  <ArrowDownTrayIcon className="w-4 h-4" /> Download Video
                </a>
                {result.snapshot_url && (
                  <a href={`${API_BASE}${result.snapshot_url}`} download className="btn btn-ghost text-xs">
                    <ArrowDownTrayIcon className="w-4 h-4" /> Download Snapshot
                  </a>
                )}
                <button onClick={reset} className="btn btn-ghost text-xs">
                  <ArrowPathIcon className="w-4 h-4" /> New Video
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
