/**
 * Helpers PWA: registro de service worker + estado online/offline + drain
 * automatico al volver la red.
 */
import { drainQueue } from "./offline-queue.js";
import { createVenta } from "../services/ventasService.js";

let registrationPromise = null;

export const registerSaasServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return null;
  if (registrationPromise) return registrationPromise;

  registrationPromise = navigator.serviceWorker
    .register("/saas-sw.js", { scope: "/" })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[pwa] no se pudo registrar SW:", err);
      return null;
    });

  return registrationPromise;
};

/**
 * Configura listeners online/offline y dispara eventos custom para que
 * la UI reaccione (ej. mostrar banner amarillo).
 */
export const initConnectivityWatchers = () => {
  if (typeof window === "undefined") return;

  const fire = () => {
    window.dispatchEvent(
      new CustomEvent("saas:connectivity", {
        detail: { online: navigator.onLine },
      })
    );

    if (navigator.onLine) {
      // Volvio la red: drenar cola
      drainQueue(async (payload) => {
        await createVenta(payload, {
          branchId: payload.__branchId,
        });
      })
        .then((stats) => {
          if (stats.sent > 0 || stats.failed > 0) {
            window.dispatchEvent(
              new CustomEvent("saas:queue-drained", { detail: stats })
            );
          }
        })
        .catch(() => {
          // silencioso; el siguiente reintento volvera a intentarlo
        });
    }
  };

  window.addEventListener("online", fire);
  window.addEventListener("offline", fire);

  // Disparar inicial para sincronizar UI
  fire();
};

export const isOnline = () =>
  typeof navigator !== "undefined" ? navigator.onLine : true;
