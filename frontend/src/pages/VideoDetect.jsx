import { useState } from "react";
import { detectionApi } from "../api/detectionApi";
import { pollAgentReport } from "../api/agentApi";
import AgentReportCard from "../components/AgentReportCard";
import DropZone from "../components/DropZone";
import SeverityBadge from "../components/SeverityBadge";
import ProgressBar from "../components/ProgressBar";
import PageHeader from "../components/PageHeader";
import LocationInput from "../components/LocationInput";
import { showEmergencyToast } from "../components/AlertToast";
import toast from "react-hot-toast";
import { API_BASE, CLASS_CONFIG } from "../utils/constants";
import { fmtConf } from "../utils/helpers";
import {
  ArrowPathIcon, FilmIcon, PlayIcon, ExclamationTriangleIcon, CheckBadgeIcon,
  RectangleStackIcon, CpuChipIcon, SignalIcon,
} from "@heroicons/react/24/outline";

const ACCEPT = { "video/*": [".mp4", ".avi", ".mov", ".mkv"] };
const STEPS = ["Upload", "Frame analysis", "Result"];

export default function VideoDetect() {
  const [file,    setFile]    = useState(null);
  const [result,  setResult]  = useState(null);
  const [liveStreamUrl, setLiveStreamUrl] = useState(null);
  const [progress,setProgress]= useState(0);
  const [stage,   setStage]   = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [location, setLocation] = useState("");

  const onFile = (f) => { setFile(f); setResult(null); setLiveStreamUrl(null); setReport(null); setAgentLoading(false); setProgress(0); setStage(""); };
  const reset  = ()  => { setFile(null); setResult(null); setLiveStreamUrl(null); setReport(null); setAgentLoading(false); setProgress(0); setStage(""); };

  const process = async () => {
    if (!file) return;
    setLoading(true); setStage("Uploading video…"); setProgress(5);
    try {
      const { data } = await detectionApi.detectVideo(file, location.trim() || "Unknown", (e) => {
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
      toast.error(err.response?.data?.detail || err.message || "Processing failed");
    } finally {
      setLoading(false);
    }
  };

  const step = result ? 2 : loading ? 1 : 0;
  const cfg = result ? (CLASS_CONFIG[result.dominant_class] ?? CLASS_CONFIG.no_detection) : null;
  const snapshot = result?.snapshot_url ? `${API_BASE}${result.snapshot_url}` : null;
  const stats = result?.class_stats ?? {};
  const analysed = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 anim-fade-up">
      <PageHeader
        eyebrow="Detection"
        title="Video analysis"
        subtitle="Frame-by-frame YOLO analysis with live annotated preview. Alerts fire only after consecutive confirmed frames."
        actions={file && !loading && (
          <button onClick={reset} className="btn-ghost btn-sm"><ArrowPathIcon className="w-4 h-4" /> New video</button>
        )}
      />

      {/* Stepper */}
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2 sm:gap-3 flex-1 last:flex-none">
            <span className={`flex items-center gap-2 text-xs sm:text-sm font-semibold whitespace-nowrap
              ${i <= step ? "text-white" : "text-slate-500"}`}>
              <span className={`w-6 h-6 rounded-full text-[11px] flex items-center justify-center border transition-colors
                ${i < step ? "bg-brand-500 border-brand-500 text-ink-950"
                  : i === step ? "border-brand-400 text-brand-300 bg-brand-500/10"
                  : "border-white/15 text-slate-500"}`}>{i + 1}</span>
              {s}
            </span>
            {i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < step ? "bg-brand-500/60" : "bg-white/10"}`} />}
          </li>
        ))}
      </ol>

      {!file ? (
        <div className="card p-2">
          <DropZone onFile={onFile} accept={ACCEPT} label="Drop a traffic or dash-cam video" sublabel="Max 100 MB" />
        </div>
      ) : (
        <div className="grid xl:grid-cols-5 gap-4 items-start">
          {/* Stage */}
          <div className="xl:col-span-3 card p-0 overflow-hidden">
            <div className="card-header">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-400/25 flex items-center justify-center shrink-0">
                  <FilmIcon className="w-5 h-5 text-brand-300" />
                </div>
                <div className="min-w-0">
                  <p className="card-title truncate">{file.name}</p>
                  <p className="card-subtitle">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>
              {loading && liveStreamUrl && (
                <span className="badge border-red-500/40 bg-red-500/10 text-red-300">
                  <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-red-500 animate-ping2" /><span className="relative w-2 h-2 rounded-full bg-red-500" /></span>
                  LIVE
                </span>
              )}
            </div>
            <div className="relative bg-ink-950 aspect-video flex items-center justify-center">
              {loading && liveStreamUrl ? (
                <img src={`${API_BASE}${liveStreamUrl}`} alt="Live annotated video processing"
                  className="w-full h-full object-contain" />
              ) : snapshot ? (
                <>
                  <img src={snapshot} alt="Highest-confidence frame" className="w-full h-full object-contain" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <span className="rounded-full bg-ink-950/85 backdrop-blur">
                      <SeverityBadge cls={result.dominant_class} confidence={result.avg_confidence} pulse={result.alert_triggered} />
                    </span>
                    <span className="badge border-white/10 bg-ink-950/70 text-slate-300">Key frame</span>
                  </div>
                </>
              ) : (
                <div className="text-center px-6">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
                    {loading ? <SignalIcon className="w-8 h-8 text-brand-300 animate-pulse" /> : <PlayIcon className="w-8 h-8 text-slate-500" />}
                  </div>
                  <p className="text-sm text-slate-300 mt-4 font-medium">
                    {loading ? "Connecting to the live analysis stream…" : result ? "No key frame was captured" : "The annotated live stream appears here during processing"}
                  </p>
                </div>
              )}
            </div>
            {loading && (
              <div className="p-5 border-t border-white/[0.06]">
                <ProgressBar progress={progress} label={stage} />
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="xl:col-span-2 space-y-4">
            {!result ? (
              <div className="card space-y-5">
                <div>
                  <p className="card-title">{loading ? "Processing video" : "Ready to process"}</p>
                  <p className="card-subtitle">
                    {loading ? "Each sampled frame is analysed and annotated in real time." : "Add a location so responders know where to go."}
                  </p>
                </div>
                <LocationInput value={location} onChange={setLocation} disabled={loading} />
                <button onClick={process} disabled={loading} className="btn-primary w-full py-3">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" /> Processing… {progress}%</>
                    : <><PlayIcon className="w-5 h-5" /> Process video</>}
                </button>
              </div>
            ) : (
              <>
                <div className="card anim-fade-up"
                     style={result.alert_triggered ? { borderColor: `${cfg.color}55`, background: `linear-gradient(135deg, ${cfg.color}1f, transparent 60%), #0d1424` } : undefined}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border"
                         style={{ background: `${cfg.color}22`, borderColor: `${cfg.color}55` }}>
                      {result.alert_triggered
                        ? <ExclamationTriangleIcon className="w-6 h-6" style={{ color: cfg.color }} />
                        : <CheckBadgeIcon className="w-6 h-6 text-emerald-400" />}
                    </div>
                    <div>
                      <p className="stat-label">{result.alert_triggered ? `Confirmed incident · ${cfg.severity}` : "No confirmed incident"}</p>
                      <p className="text-2xl font-bold text-white mt-1">{cfg.label}</p>
                      <p className="text-sm text-slate-300 mt-1">
                        {result.alert_triggered ? "Email and WhatsApp alerts have been dispatched to responders." : "Detections did not persist across enough consecutive frames to raise an alert."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 stagger">
                  <div className="card-sm">
                    <RectangleStackIcon className="w-4 h-4 text-slate-500" />
                    <p className="text-lg font-bold text-white mt-2 num">{result.total_frames}</p>
                    <p className="text-[11px] text-slate-400">Total frames</p>
                  </div>
                  <div className="card-sm">
                    <CpuChipIcon className="w-4 h-4 text-slate-500" />
                    <p className="text-lg font-bold text-white mt-2 num">{fmtConf(result.avg_confidence)}</p>
                    <p className="text-[11px] text-slate-400">Avg confidence</p>
                  </div>
                </div>

                {analysed > 0 && (
                  <div className="card">
                    <p className="card-title">Frame breakdown</p>
                    <p className="card-subtitle">{analysed} sampled frames analysed</p>
                    <div className="flex h-2.5 rounded-full overflow-hidden mt-4 bg-white/[0.05]">
                      {Object.entries(stats).filter(([, v]) => v > 0).map(([k, v]) => (
                        <div key={k} style={{ width: `${(v / analysed) * 100}%`, background: (CLASS_CONFIG[k] ?? CLASS_CONFIG.no_detection).color }} />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                      {Object.entries(stats).map(([k, v]) => {
                        const c = CLASS_CONFIG[k] ?? CLASS_CONFIG.no_detection;
                        return (
                          <div key={k} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-300">
                              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />{c.label}
                            </span>
                            <span className="font-semibold text-slate-100 num">{v}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {(agentLoading || report) && (
            <div className="xl:col-span-5">
              <AgentReportCard report={report} loading={agentLoading} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
