import api from "./api";

export const getTecnicosServicio = async () => {
  const res = await api.get("/servicios/tecnicos");
  return res.data;
};

export const getAutolavadoCatalogo = async () => {
  const res = await api.get("/servicios/autolavado/catalogo");
  return res.data;
};

export const crearTipoVehiculoAutolavado = async (data) => {
  const res = await api.post("/servicios/autolavado/vehiculos", data);
  return res.data;
};

export const editarTipoVehiculoAutolavado = async (id, data) => {
  const res = await api.put(`/servicios/autolavado/vehiculos/${id}`, data);
  return res.data;
};

export const crearServicioAutolavado = async (data) => {
  const res = await api.post("/servicios/autolavado/catalogo", data);
  return res.data;
};

export const editarServicioAutolavado = async (id, data) => {
  const res = await api.put(`/servicios/autolavado/catalogo/${id}`, data);
  return res.data;
};

export const cobrarServicioAutolavado = async (data) => {
  const res = await api.post("/servicios/autolavado/cobros", data);
  return res.data;
};

export const getOrdenesAutolavado = async (params = {}) => {
  const res = await api.get("/servicios/autolavado/ordenes", { params });
  return res.data;
};

export const actualizarEstadoOrdenAutolavado = async (id, data) => {
  const res = await api.patch(`/servicios/autolavado/ordenes/${id}/estado`, data);
  return res.data;
};

export const asignarTecnicoOrdenAutolavado = async (id, data) => {
  const res = await api.patch(`/servicios/autolavado/ordenes/${id}/tecnico`, data);
  return res.data;
};

export const getReparacionCatalogo = async () => {
  const res = await api.get("/servicios/reparacion/catalogo");
  return res.data;
};

export const crearTipoVehiculoReparacion = async (data) => {
  const res = await api.post("/servicios/reparacion/vehiculos", data);
  return res.data;
};

export const editarTipoVehiculoReparacion = async (id, data) => {
  const res = await api.put(`/servicios/reparacion/vehiculos/${id}`, data);
  return res.data;
};

export const crearServicioReparacion = async (data) => {
  const res = await api.post("/servicios/reparacion/catalogo", data);
  return res.data;
};

export const editarServicioReparacion = async (id, data) => {
  const res = await api.put(`/servicios/reparacion/catalogo/${id}`, data);
  return res.data;
};

export const cobrarServicioReparacion = async (data) => {
  const res = await api.post("/servicios/reparacion/cobros", data);
  return res.data;
};

export const crearOrdenReparacion = async (data) => {
  const res = await api.post("/servicios/reparacion/ordenes", data);
  return res.data;
};

export const getOrdenesReparacion = async (params = {}) => {
  const res = await api.get("/servicios/reparacion/ordenes", { params });
  return res.data;
};

export const cobrarOrdenReparacion = async (id, data) => {
  const res = await api.post(`/servicios/reparacion/ordenes/${id}/cobro`, data);
  return res.data;
};

export const agregarProductoReparacion = async (id, data) => {
  const res = await api.post(`/servicios/reparacion/ordenes/${id}/productos`, data);
  return res.data;
};

export const actualizarEstadoOrdenReparacion = async (id, data) => {
  const res = await api.patch(`/servicios/reparacion/ordenes/${id}/estado`, data);
  return res.data;
};

export const asignarTecnicoOrdenReparacion = async (id, data) => {
  const res = await api.patch(`/servicios/reparacion/ordenes/${id}/tecnico`, data);
  return res.data;
};
