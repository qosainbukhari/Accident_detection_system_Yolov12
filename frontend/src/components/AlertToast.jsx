import toast from "react-hot-toast";
import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { CLASS_CONFIG } from "../utils/constants";

export function showEmergencyToast(detectedClass, confidence) {
  toast.custom(
    (t) => <EmergencyToast t={t} cls={detectedClass} conf={confidence} />,
    { duration: 8000, position: "top-right" }
  );
}

function EmergencyToast({ t, cls, conf }) {
  const cfg = CLASS_CONFIG[cls] ?? CLASS_CONFIG.severe;
  return (
    <div className={`relative flex items-start gap-3 w-[340px] bg-ink-800/95 backdrop-blur-xl
                     border rounded-2xl shadow-2xl shadow-black/60 p-4 overflow-hidden
                     ${t.visible ? "anim-fade-up" : "opacity-0"}`}
         style={{ borderColor: `${cfg.color}55` }}>
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: cfg.color }} />
      <div className="p-2 rounded-xl shrink-0" style={{ background: `${cfg.color}22` }}>
        <ExclamationTriangleIcon className="w-5 h-5" style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">Emergency alert · {cfg.severity}</p>
        <p className="text-sm text-slate-300 mt-0.5">
          <span className="font-semibold" style={{ color: cfg.text }}>{cfg.label}</span> incident detected
          {conf ? <span className="num"> · {(conf * 100).toFixed(1)}%</span> : ""}
        </p>
        <p className="text-xs text-slate-400 mt-1.5">Responders are being notified.</p>
      </div>
      <button onClick={() => toast.dismiss(t.id)}
              className="text-slate-500 hover:text-white transition-colors shrink-0">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
