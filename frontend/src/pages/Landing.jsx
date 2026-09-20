import { Link } from "react-router-dom";
import { CpuChipIcon, BellAlertIcon, PhoneIcon, ChartBarIcon, FilmIcon, PhotoIcon } from "@heroicons/react/24/outline";

const FEATURES = [
  { icon: CpuChipIcon,   title: "YOLOv12 Detection",   desc: "State-of-the-art object detection with 4 severity classes",       color: "#6366f1" },
  { icon: BellAlertIcon, title: "Instant Email Alerts", desc: "Automated emergency emails for critical detections",              color: "#ef4444" },
  { icon: PhotoIcon,     title: "Image Detection",      desc: "Upload any accident image — get annotated results instantly",    color: "#10b981" },
  { icon: FilmIcon,      title: "Video Processing",     desc: "Frame-by-frame analysis with dominant class determination",      color: "#f59e0b" },
  { icon: ChartBarIcon,  title: "Analytics",            desc: "Full detection history, confidence trends, and class charts",    color: "#06b6d4" },
];

const CLASSES = [
  { name: "fire",     color: "#ef4444", icon: "🔥", desc: "Vehicle or surroundings on fire — CRITICAL response required"   },
  { name: "moderate", color: "#f97316", icon: "🟠",  desc: "Moderate collision — moderate damage"                           },
  { name: "severe",   color: "#dc2626", icon: "🚨",  desc: "Major crash, rollover, or head-on — HIGH risk of fatality"      },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-white">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0f1117]/80
                      backdrop-blur-md border-b border-white/[0.06] flex items-center px-8 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-glow">
            <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
              <path fillRule="evenodd"
                d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
                clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-bold text-sm">AccidentAI</span>
        </div>
        <Link to="/login" className="btn-primary text-xs px-4 py-1.5">
          Launch App →
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative pt-32 pb-24 px-6 text-center overflow-hidden">
        {/* Background blur */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                          w-[800px] h-[500px] bg-indigo-600/8 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400
                           bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full mb-6">
            🔬 Powered by YOLOv12
          </span>

          <h1 className="text-4xl sm:text-6xl font-extrabold mb-5 leading-tight tracking-tight">
            AI Accident Detection<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              & Emergency Response
            </span>
          </h1>

          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">
            Real-time accident detection from images and videos.
            Auto-classify severity and instantly alert emergency services.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/login" className="btn-primary px-7 py-3 text-sm">
              Get Started →
            </Link>
            <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer"
               className="btn-ghost px-7 py-3 text-sm">
              API Docs
            </a>
          </div>
        </div>
      </div>

      {/* Tech stack pills */}
      <div className="border-y border-white/[0.05] py-5">
        <div className="flex flex-wrap justify-center gap-2 px-6">
          {["YOLOv12", "FastAPI", "React 18", "MySQL 8", "Kapso WhatsApp", "Docker"].map(t => (
            <span key={t} className="text-xs font-medium text-slate-500
                                     bg-white/[0.04] border border-white/[0.06]
                                     px-3 py-1 rounded-full">{t}</span>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-center text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">
          Features
        </p>
        <h2 className="text-2xl font-bold text-center text-white mb-10">Everything you need</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title}
              className="bg-[#161b27] border border-white/[0.06] rounded-2xl p-5
                         hover:border-white/10 transition-all duration-200">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                   style={{ background: color + "18" }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h3 className="font-semibold text-white text-sm mb-1.5">{title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Classes */}
      <div className="border-y border-white/[0.05] py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">
            Detection Classes
          </p>
          <h2 className="text-2xl font-bold text-center mb-10">4 Severity Levels</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {CLASSES.map(({ name, color, icon, desc }) => (
              <div key={name}
                className="flex items-start gap-4 bg-[#161b27] border border-white/[0.06]
                           rounded-2xl p-5 hover:border-white/10 transition-all">
                <span className="text-2xl shrink-0">{icon}</span>
                <div>
                  <p className="font-bold capitalize mb-1" style={{ color }}>{name}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center py-20 px-6">
        <h2 className="text-2xl font-bold mb-3">Ready to deploy?</h2>
        <p className="text-slate-500 text-sm mb-8">One command with Docker Compose</p>
        <code className="bg-[#161b27] border border-white/[0.06] rounded-xl
                         px-5 py-2.5 text-sm text-indigo-300 font-mono block max-w-fit mx-auto mb-8">
          docker-compose up --build -d
        </code>
        <Link to="/login" className="btn-primary px-8 py-3 text-sm">
          Launch Dashboard →
        </Link>
        <p className="text-slate-700 text-xs mt-8">AccidentAI · YOLOv12 · FYP v2.0</p>
      </div>
    </div>
  );
}
