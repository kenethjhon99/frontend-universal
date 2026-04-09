import api from "./api";

export const getReporteGeneral = async (params = {}) => {
  const response = await api.get("/reportes/general", { params });
  return response.data;
};
