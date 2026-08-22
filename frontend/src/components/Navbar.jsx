import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14
                       bg-[#0f1117]/90 backdrop-blur-md
                       border-b border-white/[0.06]">
      <div className="flex items-center justify-between h-full px-5">

        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-glow">
            <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
              <path fillRule="evenodd"
                d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
                clipRule="evenodd" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-white leading-none">AccidentAI</p>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">YOLOv12 Detection</p>
          </div>
        </Link>

        {/* Right: user */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-slate-200 leading-none">{user.username}</span>
              <span className="text-[10px] text-slate-500 leading-none mt-0.5 capitalize">{user.role}</span>
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30
                            flex items-center justify-center text-indigo-300 text-sm font-bold uppercase">
              {user.username?.[0]}
            </div>

            {/* Logout */}
            <button
              onClick={() => { logout(); navigate("/login"); }}
              title="Sign out"
              className="p-2 text-slate-500 hover:text-slate-200 hover:bg-white/5
                         rounded-lg transition-all duration-150"
            >
              <ArrowRightOnRectangleIcon className="w-4.5 h-4.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
