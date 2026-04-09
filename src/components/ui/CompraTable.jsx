import {
  Box,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import { useTheme } from "@mui/material/styles";
import {
  getTableHeaderCellSx,
  getTableHeaderRowSx,
} from "../../utils/tableHeaderStyles";

function CompraTable({
  items,
  onCambiarCantidad,
  onCambiarCosto,
  onEliminar,
  disabled = false,
}) {
  const theme = useTheme();

  if (!items.length) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          borderRadius: 3,
          textAlign: "center",
        }}
      >
        <Stack spacing={1} alignItems="center">
          <LocalMallIcon color="disabled" sx={{ fontSize: 40 }} />
          <Typography variant="h6" fontWeight="bold">
            Compra vacia
          </Typography>
          <Typography color="text.secondary">
            Agrega productos para registrar una nueva compra
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflowX: "auto",
      }}
    >
      <Table>
        <TableHead>
          <TableRow sx={getTableHeaderRowSx(theme)}>
            <TableCell sx={getTableHeaderCellSx(theme)}>Producto</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Stock actual</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Costo unitario</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Cantidad</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Subtotal</TableCell>
            <TableCell align="center" sx={getTableHeaderCellSx(theme)}>
              Accion
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id_producto} hover>
              <TableCell>
                <Box>
                  <Typography fontWeight={600}>{item.nombre}</Typography>
                  {item.codigo_barras && (
                    <Typography variant="body2" color="text.secondary">
                      {item.codigo_barras}
                    </Typography>
                  )}
                </Box>
              </TableCell>

              <TableCell>
                <Typography color="text.secondary">
                  {Number(item.stock_actual || 0)}
                </Typography>
              </TableCell>

              <TableCell>
                <TextField
                  type="number"
                  size="small"
                  value={item.costo_unitario}
                  onChange={(event) =>
                    onCambiarCosto(
                      item.id_producto,
                      Number(event.target.value)
                    )
                  }
                  disabled={disabled}
                  inputProps={{
                    min: 0.01,
                    step: "0.01",
                    style: { textAlign: "right" },
                  }}
                  sx={{ width: 120 }}
                />
              </TableCell>

              <TableCell>
                <TextField
                  type="number"
                  size="small"
                  value={item.cantidad}
                  onChange={(event) =>
                    onCambiarCantidad(
                      item.id_producto,
                      Number(event.target.value)
                    )
                  }
                  disabled={disabled}
                  inputProps={{
                    min: 1,
                    style: { textAlign: "center" },
                  }}
                  sx={{ width: 90 }}
                />
              </TableCell>

              <TableCell>
                <Typography fontWeight="bold" color="primary.main">
                  Q{" "}
                  {(
                    Number(item.costo_unitario || 0) * Number(item.cantidad || 0)
                  ).toFixed(2)}
                </Typography>
              </TableCell>

              <TableCell align="center">
                <Tooltip title="Quitar producto">
                  <IconButton
                    color="error"
                    onClick={() => onEliminar(item.id_producto)}
                    disabled={disabled}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

export default CompraTable;
