import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PrintIcon from "@mui/icons-material/Print";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";

import { generarCodigoBarrasProducto } from "../../services/productoService";
import { openPrintDocument } from "../../utils/printDocuments";
import {
  buildBarcodeLabelHtml,
  isValidEan13,
} from "../../utils/barcodeUtils";
import BarcodeCameraDialog from "../ui/BarcodeCameraDialog";

const initialState = {
  codigo_barras: "",
  nombre: "",
  descripcion: "",
  precio_compra: "",
  precio_venta: "",
  existencia_inicial: "",
  stock_minimo: "",
  ubicacion: "",
  modulo_origen: "GENERAL",
};

const buildFormState = (productoEditando) => {
  if (!productoEditando) {
    return initialState;
  }

  return {
    codigo_barras: productoEditando.codigo_barras || "",
    nombre: productoEditando.nombre || "",
    descripcion: productoEditando.descripcion || "",
    precio_compra: productoEditando.precio_compra || "",
    precio_venta: productoEditando.precio_venta || "",
    existencia_inicial: productoEditando.stock ?? 0,
    stock_minimo: productoEditando.stock_minimo ?? 0,
    ubicacion: productoEditando.ubicacion || "",
    modulo_origen: productoEditando.modulo_origen || "GENERAL",
  };
};

