import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api/axiosClient";
import { Bars3Icon, PlusIcon } from "@heroicons/react/24/outline";

const TITLES = {
  "/dashboard":    ["Overview", "Dashboard"],
  "/analytics":    ["Overview", "Analytics"],
  "/detect/image": ["Detection", "Image Analysis"],
  "/detect/video": ["Detection", "Video Analysis"],
  "/history":      ["Response", "Incidents"],
  "/alerts":       ["Response", "Alerts Center"],
  "/users":        ["System", "Users"],
  "/settings":     ["System", "Settings"],
};

/** Polls the public /health endpoint so the demo shows real model status. */
function useSystemHealth() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    let alive = true;
    const check = () => api.get("/health")
      .then(r => alive && setHealth(r.data))
      .catch(() => alive && setHealth({ status: "down" }));
    check();
    const id = setInterval(check, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return health;
}

export default function Navbar({ onMenu }) {
  const { pathname } = useLocation();
  const [section, title] = TITLES[pathname] ?? ["", ""];
  const health = useSystemHealth();

  const online = health?.status === "ok" && health?.model_loaded !== false;
  const statusText = !health ? "Checking…" : online ? "Model online" : health.status === "ok" ? "Model not loaded" : "API offline";
  const statusColor = !health ? "bg-slate-400" : online ? "bg-emerald-400" : "bg-severe";

  return (
    <header className="sticky top-0 z-30 h-16 bg-ink-950/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center gap-3">
        <button onClick={onMenu} className="lg:hidden p-2 -ml-2 text-slate-300 hover:text-white rounded-lg">
          <Bars3Icon className="w-6 h-6" />
        </button>

        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 leading-none">{section}</p>
          <p className="text-[15px] font-semibold text-white leading-tight mt-1 truncate">{title}</p>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full
                          bg-white/[0.03] border border-white/[0.07] text-xs text-slate-300"
               title={health?.version ? `API v${health.version}` : undefined}>
            <span className="relative flex w-2 h-2">
              {online && <span className={`absolute inset-0 rounded-full ${statusColor} animate-ping2`} />}
              <span className={`relative w-2 h-2 rounded-full ${statusColor}`} />
            </span>
            {statusText}
          </div>
          <Link to="/detect/image" className="btn-primary btn-sm">
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">New analysis</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
