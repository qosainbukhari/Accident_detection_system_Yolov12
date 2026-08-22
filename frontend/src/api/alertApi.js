import api from "./axiosClient";

export const alertApi = {
  getAlerts:   (skip = 0, limit = 20) => api.get("/alerts",       { params: { skip, limit } }),
  getCallLogs: (skip = 0, limit = 20) => api.get("/alerts/calls", { params: { skip, limit } }),
  testEmail:   ()                     => api.post("/alerts/test-email"),
  testCall:    ()                     => api.post("/alerts/test-call"),
  getStats:    ()                     => api.get("/dashboard/stats"),
  getTimeline: (days = 7)             => api.get("/dashboard/timeline", { params: { days } }),
  getConfDist: ()                     => api.get("/dashboard/confidence-distribution"),
};
