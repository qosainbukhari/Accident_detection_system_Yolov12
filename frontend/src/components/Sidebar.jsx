import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HomeIcon, PhotoIcon, VideoCameraIcon, ClockIcon,
  BellAlertIcon, ChartBarIcon, Cog6ToothIcon, UsersIcon,
} from "@heroicons/react/24/outline";

const NAV = [
  { to: "/dashboard",    icon: HomeIcon,         label: "Dashboard"    },
  { to: "/detect/image", icon: PhotoIcon,         label: "Image Detect" },
  { to: "/detect/video", icon: VideoCameraIcon,   label: "Video Detect" },
  { to: "/history",      icon: ClockIcon,         label: "History"      },
  { to: "/alerts",       icon: BellAlertIcon,     label: "Alerts"       },
  { to: "/analytics",    icon: ChartBarIcon,      label: "Analytics"    },
  { to: "/settings",     icon: Cog6ToothIcon,     label: "Settings"     },
];

const ADMIN_NAV = [
  { to: "/users",        icon: UsersIcon,         label: "Users"        },
];

export default function Sidebar() {
  const { isAdmin } = useAuth();

  const link = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium
     transition-all duration-150 group
     ${isActive
       ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20"
       : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]"
     }`;

  return (
    <aside className="fixed top-14 left-0 w-[220px] h-[calc(100vh-56px)]
                      bg-[#0f1117] border-r border-white/[0.06]
                      flex flex-col py-4 overflow-y-auto">

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={link}>
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 shrink-0 transition-colors
                  ${isActive ? "text-indigo-400" : "text-slate-600 group-hover:text-slate-400"}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                Admin
              </p>
            </div>
            {ADMIN_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={link}>
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0
                      ${isActive ? "text-indigo-400" : "text-slate-600 group-hover:text-slate-400"}`} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 pt-3 border-t border-white/[0.06]">
        <p className="text-[11px] text-slate-600">AccidentAI · v2.0</p>
        <p className="text-[11px] text-slate-700">YOLOv12 · FastAPI</p>
      </div>
    </aside>
  );
}
