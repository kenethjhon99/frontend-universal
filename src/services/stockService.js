import api from "./api";

const buildParams = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams;
};

export const getStock = async (params = {}) => {
  const res = await api.get("/stock", {
    params: buildParams(params),
  });

  return res.data;
};

export const getMovimientosStock = async (params = {}) => {
  const res = await api.get("/stock/movimientos", {
    params: buildParams(params),
  });

  return res.data;
};
