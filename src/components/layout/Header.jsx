import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useThemeMode } from "../../hooks/useThemeMode";
import { userHasRole } from "../../utils/roles";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Avatar,
  Chip,
  IconButton,
  useTheme,
} from "@mui/material";

function Header({ showMobileMenuButton = false, onOpenMobileMenu = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const theme = useTheme();
  const roleNames = [...new Set(
    (user?.roles ?? [])
      .map((role) => {
        const normalized = String(role?.nombre_rol || role || "").trim().toUpperCase();
        return normalized === "SUPERADMIN" ? "SUPER_ADMIN" : normalized;
      })
      .filter(Boolean)
  )];

  const showIdentityPanel = location.pathname === "/dashboard";

  const roleMeta = roleNames.includes("SUPER_ADMIN")
    ? {
        label: "Modo super admin",
        chipColor: "error",
        accent: "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(249,115,22,0.12))",
        borderColor: "rgba(239,68,68,0.35)",
      }
    : roleNames.includes("ADMIN")
      ? {
          label: "Modo administrativo",
          chipColor: "primary",
          accent: "linear-gradient(135deg, rgba(37,99,235,0.2), rgba(14,165,233,0.12))",
          borderColor: "rgba(37,99,235,0.3)",
        }
      : roleNames.includes("ENCARGADO_SERVICIOS")
        ? {
            label: "Modo servicios",
            chipColor: "secondary",
            accent: "linear-gradient(135deg, rgba(147,51,234,0.18), rgba(34,197,94,0.10))",
            borderColor: "rgba(147,51,234,0.28)",
          }
      : roleNames.includes("LECTURA")
        ? {
            label: "Modo lectura",
            chipColor: "info",
            accent: "linear-gradient(135deg, rgba(14,165,233,0.20), rgba(148,163,184,0.10))",
            borderColor: "rgba(14,165,233,0.30)",
          }
      : roleNames.includes("CAJERO")
        ? {
            label: "Modo operativo",
            chipColor: "success",
            accent: "linear-gradient(135deg, rgba(22,163,74,0.2), rgba(16,185,129,0.12))",
            borderColor: "rgba(22,163,74,0.3)",
          }
        : roleNames.includes("MECANICO")
          ? {
              label: "Modo mecanico",
              chipColor: "warning",
              accent: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(249,115,22,0.12))",
              borderColor: "rgba(245,158,11,0.3)",
            }
          : {
              label: "Modo general",
              chipColor: "default",
              accent: "linear-gradient(135deg, rgba(148,163,184,0.18), rgba(100,116,139,0.1))",
              borderColor: "rgba(148,163,184,0.25)",
            };

  const pathname = location.pathname;
  const isAdminView = userHasRole(user, "SUPER_ADMIN", "ADMIN");
  const isCashierView = userHasRole(user, "CAJERO");
  const isMechanicView = userHasRole(user, "MECANICO");
  const isServiciosManagerView = userHasRole(user, "ENCARGADO_SERVICIOS");

  const sections = {
    "/dashboard": {
      title: "Dashboard y reportes",
      subtitle: "Ventas, compras, utilidad estimada y stock critico en un solo panel.",
    },
    "/ventas": {
      title: isCashierView ? "Caja y ventas" : "Ventas",
      subtitle: isCashierView
        ? "Cobros, clientes y operaciones del punto de venta."
        : "Gestiona ventas, revisa detalles y controla anulaciones.",
    },
    "/caja": {
      title: "Caja",
      subtitle: "Apertura, movimientos, cierres y control operativo del efectivo.",
    },
    "/productos": {
      title: "Productos",
      subtitle: isServiciosManagerView
        ? "Administra exclusivamente los productos del catalogo de tienda."
        : isAdminView
        ? "Administra catalogo, stock y configuraciones de inventario."
        : "Consulta existencias y disponibilidad del catalogo.",
    },
    "/inventario": {
      title: "Inventario y kardex",
      subtitle: "Revisa existencias, stock critico y movimientos detallados por producto.",
    },
    "/clientes": {
      title: "Clientes",
      subtitle: isAdminView
        ? "Administra el catalogo y los datos de clientes."
        : "Consulta y registra clientes para las ventas.",
    },
    "/compras": {
      title: "Compras",
      subtitle: "Registra ingresos de inventario y compras a proveedores.",
    },
    "/proveedores": {
      title: "Proveedores",
      subtitle: "Gestiona el catalogo de proveedores y su historial.",
    },
    "/usuarios": {
      title: "Usuarios y roles",
      subtitle: "Configura accesos, roles y permisos del sistema.",
    },
    "/auditoria": {
      title: "Auditoria del sistema",
      subtitle: "Consulta trazabilidad de altas, cambios e inactivaciones.",
    },
    "/servicios": {
      title: "Servicios",
      subtitle: isServiciosManagerView
        ? "Controla autolavado, reparacion, tienda y la caja operativa de servicios."
        : isMechanicView
        ? "Accede a los trabajos de taller y seguimiento del servicio."
        : "Accede rapidamente a autolavado y reparacion desde un solo modulo.",
    },
    "/carwash/autolavado": {
      title: "Servicios - Autolavado",
      subtitle: "Gestiona el flujo operativo del area de autolavado.",
    },
    "/carwash/reparacion": {
      title: isMechanicView ? "Taller mecanico" : "Servicios - Reparacion",
      subtitle: "Organiza trabajos de taller, diagnosticos y mantenimientos.",
    },
  };

  const headerContent =
    sections[pathname] || {
      title: "Sistema Punto de Venta",
      subtitle: isCashierView
        ? "Area operativa para atender ventas y clientes."
        : "Gestion general del sistema.",
    };

  const cerrarSesion = () => {
    logout();
    navigate("/login");
  };

  return (
    <AppBar
      position="static"
      elevation={2}
      sx={{
        backgroundColor:
          theme.palette.mode === "light" ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.74)",
        color: "text.primary",
        backgroundImage: `${roleMeta.accent}, linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))`,
        borderBottom: `1px solid ${roleMeta.borderColor}`,
        backdropFilter: "blur(18px)",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            theme.palette.mode === "light"
              ? "linear-gradient(90deg, rgba(255,255,255,0.3), transparent 28%, rgba(37,99,235,0.05) 100%)"
              : "linear-gradient(90deg, rgba(255,255,255,0.06), transparent 28%, rgba(56,189,248,0.08) 100%)",
        },
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: { xs: "wrap", md: "nowrap" },
          alignItems: "center",
          py: { xs: 1.25, md: 1.5 },
        }}
      >
        <Box sx={{ minWidth: 0, display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          {showMobileMenuButton && (
            <IconButton
              onClick={onOpenMobileMenu}
              color="inherit"
              sx={{
                display: { xs: "inline-flex", md: "none" },
                mt: 0.25,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor:
                  theme.palette.mode === "light"
                    ? "rgba(255,255,255,0.6)"
                    : "rgba(15,23,42,0.35)",
                boxShadow:
                  theme.palette.mode === "light"
                    ? "0 10px 20px rgba(15,23,42,0.08)"
                    : "0 12px 22px rgba(2,6,23,0.24)",
              }}
            >
              <MenuRoundedIcon />
            </IconButton>
          )}

          <Box
            sx={{
              minWidth: 0,
              px: { xs: 0, md: 1.75 },
              py: { xs: 0, md: 1.2 },
              borderRadius: { xs: 0, md: 3.5 },
              border: { xs: "none", md: "1px solid" },
              borderColor: { xs: "transparent", md: "divider" },
              backgroundColor:
                theme.palette.mode === "light"
                  ? { xs: "transparent", md: "rgba(255,255,255,0.46)" }
                  : { xs: "transparent", md: "rgba(15,23,42,0.36)" },
              backdropFilter: { xs: "none", md: "blur(12px)" },
              boxShadow:
                theme.palette.mode === "light"
                  ? { xs: "none", md: "0 14px 30px rgba(15,23,42,0.06)" }
                  : { xs: "none", md: "0 18px 32px rgba(2,6,23,0.22)" },
            }}
          >
            <Chip
              label={roleMeta.label}
              size="small"
              color={roleMeta.chipColor}
              sx={{ mb: 1, fontWeight: 800 }}
            />
            <Typography variant="h6" fontWeight="bold">
              {headerContent.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {headerContent.subtitle}
            </Typography>
          </Box>
        </Box>

        <Box
          display="flex"
          alignItems="center"
          gap={2}
          flexWrap="wrap"
          justifyContent="flex-end"
          sx={{ ml: "auto" }}
        >
          <IconButton
            onClick={toggleTheme}
            color="inherit"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              backgroundColor:
                theme.palette.mode === "light"
                  ? "rgba(255,255,255,0.54)"
                  : "rgba(15,23,42,0.35)",
              boxShadow:
                theme.palette.mode === "light"
                  ? "0 12px 24px rgba(15,23,42,0.06)"
                  : "0 16px 26px rgba(2,6,23,0.22)",
            }}
          >
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>

          <Box textAlign="right">
          {showIdentityPanel && (
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor:
                    theme.palette.mode === "light"
                      ? "rgba(255,255,255,0.52)"
                      : "rgba(15,23,42,0.35)",
                  backdropFilter: "blur(10px)",
                  minWidth: { xs: "100%", md: 260 },
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  {user?.nombre || user?.username || "Usuario"}
                </Typography>

                <Box display="flex" gap={0.5} flexWrap="wrap" justifyContent="flex-end">
                  {roleNames.map((roleName) => (
                    <Chip
                      key={roleName}
                      label={roleName}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          <Avatar>
            {user?.nombre?.[0] || user?.username?.[0] || "U"}
          </Avatar>

          <Button
            variant="contained"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={cerrarSesion}
          >
            Salir
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
