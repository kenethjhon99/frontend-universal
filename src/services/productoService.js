import api from "./api";

export const getProductos = async (params = {}) => {
  const res = await api.get("/productos", { params });
  return res.data;
};

export const crearProducto = async (data) => {
  const res = await api.post("/productos", data);
  return res.data;
};

export const generarCodigoBarrasProducto = async () => {
  const res = await api.get("/productos/codigo-barras/generar");
  return res.data;
};

export const editarProducto = async (id, data) => {
  const res = await api.put(`/productos/${id}`, data);
  return res.data;
};

export const desactivarProducto = async (id) => {
  const res = await api.patch(`/productos/${id}/desactivar`);
  return res.data;
};
