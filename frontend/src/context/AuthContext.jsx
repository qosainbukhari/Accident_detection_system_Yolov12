/**
 * AuthContext.jsx – Global authentication state
 *
 * Provides: user, token, loading, login(), logout(), isAdmin, isOperator
 */
import { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [token,   setToken]   = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);

  // On mount: if we have a token but no user object, re-fetch from /auth/me
  useEffect(() => {
    if (token && !user) {
      authApi
        .getMe()
        .then((r) => {
          setUser(r.data);
          localStorage.setItem("user", JSON.stringify(r.data));
        })
        .catch(() => logout());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (username, password) => {
    setLoading(true);
    try {
      // authApi.login sends x-www-form-urlencoded (required by FastAPI OAuth2)
      const { data } = await authApi.login(username, password);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user",  JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
    // Errors propagate up to the caller (Login.jsx handles them)
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const isAdmin    = user?.role === "admin";
  const isOperator = ["admin", "operator"].includes(user?.role);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, isAdmin, isOperator }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
