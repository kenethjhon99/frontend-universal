import apiClient from "./apiClient";

export const getCompras = async (params = {}, options = {}) => {
  const response = await apiClient.get("/compras", {
    params,
    saasBranchId: options.branchId,
  });
  return response.data?.data || [];
};

export const createCompra = async (payload, options = {}) => {
  const response = await apiClient.post("/compras", payload, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

export const getCompraById = async (idCompra, options = {}) => {
  const response = await apiClient.get(`/compras/${idCompra}`, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

export const createCompraDevolucion = async (
  idCompra,
  payload,
  options = {}
) => {
  const response = await apiClient.post(
    `/compras/${idCompra}/devoluciones`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const createCompraAjusteCosto = async (
  idCompra,
  payload,
  options = {}
) => {
  const response = await apiClient.post(
    `/compras/${idCompra}/ajustes-costo`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};
