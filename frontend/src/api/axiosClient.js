/**
 * axiosClient.js – Base Axios instance
 *
 * Features:
 *  - Auto-attaches the in-memory JWT Bearer token on every request
 *  - 401 → clears token + redirects to /login
 *  - 422 → flattens Pydantic validation errors into a readable string
 *          and attaches it as error.friendlyMessage
 */
import axios from "axios";
import { API_BASE } from "../utils/constants";
import { clearAccessToken, getAccessToken } from "./tokenStore";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120_000,    // 2 min – large video uploads
});

// ── Request: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: handle errors ──────────────────────────────────────
api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error?.response?.status;
    const data   = error?.response?.data;

    // 401 → session expired or invalid token → force re-login
    if (status === 401) {
      clearAccessToken();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    // 422 Unprocessable Entity → Pydantic validation errors
    // FastAPI format: { detail: [ { loc: [...], msg: "...", type: "..." }, ... ] }
    if (status === 422 && Array.isArray(data?.detail)) {
      const messages = data.detail.map((e) => {
        const field = e.loc?.[e.loc.length - 1];
        // Strip "Value error, " prefix that Pydantic v2 adds
        const msg = (e.msg || "").replace(/^value error,\s*/i, "");
        return field && field !== "body" ? `${field}: ${msg}` : msg;
      });
      error.friendlyMessage = messages.join(" | ");
    }

    // 400 → plain string detail from our route handlers
    if (status === 400 && typeof data?.detail === "string") {
      error.friendlyMessage = data.detail;
    }

    return Promise.reject(error);
  }
);

export default api;
