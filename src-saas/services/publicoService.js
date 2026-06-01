import axios from "axios";

/**
 * Servicio publico (sin auth) para consultar el estado de una orden por su
 * codigo opaco. NO usa apiClient porque no debe inyectar Authorization
 * (es un endpoint sin login).
 */

const resolveApiBaseUrl = () => {
  const configured = String(import.meta.env?.VITE_SAAS_API_URL || "").trim();
  const productionUrl = "https://backend-universal-i850.onrender.com/api/saas";

  if (import.meta.env.PROD) {
    if (!configured) return productionUrl;
    if (configured.includes("tradenova-api.onrender.com")) return productionUrl;
    return configured.startsWith("//") ? `https:${configured}` : configured;
  }

  return configured || "http://localhost:4000/api/saas";
};

const baseURL =
  resolveApiBaseUrl();

const publicAxios = axios.create({ baseURL });

export const getOrdenPublica = async (codigo) => {
  const response = await publicAxios.get(`/publico/ordenes/${codigo}`);
  return response.data?.data;
};
