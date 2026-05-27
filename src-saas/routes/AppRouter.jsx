import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import ConnectivityBanner from "../components/ConnectivityBanner";
import PageLoading from "../components/PageLoading";
import { useAppSession } from "../hooks/useAppSession";
import ModuleRoute from "./ModuleRoute";
import ProtectedRoute from "./ProtectedRoute";

// ----- Pages cargadas on-demand (cada una en su propio chunk Vite) -----
// LoginPage podría quedarse eager para evitar el flash de loading en el primer
// acceso anónimo, pero como es chico y se cachea agresivo en CDN, también
// queda lazy. La penalización es ~30ms en la primera carga.
const LoginPage = lazy(() => import("../pages/LoginPage"));
const PublicOrderStatusPage = lazy(
  () => import("../pages/PublicOrderStatusPage")
);

const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const PlatformCompaniesPage = lazy(
  () => import("../pages/PlatformCompaniesPage")
);
const UsuariosPage = lazy(() => import("../pages/UsuariosPage"));
const AuditoriaPage = lazy(() => import("../pages/AuditoriaPage"));
const FinanzasPage = lazy(() => import("../pages/FinanzasPage"));
const ReportesPage = lazy(() => import("../pages/ReportesPage"));
const ServiciosPage = lazy(() => import("../pages/ServiciosPage"));
const ServiciosControlPage = lazy(
  () => import("../pages/ServiciosControlPage")
);
const VentasPage = lazy(() => import("../pages/VentasPage"));
const CajaPage = lazy(() => import("../pages/CajaPage"));
const CatalogosPage = lazy(() => import("../pages/CatalogosPage"));
const InventarioPage = lazy(() => import("../pages/InventarioPage"));
const ComprasPage = lazy(() => import("../pages/ComprasPage"));
const SeriesComprobantePage = lazy(
  () => import("../pages/SeriesComprobantePage")
);
const RolesCustomPage = lazy(() => import("../pages/RolesCustomPage"));
const BrandingPage = lazy(() => import("../pages/BrandingPage"));
const WhiteLabelPage = lazy(() => import("../pages/WhiteLabelPage"));
const SubscriptionSuspendedPage = lazy(
  () => import("../pages/SubscriptionSuspendedPage")
);
const MfaSettingsPage = lazy(() => import("../pages/MfaSettingsPage"));
const AccountSecurityPage = lazy(() => import("../pages/AccountSecurityPage"));
const PlatformDashboardPage = lazy(
  () => import("../pages/PlatformDashboardPage")
);

function AppRouter() {
  const { isAuthenticated } = useAppSession();

  return (
    <HashRouter>
      <ConnectivityBanner />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Pagina publica de seguimiento (sin auth) */}
          <Route
            path="/publico/orden/:codigo"
            element={<PublicOrderStatusPage />}
          />

          {/* Pantalla de suscripcion suspendida / trial expirado / limite plan. */}
          <Route
            path="/subscription/suspended"
            element={<SubscriptionSuspendedPage />}
          />

          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/platform/empresas"
            element={
              <ProtectedRoute roles={["SUPER_ADMIN", "SUPER_ADMIN_SAAS"]}>
                <PlatformCompaniesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/administracion/usuarios"
            element={
              <ProtectedRoute
                roles={["ADMIN_EMPRESA", "ENCARGADO_SUCURSAL"]}
              >
                <UsuariosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/administracion/auditoria"
            element={
              <ProtectedRoute roles={["SUPER_ADMIN", "SUPER_ADMIN_SAAS", "ADMIN_EMPRESA"]}>
                <AuditoriaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operacion/finanzas"
            element={
              <ProtectedRoute permissions={["finance.read"]}>
                <ModuleRoute moduleCodes={["FINANZAS"]}>
                  <FinanzasPage />
                </ModuleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analitica/reportes"
            element={
              <ProtectedRoute permissions={["reports.read"]}>
                <ModuleRoute moduleCodes={["REPORTES"]}>
                  <ReportesPage />
                </ModuleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operacion/servicios"
            element={
              <ProtectedRoute permissions={["services.read"]}>
                <ModuleRoute moduleCodes={["SERVICIOS", "CARWASH"]}>
                  <ServiciosPage />
                </ModuleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operacion/servicios/control"
            element={
              <ProtectedRoute permissions={["services.read"]}>
                <ModuleRoute moduleCodes={["SERVICIOS", "CARWASH"]}>
                  <ServiciosControlPage />
                </ModuleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operacion/ventas"
            element={
              <ProtectedRoute permissions={["sales.read"]}>
                <ModuleRoute moduleCodes={["POS"]}>
                  <VentasPage />
                </ModuleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operacion/caja"
            element={
              <ProtectedRoute permissions={["cash.read"]}>
                <ModuleRoute moduleCodes={["POS"]}>
                  <CajaPage />
                </ModuleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operacion/catalogos"
            element={
              <ProtectedRoute permissions={["catalogs.read"]}>
                <ModuleRoute
                  moduleCodes={[
                    "POS",
                    "INVENTARIO",
                    "COMPRAS",
                    "SERVICIOS",
                    "CARWASH",
                  ]}
                >
                  <CatalogosPage />
                </ModuleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operacion/inventario"
            element={
              <ProtectedRoute permissions={["inventory.read"]}>
                <ModuleRoute moduleCodes={["INVENTARIO", "POS", "COMPRAS"]}>
                  <InventarioPage />
                </ModuleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operacion/compras"
            element={
              <ProtectedRoute permissions={["purchases.read"]}>
                <ModuleRoute moduleCodes={["COMPRAS", "INVENTARIO"]}>
                  <ComprasPage />
                </ModuleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/administracion/comprobantes"
            element={
              <ProtectedRoute permissions={["comprobantes.read"]}>
                <SeriesComprobantePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/administracion/roles"
            element={
              <ProtectedRoute permissions={["roles.manage"]}>
                <RolesCustomPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/administracion/branding"
            element={
              <ProtectedRoute permissions={["company.branding.read"]}>
                <BrandingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/administracion/white-label"
            element={
              <ProtectedRoute permissions={["company.white_label.read"]}>
                <WhiteLabelPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cuenta/seguridad"
            element={
              <ProtectedRoute>
                <AccountSecurityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cuenta/seguridad/mfa"
            element={
              <ProtectedRoute>
                <MfaSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/platform/dashboard"
            element={
              <ProtectedRoute roles={["SUPER_ADMIN", "SUPER_ADMIN_SAAS"]}>
                <PlatformDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <Navigate to={isAuthenticated ? "/" : "/login"} replace />
            }
          />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default AppRouter;
