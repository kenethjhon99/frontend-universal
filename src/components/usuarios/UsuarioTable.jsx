import {
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  getTableHeaderCellSx,
  getTableContainerSx,
  getTableHeaderRowSx,
} from "../../utils/tableHeaderStyles";

const normalizarNombreRol = (nombreRol) => {
  const normalized = String(nombreRol || "").trim().toUpperCase();
  return normalized === "SUPERADMIN" ? "SUPER_ADMIN" : normalized;
};

const dedupeRoles = (roles) => {
  const seen = new Set();

  return (Array.isArray(roles) ? roles : [])
    .map((rol) => ({
      ...rol,
      nombre_rol: normalizarNombreRol(rol?.nombre_rol),
    }))
    .filter((rol) => {
      const key = normalizarNombreRol(rol?.nombre_rol);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

function UsuarioTable({
  usuarios = [],
  onEdit,
  onToggleActivo,
  canManage = true,
}) {
  const theme = useTheme();

  if (!usuarios.length) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }} elevation={0}>
        <Typography color="text.secondary">
          No hay usuarios para mostrar.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={getTableContainerSx(theme)}>
      <Table sx={{ minWidth: 980 }}>
        <TableHead>
          <TableRow sx={getTableHeaderRowSx(theme)}>
            <TableCell sx={getTableHeaderCellSx(theme)}>Usuario</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Nombre</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Telefono</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Roles</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Estado</TableCell>
            <TableCell align="center" sx={getTableHeaderCellSx(theme)}>
              {canManage ? "Acciones" : "Modo"}
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {usuarios.map((usuario) => (
            <TableRow key={usuario.id_usuario} hover>
              <TableCell>
                <Typography fontWeight={700}>{usuario.username}</Typography>
              </TableCell>

              <TableCell>
                <Typography fontWeight={600}>
                  {usuario.persona_nombre || usuario.nombre || "-"} {usuario.persona_apellido || ""}
                </Typography>
              </TableCell>

              <TableCell>{usuario.telefono || "-"}</TableCell>

              <TableCell>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {dedupeRoles(usuario.roles).map((rol) => (
                    <Chip
                      key={`${usuario.id_usuario}-${rol.nombre_rol}`}
                      label={rol.nombre_rol}
                      size="small"
                      color={rol.nombre_rol === "SUPER_ADMIN" ? "secondary" : "primary"}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </TableCell>

              <TableCell>
                <Chip
                  label={usuario.activo ? "Activo" : "Inactivo"}
                  color={usuario.activo ? "success" : "default"}
                  size="small"
                  variant={usuario.activo ? "filled" : "outlined"}
                />
              </TableCell>

              <TableCell align="center">
                {canManage ? (
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Button size="small" variant="outlined" onClick={() => onEdit(usuario)}>
                      Editar
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      color={usuario.activo ? "error" : "success"}
                      onClick={() => onToggleActivo(usuario)}
                    >
                      {usuario.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </Stack>
                ) : (
                  <Chip label="Solo lectura" size="small" variant="outlined" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default UsuarioTable;
