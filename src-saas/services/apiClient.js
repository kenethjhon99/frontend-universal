import axios from "axios";
import { clearSession, readSession, writeSession } from "../lib/session-storage";

const baseURL =
  String(import.meta.env.VITE_SAAS_API_URL || "").trim() ||
  "http://localhost:4000/api/saas";

const apiClient = axios.create({
  baseURL,
  withCredentials: true, // imprescindible para que el cookie httpOnly del refresh viaje
  // Lee XSRF-TOKEN cookie (no httpOnly) y la replica en X-XSRF-TOKEN.
  // Forzar true para que el header se envie tambien cross-origin (dev: 5173↔4000).
  // El backend valida cookie==header en /auth/refresh y /auth/logout (csrfGuard).
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

apiClient.interceptors.request.use((config) => {
  const session = readSession();

  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }

  const branchId =
    config.saasBranchId ??
    config.headers?.["X-Sucursal-Id"] ??
    session?.sucursal_activa?.id_sucursal;

  if (branchId) {
    config.headers["X-Sucursal-Id"] = String(branchId);
  }

  return config;
});

// ----- Refresh automatico en 401 -----
// Si una request falla con 401, intentamos refrescar el access token usando el
// cookie httpOnly del refresh. Si funciona, reintentamos la request original
// una sola vez. Si el refresh tambien falla, limpiamos sesion.

let refreshInFlight = null;

const tryRefresh = async () => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await axios.post(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const data = response.data || {};
      if (!data.token) throw new Error("Sin token en refresh");

      // El backend devuelve el mismo shape que /login
      writeSession(data);
      window.dispatchEvent(new Event("saas-session:changed"));
      return data.token;
    } finally {
      // Limpia el promise compartido al terminar para no reutilizar uno fallido
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const original = error.config;
    const isRefreshCall = original?.url?.includes("/auth/refresh");
    const isLoginCall = original?.url?.includes("/auth/login");

    // Solo intentamos refresh para 401 fuera del propio refresh y del login,
    // y solo una vez por request original.
    if (status === 401 && !isRefreshCall && !isLoginCall && !original.__retried) {
      original.__retried = true;
      try {
        const newToken = await tryRefresh();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient.request(original);
      } catch {
        clearSession();
        window.dispatchEvent(new Event("saas-session:changed"));
        return Promise.reject(error);
      }
    }

    if (status === 401) {
      clearSession();
      window.dispatchEvent(new Event("saas-session:changed"));
    }

    // 402 Payment Required = empresa suspendida, cancelada, trial expirado,
    // o limite de plan alcanzado. Notificamos al resto de la app via evento;
    // el AppRouter / AppSessionProvider redirige a /subscription/suspended.
    if (status === 402) {
      const detail = error.response?.data?.details || null;
      window.dispatchEvent(
        new CustomEvent("saas-subscription:blocked", { detail })
      );
    }

    return Promise.reject(error);
  }
);

export default apiClient;
