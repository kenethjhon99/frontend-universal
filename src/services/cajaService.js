import api from "./api";

export const getCajaSesionActiva = async () => {
  const response = await api.get("/caja/sesion-activa");
  return response.data;
};

export const abrirCaja = async (data) => {
  const response = await api.post("/caja/apertura", data);
  return response.data;
};

export const registrarMovimientoCaja = async (idSesion, data) => {
  const response = await api.post(`/caja/${idSesion}/movimientos`, data);
  return response.data;
};

export const cerrarCaja = async (idSesion, data) => {
  const response = await api.post(`/caja/${idSesion}/cierre`, data);
  return response.data;
};

export const validarNoCobroPendienteCaja = async (idSesion, data) => {
  const response = await api.post(`/caja/${idSesion}/pendientes/no-cobro/validar`, data);
  return response.data;
};

export const validarMovimientoPendienteCaja = async (idSesion, idMovimiento, data) => {
  const response = await api.post(
    `/caja/${idSesion}/pendientes/movimientos/${idMovimiento}/validar`,
    data
  );
  return response.data;
};

export const getCajaResumen = async (idSesion) => {
  const response = await api.get(`/caja/${idSesion}/resumen`);
  return response.data;
};

export const getCajaSesiones = async (params = {}) => {
  const response = await api.get("/caja/sesiones", { params });
  return response.data;
};
