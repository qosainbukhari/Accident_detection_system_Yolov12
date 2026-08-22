import api from "./axiosClient";

export const authApi = {
  /**
   * Register a new user.
   * Sends JSON: { username, email, password, role }
   */
  register: (data) => api.post("/auth/register", data),

  /**
   * Login with username + password.
   *
   * IMPORTANT: FastAPI's OAuth2PasswordRequestForm requires
   * application/x-www-form-urlencoded — NOT JSON.
   * Sending JSON causes a 422 "field required" error.
   */
  login: (username, password) => {
    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);
    return api.post("/auth/login", body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },

  getMe: () => api.get("/auth/me"),
};
