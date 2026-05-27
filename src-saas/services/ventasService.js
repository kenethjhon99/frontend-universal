import apiClient from "./apiClient";

/**
 * @typedef {import("../types/shared").VentaCreate} VentaCreate
 * @typedef {import("../types/shared").VentaReversion} VentaReversion
 * @typedef {import("../types/shared").VentaResponse} VentaResponse
 */

/**
 * @param {Record<string, any>} [params]
 * @param {{ branchId?: number }} [options]
 * @returns {Promise<VentaResponse[]>}
 */
export const getVentas = async (params = {}, options = {}) => {
  const response = await apiClient.get("/ventas", {
    params,
    saasBranchId: options.branchId,
  });
  return response.data?.data || [];
};

/**
 * @param {VentaCreate} payload
 * @param {{ branchId?: number }} [options]
 * @returns {Promise<VentaResponse>}
 */
export const createVenta = async (payload, options = {}) => {
  const response = await apiClient.post("/ventas", payload, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

/**
 * @param {number} idVenta
 * @param {{ branchId?: number }} [options]
 * @returns {Promise<VentaResponse>}
 */
export const getVentaById = async (idVenta, options = {}) => {
  const response = await apiClient.get(`/ventas/${idVenta}`, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

/**
 * @param {number} idVenta
 * @param {VentaReversion} payload
 * @param {{ branchId?: number }} [options]
 * @returns {Promise<VentaResponse>}
 */
export const createVentaReversion = async (
  idVenta,
  payload,
  options = {}
) => {
  const response = await apiClient.post(`/ventas/${idVenta}/reversiones`, payload, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};
