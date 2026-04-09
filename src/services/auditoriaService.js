import api from "./api";

export const getAuditoriaCatalogo = async (params = {}) => {
  const response = await api.get("/reportes/auditoria", { params });
  return response.data;
};
