import SeverityBadge from "./SeverityBadge";
import { fmtDate, truncate } from "../utils/helpers";
import { API_BASE, CLASS_CONFIG } from "../utils/constants";
import { PhotoIcon, VideoCameraIcon, BellAlertIcon, PhoneIcon } from "@heroicons/react/24/outline";

export default function DetectionCard({ event, onDelete, isAdmin }) {
  const isVideo = event.media_type === "video";
  const cfg     = CLASS_CONFIG[event.detected_class] ?? CLASS_CONFIG.no_detection;

  const imgSrc = event.snapshot_path
    ? `${API_BASE}/static/${event.snapshot_path.replace(/^.*static\//, "")}`
    : null;

  return (
    <div className="card p-0 overflow-hidden hover:border-white/10
                    transition-all duration-200 flex flex-col">

      {/* Thumbnail */}
      <div className="relative h-36 bg-[#0f1117] flex items-center justify-center overflow-hidden">
        {imgSrc
          ? <img src={imgSrc} alt="detection" className="w-full h-full object-cover" />
          : <div className="text-slate-700">
              {isVideo
                ? <VideoCameraIcon className="w-10 h-10" />
                : <PhotoIcon       className="w-10 h-10" />}
            </div>
        }

        {/* Class pill */}
        <div className="absolute top-2 left-2">
          <SeverityBadge cls={event.detected_class} confidence={event.confidence} size="sm" />
        </div>

        {/* Accent stripe */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5"
             style={{ background: cfg.color }} />
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-slate-200 truncate" title={event.original_filename}>
            {truncate(event.original_filename, 26) ?? "—"}
          </p>
          <span className="text-[11px] text-slate-600 shrink-0">#{event.id}</span>
        </div>

        <p className="text-[11px] text-slate-600">
          {fmtDate(event.created_at)}
        </p>

        {/* Indicators */}
        {(event.alert_sent || event.call_triggered) && (
          <div className="flex gap-1.5 flex-wrap">
            {event.alert_sent && (
              <span className="flex items-center gap-1 text-[10px] font-medium
                               text-rose-400 bg-rose-500/10 border border-rose-500/20
                               px-2 py-0.5 rounded-full">
                <BellAlertIcon className="w-3 h-3" /> Email
              </span>
            )}
            {event.call_triggered && (
              <span className="flex items-center gap-1 text-[10px] font-medium
                               text-violet-400 bg-violet-500/10 border border-violet-500/20
                               px-2 py-0.5 rounded-full">
                <PhoneIcon className="w-3 h-3" /> Called
              </span>
            )}
          </div>
        )}

        {isAdmin && onDelete && (
          <button
            onClick={() => onDelete(event.id)}
            className="text-[11px] text-slate-600 hover:text-rose-400 transition-colors text-left mt-auto"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
