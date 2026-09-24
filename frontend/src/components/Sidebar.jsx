import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Brand from "./Brand";
import {
  Squares2X2Icon, PhotoIcon, VideoCameraIcon, ClockIcon,
  BellAlertIcon, ChartBarIcon, Cog6ToothIcon, UsersIcon,
  ArrowRightOnRectangleIcon, XMarkIcon,
} from "@heroicons/react/24/outline";

const SECTIONS = [
  {
    title: "Overview",
    items: [
      { to: "/dashboard", icon: Squares2X2Icon, label: "Dashboard" },
      { to: "/analytics", icon: ChartBarIcon,   label: "Analytics" },
    ],
  },
  {
    title: "Detection",
    items: [
      { to: "/detect/image", icon: PhotoIcon,       label: "Image Analysis" },
      { to: "/detect/video", icon: VideoCameraIcon, label: "Video Analysis" },
    ],
  },
  {
    title: "Response",
    items: [
      { to: "/history", icon: ClockIcon,     label: "Incidents" },
      { to: "/alerts",  icon: BellAlertIcon, label: "Alerts Center" },
    ],
  },
];

const ADMIN_ITEMS = [{ to: "/users", icon: UsersIcon, label: "Users" }];

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const sections = [
    ...SECTIONS,
    { title: "System", items: [
      ...(isAdmin ? ADMIN_ITEMS : []),
      { to: "/settings", icon: Cog6ToothIcon, label: "Settings" },
    ] },
  ];

  return (
    <>
      {/* Mobile scrim */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity
          ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-[248px] bg-ink-900 border-r border-white/[0.06]
          flex flex-col transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.06]">
          <Brand />
          <button onClick={onClose} className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {sections.map(({ title, items }) => (
            <div key={title}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {title}
              </p>
              <div className="space-y-0.5">
                {items.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} onClick={onClose}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium
                       transition-colors duration-150 group
                       ${isActive
                         ? "bg-brand-500/10 text-white"
                         : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]"}`}>
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand-400" />
                        )}
                        <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors
                          ${isActive ? "text-brand-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User card */}
        {user && (
          <div className="p-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500/30 to-brand-700/30
                              border border-brand-400/20 flex items-center justify-center
                              text-brand-200 text-sm font-bold uppercase shrink-0">
                {user.username?.[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100 truncate">{user.username}</p>
                <p className="text-[11px] text-slate-400 capitalize">{user.role}</p>
              </div>
              <button
                onClick={() => { logout(); navigate("/login"); }}
                title="Sign out"
                className="p-2 text-slate-400 hover:text-severe-soft hover:bg-severe/10 rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
