import { useEffect, useState, useCallback } from "react";
import { detectionApi } from "../api/detectionApi";
import { useAuth } from "../context/AuthContext";
import DetectionCard from "../components/DetectionCard";
import toast from "react-hot-toast";
import { ChevronLeftIcon, ChevronRightIcon, InboxIcon } from "@heroicons/react/24/outline";

const PAGE_SIZE = 20;

export default function History() {
  const { isAdmin }   = useAuth();
  const [events,  setEvents]  = useState([]);
  const [page,    setPage]    = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

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
    if (!window.confirm(`Delete event #${id}?`)) return;
    try {
      await detectionApi.deleteEvent(id);
      setEvents(p => p.filter(e => e.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Delete failed"); }
  };

  const handleStatus = async (id, status) => {
    try {
      const { data } = await detectionApi.updateStatus(id, status);
      setEvents((current) => current.map((event) => event.id === id ? data : event));
      toast.success(`Incident marked ${status.replace("_", " ")}`);
    } catch { toast.error("Unable to update incident status"); }
  };

  return (
    <div className="space-y-5 anim-fade-up">
      <div>
        <h1 className="page-title">Detection History</h1>
        <p className="page-subtitle">All past detection events</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="spinner" />
        </div>
      ) : events.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 gap-3">
          <InboxIcon className="w-10 h-10 text-slate-700" />
          <p className="text-slate-500 text-sm">No detections yet</p>
          <p className="text-slate-700 text-xs">Run an image or video detection to get started</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {events.map(ev => (
            <DetectionCard key={ev.id} event={ev}
              onDelete={isAdmin ? handleDelete : null} onStatus={handleStatus} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(events.length > 0 || page > 0) && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="btn btn-ghost text-xs gap-1.5">
            <ChevronLeftIcon className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-xs text-slate-600 font-mono">Page {page + 1}</span>
          <button onClick={() => setPage(p => p + 1)}
            disabled={!hasMore || loading}
            className="btn btn-ghost text-xs gap-1.5">
            Next <ChevronRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
