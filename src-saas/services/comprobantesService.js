import apiClient from "./apiClient";

/**
 * Catalogo estatico de tipos de comprobante por modulo.
 * Devuelve [{ modulo, label, tipos: [{ tipo_comprobante, serie_default, nombre_default }] }]
 */
export const getComprobantesCatalog = async () => {
  const response = await apiClient.get("/comprobantes/tipos");
  return response.data?.data || [];
};

/**
 * Lista las series de comprobante de la empresa actual.
 * Filtros opcionales: { modulo, tipo_comprobante, id_sucursal, activo }
 */
export const getComprobantesSeries = async (params = {}, options = {}) => {
  const response = await apiClient.get("/comprobantes/series", {
    params,
    saasBranchId: options.branchId,
  });
  return response.data?.data || [];
};

export const getComprobantesSerieById = async (idComprobanteSerie) => {
  const response = await apiClient.get(
    `/comprobantes/series/${idComprobanteSerie}`
  );
  return response.data?.data;
};

export const createComprobantesSerie = async (payload, options = {}) => {
  const response = await apiClient.post("/comprobantes/series", payload, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

export const updateComprobantesSerie = async (
  idComprobanteSerie,
  payload,
  options = {}
) => {
  const response = await apiClient.put(
    `/comprobantes/series/${idComprobanteSerie}`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

/**
 * Devuelve los tipos disponibles para un modulo concreto.
 * Hace cache simple en memoria por sesion del navegador.
 */
let _catalogCache = null;

export const getTiposByModulo = async (modulo) => {
  if (!_catalogCache) {
    try {
      _catalogCache = await getComprobantesCatalog();
    } catch (error) {
      // Si la API falla, usar fallback estatico minimo (compat con backend antiguo)
      _catalogCache = FALLBACK_CATALOG;
    }
  }

  const moduloKey = String(modulo || "").trim().toUpperCase();
  const entry = _catalogCache.find((item) => item.modulo === moduloKey);
  return entry?.tipos || [];
};

export const invalidateComprobantesCache = () => {
  _catalogCache = null;
};

const FALLBACK_CATALOG = [
  {
    modulo: "VENTA",
    label: "Venta",
    tipos: [
      { tipo_comprobante: "TICKET", serie_default: "TKT", nombre_default: "Ticket POS" },
      { tipo_comprobante: "FACTURA", serie_default: "FAC", nombre_default: "Factura" },
      { tipo_comprobante: "CCF", serie_default: "CCF", nombre_default: "Credito fiscal" },
    ],
  },
  {
    modulo: "VENTA_REVERSION",
    label: "Devolucion / Nota de credito",
    tipos: [
      { tipo_comprobante: "DEVOLUCION", serie_default: "DVV", nombre_default: "Devolucion de venta" },
      { tipo_comprobante: "NOTA_CREDITO", serie_default: "NCV", nombre_default: "Nota de credito" },
    ],
  },
];
