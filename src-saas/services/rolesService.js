import apiClient from "./apiClient";

export const getCatalogoPermisos = async () => {
  const response = await apiClient.get("/roles/catalogo-permisos");
  return response.data?.data || [];
};

export const getRolesDisponibles = async () => {
  const response = await apiClient.get("/roles");
  return response.data?.data || [];
};

export const createRolCustom = async (payload) => {
  const response = await apiClient.post("/roles", payload);
  return response.data?.data;
};

export const updateRolCustom = async (idRol, payload) => {
  const response = await apiClient.put(`/roles/${idRol}`, payload);
  return response.data?.data;
};

export const deleteRolCustom = async (idRol) => {
  const response = await apiClient.delete(`/roles/${idRol}`);
  return response.data;
};
