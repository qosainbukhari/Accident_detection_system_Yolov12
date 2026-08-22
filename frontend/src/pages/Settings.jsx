import { useEffect, useState } from "react";
import { authApi } from "../api/authApi";
import { CpuChipIcon, BellAlertIcon, PhoneIcon, ServerIcon, KeyIcon } from "@heroicons/react/24/outline";

export default function Settings() {
  const [profile, setProfile] = useState(null);
  useEffect(() => { authApi.getMe().then(r => setProfile(r.data)).catch(() => {}); }, []);

  return (
    <div className="space-y-5 anim-fade-up max-w-xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">System configuration and profile</p>
      </div>

      <Section title="Your Profile" icon={KeyIcon}>
        <Row label="Username"  value={profile?.username} />
        <Row label="Email"     value={profile?.email} />
        <Row label="Role"      value={<RolePill role={profile?.role} />} />
        <Row label="Status"    value={profile?.is_active ? "Active" : "Inactive"} />
        <Row label="Joined"    value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"} />
      </Section>

      <Section title="AI Model" icon={CpuChipIcon}>
        <Row label="Model"      value="YOLOv12m (Custom Fine-Tuned)" />
        <Row label="Classes"    value="fire · moderate · severe" />
        <Row label="Confidence" value="0.45 threshold" />
        <Row label="IoU"        value="0.45 threshold" />
        <Row label="Input Size" value="640 × 640 px" />
        <Row label="Framework"  value="Ultralytics 8.3+" />
      </Section>

      <Section title="Alert System" icon={BellAlertIcon}>
        <Row label="Trigger Classes" value="fire, severe, moderate" />
        <Row label="Email Provider"  value="Gmail SMTP" />
        <Row label="Cooldown"        value="Disabled for detections" />
        <Row label="Max Upload"      value="100 MB" />
      </Section>

      <Section title="Emergency Calls" icon={PhoneIcon}>
        <Row label="Provider"    value="Free mock by default" />
        <Row label="Call Cooldown" value="Disabled for detections" />
        <Row label="Voice Engine" value="Twilio Alice (TTS) when enabled" />
        <Row label="Repeat"      value="3× per call" />
      </Section>

      <Section title="System" icon={ServerIcon}>
        <Row label="Backend"    value="FastAPI 0.111 · Python 3.11" />
        <Row label="Database"   value="MySQL 8 · SQLAlchemy ORM" />
        <Row label="Frontend"   value="React 18 · Vite · Tailwind" />
        <Row label="Container"  value="Docker Compose" />
        <Row label="Version"    value="v2.0.0" mono />
      </Section>

      {/* API Docs link */}
      <div className="card flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-200">API Documentation</p>
          <p className="text-xs text-slate-600 mt-0.5">Interactive Swagger UI</p>
        </div>
        <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer"
           className="btn-primary text-xs px-4 py-2">
          Open Docs →
        </a>
      </div>
    </div>
  );
}

const Section = ({ title, icon: Icon, children }) => (
  <div className="card space-y-0 p-0 overflow-hidden">
    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06]">
      <Icon className="w-4 h-4 text-indigo-400" />
      <p className="text-sm font-semibold text-slate-200">{title}</p>
    </div>
    <div className="divide-y divide-white/[0.04] px-5">
      {children}
    </div>
  </div>
);

const Row = ({ label, value, mono }) => (
  <div className="flex justify-between items-center py-3 gap-4">
    <span className="text-xs text-slate-500">{label}</span>
    <span className={`text-xs font-medium text-slate-300 text-right ${mono ? "font-mono" : ""}`}>
      {value ?? "—"}
    </span>
  </div>
);

const RolePill = ({ role }) => {
  const map = {
    admin:    "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
    operator: "bg-sky-500/15 text-sky-300 border-sky-500/20",
    viewer:   "bg-slate-500/15 text-slate-400 border-slate-500/20",
  };
  return (
    <span className={`badge border capitalize ${map[role] ?? map.viewer}`}>
      {role ?? "viewer"}
    </span>
  );
};
