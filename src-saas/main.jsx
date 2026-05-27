import React from "react";
import ReactDOM from "react-dom/client";
import { AppSessionProvider } from "./context/AppSessionContext";
import AppRouter from "./routes/AppRouter";
import {
  initConnectivityWatchers,
  registerSaasServiceWorker,
} from "./lib/pwa";
import { initSentry, Sentry } from "./lib/sentry";
import "./i18n"; // inicializa i18next antes de renderizar el arbol
import "./styles/app.css";

// Sentry primero: cualquier error en el arranque queda capturado.
initSentry();

// PWA: registrar service worker + watchers de conectividad.
// Solo en produccion para evitar interferir con HMR de Vite en dev.
if (import.meta.env.PROD) {
  registerSaasServiceWorker();
}
initConnectivityWatchers();

const Fallback = () => (
  <div
    role="alert"
    style={{
      padding: "2rem",
      maxWidth: 560,
      margin: "5rem auto",
      fontFamily: "system-ui, sans-serif",
      textAlign: "center",
    }}
  >
    <h1 style={{ marginBottom: "0.5rem" }}>Algo salio mal</h1>
    <p style={{ color: "#555" }}>
      Tuvimos un problema cargando esta pantalla. El equipo fue notificado.
    </p>
    <button
      onClick={() => window.location.reload()}
      style={{
        marginTop: "1.5rem",
        padding: "0.6rem 1.2rem",
        borderRadius: 8,
        border: 0,
        background: "#0f766e",
        color: "white",
        cursor: "pointer",
      }}
    >
      Recargar
    </button>
  </div>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<Fallback />}>
      <AppSessionProvider>
        <AppRouter />
      </AppSessionProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
