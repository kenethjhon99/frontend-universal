import { useCallback, useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import BuildIcon from "@mui/icons-material/Build";
import CarRepairIcon from "@mui/icons-material/CarRepair";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import EditIcon from "@mui/icons-material/Edit";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import ElectricRickshawIcon from "@mui/icons-material/ElectricRickshaw";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AirlineSeatReclineExtraIcon from "@mui/icons-material/AirlineSeatReclineExtra";
import AirportShuttleIcon from "@mui/icons-material/AirportShuttle";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import LocalTaxiIcon from "@mui/icons-material/LocalTaxi";
import MopedIcon from "@mui/icons-material/Moped";
import OilBarrelIcon from "@mui/icons-material/OilBarrel";
import SaveIcon from "@mui/icons-material/Save";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  crearServicioAutolavado,
  crearServicioReparacion,
  crearTipoVehiculoAutolavado,
  crearTipoVehiculoReparacion,
  editarTipoVehiculoAutolavado,
  editarTipoVehiculoReparacion,
  editarServicioAutolavado,
  editarServicioReparacion,
  getAutolavadoCatalogo,
  getReparacionCatalogo,
} from "../services/servicioService";
import { useSearchParams } from "react-router-dom";

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

const AUTOLAVADO_SERVICE_ICON_MAP = {
  cleaning_services: CleaningServicesIcon,
  auto_awesome: AutoAwesomeIcon,
  workspace_premium: WorkspacePremiumIcon,
  airline_seat_recline_extra: AirlineSeatReclineExtraIcon,
};

const REPARACION_SERVICE_ICON_MAP = {
  build: BuildIcon,
  oil_barrel: OilBarrelIcon,
  car_repair: CarRepairIcon,
  tune: TuneIcon,
  settings: SettingsIcon,
  electrical_services: ElectricalServicesIcon,
};

const AUTOLAVADO_VEHICLE_OPTIONS = [
  { value: "two_wheeler", label: "Moto" },
  { value: "directions_car", label: "Carro" },
  { value: "airport_shuttle", label: "Pickup" },
  { value: "local_shipping", label: "Camion" },
  { value: "directions_bus", label: "Bus" },
  { value: "local_taxi", label: "Taxi" },
  { value: "electric_rickshaw", label: "Tuc tuc" },
  { value: "moped", label: "Moped" },
];

const REPARACION_VEHICLE_OPTIONS = [
  { value: "two_wheeler", label: "Moto" },
  { value: "directions_car", label: "Carro" },
  { value: "airport_shuttle", label: "SUV / Pickup" },
  { value: "local_shipping", label: "Camion" },
  { value: "directions_bus", label: "Bus / Microbus" },
];

const AUTOLAVADO_SERVICE_OPTIONS = [
  { value: "cleaning_services", label: "Lavado basico" },
  { value: "airline_seat_recline_extra", label: "Aspirado" },
  { value: "workspace_premium", label: "Completo" },
  { value: "auto_awesome", label: "Premium" },
];

const REPARACION_SERVICE_OPTIONS = [
  { value: "build", label: "Diagnostico" },
  { value: "oil_barrel", label: "Aceite" },
  { value: "car_repair", label: "Mecanica" },
  { value: "tune", label: "Afinacion" },
  { value: "settings", label: "Suspension / clutch" },
  { value: "electrical_services", label: "Electrico" },
];

const MODULE_CONFIG = {
  AUTOLAVADO: {
    label: "Autolavado",
    subtitle: "Administra tipos de vehiculo y servicios del area de lavado.",
    accent: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(14,165,233,0.08))",
    getCatalogo: getAutolavadoCatalogo,
    crearVehiculo: crearTipoVehiculoAutolavado,
    editarVehiculo: editarTipoVehiculoAutolavado,
    crearServicio: crearServicioAutolavado,
    editarServicio: editarServicioAutolavado,
    vehicleIconOptions: AUTOLAVADO_VEHICLE_OPTIONS,
    serviceIconOptions: AUTOLAVADO_SERVICE_OPTIONS,
    serviceIconMap: AUTOLAVADO_SERVICE_ICON_MAP,
    defaultVehicleIcon: "directions_car",
    defaultServiceIcon: "cleaning_services",
  },
  REPARACION: {
    label: "Reparacion",
    subtitle: "Centraliza el catalogo del taller mecanico y sus tipos de trabajo.",
    accent: "linear-gradient(135deg, rgba(148,163,184,0.18), rgba(59,130,246,0.08))",
    getCatalogo: getReparacionCatalogo,
    crearVehiculo: crearTipoVehiculoReparacion,
    editarVehiculo: editarTipoVehiculoReparacion,
    crearServicio: crearServicioReparacion,
    editarServicio: editarServicioReparacion,
    vehicleIconOptions: REPARACION_VEHICLE_OPTIONS,
    serviceIconOptions: REPARACION_SERVICE_OPTIONS,
    serviceIconMap: REPARACION_SERVICE_ICON_MAP,
    defaultVehicleIcon: "directions_car",
    defaultServiceIcon: "build",
  },
};

