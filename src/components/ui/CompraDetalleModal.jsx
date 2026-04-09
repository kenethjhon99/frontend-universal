import {
  Box,
  Button,
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

function CompraDetalleModal({
  open,
  onClose,
  compraData,
  loading = false,
  onPrint,
  printing = false,
  onAnularCompra,
  onAnularDetalle,
  loadingAnulacion = false,
  loadingAnulacionDetalle = false,
  detalleAnulandoId = null,
}) {
  const compra = compraData?.compra;
  const detalles = compraData?.detalles || [];
  const anulaciones = compraData?.anulaciones || [];
  const resumen = compraData?.resumen;
  const estado = String(compra?.estado_real || compra?.estado || "SIN ESTADO").toUpperCase();
  const puedeAnularCompra = Boolean(compra) && estado !== "ANULADA";

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
            Detalle de compra
          </Typography>

          <Button
            variant="outlined"
            onClick={() => onPrint?.()}
            disabled={loading || !compra || printing}
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
              Cargando detalle de compra...
            </Typography>
          </Stack>
        ) : !compra ? (
          <Typography color="text.secondary">
            No hay informacion de la compra para mostrar.
          </Typography>
        ) : (
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Compra
                </Typography>
                <Typography fontWeight={600}>#{compra.id_compra}</Typography>
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
                  Proveedor
                </Typography>
                <Typography fontWeight={600}>{compra.proveedor_nombre || "-"}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Documento
                </Typography>
                <Typography fontWeight={600}>{compra.no_documento || "Sin documento"}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Fecha
                </Typography>
                <Typography fontWeight={600}>{compra.fecha || "-"}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Usuario
                </Typography>
                <Typography fontWeight={600}>
                  {compra.usuario_nombre || compra.usuario_username || "-"}
                </Typography>
              </Grid>
              {compra.observaciones && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Observaciones
                  </Typography>
                  <Typography fontWeight={600}>{compra.observaciones}</Typography>
                </Grid>
              )}
              {compra.motivo_anulacion && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Motivo de anulacion
                  </Typography>
                  <Typography fontWeight={600}>{compra.motivo_anulacion}</Typography>
                </Grid>
              )}
            </Grid>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Productos
              </Typography>

              <Button
                variant="outlined"
                color="error"
                disabled={!puedeAnularCompra || loadingAnulacion}
                onClick={() => onAnularCompra?.(compra)}
              >
                {loadingAnulacion ? "Anulando..." : puedeAnularCompra ? "Anular compra" : "Compra anulada"}
              </Button>
            </Stack>

            <Divider />

            <List disablePadding>
              {detalles.map((detalle, index) => {
                const cantidad = Number(detalle.cantidad || 0);
                const cantidadAnulada = Number(detalle.cantidad_anulada || 0);
                const cantidadActiva = cantidad - cantidadAnulada;
                const detalleEstado = String(detalle.estado || "ACTIVO").toUpperCase();
                const subtotalActivo = cantidadActiva * Number(detalle.precio_compra || 0);
                const puedeAnularDetalle = estado !== "ANULADA" && cantidadActiva > 0;
                const historialDetalle = anulaciones.filter(
                  (anulacion) => anulacion.id_detalle_compra === detalle.id_detalle_compra
                );

                return (
                  <Box key={detalle.id_detalle_compra}>
                    <Box sx={{ py: 1.25 }}>
                      <ListItem disableGutters sx={{ py: 0, alignItems: "flex-start" }}>
                        <ListItemText
                          primary={`${detalle.producto_nombre || "Producto"} (${detalle.codigo_barras || "Sin codigo"})`}
                          secondary={`Cantidad activa: ${cantidadActiva} | Cantidad anulada: ${cantidadAnulada} | Estado: ${detalleEstado} | Precio: ${formatMoney(detalle.precio_compra)}`}
                        />

                        <Stack spacing={1} alignItems="flex-end">
                          <Typography fontWeight="bold" color="primary.main">
                            {formatMoney(subtotalActivo)}
                          </Typography>

                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            disabled={!puedeAnularDetalle || loadingAnulacionDetalle}
                            onClick={() => onAnularDetalle?.(detalle)}
                          >
                            {detalleAnulandoId === detalle.id_detalle_compra
                              ? "Anulando..."
                              : puedeAnularDetalle
                                ? "Anular detalle"
                                : "Sin saldo"}
                          </Button>
                        </Stack>
                      </ListItem>

                      {detalle.motivo_anulacion && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                          Motivo: {detalle.motivo_anulacion}
                        </Typography>
                      )}

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

export default CompraDetalleModal;
