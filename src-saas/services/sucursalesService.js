import apiClient from "./apiClient";

export const getSucursales = async () => {
  const response = await apiClient.get("/sucursales");
  return response.data?.data || [];
};
