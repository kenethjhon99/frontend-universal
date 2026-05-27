import { createContext, useEffect, useMemo, useState } from "react";
import { clearSession, readSession, writeSession } from "../lib/session-storage";
import { clearSentryUser, setSentryUser } from "../lib/sentry";
import { DEFAULT_BRANDING, applyBranding } from "../lib/branding";

const AppSessionContext = createContext(null);

export function AppSessionProvider({ children }) {
  const [session, setSession] = useState(() => readSession());

  useEffect(() => {
    const syncSession = () => {
      setSession(readSession());
    };

    window.addEventListener("storage", syncSession);
    window.addEventListener("saas-session:changed", syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("saas-session:changed", syncSession);
    };
  }, []);

  // Sincronizar contexto de Sentry con la sesion actual.
  useEffect(() => {
    if (session?.user) {
      setSentryUser(session);
    } else {
      clearSentryUser();
    }
  }, [session?.user?.id_usuario, session?.user?.id_empresa]);

  useEffect(() => {
    applyBranding(session?.branding || DEFAULT_BRANDING);
  }, [session?.branding]);

  // Cuando el backend responde 402 (suspendida/cancelada/trial-expirado/
  // limite-plan), redirigir a /subscription/suspended con el motivo.
  useEffect(() => {
    const handler = (event) => {
      try {
        sessionStorage.setItem(
          "saas-suspension-reason",
          JSON.stringify(event.detail || {})
        );
      } catch {
        /* noop */
      }
      // HashRouter: navegacion sin recargar
      if (!window.location.hash.includes("/subscription/suspended")) {
        window.location.hash = "#/subscription/suspended";
      }
    };
    window.addEventListener("saas-subscription:blocked", handler);
    return () =>
      window.removeEventListener("saas-subscription:blocked", handler);
  }, []);

  const value = useMemo(() => {
    const replaceSession = (nextSession) => {
      writeSession(nextSession);
      setSession(nextSession);
      window.dispatchEvent(new Event("saas-session:changed"));
    };

    const logout = () => {
      clearSession();
      setSession(null);
      window.dispatchEvent(new Event("saas-session:changed"));
    };

    return {
      session,
      isAuthenticated: Boolean(session?.token),
      replaceSession,
      logout,
    };
  }, [session]);

  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}

export default AppSessionContext;
