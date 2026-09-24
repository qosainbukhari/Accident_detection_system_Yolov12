import { useEffect, useState } from "react";
import api from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import { fmtDate } from "../utils/helpers";
import toast from "react-hot-toast";
import { PencilSquareIcon, CheckIcon, XMarkIcon, UsersIcon, ShieldCheckIcon, UserIcon } from "@heroicons/react/24/outline";

const ROLES = ["admin", "operator", "viewer"];
const ROLE_STYLES = {
  admin:    "bg-brand-500/10 text-brand-200 border-brand-400/30",
  operator: "bg-violet-500/10 text-violet-200 border-violet-400/30",
  viewer:   "bg-slate-500/10 text-slate-300 border-slate-500/30",
};

export default function Users() {
  const { user: me } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    api.get("/users").then(r => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!editing) return;
    try {
      const { data } = await api.put(`/users/${editing.id}`, { role: editing.role, is_active: editing.is_active });
      setUsers(p => p.map(u => u.id === data.id ? data : u));
      setEditing(null);
      toast.success("User updated");
    } catch (err) { toast.error(err.response?.data?.detail || "Update failed"); }
  };

  const summary = [
    { label: "Total users", value: users.length, icon: UsersIcon, accent: "#38bdf8" },
    { label: "Admins", value: users.filter(u => u.role === "admin").length, icon: ShieldCheckIcon, accent: "#c084fc" },
    { label: "Active", value: users.filter(u => u.is_active).length, icon: UserIcon, accent: "#22c55e" },
  ];

  return (
    <div className="space-y-6 anim-fade-up">
      <PageHeader eyebrow="System" title="User management" subtitle="Control who can access the platform and what they can do." />

      <div className="grid sm:grid-cols-3 gap-4 stagger">
        {summary.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center border shrink-0"
                 style={{ background: `${accent}14`, borderColor: `${accent}33` }}>
              <Icon className="w-5 h-5" style={{ color: accent }} />
            </div>
            <div>
              <p className="stat-label">{label}</p>
              <p className="text-2xl font-bold text-white num">{loading ? "—" : value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="card-header">
          <div>
            <p className="card-title">All users</p>
            <p className="card-subtitle">Edit a row to change role or access</p>
          </div>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {users.map(u => {
                  const isEditing = editing?.id === u.id;
                  const isMe = me?.id === u.id;
                  return (
                    <tr key={u.id} className={isEditing ? "bg-brand-500/[0.04]" : ""}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500/25 to-brand-700/25 border border-brand-400/20
                                          flex items-center justify-center text-brand-200 text-sm font-bold uppercase">
                            {u.username[0]}
                          </div>
                          <div>
                            <p className="text-slate-100 font-medium">
                              {u.username} {isMe && <span className="text-[10px] text-brand-300 font-semibold ml-1">YOU</span>}
                            </p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {isEditing ? (
                          <select value={editing.role} onChange={e => setEditing(p => ({ ...p, role: e.target.value }))}
                            className="input py-1.5 px-2.5 text-xs w-32">
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <span className={`badge capitalize ${ROLE_STYLES[u.role] ?? ROLE_STYLES.viewer}`}>{u.role}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                            <input type="checkbox" checked={editing.is_active}
                              onChange={e => setEditing(p => ({ ...p, is_active: e.target.checked }))}
                              className="w-4 h-4 accent-sky-500" />
                            Active
                          </label>
                        ) : (
                          <span className={`badge ${u.is_active
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/30"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-emerald-400" : "bg-slate-500"}`} />
                            {u.is_active ? "Active" : "Inactive"}
                          </span>
                        )}
                      </td>
                      <td className="text-slate-400 whitespace-nowrap">{fmtDate(u.created_at)}</td>
                      <td className="text-right">
                        {isEditing ? (
                          <div className="inline-flex gap-1.5">
                            <button onClick={save} title="Save" className="p-2 rounded-lg bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 transition-colors">
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditing(null)} title="Cancel" className="p-2 rounded-lg bg-white/[0.05] text-slate-400 hover:bg-white/10 transition-colors">
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setEditing({ id: u.id, role: u.role, is_active: u.is_active })}
                            disabled={isMe} title={isMe ? "You cannot change your own role" : "Edit user"}
                            className="btn-ghost btn-sm">
                            <PencilSquareIcon className="w-4 h-4" /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
