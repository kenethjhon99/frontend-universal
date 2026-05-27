import apiClient from "./apiClient";

export const getProveedores = async (params = {}) => {
  const response = await apiClient.get("/proveedores", { params });
  return response.data?.data || [];
};

export const createProveedor = async (payload) => {
  const response = await apiClient.post("/proveedores", payload);
  return response.data?.data;
};

export const updateProveedor = async (idProveedor, payload) => {
  const response = await apiClient.put(`/proveedores/${idProveedor}`, payload);
  return response.data?.data;
};

export const deactivateProveedor = async (idProveedor) => {
  const response = await apiClient.delete(`/proveedores/${idProveedor}`);
  return response.data?.data;
};

/**
 * G8 - Activar / desactivar coherente.
 * payload: { activo: boolean }
 */
export const setProveedorEstado = async (idProveedor, activo) => {
  const response = await apiClient.patch(
    `/proveedores/${idProveedor}/estado`,
    { activo }
  );
  return response.data?.data;
};
