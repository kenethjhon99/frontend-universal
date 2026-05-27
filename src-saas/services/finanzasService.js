import apiClient from "./apiClient";

export const getFinanzasOverview = async (options = {}) => {
  const response = await apiClient.get("/finanzas/overview", {
    saasBranchId: options.branchId,
  });

  return response.data?.data || null;
};

export const getCuentasPorCobrar = async (params = {}, options = {}) => {
  const response = await apiClient.get("/finanzas/cxc", {
    params,
    saasBranchId: options.branchId,
  });

  return response.data?.data || [];
};

export const getCuentaPorCobrarById = async (idCuenta, options = {}) => {
  const response = await apiClient.get(`/finanzas/cxc/${idCuenta}`, {
    saasBranchId: options.branchId,
  });

  return response.data?.data || null;
};

export const createCobroCuentaPorCobrar = async (
  idCuenta,
  payload,
  options = {}
) => {
  const response = await apiClient.post(
    `/finanzas/cxc/${idCuenta}/cobros`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );

  return response.data?.data || null;
};

export const getCuentasPorPagar = async (params = {}, options = {}) => {
  const response = await apiClient.get("/finanzas/cxp", {
    params,
    saasBranchId: options.branchId,
  });

  return response.data?.data || [];
};

export const getCuentaPorPagarById = async (idCuenta, options = {}) => {
  const response = await apiClient.get(`/finanzas/cxp/${idCuenta}`, {
    saasBranchId: options.branchId,
  });

  return response.data?.data || null;
};

export const createPagoCuentaPorPagar = async (
  idCuenta,
  payload,
  options = {}
) => {
  const response = await apiClient.post(
    `/finanzas/cxp/${idCuenta}/pagos`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );

  return response.data?.data || null;
};

export const getNotasFormales = async (params = {}, options = {}) => {
  const response = await apiClient.get("/finanzas/notas", {
    params,
    saasBranchId: options.branchId,
  });

  return response.data?.data || [];
};

export const createNotaFormal = async (payload, options = {}) => {
  const response = await apiClient.post("/finanzas/notas", payload, {
    saasBranchId: options.branchId,
  });

  return response.data?.data || null;
};

export const getCierresPeriodo = async (params = {}, options = {}) => {
  const response = await apiClient.get("/finanzas/cierres", {
    params,
    saasBranchId: options.branchId,
  });

  return response.data?.data || [];
};

export const createCierrePeriodo = async (payload, options = {}) => {
  const response = await apiClient.post("/finanzas/cierres", payload, {
    saasBranchId: options.branchId,
  });

  return response.data?.data || null;
};
