import api from "./api";

export const getClientes = async (params = {}) => {
  const res = await api.get("/clientes", { params });
  return res.data;
};

export const crearCliente = async (data) => {
  const res = await api.post("/clientes", data);
  return res.data;
};

export const editarCliente = async (id, data) => {
  const res = await api.put(`/clientes/${id}`, data);
  return res.data;
};

export const desactivarCliente = async (id) => {
  const res = await api.patch(`/clientes/${id}/desactivar`);
  return res.data;
};
