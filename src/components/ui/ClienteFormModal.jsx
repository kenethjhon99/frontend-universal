import { useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from "@mui/material";

const initialState = {
  nit: "",
  nombre: "",
  telefono: "",
  correo: "",
  direccion: "",
};

const buildFormState = (clienteEditando) => {
  if (!clienteEditando) {
    return initialState;
  }

  return {
    nit: clienteEditando.nit || "",
    nombre: clienteEditando.nombre || "",
    telefono: clienteEditando.telefono || "",
    correo: clienteEditando.correo || "",
    direccion: clienteEditando.direccion || "",
  };
};

function ClienteFormModal({
  open,
  onClose,
  onSave,
  loading,
  clienteEditando = null,
}) {
  const [form, setForm] = useState(() => buildFormState(clienteEditando));

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClose = () => {
    if (loading) return;
    setForm(initialState);
    onClose();
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSave({
      nit: form.nit.trim(),
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      correo: form.correo.trim(),
      direccion: form.direccion.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight="bold">
          {clienteEditando ? "Editar cliente" : "Nuevo cliente"}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2} mt={0.5}>
          <Grid item xs={12}>
            {clienteEditando ? (
              <TextField
                fullWidth
                label="Codigo"
                value={clienteEditando.codigo || ""}
                InputProps={{ readOnly: true }}
                helperText="El codigo es generado por el sistema."
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                El codigo del cliente se generara automaticamente al guardar.
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="NIT"
              name="nit"
              value={form.nit}
              onChange={handleChange}
              placeholder="CF o 1234567-8"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Nombre del cliente"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Telefono"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Correo"
              name="correo"
              type="email"
              value={form.correo}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Direccion"
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : clienteEditando ? (
            "Actualizar cliente"
          ) : (
            "Guardar cliente"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ClienteFormModal;
