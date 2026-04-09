import api from "./api";

export const crearVenta = async (data) => {
  const res = await api.post("/ventas", data);
  return res.data;
};

export const getCatalogoComprobantesVenta = async () => {
  const res = await api.get("/ventas/comprobantes/catalogo");
  return res.data;
};

export const getVentas = async (params = {}) => {
  const res = await api.get("/ventas", { params });
  return res.data;
};

export const anularVenta = async (id_venta, data) => {
  const res = await api.post(`/ventas/${id_venta}/anular`, data);
  return res.data;
};

export const anularDetalleVenta = async (id_venta, id_detalle, data) => {
  const res = await api.post(`/ventas/${id_venta}/detalles/${id_detalle}/anular`, data);
  return res.data;
};

export const getVentaCompleta = async (id_venta) => {
  const res = await api.get(`/ventas/${id_venta}/completa`);
  return res.data;
};
