import toast from "react-hot-toast";
import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";

export function showEmergencyToast(detectedClass, confidence) {
  toast.custom(
    (t) => <EmergencyToast t={t} cls={detectedClass} conf={confidence} />,
    { duration: 8000, position: "top-right" }
  );
}

function EmergencyToast({ t, cls, conf }) {
  return (
    <div className={`flex items-start gap-3 w-80 bg-[#161b27] border border-rose-500/30
                     rounded-xl shadow-2xl shadow-black/60 p-4
                     ${t.visible ? "anim-fade-up" : "opacity-0"}`}>
      <div className="p-1.5 bg-rose-500/15 rounded-lg shrink-0">
        <ExclamationTriangleIcon className="w-4 h-4 text-rose-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-rose-300">Emergency Alert</p>
        <p className="text-xs text-slate-400 mt-0.5">
          <span className="text-white font-semibold capitalize">{cls}</span> detected
          {conf ? ` · ${(conf * 100).toFixed(1)}% confidence` : ""}
        </p>
        <p className="text-[11px] text-slate-600 mt-1">Emergency services notified</p>
      </div>
      <button onClick={() => toast.dismiss(t.id)}
              className="text-slate-600 hover:text-slate-400 transition-colors shrink-0">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
