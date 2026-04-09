import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Card,
  CardContent,
  Divider,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  getTableHeaderCellSx,
  getTableContainerSx,
  getTableHeaderRowSx,
} from "../../utils/tableHeaderStyles";

import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import TimelineIcon from "@mui/icons-material/Timeline";

function ProductoTable({
  productos = [],
  onEdit,
  onDelete,
  onViewKardex,
  canManage = true,
  showModulo = false,
}) {
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("md"));

  const getModuloChip = (modulo) => {
    const normalized = String(modulo || "GENERAL").toUpperCase();

    if (normalized === "SERVICIOS") {
      return <Chip label="Tienda" color="secondary" size="small" />;
    }

    return (
      <Chip
        label="General"
        color="primary"
        size="small"
        variant="outlined"
      />
    );
  };

  if (!productos.length) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          No hay productos para mostrar.
        </Typography>
      </Box>
    );
  }

  if (esMovil) {
    return (
      <Stack spacing={2}>
        {productos.map((producto) => {
          const stock = Number(producto.stock ?? 0);

          return (
            <Card
              key={producto.id_producto}
              elevation={2}
              sx={{
                borderRadius: 3,
              }}
            >
              <CardContent>
                <Stack spacing={1.5}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    gap={2}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {producto.nombre}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Codigo: {producto.codigo_barras || "-"}
                      </Typography>
                    </Box>

                    <Chip
                      icon={<Inventory2Icon />}
                      label={`Stock: ${stock}`}
                      color={stock > 0 ? "primary" : "default"}
                      size="small"
                    />
                  </Box>

                  <Divider />

                  {showModulo && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Modulo
                      </Typography>
                      <Box mt={0.5}>{getModuloChip(producto.modulo_origen)}</Box>
                    </Box>
                  )}

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Descripcion
                    </Typography>
                    <Typography variant="body1">
                      {producto.descripcion || "-"}
                    </Typography>
                  </Box>

                  <Box display="flex" justifyContent="space-between" gap={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Compra
                      </Typography>
                      <Typography fontWeight={600}>
                        Q {Number(producto.precio_compra).toFixed(2)}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Venta
                      </Typography>
                      <Typography fontWeight={600} color="primary.main">
                        Q {Number(producto.precio_venta).toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" justifyContent="flex-end" gap={1}>
                    {onViewKardex && (
                      <Tooltip title="Ver kardex">
                        <IconButton
                          color="secondary"
                          onClick={() => onViewKardex(producto)}
                        >
                          <TimelineIcon />
                        </IconButton>
                      </Tooltip>
                    )}

                    {canManage && (
                      <>
                        <Tooltip title="Editar producto">
                          <IconButton
                            color="primary"
                            onClick={() => onEdit(producto)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Desactivar producto">
                          <IconButton
                            color="error"
                            onClick={() => onDelete(producto)}
                          >
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={getTableContainerSx(theme)}>
      <Table sx={{ minWidth: showModulo ? 1120 : 1000 }}>
        <TableHead>
          <TableRow sx={getTableHeaderRowSx(theme)}>
            <TableCell sx={getTableHeaderCellSx(theme)}>ID</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Codigo</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Nombre</TableCell>
            {showModulo && (
              <TableCell sx={getTableHeaderCellSx(theme)}>Modulo</TableCell>
            )}
            <TableCell sx={getTableHeaderCellSx(theme)}>Descripcion</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Compra</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Venta</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Stock</TableCell>
            <TableCell align="center" sx={getTableHeaderCellSx(theme)}>
              Acciones
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {productos.map((producto) => {
            const stock = Number(producto.stock ?? 0);

            return (
              <TableRow
                key={producto.id_producto}
                hover
                sx={{
                  "&:last-child td, &:last-child th": { border: 0 },
                }}
              >
                <TableCell>{producto.id_producto}</TableCell>
                <TableCell>{producto.codigo_barras || "-"}</TableCell>
                <TableCell>
                  <Typography fontWeight={600}>{producto.nombre}</Typography>
                </TableCell>
                {showModulo && (
                  <TableCell>{getModuloChip(producto.modulo_origen)}</TableCell>
                )}
                <TableCell>{producto.descripcion || "-"}</TableCell>
                <TableCell>Q {Number(producto.precio_compra).toFixed(2)}</TableCell>
                <TableCell>
                  <Typography fontWeight={600}>
                    Q {Number(producto.precio_venta).toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={stock}
                    color={stock > 0 ? "primary" : "default"}
                    variant={stock > 0 ? "filled" : "outlined"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    {onViewKardex && (
                      <Tooltip title="Ver kardex">
                        <IconButton
                          color="secondary"
                          onClick={() => onViewKardex(producto)}
                        >
                          <TimelineIcon />
                        </IconButton>
                      </Tooltip>
                    )}

                    {canManage && (
                      <>
                        <Tooltip title="Editar producto">
                          <IconButton
                            color="primary"
                            onClick={() => onEdit(producto)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Desactivar producto">
                          <IconButton
                            color="error"
                            onClick={() => onDelete(producto)}
                          >
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default ProductoTable;