const normalizarCatalogo = (data) =>
  data?.data?.vehiculos && data?.data?.servicios
    ? data.data
    : { vehiculos: [], servicios: [] };

const buildVehicleForm = (moduleKey) => ({
  nombre: "",
  descripcion: "",
  icono: MODULE_CONFIG[moduleKey].defaultVehicleIcon,
});

const buildServiceForm = (moduleKey, vehicleId = "") => ({
  id_tipo_vehiculo: vehicleId ? String(vehicleId) : "",
  nombre: "",
  descripcion: "",
  precio_base: "",
  duracion_minutos: "",
  icono: MODULE_CONFIG[moduleKey].defaultServiceIcon,
});

function ServiciosCatalogo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedModule = useMemo(() => {
    const value = String(searchParams.get("modulo") || "").trim().toUpperCase();
    return MODULE_CONFIG[value] ? value : "AUTOLAVADO";
  }, [searchParams]);
  const requestedVehiculoId = useMemo(() => {
    const value = Number(searchParams.get("vehiculo"));
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [searchParams]);
  const requestedServicioId = useMemo(() => {
    const value = Number(searchParams.get("servicio"));
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [searchParams]);
  const requestedEditMode = useMemo(() => {
    const value = String(searchParams.get("editar") || "").trim().toLowerCase();
    return value === "vehiculo" || value === "servicio" ? value : null;
  }, [searchParams]);
  const [moduleKey, setModuleKey] = useState(requestedModule);
  const [servicioEnfocadoId, setServicioEnfocadoId] = useState(requestedServicioId);
  const [pendingAutoOpenServicioId, setPendingAutoOpenServicioId] = useState(
    requestedEditMode === "servicio" ? requestedServicioId : null
  );
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [pendingAutoOpenVehiculoId, setPendingAutoOpenVehiculoId] = useState(
    requestedEditMode === "vehiculo" ? requestedVehiculoId : null
  );
  const [vehiculos, setVehiculos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [vehiculoSeleccionadoId, setVehiculoSeleccionadoId] = useState(null);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceVehicleFilter, setServiceVehicleFilter] = useState("SELECCIONADO");
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(buildVehicleForm("AUTOLAVADO"));
  const [serviceForm, setServiceForm] = useState(buildServiceForm("AUTOLAVADO"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const config = MODULE_CONFIG[moduleKey];

  useEffect(() => {
    setModuleKey(requestedModule);
  }, [requestedModule]);

  useEffect(() => {
    setServicioEnfocadoId(requestedServicioId);
    setPendingAutoOpenServicioId(requestedEditMode === "servicio" ? requestedServicioId : null);
    setPendingAutoOpenVehiculoId(requestedEditMode === "vehiculo" ? requestedVehiculoId : null);
  }, [requestedEditMode, requestedServicioId, requestedVehiculoId]);

  const cargarCatalogo = useCallback(
    async ({ preferredVehiculoId = null } = {}) => {
      try {
        setLoading(true);
        setError("");

        const response = await MODULE_CONFIG[moduleKey].getCatalogo();
        const catalogo = normalizarCatalogo(response);

        setVehiculos(catalogo.vehiculos);
        setServicios(catalogo.servicios);

        const nextVehiculoId =
          preferredVehiculoId &&
          catalogo.vehiculos.some((item) => item.id_tipo_vehiculo === preferredVehiculoId)
            ? preferredVehiculoId
            : catalogo.vehiculos[0]?.id_tipo_vehiculo ?? null;

        setVehiculoSeleccionadoId(nextVehiculoId);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || "No se pudo cargar el catalogo de servicios.");
      } finally {
        setLoading(false);
      }
    },
    [moduleKey]
  );

  useEffect(() => {
    setVehicleModalOpen(false);
    setServiceModalOpen(false);
    setEditingServiceId(null);
    setVehicleForm(buildVehicleForm(moduleKey));
    setServiceForm(buildServiceForm(moduleKey));
    setVehicleSearch("");
    setServiceSearch("");
    setServiceVehicleFilter("SELECCIONADO");
    setServicioEnfocadoId(requestedServicioId);
    setPendingAutoOpenServicioId(requestedEditMode === "servicio" ? requestedServicioId : null);
    setPendingAutoOpenVehiculoId(requestedEditMode === "vehiculo" ? requestedVehiculoId : null);
    setSuccess("");
    cargarCatalogo({
      preferredVehiculoId: requestedVehiculoId,
    });
  }, [cargarCatalogo, moduleKey, requestedEditMode, requestedServicioId, requestedVehiculoId]);

  const vehiculoSeleccionado = useMemo(
    () =>
      vehiculos.find((vehiculo) => vehiculo.id_tipo_vehiculo === vehiculoSeleccionadoId) || null,
    [vehiculos, vehiculoSeleccionadoId]
  );

  const vehiculosFiltrados = useMemo(() => {
    const query = vehicleSearch.trim().toLowerCase();

    if (!query) return vehiculos;

    return vehiculos.filter((vehiculo) => {
      const haystack = `${vehiculo.nombre || ""} ${vehiculo.descripcion || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [vehiculos, vehicleSearch]);

  const serviceFilterVehiculoId = useMemo(() => {
    if (serviceVehicleFilter === "TODOS") return null;
    if (serviceVehicleFilter === "SELECCIONADO") return vehiculoSeleccionadoId;
    return Number(serviceVehicleFilter);
  }, [serviceVehicleFilter, vehiculoSeleccionadoId]);

  const serviciosFiltrados = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();

    return servicios.filter((servicio) => {
      const coincideVehiculo =
        serviceFilterVehiculoId == null
          ? true
          : servicio.id_tipo_vehiculo === serviceFilterVehiculoId;

      if (!coincideVehiculo) return false;
      if (!query) return true;

      const haystack = `${servicio.nombre || ""} ${servicio.descripcion || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [servicios, serviceFilterVehiculoId, serviceSearch]);

  const abrirModalVehiculo = () => {
    setEditingVehicleId(null);
    setVehicleForm(buildVehicleForm(moduleKey));
    setVehicleModalOpen(true);
  };

  const abrirModalVehiculoEditar = useCallback((vehiculo) => {
    setEditingVehicleId(vehiculo.id_tipo_vehiculo);
    setVehicleForm({
      nombre: vehiculo.nombre || "",
      descripcion: vehiculo.descripcion || "",
      icono: vehiculo.icono || config.defaultVehicleIcon,
    });
    setVehicleModalOpen(true);
  }, [config.defaultVehicleIcon]);

  const abrirModalServicioNuevo = (forcedVehiculoId = vehiculoSeleccionadoId) => {
    setEditingServiceId(null);
    setServiceForm(buildServiceForm(moduleKey, forcedVehiculoId));
    setServiceModalOpen(true);
  };

  const abrirModalServicioEditar = useCallback((servicio) => {
    setEditingServiceId(servicio.id_servicio_catalogo);
    setServiceForm({
      id_tipo_vehiculo: String(servicio.id_tipo_vehiculo),
      nombre: servicio.nombre || "",
      descripcion: servicio.descripcion || "",
      precio_base: String(servicio.precio_base ?? ""),
      duracion_minutos: String(servicio.duracion_minutos ?? ""),
      icono: servicio.icono || config.defaultServiceIcon,
    });
    setServiceModalOpen(true);
  }, [config.defaultServiceIcon]);

  useEffect(() => {
    if (!pendingAutoOpenServicioId || loading || serviceModalOpen) return;

    const servicio = servicios.find(
      (item) => item.id_servicio_catalogo === pendingAutoOpenServicioId
    );

    if (!servicio) {
      setPendingAutoOpenServicioId(null);
      return;
    }

    abrirModalServicioEditar(servicio);
    setPendingAutoOpenServicioId(null);
  }, [
    abrirModalServicioEditar,
    loading,
    pendingAutoOpenServicioId,
    serviceModalOpen,
    servicios,
  ]);

  useEffect(() => {
    if (!pendingAutoOpenVehiculoId || loading || vehicleModalOpen) return;

    const vehiculo = vehiculos.find(
      (item) => item.id_tipo_vehiculo === pendingAutoOpenVehiculoId
    );

    if (!vehiculo) {
      setPendingAutoOpenVehiculoId(null);
      return;
    }

    abrirModalVehiculoEditar(vehiculo);
    setPendingAutoOpenVehiculoId(null);
  }, [
    abrirModalVehiculoEditar,
    loading,
    pendingAutoOpenVehiculoId,
    vehiculos,
    vehicleModalOpen,
  ]);

  const limpiarFiltros = () => {
    setVehicleSearch("");
    setServiceSearch("");
    setServiceVehicleFilter("SELECCIONADO");
  };

  const guardarVehiculo = async ({ keepOpen = false } = {}) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      let vehiculoGuardado;

      if (editingVehicleId) {
        const response = await config.editarVehiculo(editingVehicleId, vehicleForm);
        vehiculoGuardado = response?.vehiculo;
      } else {
        const response = await config.crearVehiculo(vehicleForm);
        vehiculoGuardado = response?.vehiculo;
      }

      await cargarCatalogo({
        preferredVehiculoId: vehiculoGuardado?.id_tipo_vehiculo ?? null,
      });

      setSuccess(
        editingVehicleId
          ? "Tipo de vehiculo actualizado correctamente."
          : vehiculoGuardado?.nombre
            ? `Tipo de vehiculo ${vehiculoGuardado.nombre} creado correctamente.`
            : "Tipo de vehiculo creado correctamente."
      );

      if (keepOpen && !editingVehicleId) {
        setVehicleForm(buildVehicleForm(moduleKey));
      } else {
        setVehicleModalOpen(false);
        setEditingVehicleId(null);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo guardar el tipo de vehiculo.");
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
        id_tipo_vehiculo: Number(serviceForm.id_tipo_vehiculo),
        nombre: serviceForm.nombre,
        descripcion: serviceForm.descripcion,
        precio_base: Number(serviceForm.precio_base),
        duracion_minutos: Number(serviceForm.duracion_minutos),
        icono: serviceForm.icono,
      };

      let servicioGuardado;

      if (editingServiceId) {
        const response = await config.editarServicio(editingServiceId, payload);
        servicioGuardado = response?.servicio;
      } else {
        const response = await config.crearServicio(payload);
        servicioGuardado = response?.servicio;
      }

      const nextVehiculoId =
        servicioGuardado?.id_tipo_vehiculo ?? Number(serviceForm.id_tipo_vehiculo);

      await cargarCatalogo({
        preferredVehiculoId: nextVehiculoId,
      });

      setSuccess(
        editingServiceId
          ? "Servicio actualizado correctamente."
          : "Servicio creado correctamente."
      );

      if (keepOpen && !editingServiceId) {
        setServiceForm(buildServiceForm(moduleKey, nextVehiculoId));
      } else {
        setServiceModalOpen(false);
        setEditingServiceId(null);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo guardar el servicio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Catalogo de servicios
          </Typography>
          <Typography color="text.secondary">
            Crea, revisa y edita el catalogo de vehiculos y servicios en un solo lugar.
          </Typography>
        </Box>

        <Paper
          elevation={3}
          sx={{
            p: 3,
            borderRadius: 4,
            background: config.accent,
            border: "1px solid rgba(148,163,184,0.18)",
          }}
        >
          <Stack spacing={3}>
            <Tabs
              value={moduleKey}
              onChange={(_, value) => setSearchParams({ modulo: value })}
              variant="fullWidth"
            >
              <Tab label="Autolavado" value="AUTOLAVADO" />
              <Tab label="Reparacion" value="REPARACION" />
            </Tabs>

            <Box>
              <Typography variant="h5" fontWeight="bold">
                {config.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {config.subtitle}
              </Typography>
            </Box>

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
              <Paper sx={{ p: 2.5, borderRadius: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Tipos de vehiculo
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {vehiculos.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Catalogo cargado en {config.label.toLowerCase()}
                </Typography>
              </Paper>

              <Paper sx={{ p: 2.5, borderRadius: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Servicios registrados
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {servicios.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Servicios disponibles en el modulo
                </Typography>
              </Paper>

              <Paper sx={{ p: 2.5, borderRadius: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Vehiculo activo
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {vehiculoSeleccionado?.nombre || "Sin seleccionar"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {serviciosFiltrados.length} servicio(s) asociados
                </Typography>
              </Paper>
            </Box>
          </Stack>
        </Paper>

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        {loading ? (
          <Paper sx={{ p: 6, borderRadius: 4 }}>
            <Stack spacing={2} alignItems="center">
              <CircularProgress />
              <Typography color="text.secondary">Cargando catalogo...</Typography>
            </Stack>
          </Paper>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: {
                xs: "1fr",
                xl: "minmax(300px, 0.95fr) minmax(0, 1.4fr)",
              },
              alignItems: "start",
            }}
          >
            <Paper sx={{ p: 3, borderRadius: 4 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", md: "center" }}
                mb={3}
              >
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Tipos de vehiculo
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Selecciona un vehiculo para revisar sus servicios.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={abrirModalVehiculo}
                  sx={{ borderRadius: 999 }}
                >
                  Nuevo vehiculo
                </Button>
              </Stack>

              <TextField
                label="Buscar vehiculo"
                placeholder="Nombre o descripcion"
                value={vehicleSearch}
                onChange={(event) => setVehicleSearch(event.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              />

              {vehiculos.length === 0 ? (
                <Alert severity="info">
                  Todavia no hay tipos de vehiculo registrados para este modulo.
                </Alert>
              ) : vehiculosFiltrados.length === 0 ? (
                <Alert severity="info">
                  No hay tipos de vehiculo que coincidan con la busqueda actual.
                </Alert>
              ) : (
                <Stack spacing={1.5}>
                  {vehiculosFiltrados.map((vehiculo) => {
                    const IconComponent =
                      VEHICLE_ICON_MAP[vehiculo.icono] || DirectionsCarIcon;
                    const selected =
                      vehiculo.id_tipo_vehiculo === vehiculoSeleccionadoId;
                    const totalServiciosVehiculo = servicios.filter(
                      (servicio) => servicio.id_tipo_vehiculo === vehiculo.id_tipo_vehiculo
                    ).length;

                    return (
                      <Paper
                        key={vehiculo.id_tipo_vehiculo}
                        variant="outlined"
                        onClick={() => setVehiculoSeleccionadoId(vehiculo.id_tipo_vehiculo)}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          cursor: "pointer",
                          borderColor: selected ? "primary.main" : "divider",
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Box
                            sx={{
                              width: 52,
                              height: 52,
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

                          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              justifyContent="space-between"
                              alignItems="center"
                              useFlexGap
                              flexWrap="wrap"
                            >
                              <Typography fontWeight="bold">{vehiculo.nombre}</Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  size="small"
                                  color={selected ? "primary" : "default"}
                                  label={`${totalServiciosVehiculo} servicio(s)`}
                                />
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    abrirModalVehiculoEditar(vehiculo);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {vehiculo.descripcion || "Sin descripcion"}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 4 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", md: "center" }}
                mb={3}
              >
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Servicios del catalogo
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Filtra por vehiculo o texto para ubicar mas rapido el servicio que necesitas.
                  </Typography>
                </Box>

                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => abrirModalServicioNuevo(serviceFilterVehiculoId)}
                  disabled={!serviceFilterVehiculoId}
                  sx={{ borderRadius: 999 }}
                >
                  Nuevo servicio
                </Button>
              </Stack>

              <Stack spacing={2} mb={3}>
                <TextField
                  label="Buscar servicio"
                  placeholder="Nombre, descripcion o trabajo"
                  value={serviceSearch}
                  onChange={(event) => setServiceSearch(event.target.value)}
                  fullWidth
                />

                <FormControl fullWidth>
                  <InputLabel>Filtrar por vehiculo</InputLabel>
                  <Select
                    value={serviceVehicleFilter}
                    label="Filtrar por vehiculo"
                    onChange={(event) => setServiceVehicleFilter(event.target.value)}
                  >
                    <MenuItem value="SELECCIONADO">
                      Vehiculo seleccionado
                    </MenuItem>
                    <MenuItem value="TODOS">Todos los vehiculos</MenuItem>
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

                <Box>
                  <Button variant="text" onClick={limpiarFiltros} sx={{ px: 0 }}>
                    Limpiar filtros
                  </Button>
                </Box>
              </Stack>

              {serviceVehicleFilter === "SELECCIONADO" && !vehiculoSeleccionado ? (
                <Alert severity="info">
                  Debes seleccionar un tipo de vehiculo para continuar.
                </Alert>
              ) : serviciosFiltrados.length === 0 ? (
                <Alert severity="info">
                  No hay servicios que coincidan con los filtros actuales.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {serviciosFiltrados.map((servicio) => {
                    const IconComponent =
                      config.serviceIconMap[servicio.icono] || Inventory2OutlinedIcon;
                    const selected = servicio.id_servicio_catalogo === servicioEnfocadoId;

                    return (
                      <Paper
                        key={servicio.id_servicio_catalogo}
                        variant="outlined"
                        onClick={() => setServicioEnfocadoId(servicio.id_servicio_catalogo)}
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          cursor: "pointer",
                          borderColor: selected ? "primary.main" : "divider",
                          boxShadow: selected
                            ? "0 0 0 1px rgba(59,130,246,0.28)"
                            : "none",
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                          <Box
                            sx={{
                              width: 50,
                              height: 50,
                              borderRadius: 3,
                              display: "grid",
                              placeItems: "center",
                              bgcolor: "rgba(34,197,94,0.12)",
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
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="h6" fontWeight="bold">
                                  {servicio.nombre}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {servicio.descripcion || "Sin descripcion"}
                                </Typography>
                              </Box>

                              <IconButton
                                color="primary"
                                onClick={() => abrirModalServicioEditar(servicio)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Stack>

                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mt={2}>
                              <Chip
                                label={`Q ${Number(servicio.precio_base || 0).toFixed(2)}`}
                                color="primary"
                                variant="outlined"
                              />
                              <Chip
                                label={`${servicio.duracion_minutos || 0} min`}
                                variant="outlined"
                              />
                              {selected && (
                                <Chip
                                  label="Servicio enfocado"
                                  color="success"
                                />
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Paper>
          </Box>
        )}
      </Stack>

      <Dialog
        open={vehicleModalOpen}
        onClose={() => !saving && setVehicleModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingVehicleId ? "Editar tipo de vehiculo" : "Agregar tipo de vehiculo"}
        </DialogTitle>
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
              multiline
              minRows={3}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Icono</InputLabel>
              <Select
                value={vehicleForm.icono}
                label="Icono"
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, icono: event.target.value }))
                }
              >
                {config.vehicleIconOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => !saving && setVehicleModalOpen(false)}>Cancelar</Button>
          {!editingVehicleId && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => guardarVehiculo({ keepOpen: true })}
              disabled={!vehicleForm.nombre.trim() || saving}
            >
              Guardar y agregar otro
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => guardarVehiculo()}
            disabled={!vehicleForm.nombre.trim() || saving}
          >
            {saving
              ? "Guardando..."
              : editingVehicleId
                ? "Guardar cambios"
                : "Guardar vehiculo"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={serviceModalOpen}
        onClose={() => !saving && setServiceModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingServiceId ? "Editar servicio" : "Agregar servicio"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Tipo de vehiculo</InputLabel>
              <Select
                value={serviceForm.id_tipo_vehiculo}
                label="Tipo de vehiculo"
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
              multiline
              minRows={3}
              fullWidth
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
              <InputLabel>Icono</InputLabel>
              <Select
                value={serviceForm.icono}
                label="Icono"
                onChange={(event) =>
                  setServiceForm((prev) => ({ ...prev, icono: event.target.value }))
                }
              >
                {config.serviceIconOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => !saving && setServiceModalOpen(false)}>Cancelar</Button>
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
                saving
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
              saving
            }
          >
            {saving
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

export default ServiciosCatalogo;
