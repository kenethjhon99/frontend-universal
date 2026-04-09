import { useCallback, useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import BuildIcon from "@mui/icons-material/Build";
import CarRepairIcon from "@mui/icons-material/CarRepair";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";
import OilBarrelIcon from "@mui/icons-material/OilBarrel";
import SaveIcon from "@mui/icons-material/Save";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { isReadOnlyUser, userHasRole } from "../utils/roles";
import {
  readPrintPreference,
  writePrintPreference,
} from "../utils/printPreferences";
import {
  buildReparacionTicketHtml,
  openPrintWindow,
  openPrintDocument,
} from "../utils/printDocuments";
import {
  getSectionPanelSx,
  getSummaryCardSx,
} from "../utils/summaryCardStyles";
import { getCajaSesionActiva } from "../services/cajaService";
import NoCobroAuthorizationFields from "../components/ui/NoCobroAuthorizationFields";
import { getProductos } from "../services/productoService";
import {
  actualizarEstadoOrdenReparacion,
  asignarTecnicoOrdenReparacion,
  agregarProductoReparacion,
  cobrarOrdenReparacion,
  cobrarServicioReparacion,
  crearServicioReparacion,
  crearTipoVehiculoReparacion,
  editarServicioReparacion,
  getOrdenesReparacion,
  getReparacionCatalogo,
  getTecnicosServicio,
} from "../services/servicioService";

const VEHICLE_ICON_MAP = {
  two_wheeler: TwoWheelerIcon,
  directions_car: DirectionsCarIcon,
  airport_shuttle: DirectionsCarIcon,
  local_shipping: LocalShippingIcon,
  directions_bus: DirectionsBusIcon,
};

const SERVICE_ICON_MAP = {
  build: BuildIcon,
  oil_barrel: OilBarrelIcon,
  car_repair: CarRepairIcon,
  tune: TuneIcon,
  settings: SettingsIcon,
  electrical_services: ElectricalServicesIcon,
};

const VEHICLE_ICON_OPTIONS = [
  { value: "two_wheeler", label: "Moto" },
  { value: "directions_car", label: "Carro" },
  { value: "airport_shuttle", label: "SUV / Pickup" },
  { value: "local_shipping", label: "Camion" },
  { value: "directions_bus", label: "Bus / Microbus" },
];

const SERVICE_ICON_OPTIONS = [
  { value: "build", label: "Diagnostico" },
  { value: "oil_barrel", label: "Aceite" },
  { value: "car_repair", label: "Mecanica" },
  { value: "tune", label: "Afinacion" },
  { value: "settings", label: "Suspension / clutch" },
  { value: "electrical_services", label: "Electrico" },
];

const ESTADOS = ["RECIBIDO", "DIAGNOSTICO", "EN_REPARACION", "PRUEBAS", "LISTO", "ENTREGADO"];

const isServicioPersonalizado = (servicio) =>
  String(servicio?.slug || "").trim().toLowerCase() === "otro";

const EMPTY_VEHICULO = { nombre: "", descripcion: "", icono: "directions_car" };
const EMPTY_SERVICIO = {
  id_tipo_vehiculo: "",
  nombre: "",
  descripcion: "",
  precio_base: "",
  duracion_minutos: "",
  icono: "build",
};
const EMPTY_COBRO = {
  nombre_cliente: "",
  placa: "",
  color: "",
  kilometraje: "",
  diagnostico_inicial: "",
  observaciones: "",
  metodo_pago: "EFECTIVO",
  precio_servicio: "",
  monto_recibido: "",
};
const EMPTY_PAGO = {
  metodo_pago: "EFECTIVO",
  monto_recibido: "",
};
const EMPTY_PRODUCTO_ORDEN = {
  id_producto: "",
  cantidad: "1",
  cobra_al_cliente: true,
};
const EMPTY_NO_COBRO_FORM = {
  enabled: false,
  motivo: "",
};

const normalizarCatalogo = (data) =>
  data?.data?.vehiculos && data?.data?.servicios
    ? data.data
    : { vehiculos: [], servicios: [] };

const formatDateTime = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const priceOrEmpty = (metodoPago, total) =>
  metodoPago === "EFECTIVO" ? String(total || "") : "";

const getSiguientesEstadosReparacion = (estadoActual) => {
  const actual = String(estadoActual || "").trim().toUpperCase();
  const actualIndex = ESTADOS.findIndex((estado) => estado === actual);

  if (actualIndex === -1) return ESTADOS;

  return ESTADOS.filter((_, index) => index === actualIndex || index === actualIndex + 1);
};

function CarWashReparacion() {
  const { user } = useAuth();
  const canManageCatalog = userHasRole(user, "SUPER_ADMIN", "ADMIN", "ENCARGADO_SERVICIOS");
  const canManageOrders = userHasRole(user, "SUPER_ADMIN", "ADMIN", "CAJERO", "MECANICO", "ENCARGADO_SERVICIOS");
  const canOperateReparacion = userHasRole(user, "SUPER_ADMIN", "ADMIN", "CAJERO", "MECANICO", "ENCARGADO_SERVICIOS");
  const isReadOnly = isReadOnlyUser(user);
  const [vehiculos, setVehiculos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [vehiculoId, setVehiculoId] = useState(null);
  const [servicioId, setServicioId] = useState(null);
  const [cajaActiva, setCajaActiva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOrdenes, setLoadingOrdenes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehiculoModalOpen, setVehiculoModalOpen] = useState(false);
  const [servicioModalOpen, setServicioModalOpen] = useState(false);
  const [productoOrdenModalOpen, setProductoOrdenModalOpen] = useState(false);
  const [productoBorradorModalOpen, setProductoBorradorModalOpen] = useState(false);
  const [pagoOrdenModalOpen, setPagoOrdenModalOpen] = useState(false);
  const [editingServicioId, setEditingServicioId] = useState(null);
  const [ordenProductoActiva, setOrdenProductoActiva] = useState(null);
  const [ordenPagoActiva, setOrdenPagoActiva] = useState(null);
  const [vehiculoForm, setVehiculoForm] = useState(EMPTY_VEHICULO);
  const [servicioForm, setServicioForm] = useState(EMPTY_SERVICIO);
  const [cobroForm, setCobroForm] = useState(EMPTY_COBRO);
  const [pagoForm, setPagoForm] = useState(EMPTY_PAGO);
  const [noCobroForm, setNoCobroForm] = useState(EMPTY_NO_COBRO_FORM);
  const [noCobroPagoForm, setNoCobroPagoForm] = useState(EMPTY_NO_COBRO_FORM);
  const [productoOrdenForm, setProductoOrdenForm] = useState(EMPTY_PRODUCTO_ORDEN);
  const [productoBorradorForm, setProductoBorradorForm] = useState(EMPTY_PRODUCTO_ORDEN);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [actualizandoOrdenId, setActualizandoOrdenId] = useState(null);
  const [asignandoTecnicoOrdenId, setAsignandoTecnicoOrdenId] = useState(null);
  const [imprimiendoOrdenId, setImprimiendoOrdenId] = useState(null);
  const [autoPrintOrdenNueva, setAutoPrintOrdenNueva] = useState(() =>
    readPrintPreference(user, "reparacion.autoPrintNueva", true)
  );
  const [autoPrintCobroOrden, setAutoPrintCobroOrden] = useState(() =>
    readPrintPreference(user, "reparacion.autoPrintCobro", true)
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const cargarCatalogo = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [catalogoRes, cajaRes, productosRes, tecnicosRes] = await Promise.all([
        getReparacionCatalogo(),
        getCajaSesionActiva(),
        getProductos({ scope: "SERVICIOS" }),
        getTecnicosServicio(),
      ]);
      const catalogo = normalizarCatalogo(catalogoRes);
      setVehiculos(catalogo.vehiculos);
      setServicios(catalogo.servicios);
      setProductos(Array.isArray(productosRes) ? productosRes : []);
      setTecnicos(Array.isArray(tecnicosRes?.data) ? tecnicosRes.data : []);
      setCajaActiva(cajaRes?.sesion || null);
      const firstVehiculo = catalogo.vehiculos[0]?.id_tipo_vehiculo ?? null;
      const firstServicio =
        catalogo.servicios.find((item) => item.id_tipo_vehiculo === firstVehiculo)
          ?.id_servicio_catalogo ?? null;
      setVehiculoId(firstVehiculo);
      setServicioId(firstServicio);
      const precio = Number(
        catalogo.servicios.find((item) => item.id_servicio_catalogo === firstServicio)?.precio_base || 0
      ).toFixed(2);
      setCobroForm((prev) => ({
        ...prev,
        precio_servicio: precio,
        monto_recibido: priceOrEmpty(prev.metodo_pago, precio),
      }));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo cargar el modulo de reparacion.");
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarOrdenes = useCallback(async (estado = estadoFiltro) => {
    try {
      setLoadingOrdenes(true);
      const res = await getOrdenesReparacion({
        estado_trabajo: estado !== "TODOS" ? estado : undefined,
        limit: 24,
      });
      setOrdenes(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudieron cargar las ordenes.");
    } finally {
      setLoadingOrdenes(false);
    }
  }, [estadoFiltro]);

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  useEffect(() => {
    cargarOrdenes();
  }, [cargarOrdenes]);

  useEffect(() => {
    setAutoPrintOrdenNueva(
      readPrintPreference(user, "reparacion.autoPrintNueva", true)
    );
    setAutoPrintCobroOrden(
      readPrintPreference(user, "reparacion.autoPrintCobro", true)
    );
  }, [user]);

  useEffect(() => {
    writePrintPreference(user, "reparacion.autoPrintNueva", autoPrintOrdenNueva);
  }, [autoPrintOrdenNueva, user]);

  useEffect(() => {
    writePrintPreference(user, "reparacion.autoPrintCobro", autoPrintCobroOrden);
  }, [autoPrintCobroOrden, user]);

  const serviciosFiltrados = useMemo(
    () => servicios.filter((item) => item.id_tipo_vehiculo === vehiculoId),
    [servicios, vehiculoId]
  );

  const servicioSeleccionado = useMemo(
    () => servicios.find((item) => item.id_servicio_catalogo === servicioId) || null,
    [servicios, servicioId]
  );

  const servicioPersonalizadoSeleccionado = useMemo(
    () => isServicioPersonalizado(servicioSeleccionado),
    [servicioSeleccionado]
  );

  const precioServicioActual = useMemo(() => {
    if (servicioPersonalizadoSeleccionado) {
      return Number(cobroForm.precio_servicio || 0);
    }

    return Number(servicioSeleccionado?.precio_base || 0);
  }, [cobroForm.precio_servicio, servicioPersonalizadoSeleccionado, servicioSeleccionado]);

  const seleccionarVehiculo = (id) => {
    setVehiculoId(id);
    const nextServicio = servicios.find((item) => item.id_tipo_vehiculo === id);
    const esPersonalizado = isServicioPersonalizado(nextServicio);
    const precioBase = String(Number(nextServicio?.precio_base || 0).toFixed(2));
    setServicioId(nextServicio?.id_servicio_catalogo ?? null);
    setProductosSeleccionados([]);
    setCobroForm((prev) => ({
      ...prev,
      precio_servicio: esPersonalizado ? "" : precioBase,
      monto_recibido: priceOrEmpty(
        prev.metodo_pago,
        esPersonalizado ? "" : precioBase
      ),
    }));
  };

  const seleccionarServicio = (id) => {
    setServicioId(id);
    const servicio = servicios.find((item) => item.id_servicio_catalogo === id);
    const esPersonalizado = isServicioPersonalizado(servicio);
    const precioBase = String(Number(servicio?.precio_base || 0).toFixed(2));
    setCobroForm((prev) => ({
      ...prev,
      precio_servicio: esPersonalizado ? "" : precioBase,
      monto_recibido: priceOrEmpty(
        prev.metodo_pago,
        esPersonalizado ? "" : precioBase
      ),
    }));
  };

  const abrirModalServicioNuevo = (forcedVehiculoId = vehiculoId) => {
    setEditingServicioId(null);
    setServicioForm({
      ...EMPTY_SERVICIO,
      id_tipo_vehiculo: forcedVehiculoId ? String(forcedVehiculoId) : "",
    });
    setServicioModalOpen(true);
  };

  const guardarVehiculo = async ({ keepOpen = false } = {}) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const response = await crearTipoVehiculoReparacion(vehiculoForm);
      const nuevoVehiculo = response?.vehiculo;
      await cargarCatalogo();
      if (keepOpen) {
        setVehiculoForm({
          ...EMPTY_VEHICULO,
          icono: vehiculoForm.icono || EMPTY_VEHICULO.icono,
        });
      } else {
        setVehiculoModalOpen(false);
        setVehiculoForm(EMPTY_VEHICULO);
      }
      setSuccess(
        nuevoVehiculo?.nombre
          ? `Tipo de vehiculo ${nuevoVehiculo.nombre} creado correctamente.`
          : "Tipo de vehiculo creado correctamente."
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo guardar el vehiculo.");
    } finally {
      setSaving(false);
    }
  };

  const guardarServicio = async ({ keepOpen = false } = {}) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const payload = {
        id_tipo_vehiculo: Number(servicioForm.id_tipo_vehiculo),
        nombre: servicioForm.nombre,
        descripcion: servicioForm.descripcion,
        precio_base: Number(servicioForm.precio_base),
        duracion_minutos: Number(servicioForm.duracion_minutos),
        icono: servicioForm.icono,
      };
      let servicioGuardado = null;
      if (editingServicioId) {
        const response = await editarServicioReparacion(editingServicioId, payload);
        servicioGuardado = response?.servicio;
      } else {
        const response = await crearServicioReparacion(payload);
        servicioGuardado = response?.servicio;
      }
      await cargarCatalogo();
      if (keepOpen && !editingServicioId) {
        setServicioForm({
          ...EMPTY_SERVICIO,
          id_tipo_vehiculo: String(
            servicioGuardado?.id_tipo_vehiculo ?? Number(servicioForm.id_tipo_vehiculo)
          ),
          icono: servicioForm.icono || EMPTY_SERVICIO.icono,
        });
      } else {
        setServicioModalOpen(false);
        setEditingServicioId(null);
        setServicioForm(EMPTY_SERVICIO);
      }
      setSuccess(editingServicioId ? "Servicio actualizado correctamente." : "Servicio creado correctamente.");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo guardar el servicio.");
    } finally {
      setSaving(false);
    }
  };

  const totalProductosCobrados = productosSeleccionados.reduce(
    (acc, item) => acc + (item.cobra_al_cliente ? item.subtotal : 0),
    0
  );
  const totalOrden = Number(
    (precioServicioActual + totalProductosCobrados).toFixed(2)
  );
  const montoCobrado = Number(ordenPagoActiva?.monto_cobrado || totalOrden || 0);
  const montoRecibido = Number(
    (ordenPagoActiva ? pagoForm.monto_recibido : cobroForm.monto_recibido) || 0
  );
  const metodoPagoActual = ordenPagoActiva ? pagoForm.metodo_pago : cobroForm.metodo_pago;
  const faltante =
    metodoPagoActual === "EFECTIVO" ? Math.max(0, montoCobrado - montoRecibido) : 0;
  const vuelto =
    metodoPagoActual === "EFECTIVO" ? Math.max(0, montoRecibido - montoCobrado) : 0;

  const crearOrden = async () => {
    let reservedPrintWindow = null;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (noCobroForm.enabled) {
        if (!String(noCobroForm.motivo || "").trim()) {
          setError("Debes indicar el motivo del no cobro.");
          return;
        }
      }

      if (autoPrintOrdenNueva) {
        reservedPrintWindow = openPrintWindow({
          title: "Ticket de reparacion",
          width: 1024,
          height: 920,
        });
      }

      const response = await cobrarServicioReparacion({
        id_tipo_vehiculo: vehiculoId,
        id_servicio_catalogo: servicioId,
        nombre_cliente: cobroForm.nombre_cliente,
        placa: cobroForm.placa,
        color: cobroForm.color,
        kilometraje: cobroForm.kilometraje,
        diagnostico_inicial: cobroForm.diagnostico_inicial,
        observaciones: cobroForm.observaciones,
        metodo_pago: cobroForm.metodo_pago,
        precio_servicio: precioServicioActual,
        monto_cobrado: totalOrden,
        monto_recibido:
          !noCobroForm.enabled && cobroForm.metodo_pago === "EFECTIVO"
            ? montoRecibido
            : null,
        productos: productosSeleccionados.map((item) => ({
          id_producto: item.id_producto,
          cantidad: item.cantidad,
          cobra_al_cliente: item.cobra_al_cliente,
        })),
        no_cobrar: noCobroForm.enabled,
        no_cobrado_motivo: noCobroForm.enabled ? noCobroForm.motivo : null,
      });
      const ordenCreada = response?.orden;
      await Promise.all([cargarOrdenes(), cargarCatalogo()]);

      if (autoPrintOrdenNueva && ordenCreada?.id_reparacion_orden) {
        await imprimirOrden(ordenCreada, reservedPrintWindow);
        reservedPrintWindow = null;
      } else if (reservedPrintWindow && !reservedPrintWindow.closed) {
        reservedPrintWindow.close();
      }

      setCobroForm({
        ...EMPTY_COBRO,
        precio_servicio: servicioPersonalizadoSeleccionado
          ? ""
          : String(Number(servicioSeleccionado?.precio_base || 0).toFixed(2)),
      });
      setProductosSeleccionados([]);
      setNoCobroForm(EMPTY_NO_COBRO_FORM);
      setSuccess(
        noCobroForm.enabled
          ? "Orden de reparacion registrada sin cobro."
          : "Orden de reparacion creada y cobrada correctamente."
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo crear y cobrar la orden de reparacion.");
      if (reservedPrintWindow && !reservedPrintWindow.closed) {
        reservedPrintWindow.close();
      }
    } finally {
      setSaving(false);
    }
  };

  const abrirProductoBorradorModal = () => {
    if (!canOperateReparacion) return;
    setProductoBorradorForm({
      id_producto: productos[0]?.id_producto ? String(productos[0].id_producto) : "",
      cantidad: "1",
      cobra_al_cliente: true,
    });
    setProductoBorradorModalOpen(true);
  };

  const guardarProductoBorrador = () => {
    if (!canOperateReparacion) return;
    const producto = productos.find(
      (item) => item.id_producto === Number(productoBorradorForm.id_producto)
    );

    if (!producto) return;

    const cantidad = Number(productoBorradorForm.cantidad);
    const subtotal = Number((Number(producto.precio_venta || 0) * cantidad).toFixed(2));

    setProductosSeleccionados((prev) => [
      ...prev,
      {
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        codigo_barras: producto.codigo_barras,
        stock: Number(producto.stock || 0),
        precio_unitario: Number(producto.precio_venta || 0),
        cantidad,
        cobra_al_cliente: productoBorradorForm.cobra_al_cliente,
        subtotal,
      },
    ]);
    setProductoBorradorModalOpen(false);
    setProductoBorradorForm(EMPTY_PRODUCTO_ORDEN);
  };

  const eliminarProductoBorrador = (index) => {
    if (!canOperateReparacion) return;
    setProductosSeleccionados((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const abrirModalCobroOrden = (orden) => {
    if (!canOperateReparacion) return;
    setOrdenPagoActiva(orden);
    setPagoForm({
      metodo_pago: "EFECTIVO",
      monto_recibido: String(Number(orden.monto_cobrado || 0).toFixed(2)),
    });
    setNoCobroPagoForm(EMPTY_NO_COBRO_FORM);
    setPagoOrdenModalOpen(true);
  };

  const guardarCobroOrden = async () => {
    if (!canOperateReparacion) return;
    let reservedPrintWindow = null;

    try {
      if (!ordenPagoActiva) return;

      setSaving(true);
      setError("");
      setSuccess("");

      if (noCobroPagoForm.enabled) {
        if (!String(noCobroPagoForm.motivo || "").trim()) {
          setError("Debes indicar el motivo del no cobro.");
          return;
        }
      }

      if (autoPrintCobroOrden) {
        reservedPrintWindow = openPrintWindow({
          title: `Ticket de reparacion #${ordenPagoActiva.id_reparacion_orden}`,
          width: 1024,
          height: 920,
        });
      }

      const response = await cobrarOrdenReparacion(ordenPagoActiva.id_reparacion_orden, {
        metodo_pago: pagoForm.metodo_pago,
        monto_recibido:
          !noCobroPagoForm.enabled && pagoForm.metodo_pago === "EFECTIVO"
            ? montoRecibido
            : null,
        no_cobrar: noCobroPagoForm.enabled,
        no_cobrado_motivo: noCobroPagoForm.enabled ? noCobroPagoForm.motivo : null,
      });
      const ordenActualizada = response?.orden || {
        ...ordenPagoActiva,
        metodo_pago: noCobroPagoForm.enabled ? "NO_COBRADO" : pagoForm.metodo_pago,
        monto_recibido:
          !noCobroPagoForm.enabled && pagoForm.metodo_pago === "EFECTIVO"
            ? montoRecibido
            : null,
        estado: noCobroPagoForm.enabled ? "NO_COBRADO" : "PAGADO",
        no_cobrado_motivo: noCobroPagoForm.enabled ? noCobroPagoForm.motivo : null,
      };
      await cargarOrdenes(estadoFiltro);

      if (autoPrintCobroOrden && ordenActualizada?.id_reparacion_orden) {
        await imprimirOrden(ordenActualizada, reservedPrintWindow);
        reservedPrintWindow = null;
      } else if (reservedPrintWindow && !reservedPrintWindow.closed) {
        reservedPrintWindow.close();
      }

      setPagoOrdenModalOpen(false);
      setOrdenPagoActiva(null);
      setPagoForm(EMPTY_PAGO);
      setNoCobroPagoForm(EMPTY_NO_COBRO_FORM);
      setSuccess(
        noCobroPagoForm.enabled
          ? "Orden registrada como no cobrada."
          : "Cobro registrado correctamente en caja."
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo cobrar la orden.");
      if (reservedPrintWindow && !reservedPrintWindow.closed) {
        reservedPrintWindow.close();
      }
    } finally {
      setSaving(false);
    }
  };

  const abrirModalProductoOrden = (orden) => {
    if (!canOperateReparacion) return;
    setOrdenProductoActiva(orden);
    setProductoOrdenForm({
      id_producto: productos[0]?.id_producto ? String(productos[0].id_producto) : "",
      cantidad: "1",
      cobra_al_cliente: true,
    });
    setProductoOrdenModalOpen(true);
  };

  const guardarProductoOrden = async () => {
    if (!canOperateReparacion) return;
    try {
      if (!ordenProductoActiva) return;

      setSaving(true);
      setError("");
      setSuccess("");
      await agregarProductoReparacion(ordenProductoActiva.id_reparacion_orden, {
        id_producto: Number(productoOrdenForm.id_producto),
        cantidad: Number(productoOrdenForm.cantidad),
        cobra_al_cliente: productoOrdenForm.cobra_al_cliente,
      });
      const productosRes = await getProductos({ scope: "SERVICIOS" });
      setProductos(Array.isArray(productosRes) ? productosRes : []);
      await cargarOrdenes(estadoFiltro);
      setProductoOrdenModalOpen(false);
      setOrdenProductoActiva(null);
      setProductoOrdenForm(EMPTY_PRODUCTO_ORDEN);
      setSuccess("Producto agregado a la orden y stock actualizado.");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo agregar el producto a la orden.");
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (id, estado) => {
    if (!canManageOrders) return;
    try {
      setActualizandoOrdenId(id);
      setError("");
      setSuccess("");
      await actualizarEstadoOrdenReparacion(id, { estado_trabajo: estado });
      await cargarOrdenes(estadoFiltro);
      setSuccess(`Orden #${id} actualizada a ${estado.replaceAll("_", " ")}.`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo actualizar el estado.");
    } finally {
      setActualizandoOrdenId(null);
    }
  };

  const asignarTecnico = async (id, idTecnico) => {
    if (!canManageOrders) return;
    try {
      setAsignandoTecnicoOrdenId(id);
      setError("");
      setSuccess("");
      await asignarTecnicoOrdenReparacion(id, {
        id_tecnico: idTecnico || null,
      });
      await cargarOrdenes(estadoFiltro);
      const tecnico = tecnicos.find(
        (item) => String(item.id_usuario) === String(idTecnico)
      );
      setSuccess(
        tecnico
          ? `Tecnico ${tecnico.nombre || tecnico.username} asignado a la orden #${id}.`
          : `Tecnico retirado de la orden #${id}.`
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo asignar el tecnico.");
    } finally {
      setAsignandoTecnicoOrdenId(null);
    }
  };

  const imprimirOrden = async (orden, printWindow = null) => {
    try {
      setImprimiendoOrdenId(orden.id_reparacion_orden);
      setError("");
      const targetWindow =
        printWindow ||
        openPrintWindow({
          title: `Orden de reparacion #${orden.id_reparacion_orden}`,
          width: 1024,
          height: 920,
        });

      openPrintDocument({
        title: `Orden de reparacion #${orden.id_reparacion_orden}`,
        html: buildReparacionTicketHtml(orden),
        width: 1024,
        height: 920,
        printWindow: targetWindow,
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo imprimir la orden de reparacion.");
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
    } finally {
      setImprimiendoOrdenId(null);
    }
  };

  const productoOrdenSeleccionado =
    productos.find((item) => item.id_producto === Number(productoOrdenForm.id_producto)) || null;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Paper
          elevation={0}
          sx={(currentTheme) => ({
            ...getSummaryCardSx(currentTheme, "secondary", { minHeight: 0 }),
            mb: 0,
          })}
        >
          <Stack spacing={1.5}>
            <Typography
              variant="overline"
              color="secondary.main"
              sx={{ fontWeight: 800, letterSpacing: "0.16em" }}
            >
              Taller mecanico
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              Servicios - Reparacion
            </Typography>
            <Typography color="text.secondary">
              Gestiona servicios de taller, diagnostico, cobro y seguimiento de reparaciones con una vista mas clara para trabajo y repuestos.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Chip
                color={cajaActiva?.id_caja_sesion ? "success" : "default"}
                label={cajaActiva?.id_caja_sesion ? "Caja abierta" : "Caja cerrada"}
                sx={{ fontWeight: 700 }}
              />
              {cajaActiva?.id_caja_sesion && (
                <Chip
                  variant="outlined"
                  color="primary"
                  label={`Sesion #${cajaActiva.id_caja_sesion}`}
                  sx={{ fontWeight: 700 }}
                />
              )}
              <Chip color="info" variant="outlined" label={`${ordenes.length} ordenes`} sx={{ fontWeight: 700 }} />
            </Stack>
          </Stack>
        </Paper>

        {isReadOnly && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Estas en modo solo lectura. Puedes consultar catalogo, repuestos usados y ordenes de reparacion, pero no crear ordenes, registrar cobros ni actualizar trabajos.
          </Alert>
        )}

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        {loading ? (
          <Paper
            sx={(currentTheme) => ({
              ...getSectionPanelSx(currentTheme, { p: 6, radius: 4, accent: "secondary" }),
            })}
          >
            <Stack spacing={2} alignItems="center">
              <CircularProgress />
              <Typography color="text.secondary">Cargando taller mecanico...</Typography>
            </Stack>
          </Paper>
        ) : (
          <>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, minmax(0, 1fr))",
                },
              }}
            >
              <Paper
                variant="outlined"
                sx={(currentTheme) =>
                  getSummaryCardSx(currentTheme, "info", {
                    compact: true,
                    minHeight: 136,
                  })
                }
              >
                <Typography variant="body2" color="text.secondary">
                  Tipos de vehiculo
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {vehiculos.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Registrados en reparacion
                </Typography>
              </Paper>

              <Paper
                variant="outlined"
                sx={(currentTheme) =>
                  getSummaryCardSx(currentTheme, "secondary", {
                    compact: true,
                    minHeight: 136,
                  })
                }
              >
                <Typography variant="body2" color="text.secondary">
                  Servicios mecanicos
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {servicios.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Catalogo total del modulo
                </Typography>
              </Paper>

              <Paper
                variant="outlined"
                sx={(currentTheme) =>
                  getSummaryCardSx(currentTheme, "success", {
                    compact: true,
                    minHeight: 136,
                  })
                }
              >
                <Typography variant="body2" color="text.secondary">
                  Servicios del vehiculo
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {serviciosFiltrados.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {vehiculos.find((item) => item.id_tipo_vehiculo === vehiculoId)?.nombre ||
                    "Sin vehiculo seleccionado"}
                </Typography>
              </Paper>
            </Box>

            <Paper
              sx={(currentTheme) =>
                getSectionPanelSx(currentTheme, { p: 3, radius: 4, accent: "info" })
              }
            >
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} mb={3}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">Tipo de vehiculo</Typography>
                  <Typography variant="body2" color="text.secondary">Selecciona el vehiculo que ingresa al taller.</Typography>
                </Box>
                {canManageCatalog && (
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setVehiculoModalOpen(true)}
                  >
                    Agregar vehiculo
                  </Button>
                )}
              </Stack>

              <Grid container spacing={2}>
                {vehiculos.map((vehiculo) => {
                  const Icon = VEHICLE_ICON_MAP[vehiculo.icono] || DirectionsCarIcon;
                  const selected = vehiculo.id_tipo_vehiculo === vehiculoId;
                  return (
                    <Grid item xs={12} sm={6} lg={4} key={vehiculo.id_tipo_vehiculo}>
                      <Paper
                        onClick={() => seleccionarVehiculo(vehiculo.id_tipo_vehiculo)}
                        variant="outlined"
                        sx={{ p: 2.5, borderRadius: 3, cursor: "pointer", borderColor: selected ? "primary.main" : "divider" }}
                      >
                        <Stack spacing={2}>
                          <Icon color="primary" sx={{ fontSize: 42 }} />
                          <Typography variant="h6" fontWeight="bold">{vehiculo.nombre}</Typography>
                          <Typography variant="body2" color="text.secondary">{vehiculo.descripcion}</Typography>
                          <Chip label={selected ? "Seleccionado" : "Elegir"} color={selected ? "primary" : "default"} sx={{ alignSelf: "flex-start" }} />
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 4, display: "none" }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Catalogo por vehiculo
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Revisa cuantos servicios mecanicos tiene cada vehiculo y agrega nuevos desde aqui.
                  </Typography>
                </Box>

                <Box sx={{ display: "grid", gap: 1.5 }}>
                  {vehiculos.map((vehiculo) => {
                    const totalServiciosVehiculo = servicios.filter(
                      (servicio) => servicio.id_tipo_vehiculo === vehiculo.id_tipo_vehiculo
                    ).length;
                    const seleccionado = vehiculo.id_tipo_vehiculo === vehiculoId;

                    return (
                      <Paper
                        key={`catalogo-${vehiculo.id_tipo_vehiculo}`}
                        variant="outlined"
                        sx={{ p: 2, borderRadius: 3 }}
                      >
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={1.5}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", md: "center" }}
                        >
                          <Box>
                            <Typography fontWeight="bold">{vehiculo.nombre}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {vehiculo.descripcion || "Sin descripcion"}
                            </Typography>
                          </Box>

                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            <Chip
                              label={`${totalServiciosVehiculo} servicio(s)`}
                              color="primary"
                              variant="outlined"
                            />
                            {seleccionado && <Chip label="Seleccionado" color="success" />}
                            <Button
                              size="small"
                              variant={seleccionado ? "contained" : "outlined"}
                              onClick={() => seleccionarVehiculo(vehiculo.id_tipo_vehiculo)}
                            >
                              Ver servicios
                            </Button>
                            {canManageCatalog && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() => abrirModalServicioNuevo(vehiculo.id_tipo_vehiculo)}
                              >
                                Nuevo servicio
                              </Button>
                            )}
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Box>
              </Stack>
            </Paper>

            <Grid container spacing={3}>
              <Grid item xs={12} lg={7}>
                <Paper
                  sx={(currentTheme) => ({
                    ...getSectionPanelSx(currentTheme, { p: 3, radius: 4, accent: "secondary" }),
                    height: "100%",
                  })}
                >
                  <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} mb={3}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">Servicio mecanico</Typography>
                      <Typography variant="body2" color="text.secondary">Elige el trabajo a realizar.</Typography>
                    </Box>
                    {canManageCatalog && (
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => abrirModalServicioNuevo()}
                        >
                          Agregar servicio
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => {
                            if (!servicioSeleccionado) return;
                            setEditingServicioId(servicioSeleccionado.id_servicio_catalogo);
                            setServicioForm({
                              id_tipo_vehiculo: String(servicioSeleccionado.id_tipo_vehiculo),
                              nombre: servicioSeleccionado.nombre,
                              descripcion: servicioSeleccionado.descripcion || "",
                              precio_base: String(servicioSeleccionado.precio_base || ""),
                              duracion_minutos: String(servicioSeleccionado.duracion_minutos || ""),
                              icono: servicioSeleccionado.icono || "build",
                            });
                            setServicioModalOpen(true);
                          }}
                          disabled={!servicioSeleccionado}
                        >
                          Editar servicio
                        </Button>
                      </Stack>
                    )}
                  </Stack>

                  <Stack spacing={2}>
                    {serviciosFiltrados.map((servicio) => {
                      const Icon = SERVICE_ICON_MAP[servicio.icono] || BuildIcon;
                      const selected = servicio.id_servicio_catalogo === servicioId;
                      return (
                        <Paper key={servicio.id_servicio_catalogo} variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: selected ? "primary.main" : "divider" }}>
                          <Stack direction="row" spacing={2} alignItems="flex-start">
                            <Icon color="primary" />
                            <Box sx={{ flexGrow: 1 }}>
                              <Stack direction="row" justifyContent="space-between" spacing={1}>
                                <Typography fontWeight="bold">{servicio.nombre}</Typography>
                                {canManageCatalog && (
                                  <Button
                                    size="small"
                                    sx={{ display: "inline-flex" }}
                                    onClick={() => {
                                      setEditingServicioId(servicio.id_servicio_catalogo);
                                      setServicioForm({
                                        id_tipo_vehiculo: String(servicio.id_tipo_vehiculo),
                                        nombre: servicio.nombre,
                                        descripcion: servicio.descripcion || "",
                                        precio_base: String(servicio.precio_base || ""),
                                        duracion_minutos: String(servicio.duracion_minutos || ""),
                                        icono: servicio.icono || "build",
                                      });
                                      setServicioModalOpen(true);
                                    }}
                                  >
                                    Editar
                                  </Button>
                                )}
                              </Stack>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {servicio.descripcion}
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip label={`Q ${Number(servicio.precio_base || 0).toFixed(2)}`} color="primary" variant={selected ? "filled" : "outlined"} />
                                <Chip label={`${servicio.duracion_minutos || 0} min`} variant="outlined" />
                              </Stack>
                              <Button size="small" sx={{ mt: 1 }} onClick={() => seleccionarServicio(servicio.id_servicio_catalogo)}>
                                {selected ? "Seleccionado" : "Seleccionar"}
                              </Button>
                            </Box>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>

                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mt: 3 }}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      spacing={2}
                      mb={2}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          Repuestos y productos
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Agrega aqui los productos que se usaran en el trabajo y decide si tambien se cobraran.
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={abrirProductoBorradorModal}
                        disabled={!canOperateReparacion || productos.length === 0}
                      >
                        Agregar producto
                      </Button>
                    </Stack>

                    {productosSeleccionados.length === 0 ? (
                      <Alert severity="info">
                        No has agregado repuestos a esta orden todavia.
                      </Alert>
                    ) : (
                      <Stack spacing={1.5}>
                        {productosSeleccionados.map((producto, index) => (
                          <Paper key={`${producto.id_producto}-${index}`} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                            <Stack
                              direction={{ xs: "column", md: "row" }}
                              justifyContent="space-between"
                              spacing={1}
                            >
                              <Box>
                                <Typography fontWeight="bold">{producto.nombre}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Codigo: {producto.codigo_barras || "Sin codigo"} | Cantidad: {producto.cantidad} | Stock ref.: {producto.stock}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                <Chip
                                  size="small"
                                  label={`Q ${Number(producto.precio_unitario || 0).toFixed(2)}`}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  label={
                                    producto.cobra_al_cliente
                                      ? `Se cobra Q ${Number(producto.subtotal || 0).toFixed(2)}`
                                      : "Uso interno"
                                  }
                                  color={producto.cobra_al_cliente ? "success" : "default"}
                                />
                                <Button
                                  size="small"
                                  color="error"
                                  startIcon={<DeleteOutlineIcon />}
                                  onClick={() => eliminarProductoBorrador(index)}
                                  disabled={!canOperateReparacion}
                                >
                                  Quitar
                                </Button>
                              </Stack>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Paper>
              </Grid>

              <Grid item xs={12} lg={5}>
                <Paper
                  sx={(currentTheme) => ({
                    ...getSectionPanelSx(
                      currentTheme,
                      {
                        p: 3,
                        radius: 4,
                        accent: noCobroForm.enabled ? "warning" : "primary",
                      }
                    ),
                    height: "100%",
                  })}
                >
                  <Stack spacing={2}>
                    <Typography variant="h6" fontWeight="bold">Cobro y recepcion</Typography>
                    {canOperateReparacion ? (
                      <>
                        {!cajaActiva && <Alert severity="warning">Debes abrir una caja antes de cobrar reparaciones.</Alert>}
                        <TextField label="Cliente" value={cobroForm.nombre_cliente} onChange={(e) => setCobroForm((p) => ({ ...p, nombre_cliente: e.target.value }))} fullWidth />
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField label="Placa" value={cobroForm.placa} onChange={(e) => setCobroForm((p) => ({ ...p, placa: e.target.value }))} fullWidth />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField label="Color" value={cobroForm.color} onChange={(e) => setCobroForm((p) => ({ ...p, color: e.target.value }))} fullWidth />
                          </Grid>
                        </Grid>
                        <TextField label="Kilometraje" type="number" value={cobroForm.kilometraje} onChange={(e) => setCobroForm((p) => ({ ...p, kilometraje: e.target.value }))} fullWidth />
                        <TextField label="Diagnostico inicial" value={cobroForm.diagnostico_inicial} onChange={(e) => setCobroForm((p) => ({ ...p, diagnostico_inicial: e.target.value }))} multiline minRows={3} fullWidth />
                        <TextField label="Observaciones" value={cobroForm.observaciones} onChange={(e) => setCobroForm((p) => ({ ...p, observaciones: e.target.value }))} multiline minRows={2} fullWidth />
                        <FormControl fullWidth>
                          <InputLabel>Metodo de pago</InputLabel>
                          <Select
                            label="Metodo de pago"
                            value={cobroForm.metodo_pago}
                            onChange={(e) =>
                              setCobroForm((prev) => ({
                                ...prev,
                                metodo_pago: e.target.value,
                                monto_recibido:
                                  e.target.value === "EFECTIVO"
                                    ? String(totalOrden.toFixed(2))
                                    : "",
                              }))
                            }
                          >
                            <MenuItem value="EFECTIVO">EFECTIVO</MenuItem>
                            <MenuItem value="TARJETA">TARJETA</MenuItem>
                            <MenuItem value="TRANSFERENCIA">TRANSFERENCIA</MenuItem>
                          </Select>
                        </FormControl>
                        <Paper
                          variant="outlined"
                          sx={(currentTheme) =>
                            getSummaryCardSx(currentTheme, "primary", {
                              compact: true,
                              minHeight: 126,
                            })
                          }
                        >
                          <Stack spacing={0.5}>
                            <Typography variant="body2" color="text.secondary">
                              Servicio base: Q {Number(precioServicioActual || 0).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Repuestos cobrables: Q {Number(totalProductosCobrados || 0).toFixed(2)}
                            </Typography>
                            <Typography variant="h5" fontWeight="bold" color="primary.main">
                              Total a cobrar: Q {Number(totalOrden || 0).toFixed(2)}
                            </Typography>
                          </Stack>
                        </Paper>
                        {servicioPersonalizadoSeleccionado && (
                          <TextField
                            label="Precio variable del trabajo"
                            type="number"
                            value={cobroForm.precio_servicio}
                            onChange={(e) =>
                              setCobroForm((p) => ({
                                ...p,
                                precio_servicio: e.target.value,
                                monto_recibido:
                                  p.metodo_pago === "EFECTIVO"
                                    ? String(
                                        Number(
                                          (Number(e.target.value || 0) + totalProductosCobrados).toFixed(2)
                                        )
                                      )
                                    : p.monto_recibido,
                              }))
                            }
                            fullWidth
                            inputProps={{ min: 0, step: "0.01" }}
                            helperText="Ingresa el precio personalizado del trabajo mecanico."
                          />
                        )}
                        <NoCobroAuthorizationFields
                          enabled={noCobroForm.enabled}
                          onToggle={(checked) =>
                            setNoCobroForm((prev) => ({ ...prev, enabled: checked }))
                          }
                          form={noCobroForm}
                          onChange={(field, value) =>
                            setNoCobroForm((prev) => ({ ...prev, [field]: value }))
                          }
                          title="Registrar orden sin cobro"
                          helperText="La reparacion se registrara como no cobrada y quedara pendiente de validacion al cierre de caja por un admin."
                        />
                        {cobroForm.metodo_pago === "EFECTIVO" && !noCobroForm.enabled && (
                          <TextField
                            label="Monto recibido"
                            type="number"
                            value={cobroForm.monto_recibido}
                            onChange={(e) => setCobroForm((p) => ({ ...p, monto_recibido: e.target.value }))}
                            fullWidth
                            helperText={faltante > 0 ? `Faltan Q ${faltante.toFixed(2)}` : `Vuelto Q ${vuelto.toFixed(2)}`}
                            error={faltante > 0 && totalOrden > 0}
                          />
                        )}
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={autoPrintOrdenNueva}
                              onChange={(event) =>
                                setAutoPrintOrdenNueva(event.target.checked)
                              }
                            />
                          }
                          label="Imprimir ticket al cobrar"
                        />
                        <Button
                          variant="contained"
                          color="success"
                          onClick={crearOrden}
                          disabled={
                            !cajaActiva ||
                            !vehiculoId ||
                            !servicioId ||
                            (servicioPersonalizadoSeleccionado && precioServicioActual <= 0) ||
                            saving ||
                            (!noCobroForm.enabled &&
                              cobroForm.metodo_pago === "EFECTIVO" &&
                              faltante > 0) ||
                            (noCobroForm.enabled && !String(noCobroForm.motivo || "").trim())
                          }
                        >
                          {saving
                            ? "Procesando..."
                            : noCobroForm.enabled
                              ? "Registrar orden sin cobro"
                              : "Crear orden y cobrar"}
                        </Button>
                      </>
                    ) : (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        Modo solo lectura: puedes revisar el diagnostico, repuestos y ordenes de reparacion, pero no crear ordenes ni registrar cobros.
                      </Alert>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            <Paper
              sx={(currentTheme) =>
                getSectionPanelSx(currentTheme, { p: 3, radius: 4, accent: "secondary" })
              }
            >
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} mb={3}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">Ordenes de reparacion</Typography>
                  <Typography variant="body2" color="text.secondary">Seguimiento del taller por estado.</Typography>
                </Box>
                <FormControl sx={{ minWidth: { xs: "100%", md: 220 } }}>
                  <InputLabel>Estado</InputLabel>
                  <Select value={estadoFiltro} label="Estado" onChange={(e) => { setEstadoFiltro(e.target.value); cargarOrdenes(e.target.value); }}>
                    <MenuItem value="TODOS">Todos</MenuItem>
                    {ESTADOS.map((estado) => (
                      <MenuItem key={estado} value={estado}>{estado.replaceAll("_", " ")}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Alert severity="info" sx={{ mb: 3 }}>
                Las ordenes nuevas ya pueden incluir repuestos desde arriba. En ordenes ya pagadas, cualquier producto extra solo se permite como uso interno.
              </Alert>

              {loadingOrdenes ? (
                <Stack spacing={2} alignItems="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} />
                  <Typography color="text.secondary">Cargando ordenes...</Typography>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  {ordenes.length === 0 ? (
                    <Alert severity="info">
                      No hay ordenes para el filtro seleccionado. Primero crea y cobra una orden mecanica para luego agregarle productos o repuestos.
                    </Alert>
                  ) : (
                    ordenes.map((orden) => (
                      <Paper
                        key={orden.id_reparacion_orden}
                        variant="outlined"
                        sx={(currentTheme) => ({
                          ...getSummaryCardSx(currentTheme, "neutral", {
                            compact: true,
                            minHeight: 0,
                          }),
                          p: 2,
                          borderRadius: 3,
                        })}
                      >
                        <Stack spacing={1.5}>
                          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
                            <Box>
                              <Typography fontWeight="bold">Orden #{orden.id_reparacion_orden} - {orden.servicio_nombre}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {orden.tipo_vehiculo_nombre} | Cliente: {orden.nombre_cliente || "Consumidor final"} | Placa: {orden.placa || "Sin placa"}
                              </Typography>
                            </Box>
                            <Chip label={String(orden.estado_trabajo || "").replaceAll("_", " ")} color={getEstadoColor(orden.estado_trabajo)} />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            Diagnostico inicial: {orden.diagnostico_inicial || "Sin diagnostico"} | Km: {orden.kilometraje || "N/D"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total orden: Q {Number(orden.monto_cobrado || 0).toFixed(2)} | Estado de cobro: {orden.estado} | Registro: {formatDateTime(orden.fecha)}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip
                              size="small"
                              label={`Tecnico ${orden.tecnico_nombre || orden.tecnico_username || "Sin asignar"}`}
                              color={orden.id_tecnico_asignado ? "secondary" : "default"}
                              variant="outlined"
                            />
                            {orden.tecnico_asignado_en && (
                              <Chip
                                size="small"
                                label={`Asignado ${formatDateTime(orden.tecnico_asignado_en)}`}
                                variant="outlined"
                              />
                            )}
                          </Stack>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Stack spacing={1.5}>
                              <Stack
                                direction={{ xs: "column", md: "row" }}
                                spacing={1}
                                justifyContent="space-between"
                                alignItems={{ xs: "flex-start", md: "center" }}
                              >
                                <Box>
                                  <Typography variant="subtitle2" fontWeight="bold">
                                    Repuestos y materiales
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Descuenta inventario y define si el repuesto se cobra al cliente.
                                  </Typography>
                                </Box>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<AddIcon />}
                                  onClick={() => abrirModalProductoOrden(orden)}
                                  disabled={
                                    !canOperateReparacion ||
                                    productos.length === 0 ||
                                    orden.estado === "PAGADO"
                                  }
                                >
                                  Agregar producto
                                </Button>
                              </Stack>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip
                                  label={`${Number(orden.productos_cantidad_total || 0)} repuesto(s) usados`}
                                  variant="outlined"
                                />
                                <Chip
                                  label={`Repuestos cobrados Q ${Number(orden.productos_total_cobrado || 0).toFixed(2)}`}
                                  color="primary"
                                  variant="outlined"
                                />
                              </Stack>
                              {orden.estado !== "PAGADO" && (
                                <Button
                                  size="small"
                                  color="success"
                                  variant="contained"
                                  onClick={() => abrirModalCobroOrden(orden)}
                                  disabled={
                                    !canOperateReparacion ||
                                    !cajaActiva ||
                                    orden.estado === "NO_COBRADO"
                                  }
                                >
                                  {orden.estado === "NO_COBRADO" ? "Pendiente de validacion" : "Cobrar orden"}
                                </Button>
                              )}
                            </Stack>
                          </Paper>
                          {!cajaActiva && !["PAGADO", "NO_COBRADO"].includes(orden.estado) && (
                            <Alert severity="warning">
                              Debes abrir una caja para cobrar esta orden.
                            </Alert>
                          )}
                          {orden.estado === "NO_COBRADO" && (
                            <Alert severity="warning">
                              Esta orden quedo registrada sin cobro y debera validarse con un admin antes del cierre de caja.
                            </Alert>
                          )}
                          {Array.isArray(orden.productos_usados) && orden.productos_usados.length > 0 && (
                            <Stack spacing={1}>
                              <Typography variant="subtitle2" fontWeight="bold">
                                Productos usados
                              </Typography>
                              <Stack spacing={1}>
                                {orden.productos_usados.map((producto) => (
                                  <Paper
                                    key={producto.id_reparacion_orden_producto}
                                    variant="outlined"
                                    sx={{ p: 1.5, borderRadius: 2 }}
                                  >
                                    <Stack
                                      direction={{ xs: "column", md: "row" }}
                                      justifyContent="space-between"
                                      spacing={1}
                                    >
                                      <Box>
                                        <Typography fontWeight="bold">
                                          {producto.producto_nombre}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          Codigo: {producto.codigo_barras || "Sin codigo"} | Cantidad: {producto.cantidad}
                                        </Typography>
                                      </Box>
                                      <Stack direction="row" spacing={1} flexWrap="wrap">
                                        <Chip
                                          size="small"
                                          label={`Precio Q ${Number(producto.precio_unitario || 0).toFixed(2)}`}
                                          variant="outlined"
                                        />
                                        <Chip
                                          size="small"
                                          label={
                                            producto.cobra_al_cliente
                                              ? `Cobrado Q ${Number(producto.subtotal_cobrado || 0).toFixed(2)}`
                                              : "Uso interno"
                                          }
                                          color={producto.cobra_al_cliente ? "success" : "default"}
                                        />
                                      </Stack>
                                    </Stack>
                                  </Paper>
                                ))}
                              </Stack>
                            </Stack>
                          )}
                          {canManageOrders && (
                            <>
                              <FormControl fullWidth>
                                <InputLabel>Asignar tecnico</InputLabel>
                                <Select
                                  value={orden.id_tecnico_asignado ? String(orden.id_tecnico_asignado) : ""}
                                  label="Asignar tecnico"
                                  onChange={(e) => asignarTecnico(orden.id_reparacion_orden, e.target.value)}
                                  disabled={asignandoTecnicoOrdenId === orden.id_reparacion_orden}
                                >
                                  <MenuItem value="">
                                    <em>Sin asignar</em>
                                  </MenuItem>
                                  {tecnicos.map((tecnico) => (
                                    <MenuItem key={tecnico.id_usuario} value={String(tecnico.id_usuario)}>
                                      {(tecnico.nombre || tecnico.username) +
                                        (Array.isArray(tecnico.roles) && tecnico.roles.length
                                          ? ` | ${tecnico.roles.join(", ")}`
                                          : "")}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>

                              <FormControl fullWidth>
                                <InputLabel>Cambiar estado</InputLabel>
                                <Select
                                  value={orden.estado_trabajo}
                                  label="Cambiar estado"
                                  onChange={(e) => cambiarEstado(orden.id_reparacion_orden, e.target.value)}
                                  disabled={actualizandoOrdenId === orden.id_reparacion_orden}
                                >
                                  {getSiguientesEstadosReparacion(orden.estado_trabajo).map((estado) => (
                                    <MenuItem key={estado} value={estado}>{estado.replaceAll("_", " ")}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </>
                          )}

                          <Button
                            variant="outlined"
                            startIcon={<LocalPrintshopIcon />}
                            onClick={() => imprimirOrden(orden)}
                            disabled={imprimiendoOrdenId === orden.id_reparacion_orden}
                            sx={{ alignSelf: "flex-start", borderRadius: 999 }}
                          >
                            {imprimiendoOrdenId === orden.id_reparacion_orden
                              ? "Preparando ticket..."
                              : "Imprimir ticket"}
                          </Button>
                        </Stack>
                      </Paper>
                    ))
                  )}
                </Stack>
              )}
            </Paper>
          </>
        )}
      </Stack>

      <Dialog open={vehiculoModalOpen} onClose={() => !saving && setVehiculoModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Agregar tipo de vehiculo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Nombre" value={vehiculoForm.nombre} onChange={(e) => setVehiculoForm((p) => ({ ...p, nombre: e.target.value }))} fullWidth />
            <TextField label="Descripcion" value={vehiculoForm.descripcion} onChange={(e) => setVehiculoForm((p) => ({ ...p, descripcion: e.target.value }))} multiline minRows={3} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Icono</InputLabel>
              <Select value={vehiculoForm.icono} label="Icono" onChange={(e) => setVehiculoForm((p) => ({ ...p, icono: e.target.value }))}>
                {VEHICLE_ICON_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !saving && setVehiculoModalOpen(false)}>Cancelar</Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => guardarVehiculo({ keepOpen: true })}
            disabled={!vehiculoForm.nombre.trim() || saving}
          >
            Guardar y agregar otro
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={() => guardarVehiculo()} disabled={!vehiculoForm.nombre.trim() || saving}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={servicioModalOpen} onClose={() => !saving && setServicioModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingServicioId ? "Editar servicio" : "Agregar servicio"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Tipo de vehiculo</InputLabel>
              <Select value={servicioForm.id_tipo_vehiculo} label="Tipo de vehiculo" onChange={(e) => setServicioForm((p) => ({ ...p, id_tipo_vehiculo: e.target.value }))}>
                {vehiculos.map((vehiculo) => (
                  <MenuItem key={vehiculo.id_tipo_vehiculo} value={String(vehiculo.id_tipo_vehiculo)}>{vehiculo.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Nombre del servicio" value={servicioForm.nombre} onChange={(e) => setServicioForm((p) => ({ ...p, nombre: e.target.value }))} fullWidth />
            <TextField label="Descripcion" value={servicioForm.descripcion} onChange={(e) => setServicioForm((p) => ({ ...p, descripcion: e.target.value }))} multiline minRows={3} fullWidth />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Precio" type="number" value={servicioForm.precio_base} onChange={(e) => setServicioForm((p) => ({ ...p, precio_base: e.target.value }))} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Tiempo (min)" type="number" value={servicioForm.duracion_minutos} onChange={(e) => setServicioForm((p) => ({ ...p, duracion_minutos: e.target.value }))} fullWidth />
              </Grid>
            </Grid>
            <FormControl fullWidth>
              <InputLabel>Icono</InputLabel>
              <Select value={servicioForm.icono} label="Icono" onChange={(e) => setServicioForm((p) => ({ ...p, icono: e.target.value }))}>
                {SERVICE_ICON_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !saving && setServicioModalOpen(false)}>Cancelar</Button>
          {!editingServicioId && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => guardarServicio({ keepOpen: true })}
              disabled={!servicioForm.id_tipo_vehiculo || !servicioForm.nombre.trim() || !servicioForm.precio_base || !servicioForm.duracion_minutos || saving}
            >
              Guardar y agregar otro
            </Button>
          )}
          <Button variant="contained" startIcon={<SaveIcon />} onClick={() => guardarServicio()} disabled={!servicioForm.id_tipo_vehiculo || !servicioForm.nombre.trim() || !servicioForm.precio_base || !servicioForm.duracion_minutos || saving}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={productoBorradorModalOpen}
        onClose={() => !saving && setProductoBorradorModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Agregar producto al trabajo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Este producto se agregara a la orden antes de crearla y se descontara del stock al confirmar el cobro.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Producto</InputLabel>
              <Select
                value={productoBorradorForm.id_producto}
                label="Producto"
                onChange={(e) =>
                  setProductoBorradorForm((prev) => ({
                    ...prev,
                    id_producto: e.target.value,
                  }))
                }
              >
                {productos.map((producto) => (
                  <MenuItem key={producto.id_producto} value={String(producto.id_producto)}>
                    {producto.nombre} | Stock: {Number(producto.stock || 0)} | Q {Number(producto.precio_venta || 0).toFixed(2)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Cantidad"
              type="number"
              value={productoBorradorForm.cantidad}
              onChange={(e) =>
                setProductoBorradorForm((prev) => ({
                  ...prev,
                  cantidad: e.target.value,
                }))
              }
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={productoBorradorForm.cobra_al_cliente}
                  onChange={(e) =>
                    setProductoBorradorForm((prev) => ({
                      ...prev,
                      cobra_al_cliente: e.target.checked,
                    }))
                  }
                />
              }
              label="Cobrar este producto al cliente"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !saving && setProductoBorradorModalOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={guardarProductoBorrador}
            disabled={
              !productoBorradorForm.id_producto ||
              !Number(productoBorradorForm.cantidad) ||
              Number(productoBorradorForm.cantidad) <= 0
            }
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={productoOrdenModalOpen}
        onClose={() => !saving && setProductoOrdenModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Agregar producto a orden
          {ordenProductoActiva ? ` #${ordenProductoActiva.id_reparacion_orden}` : ""}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Descuenta inventario al instante. Si marcas cobro al cliente, el total de la orden y caja se actualizan con ese repuesto.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Producto</InputLabel>
              <Select
                value={productoOrdenForm.id_producto}
                label="Producto"
                onChange={(e) =>
                  setProductoOrdenForm((prev) => ({
                    ...prev,
                    id_producto: e.target.value,
                  }))
                }
              >
                {productos.map((producto) => (
                  <MenuItem key={producto.id_producto} value={String(producto.id_producto)}>
                    {producto.nombre} | Stock: {Number(producto.stock || 0)} | Q {Number(producto.precio_venta || 0).toFixed(2)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Cantidad"
              type="number"
              value={productoOrdenForm.cantidad}
              onChange={(e) =>
                setProductoOrdenForm((prev) => ({
                  ...prev,
                  cantidad: e.target.value,
                }))
              }
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={productoOrdenForm.cobra_al_cliente}
                  onChange={(e) =>
                    setProductoOrdenForm((prev) => ({
                      ...prev,
                      cobra_al_cliente: e.target.checked,
                    }))
                  }
                />
              }
              label="Cobrar este producto al cliente"
            />
            {productoOrdenSeleccionado && (
              <Alert severity={productoOrdenForm.cobra_al_cliente ? "info" : "warning"}>
                {productoOrdenForm.cobra_al_cliente
                  ? `Se sumara al cobro Q ${(
                      Number(productoOrdenSeleccionado.precio_venta || 0) *
                      Number(productoOrdenForm.cantidad || 0)
                    ).toFixed(2)}`
                  : "Se descontara del stock, pero no se sumara al cobro del cliente."}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <FormControlLabel
            sx={{ mr: "auto" }}
            control={
              <Checkbox
                checked={autoPrintCobroOrden}
                onChange={(event) =>
                  setAutoPrintCobroOrden(event.target.checked)
                }
              />
            }
            label="Imprimir ticket al registrar cobro"
          />
          <Button
            onClick={() => {
              if (saving) return;
              setProductoOrdenModalOpen(false);
              setOrdenProductoActiva(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={guardarProductoOrden}
            disabled={
              !productoOrdenForm.id_producto ||
              !Number(productoOrdenForm.cantidad) ||
              Number(productoOrdenForm.cantidad) <= 0 ||
              saving
            }
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={pagoOrdenModalOpen}
        onClose={() => {
          if (saving) return;
          setPagoOrdenModalOpen(false);
          setOrdenPagoActiva(null);
          setNoCobroPagoForm(EMPTY_NO_COBRO_FORM);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Cobrar orden
          {ordenPagoActiva ? ` #${ordenPagoActiva.id_reparacion_orden}` : ""}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {!cajaActiva && (
              <Alert severity="warning">
                Debes abrir una caja antes de registrar el cobro.
              </Alert>
            )}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Total a cobrar
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                Q {Number(ordenPagoActiva?.monto_cobrado || 0).toFixed(2)}
              </Typography>
            </Paper>
            <FormControl fullWidth>
              <InputLabel>Metodo de pago</InputLabel>
              <Select
                value={pagoForm.metodo_pago}
                label="Metodo de pago"
                onChange={(e) =>
                  setPagoForm((prev) => ({
                    ...prev,
                    metodo_pago: e.target.value,
                    monto_recibido:
                      e.target.value === "EFECTIVO"
                        ? String(Number(ordenPagoActiva?.monto_cobrado || 0).toFixed(2))
                        : "",
                  }))
                }
              >
                <MenuItem value="EFECTIVO">EFECTIVO</MenuItem>
                <MenuItem value="TARJETA">TARJETA</MenuItem>
                <MenuItem value="TRANSFERENCIA">TRANSFERENCIA</MenuItem>
              </Select>
            </FormControl>
            <NoCobroAuthorizationFields
              enabled={noCobroPagoForm.enabled}
              onToggle={(checked) =>
                setNoCobroPagoForm((prev) => ({ ...prev, enabled: checked }))
              }
              form={noCobroPagoForm}
              onChange={(field, value) =>
                setNoCobroPagoForm((prev) => ({ ...prev, [field]: value }))
              }
              title="Registrar orden sin cobro"
              helperText="La orden quedara como no cobrada y debera validarse por un admin antes de cerrar la caja."
            />
            {pagoForm.metodo_pago === "EFECTIVO" && !noCobroPagoForm.enabled && (
              <TextField
                label="Monto recibido"
                type="number"
                value={pagoForm.monto_recibido}
                onChange={(e) =>
                  setPagoForm((prev) => ({
                    ...prev,
                    monto_recibido: e.target.value,
                  }))
                }
                fullWidth
                helperText={
                  faltante > 0
                    ? `Faltan Q ${faltante.toFixed(2)}`
                    : `Vuelto Q ${vuelto.toFixed(2)}`
                }
                error={faltante > 0 && montoCobrado > 0}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (saving) return;
              setPagoOrdenModalOpen(false);
              setOrdenPagoActiva(null);
              setNoCobroPagoForm(EMPTY_NO_COBRO_FORM);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={guardarCobroOrden}
            disabled={
              !cajaActiva ||
              saving ||
              (!noCobroPagoForm.enabled &&
                pagoForm.metodo_pago === "EFECTIVO" &&
                faltante > 0) ||
              (noCobroPagoForm.enabled && !String(noCobroPagoForm.motivo || "").trim())
            }
          >
            {noCobroPagoForm.enabled ? "Registrar sin cobro" : "Registrar cobro"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

function getEstadoColor(estado) {
  switch (estado) {
    case "RECIBIDO":
      return "info";
    case "DIAGNOSTICO":
      return "warning";
    case "EN_REPARACION":
      return "primary";
    case "PRUEBAS":
      return "secondary";
    case "LISTO":
      return "success";
    default:
      return "default";
  }
}

export default CarWashReparacion;
