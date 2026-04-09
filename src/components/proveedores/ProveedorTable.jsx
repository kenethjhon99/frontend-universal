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
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  getTableHeaderCellSx,
  getTableContainerSx,
  getTableHeaderRowSx,
} from "../../utils/tableHeaderStyles";

function ProveedorTable({
  proveedores = [],
  onEdit,
  onDeactivate,
  onViewHistory,
  canManage = true,
}) {
  const theme = useTheme();

  if (!proveedores.length) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }} elevation={0}>
        <Typography color="text.secondary">
          No hay proveedores para mostrar.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={getTableContainerSx(theme)}>
      <Table sx={{ minWidth: 900 }}>
        <TableHead>
          <TableRow sx={getTableHeaderRowSx(theme)}>
            <TableCell sx={getTableHeaderCellSx(theme)}>Nombre</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>NIT</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Telefono</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Correo</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Direccion</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Estado</TableCell>
            <TableCell align="center" sx={getTableHeaderCellSx(theme)}>
              Acciones
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {proveedores.map((proveedor) => (
            <TableRow key={proveedor.id_proveedor} hover>
              <TableCell>
                <Typography fontWeight={600}>{proveedor.nombre}</Typography>
              </TableCell>
              <TableCell>{proveedor.nit}</TableCell>
              <TableCell>{proveedor.telefono || "-"}</TableCell>
              <TableCell>{proveedor.correo || "-"}</TableCell>
              <TableCell>{proveedor.direccion || "-"}</TableCell>
              <TableCell>
                <Chip
                  label={proveedor.estado ? "Activo" : "Inactivo"}
                  color={proveedor.estado ? "success" : "default"}
                  size="small"
                  variant={proveedor.estado ? "filled" : "outlined"}
                />
              </TableCell>
              <TableCell align="center">
                <Stack direction="row" spacing={1} justifyContent="center">
                  <Tooltip title="Ver compras">
                    <span>
                      <IconButton color="inherit" onClick={() => onViewHistory(proveedor)}>
                        <ReceiptLongIcon />
                      </IconButton>
                    </span>
                  </Tooltip>

                  {canManage && (
                    <>
                      <Tooltip title="Editar proveedor">
                        <span>
                          <IconButton color="primary" onClick={() => onEdit(proveedor)}>
                            <EditIcon />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Desactivar proveedor">
                        <span>
                          <IconButton
                            color="error"
                            onClick={() => onDeactivate(proveedor)}
                            disabled={!proveedor.estado}
                          >
                            <DeleteOutlineIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default ProveedorTable;
