import { useState } from "react";
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

function VentaAnulacionModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  venta = null,
}) {
  const [motivo, setMotivo] = useState("");

  const handleClose = () => {
    if (loading) return;
    setMotivo("");
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(motivo.trim(), () => setMotivo(""));
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight="bold">
          Anular venta
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {venta
              ? `Vas a anular la venta #${venta.id_venta}. Esta accion devolvera el stock y dejara la venta en estado anulada.`
              : "Indica el motivo de la anulacion."}
          </Typography>

          <TextField
            fullWidth
            required
            autoFocus
            multiline
            minRows={3}
            label="Motivo de anulacion"
            placeholder="Ej. error de cobro, devolucion del cliente, registro duplicado"
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
          disabled={loading || !motivo.trim()}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Confirmar anulacion"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default VentaAnulacionModal;
