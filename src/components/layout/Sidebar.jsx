import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { userHasRole } from "../../utils/roles";

import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
  alpha,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LocalCarWashIcon from "@mui/icons-material/LocalCarWash";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

const drawerWidth = 240;
const collapsedDrawerWidth = 88;

function Sidebar({
  collapsed = false,
  onToggleCollapse = () => {},
  onCollapse = () => {},
  mobileOpen = false,
  onMobileClose = () => {},
}) {
  const location = useLocation();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const drawerBackground =
    theme.palette.mode === "light"
      ? "linear-gradient(180deg, #0c1526 0%, #11203b 42%, #18315f 100%)"
      : "linear-gradient(180deg, #060d17 0%, #0b1321 44%, #101827 100%)";

  const menu = [
    {
      text: "Dashboard",
      path: "/dashboard",
      icon: <DashboardIcon />,
      visible: userHasRole(user, "SUPER_ADMIN", "ADMIN", "LECTURA"),
    },
    {
      text: "Productos",
      path: "/productos",
      icon: <InventoryIcon />,
      visible: userHasRole(user, "ADMIN", "CAJERO", "LECTURA"),
    },
    {
      text: "Inventario",
      path: "/inventario",
      icon: <Inventory2Icon />,
      visible: userHasRole(user, "SUPER_ADMIN", "ADMIN", "LECTURA"),
    },
    {
      text: "Clientes",
      path: "/clientes",
      icon: <PersonOutlineIcon />,
      visible: userHasRole(user, "ADMIN", "CAJERO", "LECTURA"),
    },
    {
      text: "Proveedores",
      path: "/proveedores",
      icon: <LocalShippingIcon />,
      visible: userHasRole(user, "ADMIN", "LECTURA"),
    },
    {
      text: "Ventas",
      path: "/ventas",
      icon: <PointOfSaleIcon />,
      visible: userHasRole(user, "ADMIN", "CAJERO", "LECTURA"),
    },
    {
      text: "Caja",
      path: "/caja",
      icon: <AccountBalanceWalletIcon />,
      visible: userHasRole(user, "ADMIN", "CAJERO", "MECANICO", "ENCARGADO_SERVICIOS", "LECTURA"),
    },
    {
      text: "Compras",
      path: "/compras",
      icon: <ShoppingBagIcon />,
      visible: userHasRole(user, "ADMIN", "LECTURA"),
    },
    {
      text: "Usuarios",
      path: "/usuarios",
      icon: <AdminPanelSettingsIcon />,
      visible: userHasRole(user, "SUPER_ADMIN", "LECTURA"),
    },
    {
      text: "Auditoria",
      path: "/auditoria",
      icon: <FactCheckIcon />,
      visible: userHasRole(user, "SUPER_ADMIN", "ADMIN", "LECTURA"),
    },
    {
      text: "Servicios",
      path: "/servicios",
      icon: <LocalCarWashIcon />,
      visible: userHasRole(user, "SUPER_ADMIN", "ADMIN", "CAJERO", "MECANICO", "ENCARGADO_SERVICIOS", "LECTURA"),
    },
  ].filter((item) => item.visible ?? true);

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={isMobile ? mobileOpen : true}
      onClose={isMobile ? onMobileClose : undefined}
      ModalProps={isMobile ? { keepMounted: true } : undefined}
      sx={{
        width: isMobile ? drawerWidth : collapsed ? collapsedDrawerWidth : drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: isMobile ? drawerWidth : collapsed ? collapsedDrawerWidth : drawerWidth,
          boxSizing: "border-box",
          background: drawerBackground,
          color: "#fff",
          overflowX: "hidden",
          borderRight: `1px solid ${alpha("#ffffff", 0.08)}`,
          boxShadow: "0 24px 48px rgba(2, 6, 23, 0.35)",
          transition: (theme) =>
            theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.standard,
            }),
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `
              linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 24%),
              radial-gradient(circle at 15% 12%, rgba(96,165,250,0.16), transparent 28%),
              radial-gradient(circle at 82% 100%, rgba(52,211,153,0.10), transparent 26%)
            `,
          },
        },
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 1,
          borderBottom: `1px solid ${alpha("#ffffff", 0.08)}`,
          minHeight: 78,
          position: "relative",
          zIndex: 1,
        }}
      >
        {(!collapsed || isMobile) && (
          <Typography
            variant="h6"
            fontWeight="bold"
            noWrap
            sx={{
              letterSpacing: "-0.02em",
              textShadow: "0 6px 14px rgba(15,23,42,0.28)",
            }}
          >
            POS System
          </Typography>
        )}
        <Tooltip title={collapsed ? "Expandir menu" : "Ocultar menu"}>
          <IconButton
            onClick={isMobile ? onMobileClose : onToggleCollapse}
            sx={{
              color: "#fff",
              border: "2px solid rgba(255,255,255,0.85)",
              width: 42,
              height: 42,
              backgroundColor: "rgba(255,255,255,0.03)",
              animation: collapsed && !isMobile ? "sidebar-float 3.4s ease-in-out infinite" : "none",
              boxShadow: "0 10px 22px rgba(2,6,23,0.26)",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.08)",
              },
            }}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>

      <Box sx={{ overflow: "auto" }}>
        <List>
          {menu.map((item) => (
            <Tooltip key={item.text} title={collapsed ? item.text : ""} placement="right">
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={() => {
                  if (isMobile) {
                    onMobileClose();
                    return;
                  }

                  if (!collapsed) onCollapse();
                }}
                selected={location.pathname === item.path}
                sx={{
                  minHeight: 48,
                  px: 2,
                  mx: 1.25,
                  my: 0.5,
                  justifyContent: collapsed && !isMobile ? "center" : "initial",
                  borderRadius: 4,
                  position: "relative",
                  overflow: "hidden",
                  border: "1px solid transparent",
                  "&.Mui-selected": {
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.info.main} 100%)`,
                    boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.24)}`,
                    borderColor: alpha("#ffffff", 0.16),
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      top: 10,
                      bottom: 10,
                      width: 4,
                      borderRadius: 99,
                      backgroundColor: "rgba(255,255,255,0.95)",
                    },
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(100deg, rgba(255,255,255,0.16), transparent 32%, transparent 72%, rgba(255,255,255,0.10))",
                      pointerEvents: "none",
                    },
                  },
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.08)",
                    borderColor: alpha("#ffffff", 0.12),
                    transform:
                      collapsed && !isMobile ? "none" : "translateX(4px)",
                    boxShadow: "0 10px 22px rgba(2,6,23,0.18)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "#fff",
                    minWidth: 0,
                    mr: collapsed && !isMobile ? 0 : 2,
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {(!collapsed || isMobile) && (
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: 600,
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}

export default Sidebar;
