import axios from "axios";

/**
 * Servicio publico (sin auth) para consultar el estado de una orden por su
 * codigo opaco. NO usa apiClient porque no debe inyectar Authorization
 * (es un endpoint sin login).
 */

const baseURL =
  String(import.meta.env?.VITE_SAAS_API_URL || "").trim() ||
  (import.meta.env.PROD
    ? "https://backend-universal-i850.onrender.com/api/saas"
    : "http://localhost:4000/api/saas");

const publicAxios = axios.create({ baseURL });

export const getOrdenPublica = async (codigo) => {
  const response = await publicAxios.get(`/publico/ordenes/${codigo}`);
  return response.data?.data;
};
