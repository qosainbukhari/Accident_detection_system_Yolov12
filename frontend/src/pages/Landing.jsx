import { Link } from "react-router-dom";
import Brand from "../components/Brand";
import SeverityBadge from "../components/SeverityBadge";
import { CLASS_CONFIG } from "../utils/constants";
import {
  CpuChipIcon, BellAlertIcon, ChartBarIcon, FilmIcon, PhotoIcon, SparklesIcon,
  ArrowRightIcon, CloudArrowUpIcon, ViewfinderCircleIcon, ChatBubbleLeftRightIcon,
  DocumentTextIcon, ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const FEATURES = [
  { icon: PhotoIcon,               title: "Image analysis",         desc: "Upload a road-scene photo and get an annotated result with bounding boxes in about a second." },
  { icon: FilmIcon,                title: "Live video analysis",    desc: "Frame-by-frame inference with a live annotated stream. Alerts fire only on consecutive confirmed frames." },
  { icon: SparklesIcon,            title: "AI emergency agent",     desc: "Gemini-powered triage recommends services and actions, with a deterministic fallback when offline." },
  { icon: BellAlertIcon,           title: "Instant alerts",         desc: "Emergency email and WhatsApp notifications with the evidence image, location and priority." },
  { icon: DocumentTextIcon,        title: "Formal PDF reports",     desc: "Every incident produces a printable A4 assessment with evidence and a notification record." },
  { icon: ChartBarIcon,            title: "Analytics & audit",      desc: "Trends, confidence distribution, delivery logs and per-incident status tracking." },
];

const STEPS = [
  { icon: CloudArrowUpIcon,        title: "Upload",  desc: "Image or dash-cam video" },
  { icon: ViewfinderCircleIcon,    title: "Detect",  desc: "YOLOv12 classifies severity" },
  { icon: SparklesIcon,            title: "Assess",  desc: "AI agent builds a response plan" },
  { icon: ChatBubbleLeftRightIcon, title: "Alert",   desc: "Email + WhatsApp to responders" },
];

const METRICS = [
  ["92.5%", "Precision"],
  ["86.8%", "Recall"],
  ["89.9%", "mAP@50"],
  ["79.0%", "mAP@50-95"],
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-950 text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 bg-ink-950/70 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-6">
            <a href="#features" className="hidden md:inline text-sm text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#model" className="hidden md:inline text-sm text-slate-400 hover:text-white transition-colors">Model</a>
            <Link to="/login" className="btn-primary btn-sm">Launch console <ArrowRightIcon className="w-4 h-4" /></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="anim-fade-up">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-brand-200
                             bg-brand-500/10 border border-brand-400/25 px-3 py-1.5 rounded-full">
              <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-brand-400 animate-ping2" /><span className="relative w-2 h-2 rounded-full bg-brand-400" /></span>
              Powered by a custom-trained YOLOv12 model
            </span>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold mt-6 leading-[1.05] tracking-tight">
              AI accident detection &amp;{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-500">
                emergency response
              </span>
            </h1>

            <p className="text-slate-300 text-lg mt-6 max-w-xl leading-relaxed">
              Detect road accidents in images and video, classify their severity, and notify
              responders with an AI-generated assessment within seconds.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-9">
              <Link to="/login" className="btn-primary px-6 py-3">
                Get started <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <a href="#features" className="btn-ghost px-6 py-3">See how it works</a>
            </div>

            <div className="flex items-center gap-2 mt-8 text-sm text-slate-400">
              <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
              Decision support for human responders. Every alert is logged and auditable.
            </div>
          </div>

          {/* Product preview */}
          <div className="relative anim-fade-up [animation-delay:120ms]">
            <div className="absolute -inset-4 bg-gradient-to-tr from-brand-500/20 via-transparent to-red-500/10 rounded-[28px] blur-2xl" />
            <div className="relative card p-0 overflow-hidden shadow-lift">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-ink-900">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                <span className="ml-3 text-xs text-slate-400 font-mono">accidentai · image analysis</span>
              </div>
              <div className="relative">
                <img src="/demo-detection.jpg" alt="YOLO detecting a severe vehicle rollover" className="w-full aspect-[4/3] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent" />
                <div className="absolute top-4 right-4"><span className="rounded-full bg-ink-950/85 backdrop-blur"><SeverityBadge cls="severe" confidence={0.93} size="md" pulse /></span></div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/[0.06]">
                {[["CRITICAL", "Priority", "text-red-300"], ["Ambulance", "Dispatch", "text-white"], ["Sent", "WhatsApp", "text-emerald-300"]].map(([v, l, c]) => (
                  <div key={l} className="px-4 py-3">
                    <p className={`text-sm font-bold ${c}`}>{v}</p>
                    <p className="text-[11px] text-slate-400">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="relative border-y border-white/[0.06] bg-ink-900/50 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-2xl bg-ink-800 border border-white/[0.08] flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-brand-300" />
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-brand-500 text-ink-950 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
              </div>
              <div>
                <p className="font-semibold text-white">{title}</p>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-24 scroll-mt-16">
        <p className="eyebrow text-center">Capabilities</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-center mt-3 tracking-tight">From detection to dispatch</h2>
        <p className="text-slate-400 text-center mt-3 max-w-2xl mx-auto">One pipeline that sees the incident, understands its severity and gets the right people moving.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card card-hover group">
              <div className="w-11 h-11 rounded-xl bg-brand-500/10 border border-brand-400/20 flex items-center justify-center
                              group-hover:bg-brand-500/20 transition-colors">
                <Icon className="w-5 h-5 text-brand-300" />
              </div>
              <h3 className="font-semibold text-white mt-5">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed mt-2">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Model */}
      <section id="model" className="border-t border-white/[0.06] bg-ink-900/40 py-24 px-4 sm:px-6 scroll-mt-16">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="eyebrow">The model</p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 tracking-tight">Three severity classes, one clear scale</h2>
            <p className="text-slate-400 mt-4 leading-relaxed">
              A YOLOv12 detector fine-tuned on a labelled accident dataset. Each class maps to an incident
              priority used across alerts, the AI assessment and the PDF report.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
              {METRICS.map(([v, l]) => (
                <div key={l} className="card-sm">
                  <p className="text-2xl font-bold text-white num">{v}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">Validation metrics from the final training run.</p>
          </div>

          <div className="space-y-3">
            {["severe", "fire", "moderate"].map(k => {
              const c = CLASS_CONFIG[k];
              return (
                <div key={k} className="card card-hover flex items-start gap-4 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: c.color }} />
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
                       style={{ background: `${c.color}1a`, borderColor: `${c.color}40` }}>
                    <CpuChipIcon className="w-5 h-5" style={{ color: c.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{c.label}</p>
                      <span className="text-[11px] font-bold tracking-wider" style={{ color: c.text }}>{c.severity}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{c.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 py-24">
        <div className="relative max-w-4xl mx-auto card text-center py-14 overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-brand-500/15 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight">Ready to see it in action?</h2>
            <p className="text-slate-400 mt-3">Sign in and run your first detection in under a minute.</p>
            <Link to="/login" className="btn-primary px-7 py-3 mt-8">
              Launch console <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <Brand subtitle="Final Year Project" />
          <p>YOLOv12 · FastAPI · React · MySQL</p>
        </div>
      </footer>
    </div>
  );
}
