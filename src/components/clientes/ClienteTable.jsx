import {
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  getTableHeaderCellSx,
  getTableContainerSx,
  getTableHeaderRowSx,
} from "../../utils/tableHeaderStyles";

function ClienteTable({
  clientes = [],
  onEdit,
  onDeactivate,
  canManage = true,
}) {
  const theme = useTheme();

  if (!clientes.length) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }} elevation={0}>
        <Typography color="text.secondary">
          No hay clientes para mostrar.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={getTableContainerSx(theme)}>
      <Table sx={{ minWidth: 950 }}>
        <TableHead>
          <TableRow sx={getTableHeaderRowSx(theme)}>
            <TableCell sx={getTableHeaderCellSx(theme)}>Codigo</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Nombre</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>NIT</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Telefono</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Correo</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Direccion</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Estado</TableCell>
            {canManage && (
              <TableCell align="center" sx={getTableHeaderCellSx(theme)}>
                Acciones
              </TableCell>
            )}
          </TableRow>
        </TableHead>

        <TableBody>
          {clientes.map((cliente) => (
            <TableRow key={cliente.id_cliente} hover>
              <TableCell>{cliente.codigo}</TableCell>
              <TableCell>
                <Typography fontWeight={600}>{cliente.nombre || "-"}</Typography>
              </TableCell>
              <TableCell>{cliente.nit || "-"}</TableCell>
              <TableCell>{cliente.telefono || "-"}</TableCell>
              <TableCell>{cliente.correo || "-"}</TableCell>
              <TableCell>{cliente.direccion || "-"}</TableCell>
              <TableCell>
                <Chip
                  label={cliente.estado ? "Activo" : "Inactivo"}
                  color={cliente.estado ? "success" : "default"}
                  size="small"
                  variant={cliente.estado ? "filled" : "outlined"}
                />
              </TableCell>
              {canManage && (
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Tooltip title="Editar cliente">
                      <span>
                        <IconButton color="primary" onClick={() => onEdit(cliente)}>
                          <EditIcon />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Desactivar cliente">
                      <span>
                        <IconButton
                          color="error"
                          onClick={() => onDeactivate(cliente)}
                          disabled={!cliente.estado}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default ClienteTable;
