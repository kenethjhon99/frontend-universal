import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import BarcodeCameraDialog from "./BarcodeCameraDialog";

function BuscarProductoCompra({ productos, onAgregar, loading, disabled = false }) {
  const [busqueda, setBusqueda] = useState("");
  const [codigo, setCodigo] = useState("");
  const [scanFeedback, setScanFeedback] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const filtrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return productos;

    return productos.filter((producto) => {
      return (
        String(producto.nombre || "").toLowerCase().includes(texto) ||
        String(producto.codigo_barras || "").toLowerCase().includes(texto) ||
        String(producto.descripcion || "").toLowerCase().includes(texto)
      );
    });
  }, [productos, busqueda]);

  const handleScannedCode = (rawValue) => {
    const codigoEscaneado = String(rawValue || "").trim();
    if (!codigoEscaneado) return false;

    setCodigo(codigoEscaneado);

    const encontrado = productos.find(
      (producto) => String(producto.codigo_barras || "").trim() === codigoEscaneado
    );

    if (encontrado) {
      setScanFeedback(null);
      onAgregar(encontrado);
      setCodigo("");
      return true;
    }

    setScanFeedback({
      severity: "warning",
      message: `No se encontro un producto con el codigo ${codigoEscaneado}.`,
    });
    return true;
  };

  return (
    <Box>
      <Stack spacing={2}>
        <TextField
          fullWidth
          label="Escanear codigo"
          placeholder="Escanea o escribe el codigo de barras"
          value={codigo}
          onChange={(event) => {
            setCodigo(event.target.value);
            if (scanFeedback) {
              setScanFeedback(null);
            }
          }}
          onKeyDown={(event) => {
            if (!disabled && event.key === "Enter") {
              handleScannedCode(codigo);
            }
          }}
          disabled={disabled}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <QrCodeScannerIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => {
                    setScanFeedback(null);
                    setScannerOpen(true);
                  }}
                  disabled={disabled}
                  edge="end"
                  color="primary"
                >
                  <CameraAltIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          helperText="Presiona Enter con el lector manual o usa la camara del dispositivo."
        />

        <TextField
          fullWidth
          label="Buscar producto"
          placeholder="Busca por nombre, codigo o descripcion"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          disabled={disabled}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {scanFeedback?.message ? (
          <Alert severity={scanFeedback.severity || "info"}>
            {scanFeedback.message}
          </Alert>
        ) : null}
      </Stack>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {loading ? "Cargando productos..." : `${filtrados.length} producto(s) disponibles`}
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            maxHeight: 520,
            overflowY: "auto",
          }}
        >
          {!loading && filtrados.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary">No se encontraron productos.</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filtrados.map((producto, index) => {
                const stock = Number(producto.stock ?? 0);
                const costoBase = Number(
                  producto.precio_compra ?? producto.costo ?? producto.precio_venta ?? 0
                );

                return (
                  <Box key={producto.id_producto}>
                    <ListItemButton
                      onClick={() => !disabled && onAgregar(producto)}
                      disabled={disabled}
                      sx={{
                        py: 1.8,
                        px: 2,
                        alignItems: "flex-start",
                        cursor: disabled ? "default" : "pointer",
                        transition: "transform 180ms ease, background-color 180ms ease",
                        "&:hover": disabled
                          ? undefined
                          : {
                              transform: "translateY(-1px)",
                              backgroundColor: "action.hover",
                            },
                      }}
                    >
                      <Box
                        sx={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                            <Inventory2Icon fontSize="small" color="action" />
                            <Typography fontWeight={600}>{producto.nombre}</Typography>
                          </Stack>

                          <ListItemText
                            primary={null}
                            secondary={
                              <>
                                <Typography component="span" variant="body2" color="text.secondary">
                                  Codigo: {producto.codigo_barras || "Sin codigo"}
                                </Typography>
                                <br />
                                <Typography component="span" variant="body2" color="text.secondary">
                                  Costo sugerido: Q {costoBase.toFixed(2)}
                                </Typography>
                              </>
                            }
                          />
                        </Box>

                        <Stack spacing={1} alignItems="flex-end">
                          <Chip
                            label={`Stock actual: ${stock}`}
                            color={stock <= 5 ? "warning" : "primary"}
                            size="small"
                            variant="outlined"
                          />

                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: "success.main",
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <AddShoppingCartIcon sx={{ fontSize: 16 }} />
                            Toca para agregar
                          </Typography>
                        </Stack>
                      </Box>
                    </ListItemButton>

                    {index < filtrados.length - 1 ? <Divider /> : null}
                  </Box>
                );
              })}
            </List>
          )}
        </Paper>
      </Box>

      <BarcodeCameraDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleScannedCode}
        title="Escanear con camara"
        description="Apunta la camara al codigo de barras del producto para agregarlo rapidamente a la compra."
      />
    </Box>
  );
}

export default BuscarProductoCompra;
