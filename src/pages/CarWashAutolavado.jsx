import { useCallback, useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import AirportShuttleIcon from "@mui/icons-material/AirportShuttle";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import LocalTaxiIcon from "@mui/icons-material/LocalTaxi";
import ElectricRickshawIcon from "@mui/icons-material/ElectricRickshaw";
import MopedIcon from "@mui/icons-material/Moped";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import AirlineSeatReclineExtraIcon from "@mui/icons-material/AirlineSeatReclineExtra";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SaveIcon from "@mui/icons-material/Save";
import PaidIcon from "@mui/icons-material/Paid";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";
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
  IconButton,
  InputLabel,
  Divider,
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
  buildAutolavadoTicketHtml,
  openPrintWindow,
  openPrintDocument,
} from "../utils/printDocuments";
import {
  getSectionPanelSx,
  getSummaryCardSx,
} from "../utils/summaryCardStyles";
import NoCobroAuthorizationFields from "../components/ui/NoCobroAuthorizationFields";
import { getCajaSesionActiva } from "../services/cajaService";
import {
  actualizarEstadoOrdenAutolavado,
  asignarTecnicoOrdenAutolavado,
  cobrarServicioAutolavado,
  crearServicioAutolavado,
  crearTipoVehiculoAutolavado,
  editarServicioAutolavado,
  getAutolavadoCatalogo,
  getOrdenesAutolavado,
  getTecnicosServicio,
} from "../services/servicioService";

const VEHICLE_ICON_MAP = {
  two_wheeler: TwoWheelerIcon,
  directions_car: DirectionsCarIcon,
  airport_shuttle: AirportShuttleIcon,
  local_shipping: LocalShippingIcon,
  directions_bus: DirectionsBusIcon,
  local_taxi: LocalTaxiIcon,
  electric_rickshaw: ElectricRickshawIcon,
  moped: MopedIcon,
};

const SERVICE_ICON_MAP = {
  cleaning_services: CleaningServicesIcon,
  auto_awesome: AutoAwesomeIcon,
  workspace_premium: WorkspacePremiumIcon,
  airline_seat_recline_extra: AirlineSeatReclineExtraIcon,
};

const VEHICLE_ICON_OPTIONS = [
  { value: "two_wheeler", label: "Moto" },
  { value: "directions_car", label: "Carro" },
  { value: "airport_shuttle", label: "Pickup" },
  { value: "local_shipping", label: "Camion" },
  { value: "directions_bus", label: "Bus" },
  { value: "local_taxi", label: "Taxi" },
  { value: "electric_rickshaw", label: "Tuc tuc" },
  { value: "moped", label: "Moped" },
];

const SERVICE_ICON_OPTIONS = [
  { value: "cleaning_services", label: "Lavado basico" },
  { value: "airline_seat_recline_extra", label: "Aspirado" },
  { value: "workspace_premium", label: "Completo" },
  { value: "auto_awesome", label: "Premium" },
];

const EMPTY_VEHICLE_FORM = {
  nombre: "",
  descripcion: "",
  icono: "directions_car",
};

const EMPTY_SERVICE_FORM = {
  id_tipo_vehiculo: "",
  nombre: "",
  descripcion: "",
  precio_base: "",
  duracion_minutos: "",
  icono: "cleaning_services",
};

const EMPTY_COBRO_FORM = {
  nombre_cliente: "",
  placa: "",
  color: "",
  observaciones: "",
  metodo_pago: "EFECTIVO",
  monto_cobrado: "",
  monto_recibido: "",
};

const EMPTY_NO_COBRO_FORM = {
  enabled: false,
  motivo: "",
};

const ESTADOS_ORDEN_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "RECIBIDO", label: "Recibido" },
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "LAVADO", label: "Lavado" },
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "ENTREGADO", label: "Entregado" },
];

const normalizarCatalogo = (data) => {
  if (data?.data?.vehiculos && data?.data?.servicios) return data.data;
  return { vehiculos: [], servicios: [] };
};

const formatDateTime = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getEstadoOrdenColor = (estado) => {
  switch (estado) {
    case "RECIBIDO":
      return "info";
    case "EN_PROCESO":
      return "warning";
    case "LAVADO":
      return "primary";
    case "FINALIZADO":
      return "success";
    case "ENTREGADO":
      return "default";
    default:
      return "default";
  }
};

const isServicioPersonalizado = (servicio) =>
  String(servicio?.slug || "").trim().toLowerCase() === "otro";

const getSiguientesEstadosAutolavado = (estadoActual) => {
  const flujo = ESTADOS_ORDEN_OPTIONS.filter((option) => option.value !== "TODOS");
  const actual = String(estadoActual || "").trim().toUpperCase();
  const actualIndex = flujo.findIndex((option) => option.value === actual);

  if (actualIndex === -1) return flujo;

  return flujo.filter((_, index) => index === actualIndex || index === actualIndex + 1);
};

