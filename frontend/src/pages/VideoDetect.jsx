import { useState } from "react";
import { detectionApi } from "../api/detectionApi";
import { pollAgentReport } from "../api/agentApi";
import AgentReportCard from "../components/AgentReportCard";
import DropZone from "../components/DropZone";
import SeverityBadge from "../components/SeverityBadge";
import ProgressBar from "../components/ProgressBar";
import { showEmergencyToast } from "../components/AlertToast";
import toast from "react-hot-toast";
import { API_BASE } from "../utils/constants";
import { fmtConf } from "../utils/helpers";
import { ArrowPathIcon, FilmIcon } from "@heroicons/react/24/outline";

const ACCEPT = { "video/*": [".mp4", ".avi", ".mov", ".mkv"] };

export default function VideoDetect() {
  const [file,    setFile]    = useState(null);
  const [result,  setResult]  = useState(null);
  const [liveStreamUrl, setLiveStreamUrl] = useState(null);
  const [progress,setProgress]= useState(0);
  const [stage,   setStage]   = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);

  const onFile = (f) => { setFile(f); setResult(null); setLiveStreamUrl(null); setReport(null); setAgentLoading(false); setProgress(0); setStage(""); };
  const reset  = ()  => { setFile(null); setResult(null); setLiveStreamUrl(null); setReport(null); setAgentLoading(false); setProgress(0); setStage(""); };

  const process = async () => {
    if (!file) return;
    setLoading(true); setStage("Uploading video…"); setProgress(5);
    try {
      const { data } = await detectionApi.detectVideo(file, "Unknown", (e) => {
        const pct = Math.round((e.loaded / e.total) * 15);
        setProgress(pct);
        if (pct >= 14) setStage("Upload complete — preparing frame analysis…");
      });
      const jobId = data.job_id;
      if (!jobId) throw new Error("Video processing job was not created");
      setLiveStreamUrl(`/detection/video/jobs/${jobId}/stream`);
      let job;
      do {
        await new Promise(resolve => setTimeout(resolve, 700));
        ({ data: job } = await detectionApi.getVideoJob(jobId));
        const frameProgress = Math.round(15 + (job.progress ?? 0) * 0.85);
        setProgress(Math.min(100, frameProgress));
        const frames = job.total_frames ? ` (${job.processed_frames}/${job.total_frames} frames)` : "";
        setStage(`${job.stage || "Processing video…"}${frames}`);
      } while (job.status === "queued" || job.status === "processing");
      if (job.status === "failed") throw new Error(job.error || "Video processing failed");
      const finalResult = job.result;
      setProgress(100); setStage("Complete");
      setResult(finalResult);
      if (finalResult.agent_pending && finalResult.event_id) {
        setAgentLoading(true);
        pollAgentReport(finalResult.event_id)
          .then(r => { setReport(r); if (r?.whatsapp_sent) toast.success("WhatsApp alert submitted for delivery"); })
          .catch(() => toast.error("AI emergency report could not be loaded"))
          .finally(() => setAgentLoading(false));
      }
      finalResult.alert_triggered
        ? showEmergencyToast(finalResult.dominant_class, finalResult.avg_confidence)
        : toast.success(`Done — dominant class: ${finalResult.dominant_class}`);
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
          {loading && <>
            <div className="card"><ProgressBar progress={progress} label={stage} /></div>
            {liveStreamUrl && (
              <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Live YOLO frame analysis</p>
                  <p className="text-[11px] text-slate-600 mt-1">Each frame below is being analyzed and annotated in real time.</p>
                </div>
                <img src={`${API_BASE}${liveStreamUrl}`} alt="Live annotated video processing"
                  className="w-full max-h-[30rem] object-contain bg-[#0f1117]" />
              </div>
            )}
          </>}

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
                    <p className="text-xs text-slate-500">Email + WhatsApp report sent to emergency contacts</p>
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
              {/* Actions */}
              <div className="flex flex-wrap gap-2">
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
