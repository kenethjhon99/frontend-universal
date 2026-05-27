import apiClient from "./apiClient";

export const getStock = async (params = {}, options = {}) => {
  const response = await apiClient.get("/stock", {
    params,
    saasBranchId: options.branchId,
  });
  return response.data?.data || [];
};

export const getStockMovimientos = async (params = {}, options = {}) => {
  const response = await apiClient.get("/stock/movimientos", {
    params,
    saasBranchId: options.branchId,
  });
  return response.data?.data || [];
};

export const updateStockConfig = async (idProducto, payload, options = {}) => {
  const response = await apiClient.put(
    `/stock/${idProducto}/configuracion`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const createStockMovimiento = async (payload, options = {}) => {
  const response = await apiClient.post("/stock/movimientos", payload, {
    saasBranchId: options.branchId,
  });
  return response.data;
};

/**
 * Ajuste directo de existencia (alias del legacy PUT /stock/:id_producto).
 * Internamente crea un movimiento de inventario tipo AJUSTE.
 * payload: { nueva_existencia: number, observacion?: string }
 */
export const ajustarStock = async (idProducto, payload, options = {}) => {
  const response = await apiClient.put(
    `/stock/${idProducto}/ajuste`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data;
};