function CarWashAutolavado() {
  const { user } = useAuth();
  const [vehiculos, setVehiculos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [vehiculoSeleccionadoId, setVehiculoSeleccionadoId] = useState(null);
  const [servicioSeleccionadoId, setServicioSeleccionadoId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOrdenes, setLoadingOrdenes] = useState(true);
  const [savingVehiculo, setSavingVehiculo] = useState(false);
  const [savingServicio, setSavingServicio] = useState(false);
  const [cobrandoServicio, setCobrandoServicio] = useState(false);
  const [actualizandoOrdenId, setActualizandoOrdenId] = useState(null);
  const [asignandoTecnicoOrdenId, setAsignandoTecnicoOrdenId] = useState(null);
  const [imprimiendoOrdenId, setImprimiendoOrdenId] = useState(null);
  const [autoPrintServicio, setAutoPrintServicio] = useState(() =>
    readPrintPreference(user, "autolavado.autoPrint", true)
  );
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE_FORM);
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE_FORM);
  const [cobroForm, setCobroForm] = useState(EMPTY_COBRO_FORM);
  const [noCobroForm, setNoCobroForm] = useState(EMPTY_NO_COBRO_FORM);
  const [cajaActiva, setCajaActiva] = useState(null);
  const [ordenes, setOrdenes] = useState([]);
  const [estadoFiltroOrdenes, setEstadoFiltroOrdenes] = useState("TODOS");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManageCatalog = useMemo(() => {
    return userHasRole(user, "SUPER_ADMIN", "ADMIN", "ENCARGADO_SERVICIOS");
  }, [user]);

  const canOperateAutolavado = useMemo(() => {
    return userHasRole(user, "SUPER_ADMIN", "ADMIN", "CAJERO", "MECANICO", "ENCARGADO_SERVICIOS");
  }, [user]);

  const canManageOrders = useMemo(() => {
    return userHasRole(user, "SUPER_ADMIN", "ADMIN", "CAJERO", "MECANICO", "ENCARGADO_SERVICIOS");
  }, [user]);

  const isReadOnly = useMemo(() => isReadOnlyUser(user), [user]);

  const cargarOrdenes = useCallback(async (estadoTrabajo = estadoFiltroOrdenes) => {
    try {
      setLoadingOrdenes(true);
      const response = await getOrdenesAutolavado({
        estado_trabajo: estadoTrabajo !== "TODOS" ? estadoTrabajo : undefined,
        limit: 24,
      });
      setOrdenes(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudieron cargar las ordenes de autolavado.");
    } finally {
      setLoadingOrdenes(false);
    }
  }, [estadoFiltroOrdenes]);

  const cargarCatalogo = useCallback(
    async ({ preferredVehiculoId = null, preferredServicioId = null } = {}) => {
      try {
        setLoading(true);
        setError("");

        const [data, cajaResponse, tecnicosResponse] = await Promise.all([
          getAutolavadoCatalogo(),
          getCajaSesionActiva(),
          getTecnicosServicio(),
        ]);
        const catalogo = normalizarCatalogo(data);

        setVehiculos(catalogo.vehiculos);
        setServicios(catalogo.servicios);
        setCajaActiva(cajaResponse?.sesion || null);
        setTecnicos(Array.isArray(tecnicosResponse?.data) ? tecnicosResponse.data : []);

        const nextVehiculoId =
          preferredVehiculoId && catalogo.vehiculos.some((item) => item.id_tipo_vehiculo === preferredVehiculoId)
            ? preferredVehiculoId
            : catalogo.vehiculos[0]?.id_tipo_vehiculo ?? null;

        const serviciosVehiculo = catalogo.servicios.filter(
          (servicio) => servicio.id_tipo_vehiculo === nextVehiculoId
        );

        const nextServicioId =
          preferredServicioId &&
          serviciosVehiculo.some(
            (servicio) => servicio.id_servicio_catalogo === preferredServicioId
          )
            ? preferredServicioId
            : serviciosVehiculo[0]?.id_servicio_catalogo ?? null;

        setVehiculoSeleccionadoId(nextVehiculoId);
        setServicioSeleccionadoId(nextServicioId);
        setCobroForm((prev) => ({
          ...EMPTY_COBRO_FORM,
          metodo_pago: prev.metodo_pago || "EFECTIVO",
          monto_cobrado:
            nextServicioId != null
              ? String(
                  Number(
                    serviciosVehiculo.find(
                      (servicio) => servicio.id_servicio_catalogo === nextServicioId
                    )?.precio_base || 0
                  ).toFixed(2)
                )
              : "",
          monto_recibido:
            nextServicioId != null
              ? String(
                  Number(
                    serviciosVehiculo.find(
                      (servicio) => servicio.id_servicio_catalogo === nextServicioId
                    )?.precio_base || 0
                  ).toFixed(2)
                )
              : "",
        }));
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || "No se pudo cargar el catalogo de autolavado.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  useEffect(() => {
    cargarOrdenes();
  }, [cargarOrdenes]);

  useEffect(() => {
    setAutoPrintServicio(
      readPrintPreference(user, "autolavado.autoPrint", true)
    );
  }, [user]);

  useEffect(() => {
    writePrintPreference(user, "autolavado.autoPrint", autoPrintServicio);
  }, [autoPrintServicio, user]);

  const vehiculoSeleccionado = useMemo(() => {
    return (
      vehiculos.find((vehiculo) => vehiculo.id_tipo_vehiculo === vehiculoSeleccionadoId) || null
    );
  }, [vehiculoSeleccionadoId, vehiculos]);

  const serviciosFiltrados = useMemo(() => {
    return servicios.filter(
      (servicio) => servicio.id_tipo_vehiculo === vehiculoSeleccionadoId
    );
  }, [servicios, vehiculoSeleccionadoId]);

  const servicioSeleccionado = useMemo(() => {
    return (
      serviciosFiltrados.find(
        (servicio) => servicio.id_servicio_catalogo === servicioSeleccionadoId
      ) || null
    );
  }, [servicioSeleccionadoId, serviciosFiltrados]);

  const servicioPersonalizadoSeleccionado = useMemo(
    () => isServicioPersonalizado(servicioSeleccionado),
    [servicioSeleccionado]
  );

  const seleccionarServicio = (servicioId) => {
    setServicioSeleccionadoId(servicioId);
    const servicio = servicios.find((item) => item.id_servicio_catalogo === servicioId);
    const esPersonalizado = isServicioPersonalizado(servicio);

    setCobroForm((prev) => ({
      ...prev,
      monto_cobrado: esPersonalizado
        ? ""
        : servicio?.precio_base != null
          ? String(Number(servicio.precio_base).toFixed(2))
          : prev.monto_cobrado,
      monto_recibido:
        prev.metodo_pago === "EFECTIVO" && esPersonalizado
          ? ""
          : prev.metodo_pago === "EFECTIVO" && servicio?.precio_base != null
            ? String(Number(servicio.precio_base).toFixed(2))
          : prev.monto_recibido,
    }));
  };

  const seleccionarVehiculo = (vehiculoId) => {
    setVehiculoSeleccionadoId(vehiculoId);
    const primerServicio = servicios.find(
      (servicio) => servicio.id_tipo_vehiculo === vehiculoId
    );
    if (primerServicio?.id_servicio_catalogo) {
      seleccionarServicio(primerServicio.id_servicio_catalogo);
      return;
    }
    setServicioSeleccionadoId(null);
  };

  const cerrarModalVehiculo = () => {
    if (savingVehiculo) return;
    setVehicleModalOpen(false);
  };

  const abrirModalServicioNuevo = (forcedVehiculoId = vehiculoSeleccionadoId) => {
    setEditingServiceId(null);
    setServiceForm({
      ...EMPTY_SERVICE_FORM,
      id_tipo_vehiculo: forcedVehiculoId ? String(forcedVehiculoId) : "",
    });
    setServiceModalOpen(true);
  };

  const abrirModalServicioEditar = (servicio) => {
    setEditingServiceId(servicio.id_servicio_catalogo);
    setServiceForm({
      id_tipo_vehiculo: String(servicio.id_tipo_vehiculo),
      nombre: servicio.nombre || "",
      descripcion: servicio.descripcion || "",
      precio_base: String(servicio.precio_base ?? ""),
      duracion_minutos: String(servicio.duracion_minutos ?? ""),
      icono: servicio.icono || "cleaning_services",
    });
    setServiceModalOpen(true);
  };

  const cerrarModalServicio = () => {
    if (savingServicio) return;
    setServiceModalOpen(false);
    setEditingServiceId(null);
  };

  const guardarVehiculo = async ({ keepOpen = false } = {}) => {
    try {
      setSavingVehiculo(true);
      setError("");
      setSuccess("");

      const response = await crearTipoVehiculoAutolavado(vehicleForm);
      const nuevoVehiculo = response?.vehiculo;

      await cargarCatalogo({
        preferredVehiculoId: nuevoVehiculo?.id_tipo_vehiculo ?? null,
      });

      setSuccess(
        nuevoVehiculo?.nombre
          ? `Tipo de vehiculo ${nuevoVehiculo.nombre} creado correctamente.`
          : "Tipo de vehiculo creado correctamente."
      );
      if (keepOpen) {
        setVehicleForm({
          ...EMPTY_VEHICLE_FORM,
          icono: vehicleForm.icono || EMPTY_VEHICLE_FORM.icono,
        });
      } else {
        setVehicleModalOpen(false);
        setVehicleForm(EMPTY_VEHICLE_FORM);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo guardar el tipo de vehiculo.");
    } finally {
      setSavingVehiculo(false);
    }
  };

  const guardarServicio = async ({ keepOpen = false } = {}) => {
    try {
      setSavingServicio(true);
      setError("");
      setSuccess("");

      const payload = {
        id_tipo_vehiculo: Number(serviceForm.id_tipo_vehiculo),
        nombre: serviceForm.nombre,
        descripcion: serviceForm.descripcion,
        precio_base: Number(serviceForm.precio_base),
        duracion_minutos: Number(serviceForm.duracion_minutos),
        icono: serviceForm.icono,
      };

      let servicioGuardado;

      if (editingServiceId) {
        const response = await editarServicioAutolavado(editingServiceId, payload);
        servicioGuardado = response?.servicio;
      } else {
        const response = await crearServicioAutolavado(payload);
        servicioGuardado = response?.servicio;
      }

      await cargarCatalogo({
        preferredVehiculoId: servicioGuardado?.id_tipo_vehiculo ?? Number(serviceForm.id_tipo_vehiculo),
        preferredServicioId: servicioGuardado?.id_servicio_catalogo ?? null,
      });

      setSuccess(
        editingServiceId
          ? "Servicio actualizado correctamente."
          : "Servicio creado correctamente."
      );
      if (keepOpen && !editingServiceId) {
        setServiceForm({
          ...EMPTY_SERVICE_FORM,
          id_tipo_vehiculo: String(
            servicioGuardado?.id_tipo_vehiculo ?? Number(serviceForm.id_tipo_vehiculo)
          ),
          icono: serviceForm.icono || EMPTY_SERVICE_FORM.icono,
        });
      } else {
        setServiceModalOpen(false);
        setEditingServiceId(null);
        setServiceForm(EMPTY_SERVICE_FORM);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo guardar el servicio.");
    } finally {
      setSavingServicio(false);
    }
  };

  const montoCobradoNumero = Number(cobroForm.monto_cobrado || 0);
  const montoRecibidoNumero = Number(cobroForm.monto_recibido || 0);
  const vuelto =
    cobroForm.metodo_pago === "EFECTIVO"
      ? Math.max(0, montoRecibidoNumero - montoCobradoNumero)
      : 0;
  const faltanteEfectivo =
    cobroForm.metodo_pago === "EFECTIVO"
      ? Math.max(0, montoCobradoNumero - montoRecibidoNumero)
      : 0;

  const cobrarServicio = async () => {
    if (!vehiculoSeleccionadoId || !servicioSeleccionadoId) {
      setError("Selecciona un vehiculo y un servicio antes de cobrar.");
      return;
    }

    if (noCobroForm.enabled) {
      if (!String(noCobroForm.motivo || "").trim()) {
        setError("Debes indicar el motivo del no cobro.");
        return;
      }
    }

    let reservedPrintWindow = null;

    try {
      setCobrandoServicio(true);
      setError("");
      setSuccess("");

      if (autoPrintServicio) {
        reservedPrintWindow = openPrintWindow({
          title: "Ticket de autolavado",
          width: 960,
          height: 900,
        });
      }

      const response = await cobrarServicioAutolavado({
        id_tipo_vehiculo: vehiculoSeleccionadoId,
        id_servicio_catalogo: servicioSeleccionadoId,
        nombre_cliente: cobroForm.nombre_cliente,
        placa: cobroForm.placa,
        color: cobroForm.color,
        observaciones: cobroForm.observaciones,
        metodo_pago: cobroForm.metodo_pago,
        precio_servicio: montoCobradoNumero,
        monto_cobrado: montoCobradoNumero,
        monto_recibido:
          !noCobroForm.enabled && cobroForm.metodo_pago === "EFECTIVO"
            ? montoRecibidoNumero
            : null,
        no_cobrar: noCobroForm.enabled,
        no_cobrado_motivo: noCobroForm.enabled ? noCobroForm.motivo : null,
      });

      const orden = response?.orden;
      setCajaActiva(response?.caja || cajaActiva);
      await cargarOrdenes(estadoFiltroOrdenes);
      setSuccess(
        orden?.id_autolavado_orden
          ? `Cobro registrado correctamente. Orden #${orden.id_autolavado_orden}.`
          : "Cobro registrado correctamente."
      );

      if (autoPrintServicio && orden?.id_autolavado_orden) {
        await imprimirOrden(orden, reservedPrintWindow);
        reservedPrintWindow = null;
      } else if (reservedPrintWindow && !reservedPrintWindow.closed) {
        reservedPrintWindow.close();
      }

      setCobroForm({
        ...EMPTY_COBRO_FORM,
        metodo_pago: "EFECTIVO",
        monto_cobrado: servicioPersonalizadoSeleccionado
          ? ""
          : String(Number(servicioSeleccionado?.precio_base || 0).toFixed(2)),
        monto_recibido: servicioPersonalizadoSeleccionado
          ? ""
          : String(Number(servicioSeleccionado?.precio_base || 0).toFixed(2)),
      });
      setNoCobroForm(EMPTY_NO_COBRO_FORM);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo registrar el cobro del servicio.");
      if (reservedPrintWindow && !reservedPrintWindow.closed) {
        reservedPrintWindow.close();
      }
    } finally {
      setCobrandoServicio(false);
    }
  };

  const actualizarEstadoOrden = async (idOrden, estadoTrabajo) => {
    try {
      setActualizandoOrdenId(idOrden);
      setError("");
      setSuccess("");

      await actualizarEstadoOrdenAutolavado(idOrden, {
        estado_trabajo: estadoTrabajo,
      });

      setOrdenes((prev) => {
        if (estadoFiltroOrdenes !== "TODOS" && estadoFiltroOrdenes !== estadoTrabajo) {
          return prev.filter((orden) => orden.id_autolavado_orden !== idOrden);
        }

        return prev.map((orden) =>
          orden.id_autolavado_orden === idOrden
            ? { ...orden, estado_trabajo: estadoTrabajo }
            : orden
        );
      });

      await cargarOrdenes(estadoFiltroOrdenes);
      setSuccess(
        estadoFiltroOrdenes !== "TODOS" && estadoFiltroOrdenes !== estadoTrabajo
          ? `Orden #${idOrden} actualizada a ${estadoTrabajo.replaceAll("_", " ")}. Como el filtro actual es ${estadoFiltroOrdenes.replaceAll("_", " ")}, la orden salio de la lista.`
          : `Orden #${idOrden} actualizada a ${estadoTrabajo.replaceAll("_", " ")}.`
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo actualizar el estado de la orden.");
    } finally {
      setActualizandoOrdenId(null);
    }
  };

  const asignarTecnicoOrden = async (idOrden, idTecnico) => {
    try {
      setAsignandoTecnicoOrdenId(idOrden);
      setError("");
      setSuccess("");

      await asignarTecnicoOrdenAutolavado(idOrden, {
        id_tecnico: idTecnico || null,
      });

      await cargarOrdenes(estadoFiltroOrdenes);

      const tecnico = tecnicos.find(
        (item) => String(item.id_usuario) === String(idTecnico)
      );

      setSuccess(
        tecnico
          ? `Tecnico ${tecnico.nombre || tecnico.username} asignado a la orden #${idOrden}.`
          : `Tecnico retirado de la orden #${idOrden}.`
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
      setImprimiendoOrdenId(orden.id_autolavado_orden);
      setError("");
      const targetWindow =
        printWindow ||
        openPrintWindow({
          title: `Orden de autolavado #${orden.id_autolavado_orden}`,
          width: 960,
          height: 900,
        });

      openPrintDocument({
        title: `Orden de autolavado #${orden.id_autolavado_orden}`,
        html: buildAutolavadoTicketHtml(orden),
        width: 960,
        height: 900,
        printWindow: targetWindow,
      });
    } catch (err) {
      console.error(err);
      setError("No se pudo generar la impresion de la orden.");
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
    } finally {
      setImprimiendoOrdenId(null);
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
                Operacion de servicio
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                Servicios - Autolavado
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Selecciona primero el tipo de vehiculo y luego el servicio que se le va a realizar con una interfaz mas clara para recepcion, cobro y seguimiento.
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

          {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        {isReadOnly && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
            Estas en modo solo lectura. Puedes consultar el catalogo, los servicios y las ordenes de autolavado, pero no registrar cobros ni actualizar el proceso.
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 3 }}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Paper
            elevation={3}
            sx={(currentTheme) => ({
              ...getSectionPanelSx(currentTheme, { p: 5, radius: 4, accent: "primary" }),
              minHeight: 320,
              display: "grid",
              placeItems: "center",
            })}
          >
            <Stack spacing={2} alignItems="center">
              <CircularProgress />
              <Typography color="text.secondary">
                Cargando catalogo de autolavado...
              </Typography>
            </Stack>
          </Paper>
        ) : (
          <Stack spacing={3}>
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
                  Registrados en autolavado
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
                  Servicios disponibles
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
                  {vehiculoSeleccionado?.nombre || "Sin vehiculo seleccionado"}
                </Typography>
              </Paper>
            </Box>

            <Paper
              elevation={3}
              sx={(currentTheme) =>
                getSectionPanelSx(currentTheme, { p: 3, radius: 4, accent: "info" })
              }
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", md: "center" }}
                justifyContent="space-between"
                mb={3}
              >
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    1. Tipo de vehiculo
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Elige el vehiculo que ingresara al area de lavado.
                  </Typography>
                </Box>

                {canManageCatalog && (
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setVehicleModalOpen(true)}
                    sx={{
                      borderRadius: 999,
                      alignSelf: { xs: "stretch", md: "center" },
                    }}
                  >
                    Agregar vehiculo
                  </Button>
                )}
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gap: 3,
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    xl: "repeat(4, minmax(0, 1fr))",
                  },
                }}
              >
                {vehiculos.map((vehiculo) => {
                  const IconComponent =
                    VEHICLE_ICON_MAP[vehiculo.icono] || DirectionsCarIcon;
                  const selected = vehiculo.id_tipo_vehiculo === vehiculoSeleccionadoId;

                  return (
                    <Paper
                      key={vehiculo.id_tipo_vehiculo}
                      onClick={() => seleccionarVehiculo(vehiculo.id_tipo_vehiculo)}
                      elevation={selected ? 6 : 2}
                      sx={{
                        p: 3,
                        borderRadius: 4,
                        cursor: "pointer",
                        minHeight: 220,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        border: selected
                          ? "1px solid rgba(96,165,250,0.5)"
                          : "1px solid rgba(148,163,184,0.18)",
                        background: selected
                          ? "linear-gradient(135deg, rgba(59,130,246,0.26), rgba(14,165,233,0.1))"
                          : "linear-gradient(135deg, rgba(17,24,39,0.72), rgba(30,41,59,0.52))",
                        transition: "transform 160ms ease, border-color 160ms ease",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          borderColor: "rgba(96,165,250,0.45)",
                        },
                      }}
                    >
                      <Stack spacing={2}>
                        <Box
                          sx={{
                            width: 72,
                            height: 72,
                            borderRadius: 4,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: "rgba(255,255,255,0.1)",
                            color: "#fff",
                          }}
                        >
                          <IconComponent sx={{ fontSize: 42 }} />
                        </Box>

                        <Box>
                          <Typography variant="h5" fontWeight="bold" gutterBottom>
                            {vehiculo.nombre}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {vehiculo.descripcion}
                          </Typography>
                        </Box>
                      </Stack>

                      <Chip
                        label={selected ? "Seleccionado" : "Elegir"}
                        color={selected ? "primary" : "default"}
                        sx={{ alignSelf: "flex-start", fontWeight: 700 }}
                      />
                    </Paper>
                  );
                })}
              </Box>
            </Paper>

            <Paper elevation={2} sx={{ p: 2.5, borderRadius: 4, display: "none" }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Catalogo por vehiculo
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Revisa rapido cuantos servicios tiene cada vehiculo y agrega nuevos desde aqui.
                  </Typography>
                </Box>

                <Box sx={{ display: "grid", gap: 1.5 }}>
                  {vehiculos.map((vehiculo) => {
                    const totalServiciosVehiculo = servicios.filter(
                      (servicio) => servicio.id_tipo_vehiculo === vehiculo.id_tipo_vehiculo
                    ).length;
                    const seleccionado =
                      vehiculo.id_tipo_vehiculo === vehiculoSeleccionadoId;

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

            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: {
                  xs: "1fr",
                  xl: "minmax(0, 2fr) minmax(320px, 0.95fr)",
                },
                alignItems: "start",
              }}
            >
              <Paper
                elevation={3}
                sx={(currentTheme) =>
                  getSectionPanelSx(currentTheme, { p: 3, radius: 4, accent: "secondary" })
                }
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  alignItems={{ xs: "stretch", md: "center" }}
                  justifyContent="space-between"
                  mb={3}
                >
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      2. Tipo de servicio
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {vehiculoSeleccionado
                        ? `Opciones disponibles para ${vehiculoSeleccionado.nombre}.`
                        : "Selecciona un vehiculo para ver sus servicios."}
                    </Typography>
                  </Box>

                  {canManageCatalog && (
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      sx={{ alignSelf: { xs: "stretch", md: "center" } }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => abrirModalServicioNuevo()}
                        sx={{ borderRadius: 999 }}
                      >
                        Agregar servicio
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() =>
                          servicioSeleccionado && abrirModalServicioEditar(servicioSeleccionado)
                        }
                        disabled={!servicioSeleccionado}
                        sx={{ borderRadius: 999 }}
                      >
                        Editar servicio
                      </Button>
                    </Stack>
                  )}
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(2, minmax(0, 1fr))",
                    },
                  }}
                >
                  {serviciosFiltrados.map((servicio) => {
                    const IconComponent =
                      SERVICE_ICON_MAP[servicio.icono] || CleaningServicesIcon;
                    const selected =
                      servicio.id_servicio_catalogo === servicioSeleccionadoId;

                    return (
                      <Paper
                        key={servicio.id_servicio_catalogo}
                        onClick={() => seleccionarServicio(servicio.id_servicio_catalogo)}
                        elevation={selected ? 5 : 1}
                        sx={{
                          p: 2.5,
                          borderRadius: 4,
                          cursor: "pointer",
                          border: selected
                            ? "1px solid rgba(34,197,94,0.42)"
                            : "1px solid rgba(148,163,184,0.16)",
                          background: selected
                            ? "linear-gradient(135deg, rgba(22,163,74,0.22), rgba(16,185,129,0.08))"
                            : "linear-gradient(135deg, rgba(17,24,39,0.65), rgba(30,41,59,0.48))",
                          transition: "transform 160ms ease, border-color 160ms ease",
                          "&:hover": {
                            transform: "translateY(-3px)",
                            borderColor: "rgba(34,197,94,0.38)",
                          },
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                          <Box
                            sx={{
                              width: 52,
                              height: 52,
                              borderRadius: 3,
                              display: "grid",
                              placeItems: "center",
                              bgcolor: "rgba(255,255,255,0.08)",
                              color: "#fff",
                              flexShrink: 0,
                            }}
                          >
                            <IconComponent />
                          </Box>

                          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="flex-start"
                              justifyContent="space-between"
                            >
                              <Typography variant="h6" fontWeight="bold" gutterBottom>
                                {servicio.nombre}
                              </Typography>

                              {canManageCatalog && (
                                <IconButton
                                  size="small"
                                  color="primary"
                                  sx={{ display: "inline-flex" }}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    abrirModalServicioEditar(servicio);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Stack>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {servicio.descripcion}
                            </Typography>

                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1}
                              useFlexGap
                              flexWrap="wrap"
                            >
                              <Chip
                                label={`Q ${Number(servicio.precio_base || 0).toFixed(2)}`}
                                color="primary"
                                variant={selected ? "filled" : "outlined"}
                              />
                              <Chip
                                label={`${servicio.duracion_minutos || 0} min`}
                                variant="outlined"
                              />
                              {selected && (
                                <Chip
                                  icon={<CheckCircleOutlineIcon />}
                                  label="Seleccionado"
                                  color="success"
                                />
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Box>
              </Paper>

              <Paper
                elevation={3}
                sx={(currentTheme) =>
                  getSectionPanelSx(
                    currentTheme,
                    {
                      p: 3,
                      radius: 4,
                      accent: noCobroForm.enabled ? "warning" : "primary",
                    }
                  )
                }
              >
                <Stack spacing={2}>
                  <Typography variant="h5" fontWeight="bold">
                    Resumen de seleccion
                  </Typography>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Vehiculo
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {vehiculoSeleccionado?.nombre || "Sin seleccionar"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Servicio
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {servicioSeleccionado?.nombre || "Sin seleccionar"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {servicioPersonalizadoSeleccionado ? "Precio variable" : "Precio sugerido"}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      Q {Number(
                        servicioPersonalizadoSeleccionado
                          ? cobroForm.monto_cobrado || 0
                          : servicioSeleccionado?.precio_base || 0
                      ).toFixed(2)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Duracion estimada
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {servicioSeleccionado?.duracion_minutos || 0} minutos
                    </Typography>
                  </Box>

                  <Divider />

                  {canOperateAutolavado ? (
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <PaidIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">
                          Cobro del servicio
                        </Typography>
                      </Stack>

                      {!cajaActiva && (
                        <Alert severity="warning" sx={{ borderRadius: 3 }}>
                          Debes abrir una caja antes de cobrar servicios de autolavado.
                        </Alert>
                      )}

                      <TextField
                        label="Nombre del cliente"
                        value={cobroForm.nombre_cliente}
                        onChange={(event) =>
                          setCobroForm((prev) => ({
                            ...prev,
                            nombre_cliente: event.target.value,
                          }))
                        }
                        fullWidth
                      />

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                          label="Placa"
                          value={cobroForm.placa}
                          onChange={(event) =>
                            setCobroForm((prev) => ({ ...prev, placa: event.target.value }))
                          }
                          fullWidth
                        />
                        <TextField
                          label="Color"
                          value={cobroForm.color}
                          onChange={(event) =>
                            setCobroForm((prev) => ({ ...prev, color: event.target.value }))
                          }
                          fullWidth
                        />
                      </Stack>

                      <TextField
                        label="Observaciones"
                        value={cobroForm.observaciones}
                        onChange={(event) =>
                          setCobroForm((prev) => ({
                            ...prev,
                            observaciones: event.target.value,
                          }))
                        }
                        fullWidth
                        multiline
                        minRows={2}
                      />

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <FormControl fullWidth>
                          <InputLabel id="autolavado-metodo-pago-label">Metodo de pago</InputLabel>
                          <Select
                            labelId="autolavado-metodo-pago-label"
                            label="Metodo de pago"
                            value={cobroForm.metodo_pago}
                            onChange={(event) =>
                              setCobroForm((prev) => ({
                                ...prev,
                                metodo_pago: event.target.value,
                                monto_recibido:
                                  event.target.value === "EFECTIVO"
                                    ? prev.monto_cobrado
                                    : "",
                              }))
                            }
                          >
                            <MenuItem value="EFECTIVO">EFECTIVO</MenuItem>
                            <MenuItem value="TARJETA">TARJETA</MenuItem>
                            <MenuItem value="TRANSFERENCIA">TRANSFERENCIA</MenuItem>
                          </Select>
                        </FormControl>

                        <TextField
                          label={servicioPersonalizadoSeleccionado ? "Precio variable" : "Monto a cobrar"}
                          type="number"
                          value={cobroForm.monto_cobrado}
                          onChange={(event) =>
                            setCobroForm((prev) => ({
                              ...prev,
                              monto_cobrado: event.target.value,
                            }))
                          }
                          fullWidth
                          inputProps={{ min: 0, step: "0.01" }}
                          helperText={
                            servicioPersonalizadoSeleccionado
                              ? "Ingresa el precio personalizado para este trabajo."
                              : "Monto sugerido segun el tipo de servicio seleccionado."
                          }
                        />
                      </Stack>

                      {servicioPersonalizadoSeleccionado && (
                        <Alert severity="info" sx={{ borderRadius: 3 }}>
                          Estas usando el servicio <strong>Otro</strong>. Aqui puedes cobrar un monto variable.
                        </Alert>
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
                        title="Registrar servicio sin cobro"
                        helperText="El autolavado se registrara como no cobrado y quedara pendiente de validacion al cierre de caja por un admin."
                      />

                      {cobroForm.metodo_pago === "EFECTIVO" && !noCobroForm.enabled && (
                        <Stack spacing={2}>
                          <TextField
                            label="Monto recibido"
                            type="number"
                            value={cobroForm.monto_recibido}
                            onChange={(event) =>
                              setCobroForm((prev) => ({
                                ...prev,
                                monto_recibido: event.target.value,
                              }))
                            }
                            fullWidth
                            inputProps={{ min: 0, step: "0.01" }}
                            helperText={
                              faltanteEfectivo > 0
                                ? `Faltan Q ${faltanteEfectivo.toFixed(2)} para completar el cobro.`
                                : "Ingresa el efectivo recibido del cliente."
                            }
                            error={montoCobradoNumero > 0 && faltanteEfectivo > 0}
                          />

                          <Paper
                            variant="outlined"
                            sx={(currentTheme) =>
                              getSummaryCardSx(
                                currentTheme,
                                faltanteEfectivo > 0 ? "error" : "success",
                                {
                                  compact: true,
                                  minHeight: 120,
                                }
                              )
                            }
                          >
                            <Typography variant="body2" color="text.secondary">
                              Vuelto a entregar
                            </Typography>
                            <Typography variant="h5" fontWeight="bold" color="success.main">
                              Q {vuelto.toFixed(2)}
                            </Typography>
                          </Paper>
                        </Stack>
                      )}

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={autoPrintServicio}
                            onChange={(event) =>
                              setAutoPrintServicio(event.target.checked)
                            }
                          />
                        }
                        label="Imprimir ticket al cobrar"
                      />

                      <Button
                        variant="contained"
                        color="success"
                        onClick={cobrarServicio}
                        disabled={
                          !cajaActiva ||
                          !vehiculoSeleccionadoId ||
                          !servicioSeleccionadoId ||
                          !cobroForm.monto_cobrado ||
                          cobrandoServicio ||
                          (!noCobroForm.enabled &&
                            cobroForm.metodo_pago === "EFECTIVO" &&
                            faltanteEfectivo > 0) ||
                          (noCobroForm.enabled && !String(noCobroForm.motivo || "").trim())
                        }
                        sx={{ borderRadius: 999, py: 1.4, fontWeight: 700 }}
                      >
                        {cobrandoServicio
                          ? "Registrando..."
                          : noCobroForm.enabled
                            ? "Registrar sin cobro"
                            : "Cobrar servicio"}
                      </Button>
                    </Stack>
                  ) : (
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <PaidIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">
                          Cobro del servicio
                        </Typography>
                      </Stack>
                      <Alert severity="info" sx={{ borderRadius: 3 }}>
                        Modo solo lectura: puedes revisar el servicio seleccionado y las ordenes de autolavado, pero no registrar cobros ni crear nuevas ordenes.
                      </Alert>
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </Box>

            <Paper
              elevation={3}
              sx={(currentTheme) =>
                getSectionPanelSx(currentTheme, { p: 3, radius: 4, accent: "secondary" })
              }
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", md: "center" }}
                mb={3}
              >
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    Ordenes de trabajo
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cada cobro genera una orden visible para dar seguimiento al proceso de lavado.
                  </Typography>
                </Box>

                <FormControl sx={{ minWidth: { xs: "100%", md: 220 } }}>
                  <InputLabel id="estado-ordenes-label">Estado</InputLabel>
                  <Select
                    labelId="estado-ordenes-label"
                    label="Estado"
                    value={estadoFiltroOrdenes}
                    onChange={(event) => {
                      const nextEstado = event.target.value;
                      setEstadoFiltroOrdenes(nextEstado);
                      cargarOrdenes(nextEstado);
                    }}
                  >
                    {ESTADOS_ORDEN_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {loadingOrdenes ? (
                <Stack spacing={2} alignItems="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} />
                  <Typography color="text.secondary">
                    Cargando ordenes de autolavado...
                  </Typography>
                </Stack>
              ) : ordenes.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                  No hay ordenes registradas para el filtro seleccionado.
                </Alert>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: {
                      xs: "1fr",
                      xl: "repeat(2, minmax(0, 1fr))",
                    },
                  }}
                >
                  {ordenes.map((orden) => {
                    const IconComponent =
                      VEHICLE_ICON_MAP[orden.tipo_vehiculo_icono] || DirectionsCarIcon;

                    return (
                      <Paper
                        key={orden.id_autolavado_orden}
                        variant="outlined"
                        sx={(currentTheme) => ({
                          ...getSummaryCardSx(currentTheme, "neutral", {
                            compact: true,
                            minHeight: 0,
                          }),
                          p: 2.5,
                          borderRadius: 4,
                        })}
                      >
                        <Stack spacing={2}>
                          <Stack
                            direction={{ xs: "column", md: "row" }}
                            spacing={2}
                            justifyContent="space-between"
                          >
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Box
                                sx={{
                                  width: 54,
                                  height: 54,
                                  borderRadius: 3,
                                  display: "grid",
                                  placeItems: "center",
                                  bgcolor: "rgba(59,130,246,0.14)",
                                  color: "#fff",
                                  flexShrink: 0,
                                }}
                              >
                                <IconComponent />
                              </Box>

                              <Box>
                                <Typography variant="h6" fontWeight="bold">
                                  Orden #{orden.id_autolavado_orden}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {orden.tipo_vehiculo_nombre} - {orden.servicio_nombre}
                                </Typography>
                              </Box>
                            </Stack>

                            <Chip
                              label={String(orden.estado_trabajo || "").replaceAll("_", " ")}
                              color={getEstadoOrdenColor(orden.estado_trabajo)}
                              sx={{ fontWeight: 700, alignSelf: { xs: "flex-start", md: "center" } }}
                            />
                          </Stack>

                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            useFlexGap
                            flexWrap="wrap"
                          >
                            <Chip label={`Cobro Q ${Number(orden.monto_cobrado || 0).toFixed(2)}`} color="primary" variant="outlined" />
                            <Chip label={`Pago ${orden.metodo_pago}`} variant="outlined" />
                            <Chip label={`${orden.duracion_minutos || 0} min`} variant="outlined" />
                            <Chip
                              label={`Tecnico ${orden.tecnico_nombre || orden.tecnico_username || "Sin asignar"}`}
                              color={orden.id_tecnico_asignado ? "secondary" : "default"}
                              variant="outlined"
                            />
                          </Stack>

                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Cliente
                            </Typography>
                            <Typography fontWeight="bold">
                              {orden.nombre_cliente || "Consumidor final"}
                            </Typography>
                          </Box>

                          <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Placa
                              </Typography>
                              <Typography fontWeight="bold">
                                {orden.placa || "Sin placa"}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Color
                              </Typography>
                              <Typography fontWeight="bold">
                                {orden.color || "Sin color"}
                              </Typography>
                            </Box>
                          </Stack>

                          <Typography variant="body2" color="text.secondary">
                            Recibido el {formatDateTime(orden.fecha)} por {orden.usuario_nombre || orden.username}
                          </Typography>

                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Tecnico asignado
                            </Typography>
                            <Typography fontWeight="bold">
                              {orden.tecnico_nombre || orden.tecnico_username || "Sin asignar"}
                            </Typography>
                            {orden.tecnico_asignado_en && (
                              <Typography variant="caption" color="text.secondary">
                                Asignado el {formatDateTime(orden.tecnico_asignado_en)}
                              </Typography>
                            )}
                          </Box>

                          {orden.observaciones && (
                            <Typography variant="body2" color="text.secondary">
                              Observaciones: {orden.observaciones}
                            </Typography>
                          )}

                          {canManageOrders && (
                            <Stack spacing={1.5}>
                              <FormControl fullWidth>
                                <InputLabel id={`tecnico-orden-${orden.id_autolavado_orden}`}>
                                  Asignar tecnico
                                </InputLabel>
                                <Select
                                  labelId={`tecnico-orden-${orden.id_autolavado_orden}`}
                                  label="Asignar tecnico"
                                  value={orden.id_tecnico_asignado ? String(orden.id_tecnico_asignado) : ""}
                                  onChange={(event) =>
                                    asignarTecnicoOrden(
                                      orden.id_autolavado_orden,
                                      event.target.value
                                    )
                                  }
                                  disabled={asignandoTecnicoOrdenId === orden.id_autolavado_orden}
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
                                <InputLabel id={`estado-orden-${orden.id_autolavado_orden}`}>
                                  Cambiar estado
                                </InputLabel>
                                <Select
                                  labelId={`estado-orden-${orden.id_autolavado_orden}`}
                                  label="Cambiar estado"
                                  value={orden.estado_trabajo}
                                  onChange={(event) =>
                                    actualizarEstadoOrden(
                                      orden.id_autolavado_orden,
                                      event.target.value
                                    )
                                  }
                                  disabled={actualizandoOrdenId === orden.id_autolavado_orden}
                                >
                                  {getSiguientesEstadosAutolavado(orden.estado_trabajo).map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                      {option.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>

                              <Button
                                variant="outlined"
                                startIcon={<LocalPrintshopIcon />}
                                onClick={() => imprimirOrden(orden)}
                                disabled={imprimiendoOrdenId === orden.id_autolavado_orden}
                                sx={{ borderRadius: 999, alignSelf: "flex-start" }}
                              >
                                {imprimiendoOrdenId === orden.id_autolavado_orden
                                  ? "Preparando ticket..."
                                  : "Imprimir ticket"}
                              </Button>
                            </Stack>
                          )}
                        </Stack>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </Paper>
          </Stack>
        )}
      </Box>

      <Dialog open={vehicleModalOpen} onClose={cerrarModalVehiculo} fullWidth maxWidth="sm">
        <DialogTitle>Agregar tipo de vehiculo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nombre"
              value={vehicleForm.nombre}
              onChange={(event) =>
                setVehicleForm((prev) => ({ ...prev, nombre: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Descripcion"
              value={vehicleForm.descripcion}
              onChange={(event) =>
                setVehicleForm((prev) => ({ ...prev, descripcion: event.target.value }))
              }
              fullWidth
              multiline
              minRows={3}
            />
            <FormControl fullWidth>
              <InputLabel id="vehiculo-icono-label">Icono</InputLabel>
              <Select
                labelId="vehiculo-icono-label"
                label="Icono"
                value={vehicleForm.icono}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, icono: event.target.value }))
                }
              >
                {VEHICLE_ICON_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={cerrarModalVehiculo} disabled={savingVehiculo}>
            Cancelar
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => guardarVehiculo({ keepOpen: true })}
            disabled={!vehicleForm.nombre.trim() || savingVehiculo}
          >
            Guardar y agregar otro
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => guardarVehiculo()}
            disabled={!vehicleForm.nombre.trim() || savingVehiculo}
          >
            {savingVehiculo ? "Guardando..." : "Guardar vehiculo"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={serviceModalOpen} onClose={cerrarModalServicio} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingServiceId ? "Editar tipo de servicio" : "Agregar tipo de servicio"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="servicio-vehiculo-label">Tipo de vehiculo</InputLabel>
              <Select
                labelId="servicio-vehiculo-label"
                label="Tipo de vehiculo"
                value={serviceForm.id_tipo_vehiculo}
                onChange={(event) =>
                  setServiceForm((prev) => ({
                    ...prev,
                    id_tipo_vehiculo: event.target.value,
                  }))
                }
              >
                {vehiculos.map((vehiculo) => (
                  <MenuItem
                    key={vehiculo.id_tipo_vehiculo}
                    value={String(vehiculo.id_tipo_vehiculo)}
                  >
                    {vehiculo.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Nombre del servicio"
              value={serviceForm.nombre}
              onChange={(event) =>
                setServiceForm((prev) => ({ ...prev, nombre: event.target.value }))
              }
              fullWidth
            />

            <TextField
              label="Descripcion"
              value={serviceForm.descripcion}
              onChange={(event) =>
                setServiceForm((prev) => ({ ...prev, descripcion: event.target.value }))
              }
              fullWidth
              multiline
              minRows={3}
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Precio"
                type="number"
                value={serviceForm.precio_base}
                onChange={(event) =>
                  setServiceForm((prev) => ({ ...prev, precio_base: event.target.value }))
                }
                fullWidth
                inputProps={{ min: 0, step: "0.01" }}
              />
              <TextField
                label="Tiempo estimado (min)"
                type="number"
                value={serviceForm.duracion_minutos}
                onChange={(event) =>
                  setServiceForm((prev) => ({
                    ...prev,
                    duracion_minutos: event.target.value,
                  }))
                }
                fullWidth
                inputProps={{ min: 1, step: "1" }}
              />
            </Stack>

            <FormControl fullWidth>
              <InputLabel id="servicio-icono-label">Icono</InputLabel>
              <Select
                labelId="servicio-icono-label"
                label="Icono"
                value={serviceForm.icono}
                onChange={(event) =>
                  setServiceForm((prev) => ({ ...prev, icono: event.target.value }))
                }
              >
                {SERVICE_ICON_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={cerrarModalServicio} disabled={savingServicio}>
            Cancelar
          </Button>
          {!editingServiceId && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => guardarServicio({ keepOpen: true })}
              disabled={
                !serviceForm.id_tipo_vehiculo ||
                !serviceForm.nombre.trim() ||
                !serviceForm.precio_base ||
                !serviceForm.duracion_minutos ||
                savingServicio
              }
            >
              Guardar y agregar otro
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => guardarServicio()}
            disabled={
              !serviceForm.id_tipo_vehiculo ||
              !serviceForm.nombre.trim() ||
              !serviceForm.precio_base ||
              !serviceForm.duracion_minutos ||
              savingServicio
            }
          >
            {savingServicio
              ? "Guardando..."
              : editingServiceId
                ? "Guardar cambios"
                : "Guardar servicio"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default CarWashAutolavado;
