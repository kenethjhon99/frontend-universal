import api from "./api";

export const getProveedores = async (params = {}) => {
  const res = await api.get("/proveedores", { params });
  return res.data;
};

export const crearProveedor = async (data) => {
  const res = await api.post("/proveedores", data);
  return res.data;
};

export const editarProveedor = async (id, data) => {
  const res = await api.put(`/proveedores/${id}`, data);
  return res.data;
};

export const desactivarProveedor = async (id) => {
  const res = await api.patch(`/proveedores/${id}/desactivar`);
  return res.data;
};
