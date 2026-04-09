import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { getDefaultRoute } from "../utils/roles";

import {
  Chip,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Avatar,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", form);
      const { token, user } = res.data;

      login(user, token);
      navigate(getDefaultRoute(user));
    } catch (err) {
      const networkError = !err.response;
      const productionApiMissing = !import.meta.env.DEV && !import.meta.env.VITE_API_URL;

      if (networkError) {
        setError(
          productionApiMissing
            ? "No se pudo conectar con el servidor. Configura VITE_API_URL en Vercel."
            : "No se pudo conectar con el servidor. Revisa la URL del API y CORS del backend."
        );
      } else {
        setError(err.response?.data?.error || "Error al iniciar sesion");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        position: "relative",
        overflow: "hidden",
        background: isLight
          ? "linear-gradient(140deg, #eef4ff 0%, #eef2ff 42%, #f5f7ff 100%)"
          : "linear-gradient(140deg, #070d17 0%, #0b1321 46%, #101827 100%)",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(circle at 12% 18%, ${isLight ? "rgba(37,99,235,0.18)" : "rgba(37,99,235,0.24)"}, transparent 20%),
            radial-gradient(circle at 88% 16%, ${isLight ? "rgba(147,51,234,0.16)" : "rgba(168,85,247,0.18)"}, transparent 18%),
            radial-gradient(circle at 50% 100%, ${isLight ? "rgba(20,184,166,0.10)" : "rgba(20,184,166,0.12)"}, transparent 24%)
          `,
        },
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            `repeating-linear-gradient(135deg, ${
              isLight ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.02)"
            } 0px, ${isLight ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.02)"} 1px, transparent 1px, transparent 18px)`,
          opacity: isLight ? 0.8 : 1,
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: { xs: -40, md: -70 },
          right: { xs: -60, md: -80 },
          width: { xs: 180, md: 280 },
          height: { xs: 180, md: 280 },
          borderRadius: "50%",
          background:
            isLight
              ? "radial-gradient(circle at center, rgba(37,99,235,0.22) 0%, transparent 70%)"
              : "radial-gradient(circle at center, rgba(37,99,235,0.28) 0%, transparent 72%)",
          filter: "blur(10px)",
          animation: "aurora-drift 16s ease-in-out infinite",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          left: { xs: -80, md: -40 },
          bottom: { xs: -80, md: -90 },
          width: { xs: 200, md: 320 },
          height: { xs: 200, md: 320 },
          borderRadius: "50%",
          background:
            isLight
              ? "radial-gradient(circle at center, rgba(16,185,129,0.16) 0%, transparent 72%)"
              : "radial-gradient(circle at center, rgba(16,185,129,0.18) 0%, transparent 74%)",
          filter: "blur(16px)",
          animation: "aurora-drift 18s ease-in-out infinite reverse",
        }}
      />

      <Paper
        elevation={10}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 420,
          p: 4,
          borderRadius: 5,
          overflow: "hidden",
          backdropFilter: "blur(14px)",
          background: isLight
            ? "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,252,255,0.98) 58%, rgba(245,248,255,0.98) 100%)"
            : "linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(17,24,39,0.96) 58%, rgba(9,14,24,0.98) 100%)",
          boxShadow: isLight
            ? "0 28px 60px rgba(15,23,42,0.18)"
            : "0 32px 70px rgba(2,6,23,0.46)",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: isLight
              ? "linear-gradient(180deg, rgba(255,255,255,0.3), transparent 30%), radial-gradient(circle at top right, rgba(37,99,235,0.12), transparent 28%)"
              : "linear-gradient(180deg, rgba(255,255,255,0.06), transparent 30%), radial-gradient(circle at top right, rgba(37,99,235,0.14), transparent 30%)",
          },
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          autoComplete="off"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              width: 0,
              height: 0,
              overflow: "hidden",
              opacity: 0,
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            <input type="text" name="fake_username" autoComplete="username" tabIndex={-1} />
            <input
              type="password"
              name="fake_password"
              autoComplete="current-password"
              tabIndex={-1}
            />
          </Box>

          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            <Avatar
              sx={{
                bgcolor: "primary.main",
                width: 64,
                height: 64,
                boxShadow: "0 16px 34px rgba(37,99,235,0.28)",
              }}
            >
              <LockOutlinedIcon fontSize="large" />
            </Avatar>

            <Chip
              label="Acceso seguro"
              color="primary"
              variant="outlined"
              sx={{
                fontWeight: 700,
                backgroundColor: "rgba(37,99,235,0.06)",
              }}
            />

            <Typography variant="h4" fontWeight="bold" textAlign="center">
              Iniciar sesion
            </Typography>

            <Typography variant="body2" color="text.secondary" textAlign="center">
              Ingresa a tu sistema de punto de venta
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Usuario"
            name="username"
            value={form.username}
            onChange={handleChange}
            fullWidth
            required
            autoFocus
            autoComplete="off"
            inputProps={{
              autoCapitalize: "none",
              autoCorrect: "off",
              spellCheck: "false",
              "data-lpignore": "true",
              "data-1p-ignore": "true",
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Contrasena"
            name="password"
            type={mostrarPassword ? "text" : "password"}
            value={form.password}
            onChange={handleChange}
            fullWidth
            required
            autoComplete="new-password"
            inputProps={{
              autoCapitalize: "none",
              autoCorrect: "off",
              spellCheck: "false",
              "data-lpignore": "true",
              "data-1p-ignore": "true",
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setMostrarPassword((prev) => !prev)}
                    edge="end"
                  >
                    {mostrarPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{
              py: 1.5,
              borderRadius: 999,
              fontWeight: "bold",
              boxShadow: "0 16px 34px rgba(37,99,235,0.28)",
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Ingresar"}
          </Button>

          <Typography variant="caption" color="text.secondary" textAlign="center">
            Acceso seguro al sistema
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default Login;
