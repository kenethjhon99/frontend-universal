import apiClient from "./apiClient";

export const getStatus = async () => {
  const response = await apiClient.get("/mfa/status");
  return response.data;
};

export const enroll = async () => {
  const response = await apiClient.post("/mfa/enroll");
  return response.data;
};

export const verifyEnrollment = async (code) => {
  const response = await apiClient.post("/mfa/verify-enroll", { code });
  return response.data;
};

export const disable = async (password) => {
  const response = await apiClient.post("/mfa/disable", { password });
  return response.data;
};

export const regenerateBackupCodes = async () => {
  const response = await apiClient.post("/mfa/regenerate-backup-codes");
  return response.data;
};
