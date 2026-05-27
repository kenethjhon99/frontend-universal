import apiClient from "./apiClient";

export const getCajaSesionActiva = async (options = {}) => {
  const response = await apiClient.get("/caja/sesion-activa", {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

export const getCajaSesiones = async (params = {}, options = {}) => {
  const response = await apiClient.get("/caja/sesiones", {
    params,
    saasBranchId: options.branchId,
  });
  return response.data?.data || [];
};

export const getCajaResumen = async (idCajaSesion, options = {}) => {
  const response = await apiClient.get(`/caja/${idCajaSesion}/resumen`, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

export const openCaja = async (payload, options = {}) => {
  const response = await apiClient.post("/caja/apertura", payload, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

export const createCajaMovimiento = async (
  idCajaSesion,
  payload,
  options = {}
) => {
  const response = await apiClient.post(
    `/caja/${idCajaSesion}/movimientos`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const closeCaja = async (idCajaSesion, payload, options = {}) => {
  const response = await apiClient.post(
    `/caja/${idCajaSesion}/cierre`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

/**
 * Valida un no-cobrado pendiente de la sesion (admin password requerido).
 * payload: { id_venta, admin_username, admin_password, validacion_nota }
 */
export const validateNoCobroPendiente = async (
  idCajaSesion,
  payload,
  options = {}
) => {
  const response = await apiClient.post(
    `/caja/${idCajaSesion}/pendientes/no-cobro/validar`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

/**
 * Valida un movimiento manual pendiente de la sesion (admin password requerido).
 * payload: { admin_username, admin_password, autorizacion_admin_nota }
 */
export const validateCajaMovimientoPendiente = async (
  idCajaSesion,
  idCajaMovimiento,
  payload,
  options = {}
) => {
  const response = await apiClient.post(
    `/caja/${idCajaSesion}/pendientes/movimientos/${idCajaMovimiento}/validar`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};
