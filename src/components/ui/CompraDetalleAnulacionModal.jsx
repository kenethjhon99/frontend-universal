import { useMemo, useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

function CompraDetalleAnulacionModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  compra = null,
  detalle = null,
}) {
  const buildInitialCantidad = (disponible) => (disponible > 0 ? "1" : "0");

  const cantidadDisponible = useMemo(() => {
    const cantidadOriginal = Number(detalle?.cantidad || 0);
    const cantidadAnulada = Number(detalle?.cantidad_anulada || 0);
    return Math.max(0, cantidadOriginal - cantidadAnulada);
  }, [detalle]);

  const [cantidad, setCantidad] = useState(() => buildInitialCantidad(cantidadDisponible));
  const [motivo, setMotivo] = useState("");

  const handleClose = () => {
    if (loading) return;
    setCantidad(buildInitialCantidad(cantidadDisponible));
    setMotivo("");
    onClose();
  };

  const cantidadNumerica = Number(cantidad);
  const cantidadValida =
    Number.isInteger(cantidadNumerica) &&
    cantidadNumerica >= 1 &&
    cantidadNumerica <= cantidadDisponible;

  const handleConfirm = () => {
    onConfirm({
      cantidad: cantidadNumerica,
      motivo: motivo.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight="bold">
          Anular detalle de compra
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {compra && detalle
              ? `Compra #${compra.id_compra} - ${detalle.producto_nombre || "Producto"}. Puedes anular solo una parte de la cantidad ingresada.`
              : "Indica la cantidad y el motivo de la anulacion parcial."}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Cantidad disponible para anular: {cantidadDisponible}
          </Typography>

          <TextField
            fullWidth
            required
            type="number"
            label="Cantidad a anular"
            value={cantidad}
            onChange={(event) => setCantidad(event.target.value)}
            inputProps={{
              min: 1,
              max: cantidadDisponible,
              step: 1,
            }}
          />

          <TextField
            fullWidth
            required
            multiline
            minRows={3}
            label="Motivo de anulacion"
            placeholder="Ej. devolucion parcial, producto defectuoso, error de ingreso"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={loading || !cantidadValida || !motivo.trim()}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Confirmar anulacion"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CompraDetalleAnulacionModal;
