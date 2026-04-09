import api from "./api";

export const getCompras = async (params = {}) => {
  const res = await api.get("/compras", { params });
  return res.data;
};

export const crearCompra = async (data) => {
  const res = await api.post("/compras", data);
  return res.data;
};

export const getCompraById = async (id) => {
  const res = await api.get(`/compras/${id}`);
  return res.data;
};

export const anularCompra = async (id, data) => {
  const res = await api.patch(`/compras/${id}/anular`, data);
  return res.data;
};

export const anularDetalleCompra = async (idCompra, idDetalle, data) => {
  const res = await api.patch(`/compras/${idCompra}/detalles/${idDetalle}/anular`, data);
  return res.data;
};
