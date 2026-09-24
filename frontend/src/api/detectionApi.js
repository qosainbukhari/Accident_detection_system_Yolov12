import api from "./axiosClient";

export const detectionApi = {
  detectImage: (file, location = "Unknown", onUploadProgress) => {
    const form = new FormData();
    form.append("file", file);
    // The backend reads location as a query parameter, not a form field.
    return api.post("/detection/image", form, {
      params: { location },
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
  },

  detectVideo: (file, location = "Unknown", onUploadProgress) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/detection/video", form, {
      params: { location },
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
  },

  getVideoJob: (jobId) => api.get(`/detection/video/jobs/${jobId}`),

  getHistory: (skip = 0, limit = 20) =>
    api.get("/detection/history", { params: { skip, limit } }),

  getEvent: (id) => api.get(`/detection/history/${id}`),

  updateStatus: (id, status) =>
    api.patch(`/detection/history/${id}/status`, null, { params: { status } }),

  deleteEvent: (id) => api.delete(`/detection/history/${id}`),
};
