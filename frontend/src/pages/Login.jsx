import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/authApi";
import toast from "react-hot-toast";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

// ─────────────────────────────────────────────────────────────────
// Field is defined OUTSIDE Login so React never remounts it on
// re-render. Defining a component inside another component causes
// it to be destroyed + recreated every keystroke → focus loss.
// ─────────────────────────────────────────────────────────────────
function Field({ label, name, type, value, onChange, placeholder, error, autoComplete, children }) {
  return (
    <div>
      <label htmlFor={name}
        className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
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
      {error && (
        <p className="text-rose-400 text-[11px] mt-1">⚠ {error}</p>
      )}
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
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">

      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-[380px] anim-fade-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12
                          bg-indigo-600 rounded-2xl mb-4 shadow-glow">
            <svg viewBox="0 0 20 20" fill="white" className="w-6 h-6">
              <path fillRule="evenodd"
                d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0
                   5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682
                   -.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0
                   11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
                clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">AccidentAI</h1>
          <p className="text-slate-500 text-sm mt-1">Emergency Response Platform</p>
        </div>

        {/* Card */}
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-7 shadow-2xl">

          {/* Mode tabs */}
          <div className="flex bg-[#0f1117] rounded-xl p-1 mb-6 gap-1">
            {["login", "register"].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all
                  ${mode === m
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-500 hover:text-slate-300"
                  }`}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Username */}
            <Field
              label="Username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="your_username"
              error={errors.username}
              autoComplete="username"
            />

            {/* Email — register only */}
            {mode === "register" && (
              <Field
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                error={errors.email}
                autoComplete="email"
              />
            )}

            {/* Password */}
            <Field
              label="Password"
              name="password"
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              error={errors.password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            >
              {/* Show / hide toggle */}
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                           text-slate-600 hover:text-slate-400 transition-colors"
              >
                {showPwd
                  ? <EyeSlashIcon className="w-4 h-4" />
                  : <EyeIcon      className="w-4 h-4" />
                }
              </button>
            </Field>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-1 py-2.5"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                   rounded-full animate-spin shrink-0" />
                  Verifying…
                </>
              ) : (
                mode === "login" ? "Sign In" : "Create Account"
              )}
            </button>
          </form>

          {/* Hint */}
          {mode === "login" && (
            <p className="text-center text-[11px] text-slate-600 mt-4">
              Default&nbsp;
              <code className="text-slate-500 bg-white/[0.05] px-1.5 py-0.5 rounded">
                admin / admin123
              </code>
            </p>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-700 mt-5">
          Backend → <code className="text-slate-600">localhost:8000</code>
        </p>
      </div>
    </div>
  );
}
