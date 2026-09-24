import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { detectionApi } from "../api/detectionApi";
import { useAuth } from "../context/AuthContext";
import DetectionCard from "../components/DetectionCard";
import PageHeader, { EmptyState } from "../components/PageHeader";
import { CLASS_CONFIG } from "../utils/constants";
import toast from "react-hot-toast";
import { ChevronLeftIcon, ChevronRightIcon, InboxIcon, PhotoIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const PAGE_SIZE = 20;
const FILTERS = [
  { key: "all", label: "All" },
  { key: "severe", label: "Severe" },
  { key: "fire", label: "Fire" },
  { key: "moderate", label: "Moderate" },
  { key: "open", label: "Open only" },
];

export default function History() {
  const { isAdmin }   = useAuth();
  const [events,  setEvents]  = useState([]);
  const [page,    setPage]    = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [filter,  setFilter]  = useState("all");

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const { data } = await detectionApi.getHistory(p * PAGE_SIZE, PAGE_SIZE);
      setEvents(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch { toast.error("Failed to load history"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete incident #${id}? This cannot be undone.`)) return;
    try {
      await detectionApi.deleteEvent(id);
      setEvents(p => p.filter(e => e.id !== id));
      toast.success("Incident deleted");
    } catch { toast.error("Delete failed"); }
  };

  const handleStatus = async (id, status) => {
    try {
      const { data } = await detectionApi.updateStatus(id, status);
      setEvents((current) => current.map((event) => event.id === id ? data : event));
      toast.success(`Incident marked ${status.replace("_", " ")}`);
    } catch { toast.error("Unable to update incident status"); }
  };

  // Filtering applies to the current page, which keeps the API unchanged.
  const visible = events.filter(e =>
    filter === "all" ? true
      : filter === "open" ? (e.incident_status ?? "open") === "open"
      : e.detected_class === filter);
  const count = (key) => key === "all" ? events.length
    : key === "open" ? events.filter(e => (e.incident_status ?? "open") === "open").length
    : events.filter(e => e.detected_class === key).length;

  return (
    <div className="space-y-6 anim-fade-up">
      <PageHeader
        eyebrow="Response"
        title="Incidents"
        subtitle="Every detection with its evidence, alert channels and response status."
        actions={<button onClick={() => load(page)} disabled={loading} className="btn-ghost btn-sm">
          <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          const color = CLASS_CONFIG[key]?.color;
          return (
            <button key={key} onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all
                ${active ? "bg-white/[0.08] border-white/20 text-white" : "border-white/[0.08] text-slate-400 hover:text-white hover:border-white/15"}`}>
              {color && <span className="w-2 h-2 rounded-full" style={{ background: color }} />}
              {label}
              <span className={`num text-[10px] px-1.5 rounded-full ${active ? "bg-white/15" : "bg-white/[0.06]"}`}>{count(key)}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-[300px] rounded-2xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState icon={InboxIcon}
            title={events.length ? "No incidents match this filter" : "No incidents yet"}
            text={events.length ? "Try a different filter." : "Run an image or video detection to get started."}
            action={!events.length && <Link to="/detect/image" className="btn-primary btn-sm"><PhotoIcon className="w-4 h-4" /> Analyse an image</Link>} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 stagger">
          {visible.map(ev => (
            <DetectionCard key={ev.id} event={ev}
              onDelete={isAdmin ? handleDelete : null} onStatus={handleStatus} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {(events.length > 0 || page > 0) && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading} className="btn-ghost btn-sm">
            <ChevronLeftIcon className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-slate-400 num px-2">Page <span className="text-white font-semibold">{page + 1}</span></span>
          <button onClick={() => setPage(p => p + 1)} disabled={!hasMore || loading} className="btn-ghost btn-sm">
            Next <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
