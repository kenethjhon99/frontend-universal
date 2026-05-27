import apiClient from "./apiClient";

export const getMetrics = async () => {
  const response = await apiClient.get("/platform/metrics");
  return response.data;
};

export const suspendEmpresa = async (idEmpresa, motivo) => {
  const response = await apiClient.post(
    `/platform/empresas/${idEmpresa}/suspend`,
    { motivo }
  );
  return response.data;
};

export const reactivateEmpresa = async (idEmpresa) => {
  const response = await apiClient.post(
    `/platform/empresas/${idEmpresa}/reactivate`
  );
  return response.data;
};

export const impersonateEmpresa = async (idEmpresa) => {
  const response = await apiClient.post(
    `/platform/empresas/${idEmpresa}/impersonate`
  );
  return response.data;
};
