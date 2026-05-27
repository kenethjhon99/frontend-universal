import apiClient from "./apiClient";

export const getProductos = async (params = {}, options = {}) => {
  const response = await apiClient.get("/productos", {
    params,
    saasBranchId: options.branchId,
  });
  return response.data?.data || [];
};

export const createProducto = async (payload, options = {}) => {
  const response = await apiClient.post("/productos", payload, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

export const updateProducto = async (idProducto, payload, options = {}) => {
  const response = await apiClient.put(`/productos/${idProducto}`, payload, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

/**
 * Genera un codigo de barras EAN-13 unico interno (prefijo 20).
 * Devuelve { codigo_barras: "20XXXXXXXXXXC" }.
 */
export const generarCodigoBarras = async () => {
  const response = await apiClient.get("/productos/codigo-barras/generar");
  return response.data?.data?.codigo_barras || null;
};

/**
 * G8 - Activar / desactivar coherente.
 * payload: { activo: boolean }
 */
export const setProductoEstado = async (idProducto, activo, options = {}) => {
  const response = await apiClient.patch(
    `/productos/${idProducto}/estado`,
    { activo },
    { saasBranchId: options.branchId }
  );
  return response.data?.data;
};
