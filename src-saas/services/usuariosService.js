import apiClient from "./apiClient";

export const getAssignableRoles = async () => {
  const response = await apiClient.get("/usuarios/catalogo/roles");
  return response.data?.data || [];
};

export const getUsuarios = async (params = {}) => {
  const response = await apiClient.get("/usuarios", { params });
  return response.data?.data || [];
};

export const getUsuarioById = async (idUsuario) => {
  const response = await apiClient.get(`/usuarios/${idUsuario}`);
  return response.data?.data;
};

export const createUsuario = async (payload) => {
  const response = await apiClient.post("/usuarios", payload);
  return response.data?.data;
};

export const updateUsuario = async (idUsuario, payload) => {
  const response = await apiClient.put(`/usuarios/${idUsuario}`, payload);
  return response.data?.data;
};

export const updateUsuarioEstado = async (idUsuario, activo) => {
  const response = await apiClient.patch(`/usuarios/${idUsuario}/estado`, {
    activo,
  });
  return response.data?.data;
};
