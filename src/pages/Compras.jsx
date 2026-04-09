import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import InventoryIcon from "@mui/icons-material/Inventory";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AddIcon from "@mui/icons-material/Add";
import { useAuth } from "../hooks/useAuth";
import { isReadOnlyUser, userHasRole } from "../utils/roles";
import {
  readPrintPreference,
  writePrintPreference,
} from "../utils/printPreferences";

import BuscarProductoCompra from "../components/ui/BuscarProductoCompra";
import CompraTable from "../components/ui/CompraTable";
import CompraAnulacionModal from "../components/ui/CompraAnulacionModal";
import CompraDetalleAnulacionModal from "../components/ui/CompraDetalleAnulacionModal";
import CompraDetalleModal from "../components/ui/CompraDetalleModal";
import ProveedorFormModal from "../components/ui/ProveedorFormModal";
import {
  buildCompraTicketHtml,
  openPrintWindow,
  openPrintDocument,
} from "../utils/printDocuments";
import { getFilterPanelSx } from "../utils/filterPanelStyles";
import { getProductos } from "../services/productoService";
import {
  anularCompra,
  anularDetalleCompra,
  crearCompra,
  getCompraById,
  getCompras,
} from "../services/compraService";
import {
  crearProveedor,
  getProveedores,
} from "../services/proveedorService";

const getToday = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const normalizarCompras = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.compras)) return data.compras;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

const normalizarProveedores = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatFecha = (value) => {
  if (!value) return "Sin fecha";

  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return String(value);

  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(fecha);
};

