import {
  Button,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";

const formatMoney = (value) => `Q ${Number(value || 0).toFixed(2)}`;

function VentaDetalleModal({
  open,
  onClose,
  ventaData,
  loading = false,
  onPrint,
  printing = false,
  onAnularDetalle,
  loadingAnulacionDetalle = false,
  detalleAnulandoId = null,
  canAnular = false,
}) {
  const venta = ventaData?.venta;
  const detalles = ventaData?.detalles || [];
  const anulaciones = ventaData?.anulaciones || [];
  const resumen = ventaData?.resumen;
  const estado = String(venta?.estado_real || venta?.estado || "SIN ESTADO").toUpperCase();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Typography variant="h6" fontWeight="bold">
            Detalle de venta
          </Typography>

          <Button
            variant="outlined"
            onClick={() => onPrint?.()}
            disabled={loading || !venta || printing}
          >
            {printing ? "Imprimiendo..." : "Imprimir comprobante"}
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={24} />
            <Typography color="text.secondary">
              Cargando detalle de venta...
            </Typography>
          </Stack>
        ) : !venta ? (
          <Typography color="text.secondary">
            No hay informacion de la venta para mostrar.
          </Typography>
        ) : (
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Comprobante
                </Typography>
                <Typography fontWeight={600}>
                  {venta.numero_comprobante || `#${venta.id_venta}`}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Estado
                </Typography>
                <Chip
                  label={estado}
                  color={estado === "ANULADA" ? "error" : "success"}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Cliente
                </Typography>
                <Typography fontWeight={600}>
                  {venta.cliente_nombre || "Consumidor final"}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Tipo de comprobante
                </Typography>
                <Typography fontWeight={600}>
                  {venta.comprobante_nombre || venta.tipo_comprobante || "-"}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Metodo de pago
                </Typography>
                <Typography fontWeight={600}>{venta.metodo_pago || "-"}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Fecha
                </Typography>
                <Typography fontWeight={600}>{venta.fecha || "-"}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Usuario
                </Typography>
                <Typography fontWeight={600}>
                  {venta.usuario_nombre || venta.usuario_username || "-"}
                </Typography>
              </Grid>
              {venta.motivo_anulacion && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Motivo de anulacion
                  </Typography>
                  <Typography fontWeight={600}>{venta.motivo_anulacion}</Typography>
                </Grid>
              )}
            </Grid>

            <Divider />

            <Box>
              <Typography variant="subtitle1" fontWeight="bold" mb={1.5}>
                Productos
              </Typography>

              <List disablePadding>
                {detalles.map((detalle, index) => {
                  const cantidad = Number(detalle.cantidad || 0);
                  const cantidadAnulada = Number(detalle.cantidad_anulada || 0);
                  const cantidadActiva = cantidad - cantidadAnulada;
                  const puedeAnular =
                    canAnular && estado !== "ANULADA" && cantidadActiva > 0;
                  const anulandoEsteDetalle = detalleAnulandoId === detalle.id_detalle;
                  const historialDetalle = anulaciones.filter(
                    (anulacion) => anulacion.id_detalle === detalle.id_detalle
                  );

                  return (
                    <Box key={detalle.id_detalle}>
                      <Box sx={{ py: 1.25 }}>
                        <ListItem disableGutters sx={{ py: 0 }}>
                          <ListItemText
                            primary={`${detalle.producto_nombre || "Producto"} (${detalle.codigo_barras || "Sin codigo"})`}
                            secondary={`Cantidad activa: ${cantidadActiva} | Cantidad anulada: ${cantidadAnulada} | Estado: ${detalle.estado || "SIN ESTADO"} | Precio: ${formatMoney(detalle.precio_unitario)}`}
                          />

                          <Stack spacing={1} alignItems="flex-end">
                            <Typography fontWeight="bold" color="primary.main">
                              {formatMoney((detalle.precio_unitario || 0) * cantidadActiva)}
                            </Typography>

                            {canAnular && (
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                disabled={!puedeAnular || loadingAnulacionDetalle}
                                onClick={() => onAnularDetalle(detalle)}
                              >
                                {anulandoEsteDetalle ? "Anulando..." : puedeAnular ? "Anular detalle" : "Sin saldo"}
                              </Button>
                            )}
                          </Stack>
                        </ListItem>

                        {historialDetalle.length > 0 && (
                          <Box sx={{ mt: 1.25, pl: 0.5 }}>
                            <Typography variant="body2" fontWeight="bold" mb={0.75}>
                              Historial de anulaciones
                            </Typography>

                            <Stack spacing={0.75}>
                              {historialDetalle.map((anulacion) => (
                                <Box
                                  key={anulacion.id_anulacion}
                                  sx={{
                                    borderRadius: 2,
                                    px: 1.5,
                                    py: 1,
                                    backgroundColor: "rgba(239, 68, 68, 0.06)",
                                  }}
                                >
                                  <Typography variant="body2" fontWeight={600}>
                                    {`Cantidad: ${anulacion.cantidad} | ${anulacion.fecha || "Sin fecha"}`}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {`Motivo: ${anulacion.motivo || "Sin motivo"}`}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {`Usuario: ${anulacion.anulada_por_nombre || anulacion.anulada_por_username || "Sin usuario"}`}
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Box>
                      {index < detalles.length - 1 && <Divider />}
                    </Box>
                  );
                })}
              </List>
            </Box>

            {resumen && (
              <>
                <Divider />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Total original
                    </Typography>
                    <Typography fontWeight={700}>{formatMoney(resumen.total_original)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Total actual
                    </Typography>
                    <Typography fontWeight={700}>{formatMoney(resumen.total_actual)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Total anulado
                    </Typography>
                    <Typography fontWeight={700}>{formatMoney(resumen.total_anulado)}</Typography>
                  </Grid>
                </Grid>
              </>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default VentaDetalleModal;
