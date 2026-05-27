import apiClient from "./apiClient";

export const getClientes = async (params = {}) => {
  const response = await apiClient.get("/clientes", { params });
  return response.data?.data || [];
};

export const createCliente = async (payload) => {
  const response = await apiClient.post("/clientes", payload);
  return response.data?.data;
};

export const updateCliente = async (idCliente, payload) => {
  const response = await apiClient.put(`/clientes/${idCliente}`, payload);
  return response.data?.data;
};

export const deactivateCliente = async (idCliente) => {
  const response = await apiClient.delete(`/clientes/${idCliente}`);
  return response.data?.data;
};

/**
 * G8 - Activar / desactivar coherente.
 * payload: { activo: boolean }
 */
export const setClienteEstado = async (idCliente, activo) => {
  const response = await apiClient.patch(`/clientes/${idCliente}/estado`, {
    activo,
  });
  return response.data?.data;
};
