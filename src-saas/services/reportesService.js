import apiClient from "./apiClient";

export const getReporteGeneral = async (params = {}, { branchId } = {}) => {
  const response = await apiClient.get("/reportes/general", {
    params,
    saasBranchId: branchId,
  });

  return response.data?.data || null;
};

/**
 * Corte simple de ventas (resumen + por_usuario).
 * Params: desde, hasta, id_sucursal?, id_usuario?, vista? ("EMPRESA" | "SUCURSAL")
 */
export const getCorteVentas = async (params = {}, { branchId } = {}) => {
  const response = await apiClient.get("/reportes/corte", {
    params,
    saasBranchId: branchId,
  });

  return response.data?.data || null;
};

/**
 * Corte detallado pro (resumen + ventas paginadas + por_usuario + por_metodo
 * + por_tipo + top productos por total y por cantidad).
 * Params adicionales: page, limit, top
 */
export const getCorteVentasDetalladoPro = async (
  params = {},
  { branchId } = {}
) => {
  const response = await apiClient.get("/reportes/corte-detallado-pro", {
    params,
    saasBranchId: branchId,
  });

  return response.data?.data || null;
};
