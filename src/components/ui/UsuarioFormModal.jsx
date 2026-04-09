import { useState } from "react";
import LockResetIcon from "@mui/icons-material/LockReset";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const normalizarNombreRol = (nombreRol) => {
  const normalized = String(nombreRol || "").trim().toUpperCase();
  return normalized === "SUPERADMIN" ? "SUPER_ADMIN" : normalized;
};

const dedupeRoleIds = (roleIds) => {
  return [
    ...new Set(
      (Array.isArray(roleIds) ? roleIds : [])
        .map((value) => Number(value))
        .filter(Number.isInteger)
    ),
  ];
};

const dedupeRolesByName = (roles) => {
  const seen = new Set();

  return (Array.isArray(roles) ? roles : []).filter((rol) => {
    const key = normalizarNombreRol(rol?.nombre_rol);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildFormState = (usuarioEditando) => {
  const roles = dedupeRoleIds(
    Array.isArray(usuarioEditando?.roles)
      ? dedupeRolesByName(usuarioEditando.roles).map((rol) => Number(rol.id_rol))
      : []
  );

  return {
    username: usuarioEditando?.username || "",
    password: "",
    confirmPassword: "",
    nombre: usuarioEditando?.persona_nombre || "",
    apellido: usuarioEditando?.persona_apellido || "",
    dpi_persona: usuarioEditando?.dpi_persona || "",
    telefono: usuarioEditando?.telefono || "",
    direccion_persona: usuarioEditando?.direccion_persona || "",
    roles,
  };
};

const getPasswordStrength = (password) => {
  const value = String(password || "");
  let score = 0;

  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (!value) {
    return { label: "Sin definir", color: "inherit", progress: 0 };
  }
  if (score <= 2) {
    return { label: "Baja", color: "error", progress: 33 };
  }
  if (score <= 4) {
    return { label: "Media", color: "warning", progress: 66 };
  }
  return { label: "Alta", color: "success", progress: 100 };
};

function UsuarioFormModal({
  open,
  onClose,
  onSave,
  loading = false,
  usuarioEditando = null,
  roles = [],
}) {
  const [form, setForm] = useState(() => buildFormState(usuarioEditando));
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRolesChange = (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      roles: dedupeRoleIds(value),
    }));
  };

  const resetPasswordSection = () => {
    setShowPassword(false);
    setShowConfirmPassword(false);
    setForm((prev) => ({
      ...prev,
      password: "",
      confirmPassword: "",
    }));
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const showPasswordFields = !usuarioEditando || showPasswordChange;
  const passwordStrength = getPasswordStrength(form.password);
  const passwordTooShort =
    showPasswordFields &&
    Boolean(form.password) &&
    form.password.length < 4;
  const passwordMismatch =
    showPasswordFields &&
    Boolean(form.confirmPassword) &&
    form.password !== form.confirmPassword;
  const isSubmitDisabled =
    loading ||
    (showPasswordFields &&
      (!form.password ||
        !form.confirmPassword ||
        passwordTooShort ||
        passwordMismatch));

  const handleSubmit = (event) => {
    event.preventDefault();

    if (showPasswordFields) {
      if (!form.password || form.password.length < 4) return;
      if (form.password !== form.confirmPassword) return;
    }

    onSave({
      username: form.username.trim(),
      password: showPasswordFields ? form.password : "",
      persona: {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        dpi_persona: form.dpi_persona.trim(),
        telefono: form.telefono.trim(),
        direccion_persona: form.direccion_persona.trim(),
      },
      roles: form.roles.map(Number),
    });
  };

  const togglePasswordChange = () => {
    setShowPasswordChange((prev) => !prev);
    resetPasswordSection();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight="bold">
          {usuarioEditando ? "Editar usuario" : "Nuevo usuario"}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2} mt={0.5}>
          <Grid item xs={12} md={usuarioEditando ? 12 : 6}>
            <TextField
              fullWidth
              required
              label="Username"
              name="username"
              value={form.username}
              onChange={handleChange}
            />
          </Grid>

          {usuarioEditando && (
            <Grid item xs={12}>
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: showPasswordChange ? "primary.main" : "divider",
                  borderRadius: 3,
                  px: 2,
                  py: 2,
                  backgroundColor: showPasswordChange ? "action.selected" : "background.paper",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Seguridad de acceso
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {showPasswordChange
                        ? "Ingresa una nueva password y confirmala para actualizar el acceso."
                        : "La password actual se mantiene. Abre esta seccion solo si deseas cambiarla."}
                    </Typography>
                  </Box>

                  <Button
                    variant={showPasswordChange ? "contained" : "outlined"}
                    color={showPasswordChange ? "warning" : "primary"}
                    startIcon={<LockResetIcon />}
                    onClick={togglePasswordChange}
                    sx={{ minWidth: { xs: "100%", sm: 240 } }}
                  >
                    {showPasswordChange ? "Cancelar cambio de password" : "Cambiar password"}
                  </Button>
                </Stack>

                <Collapse in={showPasswordChange} timeout={320} easing="cubic-bezier(0.22, 1, 0.36, 1)">
                  <Box
                    sx={{
                      mt: 2,
                      p: 2.25,
                      borderRadius: 3.5,
                      border: "1px dashed",
                      borderColor: "divider",
                      backgroundColor: "background.default",
                      boxShadow: showPasswordChange
                        ? "0 14px 30px rgba(0, 0, 0, 0.18)"
                        : "0 0 0 rgba(0, 0, 0, 0)",
                      opacity: showPasswordChange ? 1 : 0,
                      transform: showPasswordChange
                        ? "translateY(0)"
                        : "translateY(-8px)",
                      transition:
                        "opacity 320ms cubic-bezier(0.22, 1, 0.36, 1), transform 320ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 320ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    <Alert severity="info" sx={{ mb: 2 }}>
                      La nueva password se guardara cifrada y reemplazara la anterior.
                    </Alert>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label="Minimo 4 caracteres" variant="outlined" />
                      <Chip size="small" label="Mejor con numeros" variant="outlined" />
                      <Chip size="small" label="Mejor con simbolos" variant="outlined" />
                    </Stack>

                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          required
                          type={showPassword ? "text" : "password"}
                          label="Nueva password"
                          name="password"
                          value={form.password}
                          onChange={handleChange}
                          helperText="Minimo 4 caracteres."
                          error={passwordTooShort}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  edge="end"
                                  onClick={() => setShowPassword((prev) => !prev)}
                                >
                                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          required
                          type={showConfirmPassword ? "text" : "password"}
                          label="Confirmar password"
                          name="confirmPassword"
                          value={form.confirmPassword}
                          onChange={handleChange}
                          helperText={
                            passwordMismatch
                              ? "Las passwords no coinciden."
                              : "Confirma la nueva password."
                          }
                          error={passwordMismatch}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  edge="end"
                                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                                >
                                  {showConfirmPassword ? (
                                    <VisibilityOffIcon />
                                  ) : (
                                    <VisibilityIcon />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              Fortaleza:
                            </Typography>
                            <Chip
                              size="small"
                              label={passwordStrength.label}
                              color={passwordStrength.color}
                              variant="outlined"
                            />
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={passwordStrength.progress}
                            color={passwordStrength.color}
                            sx={{ height: 8, borderRadius: 999 }}
                          />
                        </Stack>
                      </Grid>
                    </Grid>
                  </Box>
                </Collapse>
              </Box>
            </Grid>
          )}

          {showPasswordFields && !usuarioEditando && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type={showPassword ? "text" : "password"}
                label={usuarioEditando ? "Nueva password" : "Password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                helperText="Minimo 4 caracteres."
                error={passwordTooShort}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          )}

          {showPasswordFields && !usuarioEditando && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type={showConfirmPassword ? "text" : "password"}
                label="Confirmar password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                helperText={
                  passwordMismatch
                    ? "Las passwords no coinciden."
                    : "Confirma la nueva password."
                }
                error={passwordMismatch}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                      >
                        {showConfirmPassword ? (
                          <VisibilityOffIcon />
                        ) : (
                          <VisibilityIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          )}

          {showPasswordFields && !usuarioEditando && (
            <Grid item xs={12}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Fortaleza:
                  </Typography>
                  <Chip
                    size="small"
                    label={passwordStrength.label}
                    color={passwordStrength.color}
                    variant="outlined"
                  />
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={passwordStrength.progress}
                  color={passwordStrength.color}
                  sx={{ height: 8, borderRadius: 999 }}
                />
              </Stack>
            </Grid>
          )}

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Apellido"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="DPI"
              name="dpi_persona"
              value={form.dpi_persona}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Telefono"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Direccion"
              name="direccion_persona"
              value={form.direccion_persona}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="roles-usuario-label">Roles</InputLabel>
              <Select
                labelId="roles-usuario-label"
                multiple
                value={form.roles}
                onChange={handleRolesChange}
                input={<OutlinedInput label="Roles" />}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {dedupeRoleIds(selected).map((idRol) => {
                      const rol = roles.find((item) => Number(item.id_rol) === Number(idRol));
                      return (
                        <Chip
                          key={idRol}
                          size="small"
                          label={normalizarNombreRol(rol?.nombre_rol) || `Rol ${idRol}`}
                        />
                      );
                    })}
                  </Stack>
                )}
              >
                {roles.map((rol) => (
                  <MenuItem key={rol.id_rol} value={Number(rol.id_rol)}>
                    {normalizarNombreRol(rol.nombre_rol)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSubmitDisabled}>
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : usuarioEditando ? (
            "Guardar cambios"
          ) : (
            "Crear usuario"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UsuarioFormModal;
