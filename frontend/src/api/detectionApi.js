import api from "./axiosClient";

export const detectionApi = {
  detectImage: (file, location = "Unknown", onUploadProgress) => {
    const form = new FormData();
    form.append("file", file);
    form.append("location", location);
    return api.post("/detection/image", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
  },

  detectVideo: (file, location = "Unknown", onUploadProgress) => {
    const form = new FormData();
    form.append("file", file);
    form.append("location", location);
    return api.post("/detection/video", form, {
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
