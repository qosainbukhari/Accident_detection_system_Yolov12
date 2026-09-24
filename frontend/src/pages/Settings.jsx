import { useEffect, useState } from "react";
import { authApi } from "../api/authApi";
import { agentApi } from "../api/agentApi";
import PageHeader from "../components/PageHeader";
import { API_BASE } from "../utils/constants";
import { fmtDate } from "../utils/helpers";
import {
  CpuChipIcon, BellAlertIcon, ServerStackIcon, UserCircleIcon, SparklesIcon,
  ArrowTopRightOnSquareIcon, CheckCircleIcon, MinusCircleIcon,
} from "@heroicons/react/24/outline";

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [agent, setAgent] = useState(null);

  useEffect(() => {
    authApi.getMe().then(r => setProfile(r.data)).catch(() => {});
    agentApi.getStatus().then(r => setAgent(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 anim-fade-up">
      <PageHeader eyebrow="System" title="Settings" subtitle="Your profile and the current system configuration." />

      {/* Profile banner */}
      <div className="card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center
                          text-2xl font-bold text-white uppercase shadow-brand">
            {profile?.username?.[0] ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-white">{profile?.username ?? "—"}</p>
            <p className="text-sm text-slate-400">{profile?.email ?? "—"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <RolePill role={profile?.role} />
            <span className={`badge ${profile?.is_active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-500/30 bg-slate-500/10 text-slate-300"}`}>
              {profile?.is_active ? "Active" : "Inactive"}
            </span>
            <span className="badge border-white/10 bg-white/[0.03] text-slate-300">
              Joined {profile?.created_at ? fmtDate(profile.created_at).split(",")[0] : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Detection model" icon={CpuChipIcon}>
          <Row label="Architecture" value="YOLOv12 · custom fine-tuned" />
          <Row label="Classes"      value="severe · fire · moderate" />
          <Row label="Confidence threshold" value="0.45" mono />
          <Row label="IoU threshold" value="0.45" mono />
          <Row label="Input size"   value="640 × 640 px" mono />
          <Row label="Video alerting" value="3 consecutive confirmed frames" />
        </Section>

        <Section title="AI emergency agent" icon={SparklesIcon}>
          <Row label="Agent" value={<Status on={agent?.agent_enabled} />} />
          <Row label="Gemini" value={<Status on={agent?.gemini_configured} onText="Configured" offText="Rule-based fallback" />} />
          <Row label="Model" value={agent?.gemini_model} mono />
          <Row label="WhatsApp" value={<Status on={agent?.whatsapp_enabled} />} />
          <Row label="Kapso provider" value={<Status on={agent?.whatsapp_configured} onText="Connected" offText="Mock / not configured" />} />
        </Section>

        <Section title="Alerting" icon={BellAlertIcon}>
          <Row label="Trigger classes" value="severe, fire, moderate" />
          <Row label="Email provider"  value="SMTP (Gmail)" />
          <Row label="Channels"        value="Email · WhatsApp · AI PDF report" />
          <Row label="Max upload"      value="100 MB" mono />
        </Section>

        <Section title="Platform" icon={ServerStackIcon}>
          <Row label="Backend"   value="FastAPI · Python" />
          <Row label="Database"  value="MySQL 8 · SQLAlchemy" />
          <Row label="Frontend"  value="React 18 · Vite · Tailwind" />
          <Row label="Deployment" value="Docker Compose" />
          <Row label="API" value={API_BASE} mono />
        </Section>
      </div>

      <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserCircleIcon className="w-8 h-8 text-brand-300" />
          <div>
            <p className="card-title">API documentation</p>
            <p className="card-subtitle">Interactive Swagger UI (available when ENABLE_DOCS=true)</p>
          </div>
        </div>
        <a href={`${API_BASE}/docs`} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">
          Open docs <ArrowTopRightOnSquareIcon className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

const Section = ({ title, icon: Icon, children }) => (
  <div className="card p-0 overflow-hidden">
    <div className="card-header justify-start">
      <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-400/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-brand-300" />
      </div>
      <p className="card-title">{title}</p>
    </div>
    <div className="divide-y divide-white/[0.05] px-5">{children}</div>
  </div>
);

const Row = ({ label, value, mono }) => (
  <div className="flex justify-between items-center py-3 gap-4">
    <span className="text-sm text-slate-400">{label}</span>
    <span className={`text-sm font-medium text-slate-100 text-right truncate ${mono ? "font-mono text-[13px]" : ""}`}>
      {value ?? "—"}
    </span>
  </div>
);

const Status = ({ on, onText = "Enabled", offText = "Disabled" }) => {
  if (on === undefined) return <span className="text-slate-500">—</span>;
  return on
    ? <span className="inline-flex items-center gap-1.5 text-emerald-300"><CheckCircleIcon className="w-4 h-4" />{onText}</span>
    : <span className="inline-flex items-center gap-1.5 text-slate-400"><MinusCircleIcon className="w-4 h-4" />{offText}</span>;
};

const RolePill = ({ role }) => {
  const map = {
    admin:    "bg-brand-500/10 text-brand-200 border-brand-400/30",
    operator: "bg-violet-500/10 text-violet-200 border-violet-400/30",
    viewer:   "bg-slate-500/10 text-slate-300 border-slate-500/30",
  };
  return <span className={`badge capitalize ${map[role] ?? map.viewer}`}>{role ?? "viewer"}</span>;
};
