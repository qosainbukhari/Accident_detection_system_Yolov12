import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/authApi";
import toast from "react-hot-toast";
import { EyeIcon, EyeSlashIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import Brand from "../components/Brand";
import SeverityBadge from "../components/SeverityBadge";

// ─────────────────────────────────────────────────────────────────
// Field is defined OUTSIDE Login so React never remounts it on
// re-render. Defining a component inside another component causes
// it to be destroyed + recreated every keystroke → focus loss.
// ─────────────────────────────────────────────────────────────────
function Field({ label, name, type, value, onChange, placeholder, error, autoComplete, children }) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          spellCheck={false}
          className={`input ${error ? "input-error" : ""}`}
        />
        {children}
      </div>
      {error && <p className="text-red-300 text-xs mt-1.5">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
export default function Login() {
  const [mode,    setMode]    = useState("login");
  const [form,    setForm]    = useState({ username: "", email: "", password: "" });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  // ── handlers ──────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: null }));
  };

  const switchMode = (m) => {
    setMode(m);
    setErrors({});
    setForm({ username: "", email: "", password: "" });
  };

  const parseError = (err) => {
    if (!err.response) {
      return "Cannot reach the backend. Is it running on port 8000?";
    }
    const { data, status } = err.response;

    // 422 – Pydantic validation errors
    if (status === 422 && Array.isArray(data?.detail)) {
      const fe   = {};
      const msgs = data.detail.map(e => {
        const field = e.loc?.[e.loc.length - 1];
        const msg   = (e.msg || "Invalid").replace("Value error, ", "");
        if (field && field !== "body") fe[field] = msg;
        return field ? `${field}: ${msg}` : msg;
      });
      setErrors(fe);
      return msgs.join(" · ");
    }

    // 400 / 401 / 403 – string detail
    if (typeof data?.detail === "string") return data.detail;

    return `Server error ${status}. Please try again.`;
  };

  // ── submit ─────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation for register
    if (mode === "register") {
      const fe = {};
      if (!form.username || form.username.trim().length < 3) fe.username = "Minimum 3 characters";
      if (!form.email    || !form.email.includes("@"))       fe.email    = "Enter a valid email";
      if (!form.password || form.password.length < 6)        fe.password = "Minimum 6 characters";
      if (Object.keys(fe).length) { setErrors(fe); return; }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.username, form.password);
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        await authApi.register({
          username: form.username.trim(),
          email:    form.email.trim(),
          password: form.password,
          role:     "viewer",
        });
        toast.success("Account created — sign in below.");
        switchMode("login");
      }
    } catch (err) {
      toast.error(parseError(err), { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-ink-950 grid lg:grid-cols-2">

      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden border-r border-white/[0.06]">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_75%)]" />
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-brand-500/10 blur-3xl" />
        <Link to="/" className="relative w-fit"><Brand /></Link>

        <div className="relative max-w-lg">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-lift">
            <img src="/demo-detection.jpg" alt="Model detecting a severe crash" className="w-full aspect-[16/10] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="rounded-full bg-ink-950/85 backdrop-blur"><SeverityBadge cls="severe" confidence={0.93} pulse /></span>
              <span className="text-xs text-slate-300 font-medium">Live model output</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mt-8 leading-tight tracking-tight">
            Detect road accidents in seconds.<br />
            <span className="text-brand-300">Alert responders automatically.</span>
          </h2>
          <div className="grid grid-cols-3 gap-3 mt-8">
            {[["92.5%", "Precision"], ["89.9%", "mAP@50"], ["3", "Severity classes"]].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3">
                <p className="text-xl font-bold text-white num">{v}</p>
                <p className="text-xs text-slate-400">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-500">Final Year Project · AI Accident Detection &amp; Emergency Response</p>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center p-6">
        <div className="absolute inset-0 lg:hidden bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative w-full max-w-[400px] anim-fade-up">
          <div className="lg:hidden mb-10 flex justify-center"><Brand /></div>

          <h1 className="text-2xl font-bold text-white tracking-tight">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            {mode === "login" ? "Sign in to the emergency response console." : "New accounts start with viewer access."}
          </p>

          {/* Mode tabs */}
          <div className="segmented w-full mt-7 mb-6">
            {["login", "register"].map(m => (
              <button key={m} type="button" onClick={() => switchMode(m)}
                className={`segmented-item flex-1 justify-center py-2 ${mode === m ? "segmented-item-active" : ""}`}>
                {m === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label="Username" name="username" type="text" value={form.username} onChange={handleChange}
              placeholder="your_username" error={errors.username} autoComplete="username" />

            {mode === "register" && (
              <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com" error={errors.email} autoComplete="email" />
            )}

            <Field label="Password" name="password" type={showPwd ? "text" : "password"} value={form.password}
              onChange={handleChange} placeholder="••••••••" error={errors.password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}>
              <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors">
                {showPwd ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </Field>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin shrink-0" /> Verifying…</>
              ) : (
                <>{mode === "login" ? "Sign in" : "Create account"} <ArrowRightIcon className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {mode === "login" && (
            <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <span className="text-xs text-slate-400">Demo account</span>
              <code className="text-xs font-mono text-slate-200">admin / admin123</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
