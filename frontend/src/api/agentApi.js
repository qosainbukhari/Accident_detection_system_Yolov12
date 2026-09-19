import api from "./axiosClient";

export const pollAgentReport = async (detectionId, attempts = 90, delayMs = 1000) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await api.get(`/agent/report/${detectionId}`);
      if (response.data?.incident_level !== "PENDING") return response.data;
    } catch (error) {
      if (error.response?.status !== 404 || attempt === attempts - 1) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  throw new Error("AI emergency assessment timed out");
};

export const agentApi = {
  getReport: (detectionId) => api.get(`/agent/report/${detectionId}`),
  getReports: (skip = 0, limit = 20, whatsappOnly = false) =>
    api.get("/agent/reports", { params: { skip, limit, whatsapp_only: whatsappOnly } }),
  getStatus: () => api.get("/agent/status"),
  testWhatsApp: () => api.post("/agent/test-whatsapp"),
};
