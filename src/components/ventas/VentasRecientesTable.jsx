import {
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  getTableHeaderCellSx,
  getTableContainerSx,
  getTableHeaderRowSx,
} from "../../utils/tableHeaderStyles";

const formatFecha = (value) => {
  if (!value) return "-";

  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return "-";

  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(fecha);
};

function VentasRecientesTable({
  ventas = [],
  loading = false,
  onViewDetail,
  onPrint,
  onAnular,
  canAnular = false,
  printingVentaId = null,
}) {
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("md"));

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">Cargando ventas recientes...</Typography>
      </Paper>
    );
  }

  if (!ventas.length) {
    return (
      <Paper elevation={0} sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          Aun no hay ventas recientes para mostrar.
        </Typography>
      </Paper>
    );
  }

  if (esMovil) {
    return (
      <Stack spacing={1.5}>
        {ventas.map((venta) => {
          const anulada = venta.estado === "ANULADA";

          return (
            <Paper key={venta.id_venta} elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Stack spacing={1.5}>
                <Box display="flex" justifyContent="space-between" gap={2}>
                  <Box>
                    <Typography fontWeight={700}>
                      {venta.numero_comprobante || `#${venta.id_venta}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(venta.comprobante_nombre || venta.tipo_comprobante || "Comprobante").toString()} | {venta.tipo_venta || "-"}
                    </Typography>
                  </Box>

                  <Chip
                    label={venta.estado || "PENDIENTE"}
                    color={anulada ? "error" : "success"}
                    size="small"
                    variant={anulada ? "filled" : "outlined"}
                  />
                </Box>

                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Fecha: {formatFecha(venta.fecha)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cliente: {venta.cliente_nombre || "Consumidor final"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pago: {venta.metodo_pago || "-"}
                  </Typography>
                  <Typography fontWeight={700}>
                    Total: Q {Number(venta.total || 0).toFixed(2)}
                  </Typography>
                </Stack>

                <Stack direction="column" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onViewDetail(venta)}
                    fullWidth
                  >
                    Ver detalle
                  </Button>

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onPrint?.(venta)}
                    disabled={printingVentaId === venta.id_venta}
                    fullWidth
                  >
                    {printingVentaId === venta.id_venta ? "Imprimiendo..." : "Imprimir"}
                  </Button>

                  {canAnular && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      disabled={anulada}
                      onClick={() => onAnular(venta)}
                      fullWidth
                    >
                      {anulada ? "Anulada" : "Anular"}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={getTableContainerSx(theme)}>
      <Table sx={{ minWidth: 900 }}>
        <TableHead>
          <TableRow sx={getTableHeaderRowSx(theme)}>
            <TableCell sx={getTableHeaderCellSx(theme)}>Venta</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Fecha</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Cliente</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Pago</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Estado</TableCell>
            <TableCell sx={getTableHeaderCellSx(theme)}>Total</TableCell>
            <TableCell align="center" sx={getTableHeaderCellSx(theme)}>
              Acciones
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {ventas.map((venta) => {
            const anulada = venta.estado === "ANULADA";

            return (
              <TableRow key={venta.id_venta} hover>
                <TableCell>
                  <Typography fontWeight={700}>
                    {venta.numero_comprobante || `#${venta.id_venta}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(venta.comprobante_nombre || venta.tipo_comprobante || "Comprobante").toString()} | {venta.tipo_venta || "-"}
                  </Typography>
                </TableCell>

                <TableCell>{formatFecha(venta.fecha)}</TableCell>

                <TableCell>
                  {venta.cliente_nombre ? (
                    <Stack spacing={0.25}>
                      <Typography fontWeight={600}>{venta.cliente_nombre}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {venta.cliente_codigo || "Sin codigo"}
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">Consumidor final</Typography>
                  )}
                </TableCell>

                <TableCell>{venta.metodo_pago || "-"}</TableCell>

                <TableCell>
                  <Chip
                    label={venta.estado || "PENDIENTE"}
                    color={anulada ? "error" : "success"}
                    size="small"
                    variant={anulada ? "filled" : "outlined"}
                  />
                </TableCell>

                <TableCell>
                  <Typography fontWeight={700}>Q {Number(venta.total || 0).toFixed(2)}</Typography>
                </TableCell>

                <TableCell align="center">
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    justifyContent="center"
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onViewDetail(venta)}
                    >
                      Ver detalle
                    </Button>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onPrint?.(venta)}
                      disabled={printingVentaId === venta.id_venta}
                    >
                      {printingVentaId === venta.id_venta ? "Imprimiendo..." : "Imprimir"}
                    </Button>

                    {canAnular && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        disabled={anulada}
                        onClick={() => onAnular(venta)}
                      >
                        {anulada ? "Anulada" : "Anular"}
                      </Button>
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

export default VentasRecientesTable;
