import { useEffect, useState } from "react";
import api from "../api/axiosClient";
import { fmtDate } from "../utils/helpers";
import toast from "react-hot-toast";
import { PencilSquareIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

const ROLES = ["admin", "operator", "viewer"];

const rolePill = (role) => {
  const map = {
    admin:    "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20",
    operator: "bg-sky-500/15 text-sky-300 border border-sky-500/20",
    viewer:   "bg-slate-500/15 text-slate-400 border border-slate-500/20",
  };
  return `badge capitalize ${map[role] ?? map.viewer}`;
};

export default function Users() {
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
    } catch { toast.error("Update failed"); }
  };

  return (
    <div className="space-y-5 anim-fade-up">
      <div>
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">Manage roles and access — admin only</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="spinner" /></div>
      ) : (
        <div className="card p-0 overflow-hidden overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>User</th><th>Email</th><th>Role</th>
                <th>Status</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/15 border border-indigo-500/20
                                      flex items-center justify-center text-indigo-300 text-xs font-bold uppercase">
                        {u.username[0]}
                      </div>
                      <span className="text-slate-200 font-medium">{u.username}</span>
                    </div>
                  </td>
                  <td className="text-slate-500">{u.email}</td>
                  <td>
                    {editing?.id === u.id ? (
                      <select value={editing.role}
                        onChange={e => setEditing(p => ({ ...p, role: e.target.value }))}
                        className="input py-1 px-2 text-xs w-28">
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={rolePill(u.role)}>{u.role}</span>
                    )}
                  </td>
                  <td>
                    {editing?.id === u.id ? (
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400">
                        <input type="checkbox" checked={editing.is_active}
                          onChange={e => setEditing(p => ({ ...p, is_active: e.target.checked }))}
                          className="w-3.5 h-3.5 accent-indigo-500" />
                        Active
                      </label>
                    ) : (
                      <span className={`badge ${u.is_active
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-500/10 text-slate-500 border border-slate-500/20"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    )}
                  </td>
                  <td className="text-slate-600">{fmtDate(u.created_at)}</td>
                  <td>
                    {editing?.id === u.id ? (
                      <div className="flex gap-1.5">
                        <button onClick={save}
                          className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400
                                     hover:bg-indigo-500/25 transition-colors">
                          <CheckIcon className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditing(null)}
                          className="p-1.5 rounded-lg bg-white/[0.05] text-slate-500
                                     hover:bg-white/10 transition-colors">
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditing({ id: u.id, role: u.role, is_active: u.is_active })}
                        className="flex items-center gap-1 text-xs text-slate-600
                                   hover:text-slate-300 transition-colors">
                        <PencilSquareIcon className="w-3.5 h-3.5" /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
