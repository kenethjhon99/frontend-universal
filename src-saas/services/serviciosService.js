import apiClient from "./apiClient";

export const getServiciosCatalogo = async (params = {}, options = {}) => {
  const response = await apiClient.get("/servicios/catalogo", {
    params,
    saasBranchId: options.branchId,
  });
  return response.data?.data || [];
};

export const createServicioCatalogo = async (payload, options = {}) => {
  const response = await apiClient.post("/servicios/catalogo", payload, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

export const updateServicioCatalogo = async (
  idServicioCatalogo,
  payload,
  options = {}
) => {
  const response = await apiClient.put(
    `/servicios/catalogo/${idServicioCatalogo}`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const getOrdenesServicio = async (params = {}, options = {}) => {
  const response = await apiClient.get("/servicios/ordenes", {
    params,
    saasBranchId: options.branchId,
  });
  return response.data?.data || [];
};

export const createOrdenServicio = async (payload, options = {}) => {
  const response = await apiClient.post("/servicios/ordenes", payload, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

export const getOrdenServicioById = async (idOrdenServicio, options = {}) => {
  const response = await apiClient.get(`/servicios/ordenes/${idOrdenServicio}`, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

export const updateOrdenServicioSeguimiento = async (
  idOrdenServicio,
  payload,
  options = {}
) => {
  const response = await apiClient.patch(
    `/servicios/ordenes/${idOrdenServicio}/seguimiento`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const addProductoOrdenServicio = async (
  idOrdenServicio,
  payload,
  options = {}
) => {
  const response = await apiClient.post(
    `/servicios/ordenes/${idOrdenServicio}/productos`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const cobrarOrdenServicio = async (
  idOrdenServicio,
  payload,
  options = {}
) => {
  const response = await apiClient.post(
    `/servicios/ordenes/${idOrdenServicio}/cobro`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const getServiciosTecnicos = async (params = {}, options = {}) => {
  const response = await apiClient.get("/servicios/control/tecnicos", {
    params,
    saasBranchId: options.branchId,
  });
  return response.data?.data || [];
};

export const upsertServicioTecnico = async (
  idUsuario,
  payload,
  options = {}
) => {
  const response = await apiClient.put(
    `/servicios/control/tecnicos/${idUsuario}`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const getServiciosChecklistTemplates = async (
  params = {},
  options = {}
) => {
  const response = await apiClient.get("/servicios/control/checklists", {
    params,
    saasBranchId: options.branchId,
  });
  return response.data?.data || [];
};

export const createServiciosChecklistTemplate = async (
  payload,
  options = {}
) => {
  const response = await apiClient.post("/servicios/control/checklists", payload, {
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

export const updateServiciosChecklistTemplate = async (
  idChecklistTemplate,
  payload,
  options = {}
) => {
  const response = await apiClient.put(
    `/servicios/control/checklists/${idChecklistTemplate}`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const getServiciosAgenda = async (params = {}, options = {}) => {
  const response = await apiClient.get("/servicios/control/agenda", {
    params,
    saasBranchId: options.branchId,
  });
  return response.data?.data || { rango: {}, items: [] };
};

export const getServicioControlById = async (
  idOrdenServicio,
  options = {}
) => {
  const response = await apiClient.get(
    `/servicios/control/ordenes/${idOrdenServicio}`,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const programarOrdenServicio = async (
  idOrdenServicio,
  payload,
  options = {}
) => {
  const response = await apiClient.patch(
    `/servicios/control/ordenes/${idOrdenServicio}/agenda`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const updateChecklistOrdenServicio = async (
  idOrdenServicio,
  idChecklistItem,
  payload,
  options = {}
) => {
  const response = await apiClient.patch(
    `/servicios/control/ordenes/${idOrdenServicio}/checklist/${idChecklistItem}`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const anularOrdenServicio = async (
  idOrdenServicio,
  payload,
  options = {}
) => {
  const response = await apiClient.post(
    `/servicios/control/ordenes/${idOrdenServicio}/anulacion`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const reembolsarOrdenServicio = async (
  idOrdenServicio,
  payload,
  options = {}
) => {
  const response = await apiClient.post(
    `/servicios/control/ordenes/${idOrdenServicio}/reembolso`,
    payload,
    {
      saasBranchId: options.branchId,
    }
  );
  return response.data?.data;
};

export const getReporteServicios = async (params = {}, options = {}) => {
  const response = await apiClient.get("/servicios/control/reportes", {
    params,
    saasBranchId: options.branchId,
  });
  return response.data?.data;
};

// ----- G6: tipos de vehiculo -----

/**
 * Lista los tipos de vehiculo de la empresa.
 * Filtros: { modulo: "CARWASH"|"SERVICIOS", activo: true|false }
 */
export const getTiposVehiculo = async (params = {}) => {
  const response = await apiClient.get("/servicios/tipos-vehiculo", { params });
  return response.data?.data || [];
};

export const createTipoVehiculo = async (payload) => {
  const response = await apiClient.post("/servicios/tipos-vehiculo", payload);
  return response.data?.data;
};

export const updateTipoVehiculo = async (idTipoVehiculo, payload) => {
  const response = await apiClient.put(
    `/servicios/tipos-vehiculo/${idTipoVehiculo}`,
    payload
  );
  return response.data?.data;
};
