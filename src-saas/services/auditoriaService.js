import apiClient from "./apiClient";

export const getAuditoriaEventos = async (params = {}) => {
  const response = await apiClient.get("/auditoria", { params });
  return response.data?.data || [];
};
