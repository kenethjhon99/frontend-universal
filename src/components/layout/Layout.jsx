import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useState } from "react";

const drawerWidth = 240;
const collapsedDrawerWidth = 88;

function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
        position: "relative",
        overflowX: "clip",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: theme.customLayout?.shellGlow,
          opacity: theme.palette.mode === "light" ? 1 : 0.9,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: theme.customLayout?.shellPattern,
          opacity: theme.palette.mode === "light" ? 0.75 : 0.9,
          mixBlendMode: theme.palette.mode === "light" ? "multiply" : "screen",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          top: { xs: 78, md: 92 },
          right: { xs: -100, md: -70 },
          width: { xs: 220, md: 360 },
          height: { xs: 220, md: 360 },
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 0,
          opacity: theme.palette.mode === "light" ? 0.95 : 0.8,
          backgroundImage: theme.customLayout?.orbPrimary,
          filter: "blur(14px)",
          animation: "aurora-drift 16s ease-in-out infinite",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          left: { xs: -70, md: 90 },
          bottom: { xs: -80, md: -40 },
          width: { xs: 180, md: 280 },
          height: { xs: 180, md: 280 },
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 0,
          opacity: theme.palette.mode === "light" ? 0.9 : 0.72,
          backgroundImage: theme.customLayout?.orbSecondary,
          filter: "blur(16px)",
          animation: "aurora-drift 20s ease-in-out infinite reverse",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          left: "48%",
          top: "30%",
          width: { xs: 130, md: 180 },
          height: { xs: 130, md: 180 },
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 0,
          opacity: theme.palette.mode === "light" ? 0.55 : 0.4,
          backgroundImage: theme.customLayout?.orbAccent,
          filter: "blur(20px)",
          animation: "glow-pulse 8s ease-in-out infinite",
        }}
      />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        onCollapse={() => setSidebarCollapsed(true)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          flexGrow: 1,
          transition: (theme) =>
            theme.transitions.create(["margin", "width"], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.standard,
            }),
          width: isMobile
            ? "100%"
            : `calc(100% - ${sidebarCollapsed ? collapsedDrawerWidth : drawerWidth}px)`,
        }}
      >
        <Header
          showMobileMenuButton={isMobile}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
        />

        <Box
          component="main"
          sx={{
            position: "relative",
            p: { xs: 2, md: 3 },
            bgcolor: "background.default",
            color: "text.primary",
            minHeight: "100vh",
            animation: "app-shell-fade 420ms ease",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage: theme.customLayout?.contentOverlay,
              opacity: 0.9,
            },
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                theme.palette.mode === "light"
                  ? "radial-gradient(circle at top left, rgba(255,255,255,0.22), transparent 34%)"
                  : "radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 34%)",
            },
            "& > *": {
              position: "relative",
              zIndex: 1,
            },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default Layout;
