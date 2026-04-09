import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { getDefaultRoute } from "../utils/roles";
import ProtectedRoute from "./ProtectedRoute";

const Login = lazy(() => import("../pages/Login"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Productos = lazy(() => import("../pages/Productos"));
const Inventario = lazy(() => import("../pages/Inventario"));
const Layout = lazy(() => import("../components/layout/Layout"));
const Ventas = lazy(() => import("../pages/Ventas"));
const Compras = lazy(() => import("../pages/Compras"));
const Proveedores = lazy(() => import("../pages/Proveedores"));
const Clientes = lazy(() => import("../pages/Clientes"));
const Usuarios = lazy(() => import("../pages/Usuarios"));
const Auditoria = lazy(() => import("../pages/Auditoria"));
const Caja = lazy(() => import("../pages/Caja"));
const Servicios = lazy(() => import("../pages/Servicios"));
const ServiciosTienda = lazy(() => import("../pages/ServiciosTienda"));
const CarWashAutolavado = lazy(() => import("../pages/CarWashAutolavado"));
const CarWashReparacion = lazy(() => import("../pages/CarWashReparacion"));

const RouteFallback = () => (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <CircularProgress />
  </Box>
);

function AppRouter() {
  const { isAuthenticated, user } = useAuth();
  const homePath = getDefaultRoute(user);

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to={homePath} replace /> : <Login />
            }
          />

          <Route
            path="/"
            element={
              <Navigate
                to={isAuthenticated ? homePath : "/login"}
                replace
              />
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "LECTURA"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/productos"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "CAJERO", "LECTURA"]}>
                  <Productos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventario"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "LECTURA"]}>
                  <Inventario />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clientes"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "CAJERO", "LECTURA"]}>
                  <Clientes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/proveedores"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "LECTURA"]}>
                  <Proveedores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ventas"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "CAJERO", "LECTURA"]}>
                  <Ventas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/caja"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "CAJERO", "MECANICO", "ENCARGADO_SERVICIOS", "LECTURA"]}>
                  <Caja />
                </ProtectedRoute>
              }
            />
            <Route
              path="/compras"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "LECTURA"]}>
                  <Compras />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "LECTURA"]}>
                  <Usuarios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auditoria"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "LECTURA"]}>
                  <Auditoria />
                </ProtectedRoute>
              }
            />
            <Route
              path="/servicios"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "CAJERO", "MECANICO", "ENCARGADO_SERVICIOS", "LECTURA"]}>
                  <Servicios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/servicios/tienda"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "CAJERO", "MECANICO", "ENCARGADO_SERVICIOS", "LECTURA"]}>
                  <ServiciosTienda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/carwash/autolavado"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "CAJERO", "ENCARGADO_SERVICIOS", "LECTURA"]}>
                  <CarWashAutolavado />
                </ProtectedRoute>
              }
            />
            <Route
              path="/carwash/reparacion"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "CAJERO", "MECANICO", "ENCARGADO_SERVICIOS", "LECTURA"]}>
                  <CarWashReparacion />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default AppRouter;
