/**
 * AuthContext.jsx – Global authentication state
 *
 * Provides: user, token, loading, login(), logout(), isAdmin, isOperator
 */
import { createContext, useContext, useState } from "react";
import { authApi } from "../api/authApi";
import { clearAccessToken, setAccessToken } from "../api/tokenStore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      // authApi.login sends x-www-form-urlencoded (required by FastAPI OAuth2)
      const { data } = await authApi.login(username, password);
      setAccessToken(data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
    // Errors propagate up to the caller (Login.jsx handles them)
  };

  const logout = () => {
    clearAccessToken();
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
