import { useState } from "react";
import { detectionApi } from "../api/detectionApi";
import { pollAgentReport } from "../api/agentApi";
import AgentReportCard from "../components/AgentReportCard";
import DropZone from "../components/DropZone";
import SeverityBadge from "../components/SeverityBadge";
import PageHeader from "../components/PageHeader";
import LocationInput from "../components/LocationInput";
import ScanOverlay from "../components/ScanOverlay";
import { showEmergencyToast } from "../components/AlertToast";
import toast from "react-hot-toast";
import { API_BASE, CLASS_CONFIG } from "../utils/constants";
import { fmtConf } from "../utils/helpers";
import {
  ArrowDownTrayIcon, ArrowPathIcon, BoltIcon, CheckBadgeIcon,
  ExclamationTriangleIcon, ViewfinderCircleIcon, ClockIcon, CpuChipIcon,
} from "@heroicons/react/24/outline";

const ACCEPT = { "image/*": [".jpg", ".jpeg", ".png", ".webp"] };

export default function ImageDetect() {
  const [file,    setFile]    = useState(null);
  const [preview, setPreview] = useState(null);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [location, setLocation] = useState("");
  const [view, setView] = useState("annotated");

  const onFile = (f) => { setFile(f); setPreview(URL.createObjectURL(f)); setResult(null); setReport(null); setAgentLoading(false); setView("annotated"); };
  const reset  = ()  => { setFile(null); setPreview(null); setResult(null); setReport(null); setAgentLoading(false); };

  const detect = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const { data } = await detectionApi.detectImage(file, location.trim() || "Unknown");
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
        : toast.success("Detection complete — no incident found");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Detection failed");
    } finally {
      setLoading(false);
    }
  };

  const shownSrc = result && view === "annotated" ? `${API_BASE}${result.processed_url}` : preview;
  const cfg = result ? (CLASS_CONFIG[result.detected_class] ?? CLASS_CONFIG.no_detection) : null;

  return (
    <div className="space-y-6 anim-fade-up">
      <PageHeader
        eyebrow="Detection"
        title="Image analysis"
        subtitle="Upload a road-scene image. The YOLO model classifies the incident, draws bounding boxes and triggers alerts."
        actions={preview && (
          <button onClick={reset} disabled={loading} className="btn-ghost btn-sm">
            <ArrowPathIcon className="w-4 h-4" /> New image
          </button>
        )}
      />

      {!preview ? (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card p-2 lg:col-span-2">
            <DropZone onFile={onFile} accept={ACCEPT} label="Drop an accident image to analyse" sublabel="Max 100 MB · processed locally by your model" />
          </div>
          <HowItWorks />
        </div>
      ) : (
        <div className="grid xl:grid-cols-5 gap-4 items-start">
          {/* Image stage */}
          <div className="xl:col-span-3 card p-0 overflow-hidden">
            <div className="card-header">
              <div className="min-w-0">
                <p className="card-title truncate">{file?.name}</p>
                <p className="card-subtitle">{file ? `${(file.size / 1024).toFixed(0)} KB` : ""}</p>
              </div>
              {result && (
                <div className="segmented">
                  {["original", "annotated"].map(v => (
                    <button key={v} onClick={() => setView(v)}
                      className={`segmented-item capitalize ${view === v ? "segmented-item-active" : ""}`}>{v}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative bg-ink-950 flex items-center justify-center min-h-[320px]">
              <img src={shownSrc} alt={view} className="w-full max-h-[560px] object-contain" />
              {loading && <ScanOverlay />}
              {result && cfg && view === "annotated" && (
                <div className="absolute bottom-3 left-3 anim-fade-in rounded-full bg-ink-950/85 backdrop-blur">
                  <SeverityBadge cls={result.detected_class} confidence={result.confidence} size="md" pulse={result.alert_triggered} />
                </div>
              )}
            </div>
          </div>

          {/* Control / result panel */}
          <div className="xl:col-span-2 space-y-4">
            {!result ? (
              <div className="card space-y-5">
                <div>
                  <p className="card-title">Ready to analyse</p>
                  <p className="card-subtitle">Add a location so responders know where to go.</p>
                </div>
                <LocationInput value={location} onChange={setLocation} disabled={loading} />
                <button onClick={detect} disabled={loading} className="btn-primary w-full py-3">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" /> Running YOLO inference…</>
                    : <><BoltIcon className="w-5 h-5" /> Run detection</>}
                </button>
              </div>
            ) : (
              <>
                <VerdictCard result={result} cfg={cfg} />

                <div className="grid grid-cols-3 gap-3 stagger">
                  <Metric icon={ViewfinderCircleIcon} label="Objects" value={result.bounding_boxes?.length ?? 0} />
                  <Metric icon={CpuChipIcon} label="Confidence" value={fmtConf(result.confidence)} />
                  <Metric icon={ClockIcon} label="Inference" value={`${result.processing_ms} ms`} />
                </div>

                {result.bounding_boxes?.length > 0 && (
                  <div className="card p-0 overflow-hidden">
                    <div className="card-header"><p className="card-title">Detected objects</p></div>
                    <div className="divide-y divide-white/[0.05]">
                      {result.bounding_boxes.map((b, i) => (
                        <div key={i} className="flex items-center gap-3 px-5 py-3">
                          <span className="w-6 h-6 rounded-md bg-white/[0.05] text-[11px] font-bold text-slate-400 flex items-center justify-center">{i + 1}</span>
                          <SeverityBadge cls={b.class} size="xs" />
                          <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${b.confidence * 100}%`, background: (CLASS_CONFIG[b.class] ?? CLASS_CONFIG.no_detection).color }} />
                          </div>
                          <span className="text-sm font-mono text-slate-200 num w-14 text-right">{fmtConf(b.confidence)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <a href={`${API_BASE}${result.processed_url}`} download className="btn-ghost w-full">
                  <ArrowDownTrayIcon className="w-4 h-4" /> Download annotated image
                </a>
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

function VerdictCard({ result, cfg }) {
  const alert = result.alert_triggered;
  return (
    <div className="card relative overflow-hidden anim-fade-up"
         style={alert ? { borderColor: `${cfg.color}55`, background: `linear-gradient(135deg, ${cfg.color}1f, transparent 60%), #0d1424` } : undefined}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border"
             style={{ background: `${cfg.color}22`, borderColor: `${cfg.color}55` }}>
          {alert
            ? <ExclamationTriangleIcon className="w-6 h-6" style={{ color: cfg.color }} />
            : <CheckBadgeIcon className="w-6 h-6 text-emerald-400" />}
        </div>
        <div className="min-w-0">
          <p className="stat-label">{alert ? `Incident detected · ${cfg.severity}` : "No incident detected"}</p>
          <p className="text-2xl font-bold text-white mt-1">{cfg.label}</p>
          <p className="text-sm text-slate-300 mt-1">{cfg.desc}</p>
        </div>
      </div>
      {alert && (
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-black/20 border border-white/[0.06] text-slate-200">
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full animate-ping2" style={{ background: cfg.color }} />
            <span className="relative w-2 h-2 rounded-full" style={{ background: cfg.color }} />
          </span>
          Emergency alert dispatched to responders
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="card-sm">
      <Icon className="w-4 h-4 text-slate-500" />
      <p className="text-lg font-bold text-white mt-2 num truncate">{value}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    ["Upload", "Drop a JPG, PNG or WEBP road-scene image."],
    ["Detect", "YOLO classifies severe, fire or moderate incidents."],
    ["Respond", "Alerts and an AI emergency assessment are generated."],
  ];
  return (
    <div className="card">
      <p className="card-title">How it works</p>
      <ol className="mt-4 space-y-4">
        {steps.map(([title, text], i) => (
          <li key={title} className="flex gap-3">
            <span className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-400/25 text-brand-300 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
            <div>
              <p className="text-sm font-semibold text-slate-100">{title}</p>
              <p className="text-sm text-slate-400">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap gap-1.5">
        {["severe", "fire", "moderate"].map(c => <SeverityBadge key={c} cls={c} size="xs" />)}
      </div>
    </div>
  );
}
