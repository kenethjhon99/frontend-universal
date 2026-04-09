import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import BuscarProducto from "../components/ventas/BuscarProducto";
import VentaTable from "../components/ventas/VentaTable";
import VentasRecientesTable from "../components/ventas/VentasRecientesTable";
import ClienteFormModal from "../components/ui/ClienteFormModal";
import VentaAnulacionModal from "../components/ui/VentaAnulacionModal";
import VentaDetalleAnulacionModal from "../components/ui/VentaDetalleAnulacionModal";
import VentaDetalleModal from "../components/ui/VentaDetalleModal";
import NoCobroAuthorizationFields from "../components/ui/NoCobroAuthorizationFields";
import { useAuth } from "../hooks/useAuth";
import { isReadOnlyUser, userHasRole } from "../utils/roles";
import {
  readPrintPreference,
  writePrintPreference,
} from "../utils/printPreferences";
import {
  buildVentaTicketHtml,
  openPrintWindow,
  openPrintDocument,
} from "../utils/printDocuments";
import { getFilterPanelSx } from "../utils/filterPanelStyles";
import {
  getSectionPanelSx,
  getSummaryCardSx,
} from "../utils/summaryCardStyles";
import { getProductos } from "../services/productoService";
import {
  anularDetalleVenta,
  anularVenta,
  crearVenta,
  getCatalogoComprobantesVenta,
  getVentaCompleta,
  getVentas,
} from "../services/ventaService";
import { crearCliente, getClientes } from "../services/clienteService";
import { getCajaSesionActiva } from "../services/cajaService";

const normalizarClientes = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizarVentas = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizarComprobantes = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const EMPTY_NO_COBRO_FORM = {
  enabled: false,
  motivo: "",
};

const obtenerUltimoCodigoCliente = (clientes = []) => {
  return clientes.reduce((ultimoCodigo, cliente) => {
    const codigo = String(cliente?.codigo || "").trim();
    const match = codigo.match(/^CL-(\d+)$/i);

    if (!match) return ultimoCodigo;

    const correlativo = Number(match[1]);
    if (!Number.isInteger(correlativo)) return ultimoCodigo;

    if (!ultimoCodigo || correlativo > ultimoCodigo.correlativo) {
      return { codigo, correlativo };
    }

    return ultimoCodigo;
  }, null);
};