function Compras() {
  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [items, setItems] = useState([]);
  const [proveedorId, setProveedorId] = useState("");
  const [documento, setDocumento] = useState("");
  const [fechaCompra, setFechaCompra] = useState(getToday);
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [observaciones, setObservaciones] = useState("");
  const [estadoFiltroCompras, setEstadoFiltroCompras] = useState("TODOS");
  const [documentoFiltroCompras, setDocumentoFiltroCompras] = useState("");
  const [proveedorFiltroCompras, setProveedorFiltroCompras] = useState("");
  const [comprasRecientes, setComprasRecientes] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [loadingNuevoProveedor, setLoadingNuevoProveedor] = useState(false);
  const [loadingCompra, setLoadingCompra] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [loadingDetalleCompra, setLoadingDetalleCompra] = useState(false);
  const [printingCompraId, setPrintingCompraId] = useState(null);
  const [autoPrintCompra, setAutoPrintCompra] = useState(() =>
    readPrintPreference(user, "compras.autoPrint", true)
  );
  const [loadingAnulacionCompra, setLoadingAnulacionCompra] = useState(false);
  const [loadingAnulacionDetalle, setLoadingAnulacionDetalle] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [historialDisponible, setHistorialDisponible] = useState(true);
  const [proveedorModalOpen, setProveedorModalOpen] = useState(false);
  const [compraDetalleOpen, setCompraDetalleOpen] = useState(false);
  const [compraAnulacionOpen, setCompraAnulacionOpen] = useState(false);
  const [detalleAnulacionOpen, setDetalleAnulacionOpen] = useState(false);
  const [compraSeleccionada, setCompraSeleccionada] = useState(null);
  const [detalleCompraSeleccionado, setDetalleCompraSeleccionado] = useState(null);
  const [compraDetalle, setCompraDetalle] = useState(null);
  const canManageCompras = useMemo(() => userHasRole(user, "ADMIN"), [user]);
  const isReadOnly = useMemo(() => isReadOnlyUser(user), [user]);

  const cargarProductos = useCallback(async () => {
    try {
      setLoadingProductos(true);
      setError("");
      const data = await getProductos();
      setProductos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudieron cargar los productos");
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  const cargarProveedores = useCallback(async () => {
    try {
      setLoadingProveedores(true);
      const data = await getProveedores();
      setProveedores(normalizarProveedores(data));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudieron cargar los proveedores");
    } finally {
      setLoadingProveedores(false);
    }
  }, []);

  const cargarCompras = useCallback(async () => {
    try {
      setLoadingHistorial(true);
      const data = await getCompras({
        page: 1,
        limit: 8,
        estado: estadoFiltroCompras !== "TODOS" ? estadoFiltroCompras : undefined,
        no_documento: documentoFiltroCompras.trim() || undefined,
        proveedor: proveedorFiltroCompras.trim() || undefined,
        sortBy: "fecha",
        sortDir: "desc",
      });
      setComprasRecientes(normalizarCompras(data));
      setHistorialDisponible(true);
    } catch (err) {
      console.warn("No se pudo cargar el historial de compras", err);
      setHistorialDisponible(false);
      setComprasRecientes([]);
    } finally {
      setLoadingHistorial(false);
    }
  }, [documentoFiltroCompras, estadoFiltroCompras, proveedorFiltroCompras]);

  const cargarDetalleCompra = useCallback(async (idCompra) => {
    const data = await getCompraById(idCompra);
    setCompraDetalle(data);
    return data;
  }, []);

  useEffect(() => {
    cargarProductos();
    cargarProveedores();
    cargarCompras();
  }, [cargarCompras, cargarProductos, cargarProveedores]);

  useEffect(() => {
    setAutoPrintCompra(readPrintPreference(user, "compras.autoPrint", true));
  }, [user]);

  useEffect(() => {
    writePrintPreference(user, "compras.autoPrint", autoPrintCompra);
  }, [autoPrintCompra, user]);

  const agregarProducto = (producto) => {
    const costoInicial = Number(
      producto.precio_compra ?? producto.costo ?? producto.precio_venta ?? 0
    );

    setItems((prev) => {
      const itemExistente = prev.find(
        (item) => item.id_producto === producto.id_producto
      );

      if (itemExistente) {
        return prev.map((item) =>
          item.id_producto === producto.id_producto
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          id_producto: producto.id_producto,
          nombre: producto.nombre,
          codigo_barras: producto.codigo_barras,
          stock_actual: Number(producto.stock ?? 0),
          cantidad: 1,
          costo_unitario: costoInicial > 0 ? costoInicial : 0.01,
        },
      ];
    });
  };

  const cambiarCantidad = (idProducto, cantidad) => {
    if (!Number.isFinite(cantidad) || cantidad < 1) return;

    setItems((prev) =>
      prev.map((item) =>
        item.id_producto === idProducto ? { ...item, cantidad } : item
      )
    );
  };

  const cambiarCosto = (idProducto, costoUnitario) => {
    if (!Number.isFinite(costoUnitario) || costoUnitario <= 0) return;

    setItems((prev) =>
      prev.map((item) =>
        item.id_producto === idProducto
          ? { ...item, costo_unitario: costoUnitario }
          : item
      )
    );
  };

  const eliminarItem = (idProducto) => {
    setItems((prev) => prev.filter((item) => item.id_producto !== idProducto));
  };

  const limpiarFormulario = () => {
    setItems([]);
    setProveedorId("");
    setDocumento("");
    setFechaCompra(getToday());
    setMetodoPago("EFECTIVO");
    setObservaciones("");
  };

  const total = useMemo(() => {
    return items.reduce(
      (acc, item) => acc + item.costo_unitario * item.cantidad,
      0
    );
  }, [items]);

  const totalUnidades = useMemo(() => {
    return items.reduce((acc, item) => acc + item.cantidad, 0);
  }, [items]);

  const guardarProveedor = async (formData) => {
    if (!formData.nombre) {
      setError("El nombre del proveedor es requerido.");
      return;
    }

    if (!formData.nit) {
      setError("El NIT del proveedor es requerido.");
      return;
    }

    try {
      setLoadingNuevoProveedor(true);
      setError("");

      const response = await crearProveedor(formData);
      const proveedorCreado = response?.proveedor;

      if (!proveedorCreado) {
        throw new Error("No se pudo obtener el proveedor creado");
      }

      setProveedores((prev) =>
        [...prev, proveedorCreado].sort((a, b) =>
          String(a.nombre || "").localeCompare(String(b.nombre || ""), "es")
        )
      );
      setProveedorId(String(proveedorCreado.id_proveedor));
      setProveedorModalOpen(false);
      setSuccess(`Proveedor "${proveedorCreado.nombre}" creado correctamente.`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "No se pudo crear el proveedor");
    } finally {
      setLoadingNuevoProveedor(false);
    }
  };

  const registrarCompra = async () => {
    if (!items.length) {
      setError("Agrega al menos un producto a la compra.");
      setSuccess("");
      return;
    }

    if (!proveedorId) {
      setError("Selecciona un proveedor.");
      setSuccess("");
      return;
    }

    let reservedPrintWindow = null;

    try {
      setLoadingCompra(true);
      setError("");
      setSuccess("");

      if (autoPrintCompra) {
        reservedPrintWindow = openPrintWindow({
          title: "Comprobante de compra",
        });
      }

      const payload = {
        id_proveedor: Number(proveedorId),
        tipo_documento: "FACTURA",
        no_documento: documento.trim() || null,
        fecha_compra: fechaCompra,
        metodo_pago: metodoPago,
        observaciones: observaciones.trim(),
        id_sucursal: 1,
        items: items.map((item) => ({
          id_producto: item.id_producto,
          cantidad: item.cantidad,
          precio_compra: item.costo_unitario,
        })),
      };

      const response = await crearCompra(payload);
      const compraCreada = response?.compra;
      setSuccess("Compra registrada correctamente.");
      limpiarFormulario();
      await Promise.all([cargarProductos(), cargarCompras()]);

      if (autoPrintCompra && compraCreada?.id_compra) {
        await imprimirCompra(compraCreada.id_compra, null, reservedPrintWindow);
        reservedPrintWindow = null;
      } else if (reservedPrintWindow && !reservedPrintWindow.closed) {
        reservedPrintWindow.close();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo registrar la compra");
      if (reservedPrintWindow && !reservedPrintWindow.closed) {
        reservedPrintWindow.close();
      }
    } finally {
      setLoadingCompra(false);
    }
  };

  const abrirDetalleCompra = async (compra) => {
    try {
      setLoadingDetalleCompra(true);
      setError("");
      setCompraSeleccionada(compra);
      setCompraDetalleOpen(true);
      await cargarDetalleCompra(compra.id_compra);
    } catch (err) {
      console.error(err);
      setCompraDetalleOpen(false);
      setCompraSeleccionada(null);
      setError(err.response?.data?.error || "No se pudo cargar el detalle de la compra");
    } finally {
      setLoadingDetalleCompra(false);
    }
  };

  const imprimirCompra = async (
    compraInput,
    preloadedData = null,
    printWindow = null
  ) => {
    const idCompra = Number(compraInput?.id_compra || compraInput);
    if (!idCompra) return;

    try {
      setPrintingCompraId(idCompra);
      setError("");
      const targetWindow =
        printWindow || openPrintWindow({ title: `Compra #${idCompra}` });

      const data = preloadedData || (await getCompraById(idCompra));
      openPrintDocument({
        title: `Compra #${idCompra}`,
        html: buildCompraTicketHtml(data),
        printWindow: targetWindow,
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo imprimir el comprobante de la compra");
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
    } finally {
      setPrintingCompraId(null);
    }
  };

  const cerrarDetalleCompra = () => {
    if (loadingDetalleCompra) return;
    setDetalleAnulacionOpen(false);
    setDetalleCompraSeleccionado(null);
    setCompraDetalleOpen(false);
    setCompraDetalle(null);
  };

  const abrirAnulacionCompra = (compra) => {
    setCompraSeleccionada(compra);
    setCompraAnulacionOpen(true);
  };

  const cerrarAnulacionCompra = () => {
    if (loadingAnulacionCompra) return;
    setCompraAnulacionOpen(false);
    setCompraSeleccionada(null);
  };

  const abrirAnulacionDetalle = (detalle) => {
    setDetalleCompraSeleccionado(detalle);
    setDetalleAnulacionOpen(true);
  };

  const cerrarAnulacionDetalle = () => {
    if (loadingAnulacionDetalle) return;
    setDetalleAnulacionOpen(false);
    setDetalleCompraSeleccionado(null);
  };

  const limpiarFiltrosCompras = () => {
    setEstadoFiltroCompras("TODOS");
    setDocumentoFiltroCompras("");
    setProveedorFiltroCompras("");
  };

  const confirmarAnulacionCompra = async (motivo, resetForm) => {
    const idCompra = compraSeleccionada?.id_compra || compraDetalle?.compra?.id_compra;

    if (!idCompra) return;

    try {
      setLoadingAnulacionCompra(true);
      setError("");
      setSuccess("");

      await anularCompra(idCompra, { motivo });
      await Promise.all([cargarProductos(), cargarCompras()]);

      if (compraDetalleOpen && compraDetalle?.compra?.id_compra === idCompra) {
        await cargarDetalleCompra(idCompra);
      }

      setSuccess(`Compra #${idCompra} anulada correctamente.`);
      resetForm?.();
      setCompraAnulacionOpen(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo anular la compra");
    } finally {
      setLoadingAnulacionCompra(false);
    }
  };

  const confirmarAnulacionDetalle = async ({ cantidad, motivo }) => {
    const idCompra = compraDetalle?.compra?.id_compra;
    const idDetalle = detalleCompraSeleccionado?.id_detalle_compra;

    if (!idCompra || !idDetalle) return;

    try {
      setLoadingAnulacionDetalle(true);
      setError("");
      setSuccess("");

      await anularDetalleCompra(idCompra, idDetalle, { cantidad, motivo });
      await Promise.all([
        cargarProductos(),
        cargarCompras(),
        cargarDetalleCompra(idCompra),
      ]);

      setSuccess(
        `Detalle de la compra #${idCompra} anulado correctamente por ${cantidad} unidad(es).`
      );
      setDetalleAnulacionOpen(false);
      setDetalleCompraSeleccionado(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo anular el detalle de la compra");
    } finally {
      setLoadingAnulacionDetalle(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ maxWidth: 1440, mx: "auto" }}>
        <Stack spacing={1} mb={3}>
          <Typography variant="h4" fontWeight="bold">
            Modulo de compras
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Registra compras, actualiza inventario y controla anulaciones totales o parciales.
          </Typography>
        </Stack>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 2.5, borderRadius: 4, height: "100%" }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <InventoryIcon color="primary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Productos en la compra
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {items.length}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 2.5, borderRadius: 4, height: "100%" }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <LocalShippingIcon color="primary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Unidades a ingresar
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {totalUnidades}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                elevation={2}
                sx={{
                  p: 2.5,
                  borderRadius: 4,
                  height: "100%",
                  border: "1px solid",
                  borderColor: total > 0 ? "primary.main" : "divider",
                  background:
                    total > 0
                      ? "linear-gradient(135deg, rgba(37,99,235,0.18), rgba(15,23,42,0.55))"
                      : "transparent",
                  boxShadow:
                    total > 0
                      ? "0 0 0 1px rgba(37,99,235,0.10), 0 18px 40px rgba(15,23,42,0.16)"
                      : "none",
                  transition:
                    "border-color 180ms ease, background 180ms ease, box-shadow 180ms ease",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <ReceiptLongIcon color="primary" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total estimado
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                      Q {total.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {total > 0
                        ? "Costo acumulado de la compra actual."
                        : "Agrega productos para calcular el total."}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
            {success}
          </Alert>
        )}

        {isReadOnly && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            Estas en modo solo lectura. Puedes revisar compras, detalles e historial, pero no registrar ni anular compras.
          </Alert>
        )}

        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} lg={5}>
            <Stack spacing={3}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  Datos de la compra
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      alignItems={{ xs: "stretch", sm: "flex-end" }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          Proveedor
                        </Typography>
                        <Select
                          fullWidth
                          value={proveedorId}
                          onChange={(event) => setProveedorId(event.target.value)}
                          displayEmpty
                          disabled={loadingProveedores || !canManageCompras}
                        >
                          <MenuItem value="" disabled>
                            {loadingProveedores ? "Cargando proveedores..." : "Selecciona un proveedor"}
                          </MenuItem>
                          {proveedores.map((proveedor) => (
                            <MenuItem
                              key={proveedor.id_proveedor}
                              value={String(proveedor.id_proveedor)}
                            >
                              {proveedor.nombre}
                            </MenuItem>
                          ))}
                        </Select>
                      </Box>

                      {canManageCompras && (
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => setProveedorModalOpen(true)}
                          sx={{ minWidth: { xs: "100%", sm: 180 } }}
                        >
                          Nuevo proveedor
                        </Button>
                      )}
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="No. documento"
                      placeholder="Factura o referencia"
                      value={documento}
                      onChange={(event) => setDocumento(event.target.value)}
                      disabled={!canManageCompras}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Fecha"
                      value={fechaCompra}
                      onChange={(event) => setFechaCompra(event.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                      disabled={!canManageCompras}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      Metodo de pago
                    </Typography>
                    <Select
                      fullWidth
                      value={metodoPago}
                      onChange={(event) => setMetodoPago(event.target.value)}
                      disabled={!canManageCompras}
                    >
                      <MenuItem value="EFECTIVO">EFECTIVO</MenuItem>
                      <MenuItem value="TRANSFERENCIA">TRANSFERENCIA</MenuItem>
                      <MenuItem value="CREDITO">CREDITO</MenuItem>
                    </Select>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Observaciones"
                      placeholder="Notas internas sobre esta compra"
                      value={observaciones}
                      onChange={(event) => setObservaciones(event.target.value)}
                      disabled={!canManageCompras}
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  height: "100%",
                }}
              >
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  Agregar productos
                </Typography>

                <BuscarProductoCompra
                  productos={productos}
                  onAgregar={agregarProducto}
                  loading={loadingProductos}
                  disabled={!canManageCompras}
                />
              </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Stack spacing={3}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  Detalle de compra
                </Typography>

                <CompraTable
                  items={items}
                  onCambiarCantidad={cambiarCantidad}
                  onCambiarCosto={cambiarCosto}
                  onEliminar={eliminarItem}
                  disabled={!canManageCompras}
                />
              </Paper>

              <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  Resumen
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`${items.length} producto(s)`} color="primary" />
                  <Chip label={`${totalUnidades} unidad(es)`} variant="outlined" />
                </Stack>

                <Divider sx={{ my: 3 }} />

                {canManageCompras && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={autoPrintCompra}
                        onChange={(event) => setAutoPrintCompra(event.target.checked)}
                      />
                    }
                    label="Imprimir comprobante al registrar"
                    sx={{ mb: 2 }}
                  />
                )}

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    alignItems: { xs: "stretch", md: "center" },
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      minWidth: { xs: "100%", md: 280 },
                      borderColor: total > 0 ? "primary.main" : "divider",
                      background:
                        total > 0
                          ? "linear-gradient(135deg, rgba(37,99,235,0.18), rgba(15,23,42,0.55))"
                          : "transparent",
                      boxShadow:
                        total > 0
                          ? "0 0 0 1px rgba(37,99,235,0.10), 0 18px 40px rgba(15,23,42,0.16)"
                          : "none",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Total de la compra
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      Q {total.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Confirma este monto antes de registrar el ingreso.
                    </Typography>
                  </Paper>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button
                      variant="outlined"
                      onClick={limpiarFormulario}
                      disabled={loadingCompra || !canManageCompras}
                      sx={{ minWidth: 150 }}
                    >
                      Limpiar
                    </Button>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={registrarCompra}
                      disabled={!items.length || loadingCompra || !canManageCompras}
                      sx={{ minWidth: 220, fontWeight: "bold" }}
                    >
                      {loadingCompra ? "Guardando..." : "Registrar compra"}
                    </Button>
                  </Stack>
                </Box>
              </Paper>

              <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  mb={2}
                >
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Compras recientes
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Filtra compras completadas, parciales o anuladas.
                    </Typography>
                  </Box>
                </Stack>

                <Paper
                  variant="outlined"
                  sx={(theme) => getFilterPanelSx(theme, { compact: true, mb: 2 })}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <TextField
                      label="Documento"
                      placeholder="Buscar por factura o referencia"
                      value={documentoFiltroCompras}
                      onChange={(event) => setDocumentoFiltroCompras(event.target.value)}
                      sx={{ minWidth: { xs: "100%", sm: 220 } }}
                    />

                    <TextField
                      label="Proveedor"
                      placeholder="Buscar por nombre"
                      value={proveedorFiltroCompras}
                      onChange={(event) => setProveedorFiltroCompras(event.target.value)}
                      sx={{ minWidth: { xs: "100%", sm: 220 } }}
                    />

                    <Select
                      value={estadoFiltroCompras}
                      onChange={(event) => setEstadoFiltroCompras(event.target.value)}
                      sx={{ minWidth: { xs: "100%", sm: 220 } }}
                    >
                      <MenuItem value="TODOS">Todos los estados</MenuItem>
                      <MenuItem value="COMPLETADA">Completadas</MenuItem>
                      <MenuItem value="PARCIAL">Parciales</MenuItem>
                      <MenuItem value="ANULADA">Anuladas</MenuItem>
                    </Select>

                    <Button
                      variant="text"
                      onClick={limpiarFiltrosCompras}
                      sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
                    >
                      Limpiar filtros
                    </Button>
                  </Stack>
                </Paper>

                {loadingHistorial ? (
                  <Typography color="text.secondary">
                    Cargando historial...
                  </Typography>
                ) : !historialDisponible ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    No se pudo cargar el historial de compras en este momento.
                  </Alert>
                ) : comprasRecientes.length === 0 ? (
                  <Typography color="text.secondary">
                    Aun no hay compras registradas.
                  </Typography>
                ) : (
                  <List disablePadding>
                    {comprasRecientes.map((compra, index) => {
                      const estado = String(
                        compra.estado_visual || compra.estado || "COMPLETADA"
                      ).toUpperCase();
                      const compraAnulada = estado === "ANULADA";
                      const compraParcial = estado === "PARCIAL";
                      const unidadesAnuladas = Number(compra.unidades_anuladas || 0);

                      return (
                        <Box key={compra.id_compra}>
                          <ListItem
                            disableGutters
                            sx={{
                              py: 1.5,
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 2,
                            }}
                          >
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <ListItemText
                                primary={compra.proveedor_nombre || "Proveedor sin nombre"}
                                secondary={`${compra.no_documento || "Sin documento"} | ${formatFecha(compra.fecha || compra.fecha_compra)}`}
                              />

                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                flexWrap="wrap"
                                useFlexGap
                              >
                                <Chip
                                  label={estado}
                                  size="small"
                                  color={
                                    compraAnulada
                                      ? "error"
                                      : compraParcial
                                        ? "warning"
                                        : "success"
                                  }
                                  variant={compraAnulada ? "filled" : "outlined"}
                                />
                                {compraParcial && (
                                  <Chip
                                    label={`${unidadesAnuladas} unidad(es) anuladas`}
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                  />
                                )}
                                <Typography fontWeight="bold" color="primary.main">
                                  Q {Number(compra.total || 0).toFixed(2)}
                                </Typography>
                              </Stack>
                            </Box>

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => abrirDetalleCompra(compra)}
                              >
                                Ver detalle
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                disabled={printingCompraId === compra.id_compra}
                                onClick={() => imprimirCompra(compra)}
                              >
                                {printingCompraId === compra.id_compra
                                  ? "Imprimiendo..."
                                  : "Imprimir"}
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                disabled={compraAnulada || loadingAnulacionCompra || !canManageCompras}
                                onClick={() => abrirAnulacionCompra(compra)}
                              >
                                {compraAnulada ? "Anulada" : "Anular"}
                              </Button>
                            </Stack>
                          </ListItem>

                          {index < comprasRecientes.length - 1 && <Divider />}
                        </Box>
                      );
                    })}
                  </List>
                )}
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {canManageCompras && (
        <ProveedorFormModal
          key={proveedorModalOpen ? "proveedor-open" : "proveedor-closed"}
          open={proveedorModalOpen}
          onClose={() => setProveedorModalOpen(false)}
          onSave={guardarProveedor}
          loading={loadingNuevoProveedor}
        />
      )}

      <CompraDetalleModal
        open={compraDetalleOpen}
        onClose={cerrarDetalleCompra}
        compraData={compraDetalle}
        loading={loadingDetalleCompra}
        onPrint={() => imprimirCompra(compraDetalle?.compra?.id_compra, compraDetalle)}
        printing={printingCompraId === compraDetalle?.compra?.id_compra}
        onAnularCompra={abrirAnulacionCompra}
        onAnularDetalle={abrirAnulacionDetalle}
        loadingAnulacion={loadingAnulacionCompra}
        loadingAnulacionDetalle={loadingAnulacionDetalle}
        detalleAnulandoId={detalleCompraSeleccionado?.id_detalle_compra ?? null}
        canAnular={canManageCompras}
      />

      {canManageCompras && (
        <CompraAnulacionModal
          open={compraAnulacionOpen}
          onClose={cerrarAnulacionCompra}
          onConfirm={confirmarAnulacionCompra}
          loading={loadingAnulacionCompra}
          compra={compraSeleccionada || compraDetalle?.compra}
        />
      )}

      {canManageCompras && (
        <CompraDetalleAnulacionModal
          key={`compra-detalle-anulacion-${detalleCompraSeleccionado?.id_detalle_compra ?? "none"}-${detalleAnulacionOpen ? "open" : "closed"}`}
          open={detalleAnulacionOpen}
          onClose={cerrarAnulacionDetalle}
          onConfirm={confirmarAnulacionDetalle}
          loading={loadingAnulacionDetalle}
          compra={compraDetalle?.compra}
          detalle={detalleCompraSeleccionado}
        />
      )}
    </Container>
  );
}

export default Compras;
