import axios from "axios";
import { clearStoredSession, isTokenValid } from "../utils/authSession";

const envApiUrl = String(import.meta.env.VITE_API_URL || "").trim();

const API_BASE_URL = envApiUrl
  || (import.meta.env.DEV ? "http://localhost:3000/api" : "/api");

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    if (!isTokenValid(token)) {
      clearStoredSession();
      window.dispatchEvent(new Event("auth:changed"));
      return Promise.reject(new axios.CanceledError("Sesion expirada"));
    }

    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredSession();
      window.dispatchEvent(new Event("auth:changed"));
    }

    return Promise.reject(error);
  }
);

export default api;