function Ventas() {
  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ventasRecientes, setVentasRecientes] = useState([]);
  const [items, setItems] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [comprobantes, setComprobantes] = useState([]);
  const [tipoComprobante, setTipoComprobante] = useState("TICKET");
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [tipoVenta, setTipoVenta] = useState("CONTADO");
  const [noCobroForm, setNoCobroForm] = useState(EMPTY_NO_COBRO_FORM);
  const [autoPrintVenta, setAutoPrintVenta] = useState(() =>
    readPrintPreference(user, "ventas.autoPrint", true)
  );
  const [fechaDesdeVentas, setFechaDesdeVentas] = useState("");
  const [fechaHastaVentas, setFechaHastaVentas] = useState("");
  const [estadoFiltroVentas, setEstadoFiltroVentas] = useState("TODOS");
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loadingComprobantes, setLoadingComprobantes] = useState(true);
  const [loadingVentasRecientes, setLoadingVentasRecientes] = useState(true);
  const [loadingCaja, setLoadingCaja] = useState(true);
  const [loadingVenta, setLoadingVenta] = useState(false);
  const [loadingGuardarCliente, setLoadingGuardarCliente] = useState(false);
  const [loadingAnulacion, setLoadingAnulacion] = useState(false);
  const [loadingAnulacionDetalle, setLoadingAnulacionDetalle] = useState(false);
  const [loadingDetalleVenta, setLoadingDetalleVenta] = useState(false);
  const [printingVentaId, setPrintingVentaId] = useState(null);
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [ventaAnulacionOpen, setVentaAnulacionOpen] = useState(false);
  const [detalleAnulacionOpen, setDetalleAnulacionOpen] = useState(false);
  const [ventaDetalleOpen, setVentaDetalleOpen] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [detalleVentaSeleccionado, setDetalleVentaSeleccionado] = useState(null);
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [cajaActiva, setCajaActiva] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const cargarProductos = useCallback(async () => {
    try {
      setLoadingProductos(true);
      const data = await getProductos({ scope: "GENERAL" });
      setProductos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudieron cargar los productos");
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  const cargarClientes = useCallback(async () => {
    try {
      setLoadingClientes(true);
      const data = await getClientes();
      setClientes(normalizarClientes(data));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudieron cargar los clientes");
    } finally {
      setLoadingClientes(false);
    }
  }, []);

  const cargarComprobantes = useCallback(async () => {
    try {
      setLoadingComprobantes(true);
      const data = await getCatalogoComprobantesVenta();
      const catalogo = normalizarComprobantes(data);
      setComprobantes(catalogo);

      if (catalogo.length > 0) {
        setTipoComprobante((prev) =>
          catalogo.some(
            (item) => String(item.tipo_comprobante || "").toUpperCase() === prev
          )
            ? prev
            : String(catalogo[0].tipo_comprobante || "TICKET").toUpperCase()
        );
      }
    } catch (err) {
      console.error(err);
      setComprobantes([]);
      setError(
        err.response?.data?.error || "No se pudo cargar el catalogo de comprobantes"
      );
    } finally {
      setLoadingComprobantes(false);
    }
  }, []);

  const cargarVentasRecientes = useCallback(async () => {
    try {
      setLoadingVentasRecientes(true);
      const data = await getVentas({
        page: 1,
        limit: 8,
        desde: fechaDesdeVentas || undefined,
        hasta: fechaHastaVentas || undefined,
        estado: estadoFiltroVentas !== "TODOS" ? estadoFiltroVentas : undefined,
        sortBy: "fecha",
        sortDir: "desc",
      });
      setVentasRecientes(normalizarVentas(data));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudieron cargar las ventas recientes");
    } finally {
      setLoadingVentasRecientes(false);
    }
  }, [estadoFiltroVentas, fechaDesdeVentas, fechaHastaVentas]);

  const cargarCajaActiva = useCallback(async () => {
    try {
      setLoadingCaja(true);
      const data = await getCajaSesionActiva();
      setCajaActiva(data?.sesion || null);
    } catch (err) {
      console.error(err);
      setCajaActiva(null);
      setError(err.response?.data?.error || "No se pudo validar la sesion de caja");
    } finally {
      setLoadingCaja(false);
    }
  }, []);

  useEffect(() => {
    setError("");
    cargarProductos();
    cargarClientes();
    cargarComprobantes();
    cargarVentasRecientes();
    cargarCajaActiva();
  }, [cargarCajaActiva, cargarClientes, cargarComprobantes, cargarProductos, cargarVentasRecientes]);

  useEffect(() => {
    setAutoPrintVenta(readPrintPreference(user, "ventas.autoPrint", true));
  }, [user]);

  useEffect(() => {
    writePrintPreference(user, "ventas.autoPrint", autoPrintVenta);
  }, [autoPrintVenta, user]);

  const limpiarFiltrosVentas = () => {
    setFechaDesdeVentas("");
    setFechaHastaVentas("");
    setEstadoFiltroVentas("TODOS");
  };

  const agregarProducto = (producto, cantidadAgregar = 1) => {
    const stock = Number(producto.stock || 0);
    const cantidad = Number(cantidadAgregar);

    if (stock <= 0) return;
    if (!Number.isInteger(cantidad) || cantidad < 1) return;
    if (cantidad > stock) return;

    setItems((prev) => {
      const existe = prev.find((item) => item.id_producto === producto.id_producto);

      if (existe) {
        const nuevaCantidad = existe.cantidad + cantidad;
        if (nuevaCantidad > stock) return prev;

        return prev.map((item) =>
          item.id_producto === producto.id_producto
            ? { ...item, cantidad: nuevaCantidad }
            : item
        );
      }

      return [
        ...prev,
        {
          id_producto: producto.id_producto,
          nombre: producto.nombre,
          codigo_barras: producto.codigo_barras,
          precio_venta: Number(producto.precio_venta),
          cantidad,
          stock,
        },
      ];
    });
  };

  const cambiarCantidad = (id, cantidad) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id_producto !== id) return item;
        if (cantidad < 1 || cantidad > item.stock) return item;
        return { ...item, cantidad };
      })
    );
  };

  const eliminarItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id_producto !== id));
  };

  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + item.precio_venta * item.cantidad, 0);
  }, [items]);

  const montoRecibidoNumero = useMemo(() => {
    const value = Number(montoRecibido);
    return Number.isFinite(value) ? value : 0;
  }, [montoRecibido]);

  const vuelto = useMemo(() => {
    if (metodoPago !== "EFECTIVO") return 0;
    return Math.max(0, montoRecibidoNumero - total);
  }, [metodoPago, montoRecibidoNumero, total]);

  const faltanteEfectivo = useMemo(() => {
    if (metodoPago !== "EFECTIVO") return 0;
    return Math.max(0, total - montoRecibidoNumero);
  }, [metodoPago, montoRecibidoNumero, total]);

  const clienteSeleccionado = useMemo(() => {
    return clientes.find((cliente) => cliente.id_cliente === Number(clienteId)) || null;
  }, [clientes, clienteId]);

  const ultimoCodigoGenerado = useMemo(() => {
    return obtenerUltimoCodigoCliente(clientes);
  }, [clientes]);

  const comprobanteSeleccionado = useMemo(() => {
    return (
      comprobantes.find(
        (item) =>
          String(item.tipo_comprobante || "").toUpperCase() === tipoComprobante
      ) || null
    );
  }, [comprobantes, tipoComprobante]);

  const canAnularVentas = useMemo(() => {
    return userHasRole(user, "ADMIN");
  }, [user]);

  const canOperarVentas = useMemo(() => {
    return userHasRole(user, "ADMIN", "CAJERO");
  }, [user]);

  const canCreateClientes = useMemo(() => {
    return userHasRole(user, "ADMIN", "CAJERO");
  }, [user]);

  const isReadOnly = useMemo(() => isReadOnlyUser(user), [user]);

  const abrirNuevoCliente = () => {
    setSuccess("");
    setClienteModalOpen(true);
  };

  const cerrarNuevoCliente = () => {
    if (loadingGuardarCliente) return;
    setClienteModalOpen(false);
  };

  const guardarCliente = async (formData) => {
    try {
      setLoadingGuardarCliente(true);
      setError("");
      setSuccess("");

      const response = await crearCliente(formData);
      const clienteCreado = response?.cliente;

      await cargarClientes();

      if (clienteCreado?.id_cliente) {
        setClienteId(String(clienteCreado.id_cliente));
      }

      setSuccess(
        clienteCreado?.codigo
          ? `Cliente creado y seleccionado correctamente. Codigo asignado: ${clienteCreado.codigo}.`
          : "Cliente creado y seleccionado correctamente."
      );
      setClienteModalOpen(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo guardar el cliente");
    } finally {
      setLoadingGuardarCliente(false);
    }
  };

  const abrirAnulacionVenta = (venta) => {
    if (!canAnularVentas) return;
    setVentaSeleccionada(venta);
    setVentaAnulacionOpen(true);
  };

  const cargarDetalleVenta = useCallback(async (id_venta) => {
    const data = await getVentaCompleta(id_venta);
    setVentaDetalle(data);
    return data;
  }, []);

  const abrirDetalleVenta = async (venta) => {
    try {
      setLoadingDetalleVenta(true);
      setError("");
      setVentaDetalleOpen(true);
      await cargarDetalleVenta(venta.id_venta);
    } catch (err) {
      console.error(err);
      setVentaDetalleOpen(false);
      setError(err.response?.data?.error || "No se pudo cargar el detalle de la venta");
    } finally {
      setLoadingDetalleVenta(false);
    }
  };

  const imprimirVenta = async (ventaInput, preloadedData = null, printWindow = null) => {
    const idVenta = Number(ventaInput?.id_venta || ventaInput);
    if (!idVenta) return;

    try {
      setPrintingVentaId(idVenta);
      setError("");
      const targetWindow =
        printWindow ||
        openPrintWindow({
          title: `Venta #${idVenta}`,
          width: 420,
          height: 900,
        });

      const data = preloadedData || (await getVentaCompleta(idVenta));
      openPrintDocument({
        title: `Venta #${idVenta}`,
        html: buildVentaTicketHtml(data),
        width: 420,
        height: 900,
        printWindow: targetWindow,
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo imprimir el comprobante de la venta");
    } finally {
      setPrintingVentaId(null);
    }
  };

  const cerrarDetalleVenta = () => {
    if (loadingDetalleVenta) return;
    setDetalleAnulacionOpen(false);
    setDetalleVentaSeleccionado(null);
    setVentaDetalleOpen(false);
    setVentaDetalle(null);
  };

  const abrirAnulacionDetalleVenta = (detalle) => {
    if (!canAnularVentas) return;
    setDetalleVentaSeleccionado(detalle);
    setDetalleAnulacionOpen(true);
  };

  const cerrarAnulacionDetalleVenta = () => {
    if (loadingAnulacionDetalle) return;
    setDetalleAnulacionOpen(false);
    setDetalleVentaSeleccionado(null);
  };

  const cerrarAnulacionVenta = () => {
    if (loadingAnulacion) return;
    setVentaAnulacionOpen(false);
    setVentaSeleccionada(null);
  };

  const confirmarAnulacionVenta = async (motivo, resetForm) => {
    if (!ventaSeleccionada) return;

    try {
      setLoadingAnulacion(true);
      setError("");
      setSuccess("");

      await anularVenta(ventaSeleccionada.id_venta, { motivo });
      await Promise.all([cargarProductos(), cargarVentasRecientes()]);

      setSuccess(`Venta #${ventaSeleccionada.id_venta} anulada correctamente.`);
      resetForm();
      setVentaAnulacionOpen(false);
      setVentaSeleccionada(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo anular la venta");
    } finally {
      setLoadingAnulacion(false);
    }
  };

  const confirmarAnulacionDetalleVenta = async ({ cantidad, motivo }) => {
    const ventaId = ventaDetalle?.venta?.id_venta;
    const detalleId = detalleVentaSeleccionado?.id_detalle;

    if (!ventaId || !detalleId) return;

    try {
      setLoadingAnulacionDetalle(true);
      setError("");
      setSuccess("");

      await anularDetalleVenta(ventaId, detalleId, {
        cantidad,
        motivo,
      });

      await Promise.all([
        cargarProductos(),
        cargarVentasRecientes(),
        cargarDetalleVenta(ventaId),
      ]);

      setSuccess(
        `Detalle de la venta #${ventaId} anulado correctamente por ${cantidad} unidad(es).`
      );
      setDetalleAnulacionOpen(false);
      setDetalleVentaSeleccionado(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo anular el detalle de la venta");
    } finally {
      setLoadingAnulacionDetalle(false);
    }
  };

  const finalizarVenta = async () => {
    if (!items.length) return;

    if (noCobroForm.enabled) {
      if (!String(noCobroForm.motivo || "").trim()) {
        setError("Debes indicar el motivo del no cobro.");
        return;
      }
    }

    if (tipoVenta === "CREDITO" && !clienteId) {
      setError("Selecciona un cliente para registrar una venta a credito.");
      return;
    }

    if (!noCobroForm.enabled && metodoPago === "EFECTIVO" && montoRecibidoNumero < total) {
      setError("El monto recibido no cubre el total de la venta.");
      return;
    }

    let reservedPrintWindow = null;

    try {
      setLoadingVenta(true);
      setError("");
      setSuccess("");

        if (autoPrintVenta) {
          reservedPrintWindow = openPrintWindow({
            title: "Comprobante de venta",
            width: 420,
            height: 900,
          });
        }

        const response = await crearVenta({
          tipo_venta: tipoVenta,
          tipo_comprobante: tipoComprobante,
          metodo_pago: metodoPago,
          monto_recibido:
            !noCobroForm.enabled && metodoPago === "EFECTIVO"
              ? montoRecibidoNumero
              : null,
          id_sucursal: 1,
          id_cliente: clienteId ? Number(clienteId) : null,
          no_cobrar: noCobroForm.enabled,
          no_cobrado_motivo: noCobroForm.enabled ? noCobroForm.motivo : null,
          items: items.map((item) => ({
          id_producto: item.id_producto,
          cantidad: item.cantidad,
          precio_venta: item.precio_venta,
        })),
      });

      setItems([]);
      setClienteId("");
      setTipoVenta("CONTADO");
      setMetodoPago("EFECTIVO");
      setMontoRecibido("");
      setNoCobroForm(EMPTY_NO_COBRO_FORM);
        setSuccess(
          response?.venta?.numero_comprobante
            ? `Venta registrada correctamente. Comprobante ${response.venta.numero_comprobante}.`
            : response?.venta?.id_venta
              ? `Venta #${response.venta.id_venta} registrada correctamente.`
            : "Venta registrada correctamente."
        );
        await Promise.all([
          cargarProductos(),
          cargarComprobantes(),
          cargarVentasRecientes(),
          cargarCajaActiva(),
        ]);

      if (autoPrintVenta && response?.venta?.id_venta) {
        await imprimirVenta(response.venta.id_venta, null, reservedPrintWindow);
        reservedPrintWindow = null;
      }
    } catch (err) {
      console.error(err);
      if (reservedPrintWindow && !reservedPrintWindow.closed) {
        reservedPrintWindow.close();
      }
      setError(err.response?.data?.error || "No se pudo registrar la venta");
    } finally {
      setLoadingVenta(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
        <Paper
          elevation={0}
          sx={(currentTheme) => ({
            ...getSummaryCardSx(currentTheme, "primary", { minHeight: 0 }),
            mb: 3,
          })}
        >
          <Stack spacing={1.5}>
            <Typography
              variant="overline"
              color="primary.main"
              sx={{ fontWeight: 800, letterSpacing: "0.16em" }}
            >
              Operacion comercial
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              Punto de venta
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Registra ventas rapidas, controla existencias y anula ventas con motivo con una vista mas clara para cobro y seguimiento.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                color={cajaActiva ? "success" : "default"}
                label={cajaActiva ? "Caja abierta" : "Caja cerrada"}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                color="info"
                variant="outlined"
                label={`${productos.length} productos`}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                color="secondary"
                variant="outlined"
                label={`${items.length} en carrito`}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                color={noCobroForm.enabled ? "warning" : "primary"}
                variant={noCobroForm.enabled ? "filled" : "outlined"}
                label={
                  noCobroForm.enabled
                    ? "Venta sin cobro"
                    : `${tipoComprobante} - Q ${total.toFixed(2)}`
                }
                sx={{ fontWeight: 700 }}
              />
            </Stack>
          </Stack>
        </Paper>

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
            Estas en modo solo lectura. Puedes consultar productos y ventas recientes, pero no registrar ni modificar ventas.
          </Alert>
        )}

        {!loadingCaja && !cajaActiva && (
          <Alert
            severity="warning"
            sx={{ mb: 3, borderRadius: 2 }}
            action={(
              <Button component={RouterLink} to="/caja" color="inherit" size="small">
                Abrir caja
              </Button>
            )}
          >
            Debes abrir una caja antes de registrar ventas desde este punto de venta.
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gap: 3,
            alignItems: "start",
            gridTemplateColumns: {
              xs: "1fr",
              lg: "minmax(320px, 5fr) minmax(460px, 7fr)",
            },
          }}
        >
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(3, minmax(0, 1fr))",
              },
              gridColumn: "1 / -1",
            }}
          >
            <Paper
              variant="outlined"
              sx={(currentTheme) =>
                getSummaryCardSx(currentTheme, "info", {
                  compact: true,
                  minHeight: 132,
                })
              }
            >
              <Typography variant="body2" color="text.secondary" mb={0.75}>
                Clientes cargados
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {clientes.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Catalogo listo para asignar a la venta
              </Typography>
            </Paper>

            <Paper
              variant="outlined"
              sx={(currentTheme) =>
                getSummaryCardSx(currentTheme, "secondary", {
                  compact: true,
                  minHeight: 132,
                })
              }
            >
              <Typography variant="body2" color="text.secondary" mb={0.75}>
                Venta actual
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {items.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {items.length === 1 ? "producto en el carrito" : "productos en el carrito"}
              </Typography>
            </Paper>

            <Paper
              variant="outlined"
              sx={(currentTheme) =>
                getSummaryCardSx(
                  currentTheme,
                  noCobroForm.enabled ? "warning" : metodoPago === "EFECTIVO" ? "success" : "primary",
                  {
                    compact: true,
                    minHeight: 132,
                  }
                )
              }
            >
              <Typography variant="body2" color="text.secondary" mb={0.75}>
                Total a cobrar
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                Q {total.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {noCobroForm.enabled
                  ? "Pendiente de validacion al cierre"
                  : metodoPago === "EFECTIVO"
                    ? "Cobro inmediato en efectivo"
                    : `Metodo: ${String(metodoPago || "").toLowerCase()}`}
              </Typography>
            </Paper>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Paper
              elevation={3}
              sx={(currentTheme) => ({
                ...getSectionPanelSx(currentTheme, { p: 3, radius: 4, accent: "info" }),
                height: "100%",
              })}
            >
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Buscar productos
              </Typography>

              <BuscarProducto
                productos={productos}
                onAgregar={agregarProducto}
                loading={loadingProductos}
                disabled={!canOperarVentas}
              />
            </Paper>
          </Box>

          <Box
            sx={{
              minWidth: 0,
              position: { xs: "static", lg: "sticky" },
              top: { lg: 24 },
              alignSelf: "start",
            }}
          >
            <Stack spacing={3} sx={{ minWidth: 0 }}>
              <Paper
                elevation={3}
                sx={(currentTheme) =>
                  getSectionPanelSx(currentTheme, { p: 3, radius: 4, accent: "secondary" })
                }
              >
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  Carrito de venta
                </Typography>

                <VentaTable
                  items={items}
                  onCambiarCantidad={cambiarCantidad}
                  onEliminar={eliminarItem}
                  disabled={!canOperarVentas}
                />
              </Paper>

              {canOperarVentas ? (
                <Paper
                  elevation={3}
                  sx={(currentTheme) =>
                    getSectionPanelSx(
                      currentTheme,
                      {
                        p: 3,
                        radius: 4,
                        accent: noCobroForm.enabled
                          ? "warning"
                          : metodoPago === "EFECTIVO"
                            ? "success"
                            : "primary",
                      }
                    )
                  }
                >
                  <Typography variant="h6" fontWeight="bold" mb={2}>
                    Resumen de pago
                  </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      alignItems={{ xs: "stretch", md: "flex-end" }}
                    >
                      <FormControl fullWidth disabled={loadingClientes}>
                        <InputLabel id="cliente-select-label">Cliente</InputLabel>
                        <Select
                          labelId="cliente-select-label"
                          value={clienteId}
                          label="Cliente"
                          onChange={(event) => setClienteId(event.target.value)}
                        >
                          <MenuItem value="">Consumidor final / Sin cliente</MenuItem>
                          {clientes.map((cliente) => (
                            <MenuItem
                              key={cliente.id_cliente}
                              value={String(cliente.id_cliente)}
                            >
                              {cliente.codigo} - {cliente.nombre}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {canCreateClientes && (
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={abrirNuevoCliente}
                          disabled={loadingClientes || loadingVenta}
                          sx={{ minWidth: { xs: "100%", md: 190 } }}
                        >
                          Nuevo cliente
                        </Button>
                      )}
                    </Stack>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1, minHeight: { xs: "auto", md: 44 } }}
                    >
                      {clienteSeleccionado
                        ? `Cliente seleccionado: ${clienteSeleccionado.nombre}${clienteSeleccionado.nit ? ` - NIT ${clienteSeleccionado.nit}` : ""}`
                        : !canCreateClientes
                          ? "Puedes asignar un cliente existente a la venta."
                          : ultimoCodigoGenerado?.codigo
                          ? `Puedes registrar la venta sin cliente, asignarla a uno del catalogo o crear un cliente nuevo. Ultimo codigo generado: ${ultimoCodigoGenerado.codigo}.`
                          : "Puedes registrar la venta sin cliente, asignarla a uno del catalogo o crear un cliente nuevo."}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      Comprobante
                    </Typography>
                    <Select
                      fullWidth
                      value={tipoComprobante}
                      disabled={loadingComprobantes || comprobantes.length === 0}
                      onChange={(event) => setTipoComprobante(event.target.value)}
                    >
                      {comprobantes.length === 0 ? (
                        <MenuItem value="TICKET">TICKET</MenuItem>
                      ) : (
                        comprobantes.map((comprobante) => (
                          <MenuItem
                            key={comprobante.id_comprobante_serie}
                            value={String(comprobante.tipo_comprobante || "").toUpperCase()}
                          >
                            {comprobante.nombre || comprobante.tipo_comprobante} - {comprobante.serie}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      Tipo de venta
                    </Typography>
                    <Select
                      fullWidth
                      value={tipoVenta}
                      onChange={(event) => setTipoVenta(event.target.value)}
                    >
                      <MenuItem value="CONTADO">CONTADO</MenuItem>
                      <MenuItem value="CREDITO">CREDITO</MenuItem>
                    </Select>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      Metodo de pago
                    </Typography>
                    <Select
                      fullWidth
                      value={metodoPago}
                      onChange={(event) => {
                        const nextMetodo = event.target.value;
                        setMetodoPago(nextMetodo);

                        if (nextMetodo !== "EFECTIVO") {
                          setMontoRecibido("");
                        }
                      }}
                    >
                      <MenuItem value="EFECTIVO">EFECTIVO</MenuItem>
                      <MenuItem value="TARJETA">TARJETA</MenuItem>
                      <MenuItem value="TRANSFERENCIA">TRANSFERENCIA</MenuItem>
                      </Select>
                  </Grid>

                  <Grid item xs={12}>
                    <NoCobroAuthorizationFields
                      enabled={noCobroForm.enabled}
                      onToggle={(checked) =>
                        setNoCobroForm((prev) => ({
                          ...prev,
                          enabled: checked,
                        }))
                      }
                      form={noCobroForm}
                      onChange={(field, value) =>
                        setNoCobroForm((prev) => ({ ...prev, [field]: value }))
                      }
                      title="Registrar como no cobrado"
                      helperText="La venta se guardara sin cobro y quedara pendiente de validacion al cierre de caja por un admin."
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        flexWrap: "wrap",
                        borderColor:
                          metodoPago === "EFECTIVO" ? "success.main" : "divider",
                        background:
                          metodoPago === "EFECTIVO"
                            ? "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(15,23,42,0.55))"
                            : "transparent",
                        boxShadow:
                          metodoPago === "EFECTIVO"
                            ? "0 0 0 1px rgba(34,197,94,0.12), 0 18px 40px rgba(15,23,42,0.18)"
                            : "none",
                        transition:
                          "border-color 180ms ease, background 180ms ease, box-shadow 180ms ease",
                      }}
                    >
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            Comprobante
                          </Typography>
                          <Chip
                            size="small"
                            label={comprobanteSeleccionado?.serie || tipoComprobante}
                            color="primary"
                            variant="outlined"
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Total a pagar
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="primary.main">
                          Q {total.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {comprobanteSeleccionado?.siguiente_numero
                            ? `Siguiente correlativo: ${comprobanteSeleccionado.siguiente_numero}.`
                            : metodoPago === "EFECTIVO"
                              ? "Confirma este monto antes de recibir el efectivo."
                              : "Monto final de la venta actual."}
                        </Typography>
                      </Box>
                      <Chip
                        label={
                          metodoPago === "EFECTIVO"
                            ? "Cobro en efectivo"
                            : `Pago ${String(metodoPago || "").toLowerCase()}`
                        }
                        color={metodoPago === "EFECTIVO" ? "success" : "default"}
                        variant={metodoPago === "EFECTIVO" ? "filled" : "outlined"}
                        sx={{ fontWeight: 700 }}
                      />
                    </Paper>
                  </Grid>

                  {metodoPago === "EFECTIVO" && !noCobroForm.enabled && (
                    <>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Monto recibido"
                          value={montoRecibido}
                          onChange={(event) => setMontoRecibido(event.target.value)}
                          inputProps={{ min: 0, step: "0.01" }}
                          helperText={
                            total > 0 && faltanteEfectivo > 0
                              ? `Faltan Q ${faltanteEfectivo.toFixed(2)} para completar el pago.`
                              : "Ingresa el efectivo recibido del cliente."
                          }
                          error={total > 0 && faltanteEfectivo > 0}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            borderColor:
                              total > 0 && faltanteEfectivo > 0
                                ? "error.main"
                                : "success.main",
                            background:
                              total > 0 && faltanteEfectivo > 0
                                ? "linear-gradient(135deg, rgba(239,68,68,0.16), rgba(15,23,42,0.55))"
                                : "linear-gradient(135deg, rgba(34,197,94,0.16), rgba(15,23,42,0.55))",
                            boxShadow:
                              total > 0 && faltanteEfectivo > 0
                                ? "0 0 0 1px rgba(239,68,68,0.10), 0 18px 40px rgba(15,23,42,0.16)"
                                : "0 0 0 1px rgba(34,197,94,0.10), 0 18px 40px rgba(15,23,42,0.16)",
                            transition:
                              "border-color 180ms ease, background 180ms ease, box-shadow 180ms ease",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Vuelto a entregar
                          </Typography>
                          <Typography
                            variant="h5"
                            fontWeight="bold"
                            color={
                              total > 0 && faltanteEfectivo > 0
                                ? "error.main"
                                : "success.main"
                            }
                          >
                            Q {vuelto.toFixed(2)}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={
                              total > 0 && faltanteEfectivo > 0
                                ? "error.light"
                                : "text.secondary"
                            }
                          >
                            {faltanteEfectivo > 0
                              ? `Pago pendiente: Q ${faltanteEfectivo.toFixed(2)}`
                              : "El pago cubre el total de la venta."}
                          </Typography>
                        </Paper>
                      </Grid>
                    </>
                  )}
                </Grid>

                <Divider sx={{ my: 3 }} />

                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={autoPrintVenta}
                      onChange={(event) => setAutoPrintVenta(event.target.checked)}
                    />
                  )}
                  label="Imprimir ticket al finalizar"
                  sx={{ mb: 2 }}
                />

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: { xs: "stretch", md: "flex-end" },
                    gap: 2,
                  }}
                >
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    onClick={finalizarVenta}
                    disabled={
                      !items.length ||
                      loadingVenta ||
                      loadingCaja ||
                      !cajaActiva ||
                      (!noCobroForm.enabled &&
                        metodoPago === "EFECTIVO" &&
                        total > 0 &&
                        montoRecibidoNumero < total) ||
                      (noCobroForm.enabled && !String(noCobroForm.motivo || "").trim())
                    }
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 3,
                      fontWeight: "bold",
                      minWidth: 220,
                    }}
                  >
                    {loadingVenta
                      ? "Procesando..."
                      : loadingCaja
                        ? "Validando caja..."
                        : !cajaActiva
                        ? "Abre caja para vender"
                          : noCobroForm.enabled
                            ? "Registrar venta sin cobro"
                            : "Finalizar venta"}
                  </Button>
                </Box>
                </Paper>
              ) : (
                <Paper
                  elevation={3}
                  sx={(currentTheme) =>
                    getSectionPanelSx(currentTheme, { p: 3, radius: 4, accent: "warning" })
                  }
                >
                  <Typography variant="h6" fontWeight="bold" mb={2}>
                    Resumen de pago
                  </Typography>
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Este rol solo puede revisar el contenido del carrito y el historial reciente. El registro de ventas esta deshabilitado.
                  </Alert>
                </Paper>
              )}
            </Stack>
          </Box>
        </Box>

        <Paper
          elevation={3}
          sx={(currentTheme) => ({
            mt: 3,
            ...getSectionPanelSx(currentTheme, { p: 3, radius: 4, accent: "info" }),
          })}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            mb={2}
          >
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Ventas recientes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {canAnularVentas
                  ? "Puedes anular una venta completa indicando el motivo."
                  : "Puedes consultar el historial y el detalle de ventas. Solo un administrador puede anular."}
              </Typography>
            </Box>
          </Stack>

          <Paper
            variant="outlined"
            sx={(theme) => getFilterPanelSx(theme, { compact: true, mb: 2 })}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <TextField
                label="Desde"
                type="date"
                value={fechaDesdeVentas}
                onChange={(event) => setFechaDesdeVentas(event.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: { xs: "100%", md: 180 } }}
              />

              <TextField
                label="Hasta"
                type="date"
                value={fechaHastaVentas}
                onChange={(event) => setFechaHastaVentas(event.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: { xs: "100%", md: 180 } }}
              />

              <FormControl sx={{ minWidth: { xs: "100%", md: 180 } }}>
                <InputLabel id="estado-ventas-label">Estado</InputLabel>
                <Select
                  labelId="estado-ventas-label"
                  value={estadoFiltroVentas}
                  label="Estado"
                  onChange={(event) => setEstadoFiltroVentas(event.target.value)}
                >
                  <MenuItem value="TODOS">Todos</MenuItem>
                  <MenuItem value="COMPLETADA">Completadas</MenuItem>
                  <MenuItem value="ANULADA">Anuladas</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="text"
                onClick={limpiarFiltrosVentas}
                sx={{ alignSelf: { xs: "stretch", md: "center" } }}
              >
                Limpiar filtros
              </Button>
            </Stack>
          </Paper>

          <VentasRecientesTable
            ventas={ventasRecientes}
            loading={loadingVentasRecientes}
            onViewDetail={abrirDetalleVenta}
            onPrint={imprimirVenta}
            onAnular={abrirAnulacionVenta}
            canAnular={canAnularVentas}
            printingVentaId={printingVentaId}
          />
        </Paper>
      </Box>

      {canCreateClientes && canOperarVentas && (
        <ClienteFormModal
          key={`venta-cliente-${clienteModalOpen ? "open" : "closed"}`}
          open={clienteModalOpen}
          onClose={cerrarNuevoCliente}
          onSave={guardarCliente}
          loading={loadingGuardarCliente}
        />
      )}

      <VentaAnulacionModal
        open={ventaAnulacionOpen}
        onClose={cerrarAnulacionVenta}
        onConfirm={confirmarAnulacionVenta}
        loading={loadingAnulacion}
        venta={ventaSeleccionada}
      />

      <VentaDetalleModal
        open={ventaDetalleOpen}
        onClose={cerrarDetalleVenta}
        ventaData={ventaDetalle}
        loading={loadingDetalleVenta}
        onPrint={() => imprimirVenta(ventaDetalle?.venta?.id_venta, ventaDetalle)}
        printing={printingVentaId === ventaDetalle?.venta?.id_venta}
        onAnularDetalle={abrirAnulacionDetalleVenta}
        loadingAnulacionDetalle={loadingAnulacionDetalle}
        detalleAnulandoId={detalleVentaSeleccionado?.id_detalle ?? null}
        canAnular={canAnularVentas}
      />

      <VentaDetalleAnulacionModal
        key={`venta-detalle-anulacion-${detalleVentaSeleccionado?.id_detalle ?? "none"}-${detalleAnulacionOpen ? "open" : "closed"}`}
        open={detalleAnulacionOpen}
        onClose={cerrarAnulacionDetalleVenta}
        onConfirm={confirmarAnulacionDetalleVenta}
        loading={loadingAnulacionDetalle}
        venta={ventaDetalle?.venta}
        detalle={detalleVentaSeleccionado}
      />
    </Container>
  );
}

export default Ventas;