function ProductoFormModal({
  open,
  onClose,
  onSave,
  productoEditando,
  loading,
  forceModuloOrigen = null,
  hideModuloSelector = false,
}) {
  const [form, setForm] = useState(() => buildFormState(productoEditando));
  const [scannerOpen, setScannerOpen] = useState(false);
  const [codigoFeedback, setCodigoFeedback] = useState("");
  const [loadingCodigo, setLoadingCodigo] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(buildFormState(productoEditando));
    setCodigoFeedback("");
  }, [open, productoEditando]);

  const moduloOrigen = forceModuloOrigen || form.modulo_origen;
  const canPrintBarcode = useMemo(
    () => isValidEan13(form.codigo_barras) && Boolean(String(form.nombre || "").trim()),
    [form.codigo_barras, form.nombre]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSave({
      codigo_barras: form.codigo_barras || null,
      nombre: form.nombre,
      descripcion: form.descripcion,
      precio_compra: Number(form.precio_compra),
      precio_venta: Number(form.precio_venta),
      existencia_inicial: Number(form.existencia_inicial || 0),
      stock_minimo: Number(form.stock_minimo || 0),
      ubicacion: form.ubicacion || null,
      modulo_origen: moduloOrigen,
    });
  };

  const handleDetectedBarcode = (rawValue) => {
    const codigo = String(rawValue || "").trim();
    if (!codigo) return false;

    setForm((prev) => ({
      ...prev,
      codigo_barras: codigo,
    }));
    setCodigoFeedback("Codigo capturado con la camara del dispositivo.");
    return true;
  };

  const handleGenerateBarcode = async () => {
    try {
      setLoadingCodigo(true);
      setCodigoFeedback("");
      const response = await generarCodigoBarrasProducto();
      const codigo = String(response?.codigo_barras || "").trim();

      setForm((prev) => ({
        ...prev,
        codigo_barras: codigo,
      }));
      setCodigoFeedback("Se genero un codigo unico listo para guardar o imprimir.");
    } catch (error) {
      console.error(error);
      setCodigoFeedback(
        error.response?.data?.error || "No se pudo generar un codigo unico."
      );
    } finally {
      setLoadingCodigo(false);
    }
  };

  const handlePrintBarcode = () => {
    try {
      if (!String(form.nombre || "").trim()) {
        setCodigoFeedback("Ingresa el nombre del producto antes de imprimir la etiqueta.");
        return;
      }

      openPrintDocument({
        title: `Codigo ${form.codigo_barras}`,
        html: buildBarcodeLabelHtml({
          codigo: form.codigo_barras,
          nombre: String(form.nombre || "").trim(),
          descripcion: form.descripcion || "",
          subtitle:
            moduloOrigen === "SERVICIOS"
              ? "Codigo generado internamente para tienda"
              : "Codigo generado internamente para inventario",
        }),
        width: 420,
        height: 520,
      });
    } catch (error) {
      console.error(error);
      setCodigoFeedback(error.message || "No se pudo imprimir la etiqueta.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight="bold">
          {productoEditando ? "Editar producto" : "Nuevo producto"}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12}>
            <TextField
              label="Codigo de barras"
              name="codigo_barras"
              value={form.codigo_barras}
              onChange={handleChange}
              fullWidth
              placeholder="Ej. 7501234567890"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <QrCodeScannerIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setScannerOpen(true)}
                      edge="end"
                      color="primary"
                    >
                      <CameraAltIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText="Puedes escribirlo, escanearlo con camara o generar uno interno."
            />
          </Grid>

          <Grid item xs={12}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", sm: "center" }}
              flexWrap="wrap"
              useFlexGap
            >
              <Button
                variant="outlined"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleGenerateBarcode}
                disabled={loadingCodigo}
              >
                {loadingCodigo ? "Generando..." : "Generar codigo unico"}
              </Button>

              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrintBarcode}
                disabled={!canPrintBarcode}
              >
                Imprimir codigo
              </Button>

              {canPrintBarcode ? (
                <Typography variant="caption" color="text.secondary">
                  Listo para imprimir como etiqueta EAN-13 con el nombre del producto.
                </Typography>
              ) : form.codigo_barras && !isValidEan13(form.codigo_barras) ? (
                <Typography variant="caption" color="warning.main">
                  El codigo debe ser un EAN-13 valido para poder imprimirse.
                </Typography>
              ) : !String(form.nombre || "").trim() ? (
                <Typography variant="caption" color="text.secondary">
                  Escribe el nombre del producto para imprimir una etiqueta completa.
                </Typography>
              ) : null}
            </Stack>

            {codigoFeedback ? (
              <Alert
                severity={canPrintBarcode || loadingCodigo ? "success" : "info"}
                sx={{ mt: 1.5, borderRadius: 2 }}
              >
                {codigoFeedback}
              </Alert>
            ) : null}
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>

          {!hideModuloSelector ? (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="producto-modulo-label">Catalogo</InputLabel>
                <Select
                  labelId="producto-modulo-label"
                  name="modulo_origen"
                  label="Catalogo"
                  value={moduloOrigen}
                  onChange={handleChange}
                >
                  <MenuItem value="GENERAL">General</MenuItem>
                  <MenuItem value="SERVICIOS">Tienda</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          ) : null}

          <Grid item xs={12} md={hideModuloSelector ? 6 : 6}>
            <TextField
              label="Ubicacion"
              name="ubicacion"
              value={form.ubicacion}
              onChange={handleChange}
              fullWidth
              placeholder="Ej. Estante A-1"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Descripcion"
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Precio compra"
              name="precio_compra"
              type="number"
              value={form.precio_compra}
              onChange={handleChange}
              fullWidth
              inputProps={{ step: "0.01" }}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Precio venta"
              name="precio_venta"
              type="number"
              value={form.precio_venta}
              onChange={handleChange}
              fullWidth
              inputProps={{ step: "0.01" }}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label={productoEditando ? "Stock" : "Stock inicial"}
              name="existencia_inicial"
              type="number"
              value={form.existencia_inicial}
              onChange={handleChange}
              fullWidth
              inputProps={{ min: 0 }}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Stock minimo"
              name="stock_minimo"
              type="number"
              value={form.stock_minimo}
              onChange={handleChange}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>

        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : productoEditando ? (
            "Actualizar"
          ) : (
            "Guardar"
          )}
        </Button>
      </DialogActions>

      <BarcodeCameraDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleDetectedBarcode}
        title="Escanear codigo del producto"
        description="Usa la camara del dispositivo para capturar el codigo de barras y guardarlo en este producto."
      />
    </Dialog>
  );
}

export default ProductoFormModal;
