import SeverityBadge from "./SeverityBadge";
import { fmtDate, truncate } from "../utils/helpers";
import { API_BASE, CLASS_CONFIG } from "../utils/constants";
import {
  PhotoIcon, VideoCameraIcon, EnvelopeIcon, PhoneIcon, ChatBubbleLeftRightIcon,
  SparklesIcon, TrashIcon, CheckIcon, NoSymbolIcon, MapPinIcon,
} from "@heroicons/react/24/outline";

const STATUS_STYLES = {
  open:         "text-sky-300 bg-sky-500/10 border-sky-500/30",
  acknowledged: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  resolved:     "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  false_alarm:  "text-slate-300 bg-slate-500/10 border-slate-500/30",
};

export default function DetectionCard({ event, onDelete, onStatus, isAdmin }) {
  const isVideo = event.media_type === "video";
  const cfg     = CLASS_CONFIG[event.detected_class] ?? CLASS_CONFIG.no_detection;
  const status  = event.incident_status ?? "open";

  const imgSrc = event.snapshot_path
    ? `${API_BASE}/static/${event.snapshot_path.replace(/^.*static\//, "")}`
    : null;

  const channels = [
    event.alert_sent     && { icon: EnvelopeIcon,            label: "Email" },
    event.call_triggered && { icon: PhoneIcon,               label: "Call" },
    event.whatsapp_sent  && { icon: ChatBubbleLeftRightIcon, label: "WhatsApp" },
    event.agent_report   && { icon: SparklesIcon,            label: `AI · ${event.agent_report.incident_level || "—"}` },
  ].filter(Boolean);

  return (
    <div className="card p-0 overflow-hidden card-hover flex flex-col group">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-ink-900 flex items-center justify-center overflow-hidden">
        {imgSrc
          ? <img src={imgSrc} alt={`Incident ${event.id}`} loading="lazy"
                 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : (isVideo ? <VideoCameraIcon className="w-10 h-10 text-slate-600" /> : <PhotoIcon className="w-10 h-10 text-slate-600" />)
        }
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-ink-950/30" />
        <div className="absolute top-3 left-3 rounded-full bg-ink-950/85 backdrop-blur">
          <SeverityBadge cls={event.detected_class} confidence={event.confidence} size="sm" />
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-ink-950/70
                        backdrop-blur text-[10px] font-semibold text-slate-200 uppercase tracking-wide">
          {isVideo ? <VideoCameraIcon className="w-3 h-3" /> : <PhotoIcon className="w-3 h-3" />}
          {event.media_type}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: cfg.color }} />
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-100 truncate" title={event.original_filename}>
              {truncate(event.original_filename, 28) ?? "—"}
            </p>
            <span className="text-xs font-mono text-slate-500 shrink-0">INC-{String(event.id).padStart(4, "0")}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{fmtDate(event.created_at)}</p>
          {event.location && event.location !== "Unknown" && (
            <p className="flex items-center gap-1 text-xs text-slate-400 mt-1 truncate">
              <MapPinIcon className="w-3.5 h-3.5 shrink-0" /> {event.location}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className={`badge capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.open}`}>
            {status.replace("_", " ")}
          </span>
          {channels.map(({ icon: Icon, label }) => (
            <span key={label} className="badge border-white/10 bg-white/[0.03] text-slate-300">
              <Icon className="w-3 h-3" /> {label}
            </span>
          ))}
        </div>

        {(onStatus && status === "open") || (isAdmin && onDelete) ? (
          <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/[0.06]">
            {onStatus && status === "open" && (
              <>
                <button onClick={() => onStatus(event.id, "acknowledged")}
                  className="btn btn-sm flex-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20">
                  <CheckIcon className="w-3.5 h-3.5" /> Acknowledge
                </button>
                <button onClick={() => onStatus(event.id, "false_alarm")}
                  className="btn btn-sm flex-1 bg-white/[0.03] text-slate-300 border border-white/10 hover:bg-white/[0.07]">
                  <NoSymbolIcon className="w-3.5 h-3.5" /> False alarm
                </button>
              </>
            )}
            {isAdmin && onDelete && (
              <button onClick={() => onDelete(event.id)} title="Delete incident"
                className="btn btn-sm ml-auto px-2 text-slate-400 border border-white/10 hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10">
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
