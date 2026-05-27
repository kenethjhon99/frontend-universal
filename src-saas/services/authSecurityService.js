import apiClient from "./apiClient";

export const requestPasswordReset = async (email) => {
  const response = await apiClient.post("/auth/password-reset/request", {
    email,
  });
  return response.data;
};

export const confirmPasswordReset = async ({ token, newPassword }) => {
  const response = await apiClient.post("/auth/password-reset/confirm", {
    token,
    new_password: newPassword,
  });
  return response.data;
};

export const listSessions = async () => {
  const response = await apiClient.get("/auth/sessions");
  return response.data?.sessions || [];
};

export const revokeSession = async (idRefreshToken) => {
  const response = await apiClient.delete(`/auth/sessions/${idRefreshToken}`);
  return response.data;
};

export const logoutAllSessions = async () => {
  const response = await apiClient.post("/auth/logout-all");
  return response.data;
};

