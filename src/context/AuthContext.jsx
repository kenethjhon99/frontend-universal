import { useEffect, useMemo, useState } from "react";
import AuthContext from "./auth-context";
import {
  clearStoredSession,
  readStoredSession,
  storeSession,
} from "../utils/authSession";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());

  useEffect(() => {
    const syncSession = () => {
      setSession(readStoredSession());
    };

    window.addEventListener("storage", syncSession);
    window.addEventListener("auth:changed", syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("auth:changed", syncSession);
    };
  }, []);

  const value = useMemo(() => {
    const login = (userData, token) => {
      const nextSession = storeSession(token, userData);
      setSession(nextSession);
      window.dispatchEvent(new Event("auth:changed"));
    };

    const logout = () => {
      clearStoredSession();
      setSession({ user: null, token: null });
      window.dispatchEvent(new Event("auth:changed"));
    };

    return {
      user: session.user,
      token: session.token,
      login,
      logout,
      loading: false,
      isAuthenticated: Boolean(session.user && session.token),
    };
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
