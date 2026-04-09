import { useEffect, useRef, useState } from "react";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import PaidIcon from "@mui/icons-material/Paid";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../hooks/useAuth";
import { isReadOnlyUser, userHasRole } from "../utils/roles";
import {
  abrirCaja,
  cerrarCaja,
  getCajaResumen,
  getCajaSesionActiva,
  getCajaSesiones,
  registrarMovimientoCaja,
  validarMovimientoPendienteCaja,
  validarNoCobroPendienteCaja,
} from "../services/cajaService";
import {
  buildCajaCorteHtml,
  buildCajaNoCobrosValidadosHtml,
  openPrintWindow,
  openPrintDocument,
} from "../utils/printDocuments";
import {
  getSectionPanelSx,
  getSummaryCardSx,
  getSummaryIconWrapSx,
  getSummaryValueSx,
} from "../utils/summaryCardStyles";
import {
  getTableHeaderCellSx,
  getTableHeaderRowSx,
} from "../utils/tableHeaderStyles";

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const INGRESO_CATEGORIAS = [
  { value: "APORTE_CAJA", label: "Aporte de caja" },
  { value: "AJUSTE_POSITIVO", label: "Ajuste positivo" },
  { value: "REINTEGRO", label: "Reintegro" },
  { value: "OTRO_INGRESO", label: "Otro ingreso" },
];

const EGRESO_CATEGORIAS = [
  { value: "AGUA", label: "Agua" },
  { value: "INSUMOS", label: "Insumos" },
  { value: "COMPRAS_MENORES", label: "Compras menores" },
  { value: "VIATICOS", label: "Viaticos" },
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
  { value: "OTRO_GASTO", label: "Otro gasto" },
];

function Caja() {
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();
  const resumenSesionRef = useRef(null);
  const [sesionActiva, setSesionActiva] = useState(null);
  const [resumenActivo, setResumenActivo] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [selectedResumen, setSelectedResumen] = useState(null);
  const [selectedMovimientos, setSelectedMovimientos] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [meta, setMeta] = useState({ totalRows: 0 });
  const [apertura, setApertura] = useState({
    monto_apertura: "0.00",
    observaciones_apertura: "",
  });
  const [movimiento, setMovimiento] = useState({
    tipo: "INGRESO",
    categoria: "",
    monto: "",
    descripcion: "",
  });
  const [cierre, setCierre] = useState({
    monto_cierre_reportado: "",
    observaciones_cierre: "",
  });
  const [validacionNoCobro, setValidacionNoCobro] = useState({
    admin_username: "",
    admin_password: "",
    validacion_no_cobro_nota: "",
  });
  const [vistaPendientes, setVistaPendientes] = useState("NO_COBROS");
  const [validacionPendiente, setValidacionPendiente] = useState({
    tipo: "",
    referencia: "",
    admin_username: "",
    admin_password: "",
    nota: "",
  });

  const canSeeAllSessions = userHasRole(user, "SUPER_ADMIN", "ADMIN");
  const canOperateCaja = userHasRole(
    user,
    "ADMIN",
    "CAJERO",
    "MECANICO",
    "ENCARGADO_SERVICIOS"
  );
  const isReadOnly = isReadOnlyUser(user);
  const isCajeroOnly = userHasRole(user, "CAJERO") && !canSeeAllSessions;
  const pendientesNoCobroActivos = Number(resumenActivo?.no_cobrados_pendientes_count || 0);
  const movimientosPendientesValidacion = Number(
    resumenActivo?.movimientos_pendientes_validacion_count || 0
  );
  const movimientosPendientesLista = Array.isArray(movimientos)
    ? movimientos.filter(
        (item) => !item.admin_autoriza_nombre && !item.admin_autoriza_username
      )
    : [];
  const cierreCalculadoSistema = Number(resumenActivo?.cierre_calculado || 0);
  const montoCierreReportadoNumero = Number(cierre.monto_cierre_reportado || 0);
  const diferenciaCierre =
    String(cierre.monto_cierre_reportado || "").trim() === ""
      ? 0
      : Number((montoCierreReportadoNumero - cierreCalculadoSistema).toFixed(2));
  const requiereAutorizacionDiferencia = Number(diferenciaCierre) !== 0;
  const requiereAutorizacionCierre =
    requiereAutorizacionDiferencia;

  const cargarSesiones = async (nextPage = page, nextRowsPerPage = rowsPerPage, nextEstado = estadoFiltro) => {
    const response = await getCajaSesiones({
      page: nextPage + 1,
      limit: nextRowsPerPage,
      estado: nextEstado !== "TODOS" ? nextEstado : undefined,
      q: canSeeAllSessions ? filtroUsuario.trim() || undefined : undefined,
    });

    setSesiones(Array.isArray(response?.data) ? response.data : []);
    setMeta({ totalRows: Number(response?.meta?.totalRows || 0) });
  };

  const cargarCaja = async () => {
    try {
      setLoading(true);
      setError("");

      const activaResponse = await getCajaSesionActiva();
      setSesionActiva(activaResponse?.sesion || null);
      setResumenActivo(activaResponse?.resumen || null);
      setMovimientos(Array.isArray(activaResponse?.movimientos) ? activaResponse.movimientos : []);

      await cargarSesiones(0, rowsPerPage, estadoFiltro);
      setPage(0);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo cargar el modulo de caja");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCaja();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;

    const cargar = async () => {
      try {
        await cargarSesiones(page, rowsPerPage, estadoFiltro);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || "No se pudo actualizar el historial de caja");
      }
    };

    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, estadoFiltro, filtroUsuario]);

  useEffect(() => {
    if (!selectedSesion || !selectedResumen || !resumenSesionRef.current) return;

    resumenSesionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedSesion, selectedResumen]);

  const refrescarSesionSeleccionada = async (idSesion) => {
    const response = await getCajaResumen(idSesion);
    setSelectedSesion(response?.sesion || null);
    setSelectedResumen(response?.resumen || null);
    setSelectedMovimientos(Array.isArray(response?.movimientos) ? response.movimientos : []);
  };

  const aplicarDatosSesionActiva = (response) => {
    setSesionActiva(response?.sesion || null);
    setResumenActivo(response?.resumen || null);
    setMovimientos(Array.isArray(response?.movimientos) ? response.movimientos : []);
  };

  const handleAbrirCaja = async () => {
    try {
      setLoadingAction(true);
      setError("");
      setSuccess("");

      const response = await abrirCaja(apertura);
      aplicarDatosSesionActiva(response);
      setApertura({ monto_apertura: "0.00", observaciones_apertura: "" });
      setSuccess("Caja abierta correctamente.");
      await cargarSesiones(0, rowsPerPage, estadoFiltro);
      setPage(0);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo abrir la caja");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRegistrarMovimiento = async () => {
    if (!sesionActiva?.id_caja_sesion) return;

    try {
      setLoadingAction(true);
      setError("");
      setSuccess("");

      const response = await registrarMovimientoCaja(sesionActiva.id_caja_sesion, movimiento);
      aplicarDatosSesionActiva(response);
      setMovimiento({
        tipo: "INGRESO",
        categoria: "",
        monto: "",
        descripcion: "",
      });
      setSuccess("Movimiento de caja registrado correctamente. Quedara pendiente de validacion al cierre.");
      await cargarSesiones(page, rowsPerPage, estadoFiltro);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo registrar el movimiento");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCerrarCaja = async () => {
    if (!sesionActiva?.id_caja_sesion) return;

    try {
      setLoadingAction(true);
      setError("");
      setSuccess("");

      if (pendientesNoCobroActivos > 0 || movimientosPendientesValidacion > 0) {
        setError("Debes validar uno por uno los no cobrados y movimientos pendientes antes de cerrar la caja.");
        return;
      }

      if (requiereAutorizacionCierre) {
        if (
          !String(validacionNoCobro.admin_username || "").trim() ||
          !String(validacionNoCobro.admin_password || "").trim()
        ) {
          setError("Debes ingresar la autorizacion de un admin para validar los no cobrados o autorizar la diferencia de cierre.");
          return;
        }
      }

      const response = await cerrarCaja(sesionActiva.id_caja_sesion, {
        ...cierre,
        admin_username:
          requiereAutorizacionCierre ? validacionNoCobro.admin_username : undefined,
        admin_password:
          requiereAutorizacionCierre ? validacionNoCobro.admin_password : undefined,
        validacion_no_cobro_nota:
          null,
        validacion_movimientos_nota:
          null,
        validacion_diferencia_nota:
          requiereAutorizacionDiferencia
            ? String(validacionNoCobro.validacion_no_cobro_nota || "").trim() || null
            : null,
      });
      setSesionActiva(null);
      setResumenActivo(null);
      setMovimientos([]);
      setSelectedSesion(response?.sesion || null);
      setSelectedResumen(response?.resumen || null);
      setSelectedMovimientos(Array.isArray(response?.movimientos) ? response.movimientos : []);
      setCierre({ monto_cierre_reportado: "", observaciones_cierre: "" });
      setValidacionNoCobro({
        admin_username: "",
        admin_password: "",
        validacion_no_cobro_nota: "",
      });
      const mensajesCierre = [];
      if (requiereAutorizacionDiferencia) {
        mensajesCierre.push(
          `Se autorizo el cierre con una diferencia de ${formatCurrency(diferenciaCierre)}.`
        );
      }
      setSuccess(
        mensajesCierre.length > 0
          ? `Caja cerrada correctamente. ${mensajesCierre.join(" ")}`
          : "Caja cerrada correctamente."
      );
      await cargarSesiones(0, rowsPerPage, estadoFiltro);
      setPage(0);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo cerrar la caja");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleValidarNoCobroPendiente = async (item) => {
    if (!sesionActiva?.id_caja_sesion) return;

    try {
      setLoadingAction(true);
      setError("");
      setSuccess("");

      if (
        !String(validacionPendiente.admin_username || "").trim() ||
        !String(validacionPendiente.admin_password || "").trim()
      ) {
        setError("Debes ingresar la autorizacion de un admin para validar este no cobro.");
        return;
      }

      const response = await validarNoCobroPendienteCaja(sesionActiva.id_caja_sesion, {
        modulo: item.modulo,
        referencia: item.referencia,
        admin_username: validacionPendiente.admin_username,
        admin_password: validacionPendiente.admin_password,
        nota: String(validacionPendiente.nota || "").trim() || null,
      });

      aplicarDatosSesionActiva(response);
      setValidacionPendiente({
        tipo: "",
        referencia: "",
        admin_username: "",
        admin_password: "",
        nota: "",
      });
      setSuccess("Registro no cobrado validado correctamente.");
      await cargarSesiones(page, rowsPerPage, estadoFiltro);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo validar el no cobro");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleValidarMovimientoPendiente = async (item) => {
    if (!sesionActiva?.id_caja_sesion) return;

    try {
      setLoadingAction(true);
      setError("");
      setSuccess("");

      if (
        !String(validacionPendiente.admin_username || "").trim() ||
        !String(validacionPendiente.admin_password || "").trim()
      ) {
        setError("Debes ingresar la autorizacion de un admin para validar este movimiento.");
        return;
      }

      const response = await validarMovimientoPendienteCaja(
        sesionActiva.id_caja_sesion,
        item.id_caja_movimiento,
        {
          admin_username: validacionPendiente.admin_username,
          admin_password: validacionPendiente.admin_password,
          nota: String(validacionPendiente.nota || "").trim() || null,
        }
      );

      aplicarDatosSesionActiva(response);
      setValidacionPendiente({
        tipo: "",
        referencia: "",
        admin_username: "",
        admin_password: "",
        nota: "",
      });
      setSuccess("Movimiento manual validado correctamente.");
      await cargarSesiones(page, rowsPerPage, estadoFiltro);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo validar el movimiento manual");
    } finally {
      setLoadingAction(false);
    }
  };

  const verResumenSesion = async (idSesion) => {
    try {
      setLoadingAction(true);
      setError("");
      setSuccess("");
      await refrescarSesionSeleccionada(idSesion);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo cargar el resumen de la sesion");
    } finally {
      setLoadingAction(false);
    }
  };

  const renderSummaryCards = (resumen) => {
    if (!resumen) return null;

    const cards = [
      {
        label: "Apertura",
        value: formatCurrency(resumen.monto_apertura),
        tone: "primary",
        icon: AccountBalanceWalletIcon,
      },
      {
        label: "Ventas en efectivo",
        value: formatCurrency(resumen.total_efectivo),
        tone: "success",
        icon: PaidIcon,
      },
      {
        label: "Servicios en efectivo",
        value: formatCurrency(resumen.total_servicios_efectivo || 0),
        tone: "info",
        icon: ReceiptLongIcon,
      },
      {
        label: "Servicios cobrados",
        value: String(resumen.servicios_cantidad || 0),
        tone: "neutral",
        icon: ReceiptLongIcon,
      },
      {
        label: "Reparaciones en efectivo",
        value: formatCurrency(resumen.total_reparaciones_efectivo || 0),
        tone: "warning",
        icon: PaidIcon,
      },
      {
        label: "Reparaciones cobradas",
        value: String(resumen.reparaciones_cantidad || 0),
        tone: "neutral",
        icon: ReceiptLongIcon,
      },
      {
        label: "Ingresos manuales",
        value: formatCurrency(resumen.ingresos_manuales),
        tone: "info",
        icon: LockOpenIcon,
      },
      {
        label: "Egresos manuales",
        value: formatCurrency(resumen.egresos_manuales),
        tone: "error",
        icon: LockIcon,
      },
      {
        label: "Cierre calculado",
        value: formatCurrency(resumen.cierre_calculado),
        tone: "secondary",
        icon: AccountBalanceWalletIcon,
      },
      {
        label: "Ventas registradas",
        value: String(resumen.ventas_cantidad || 0),
        tone: "neutral",
        icon: ReceiptLongIcon,
      },
    ];

    return (
      <Grid container spacing={2}>
        {cards.map((card) => {
          const IconComponent = card.icon;

          return (
            <Grid item xs={12} sm={6} lg={4} key={card.label}>
              <Paper variant="outlined" sx={(theme) => getSummaryCardSx(theme, card.tone, { compact: true })}>
                <Stack spacing={1.6} height="100%">
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" mb={0.8}>
                        {card.label}
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        sx={(theme) => getSummaryValueSx(theme, card.tone)}
                      >
                        {card.value}
                      </Typography>
                    </Box>
                    <Box sx={(theme) => getSummaryIconWrapSx(theme, card.tone)}>
                      <IconComponent fontSize="small" />
                    </Box>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  const renderConciliacion = (resumen) => {
    if (!resumen?.conciliacion) return null;

    const conciliacion = resumen.conciliacion;
    const resumenCards = [
      {
        label: "Efectivo segun sistema",
        value: formatCurrency(conciliacion.efectivo_sistema),
        tone: "success",
      },
      {
        label: "Tarjeta",
        value: formatCurrency(conciliacion.total_tarjeta),
        tone: "primary",
      },
      {
        label: "Transferencia",
        value: formatCurrency(conciliacion.total_transferencia),
        tone: "info",
      },
      {
        label: "Credito",
        value: formatCurrency(conciliacion.total_credito),
        tone: "warning",
      },
    ];
    const diferenciaConError =
      conciliacion.efectivo_reportado != null &&
      Number(conciliacion.diferencia_efectivo || 0) !== 0;

    return (
      <Paper
        variant="outlined"
        sx={(theme) =>
          getSectionPanelSx(theme, {
            p: 2.5,
            radius: 3,
            accent: diferenciaConError ? "error" : "info",
          })
        }
      >
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
          Conciliacion por metodo de pago
        </Typography>
        <Grid container spacing={2}>
          {resumenCards.map((card) => (
            <Grid item xs={12} md={6} lg={3} key={card.label}>
              <Paper
                variant="outlined"
                sx={(theme) => getSummaryCardSx(theme, card.tone, { compact: true, minHeight: 128 })}
              >
                <Typography variant="body2" color="text.secondary" mb={0.8}>
                  {card.label}
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={(theme) => getSummaryValueSx(theme, card.tone)}
                >
                  {card.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Paper
              variant="outlined"
              sx={(theme) =>
                getSummaryCardSx(theme, diferenciaConError ? "error" : "info", {
                  compact: true,
                  minHeight: 138,
                })
              }
            >
              <Typography variant="body2" color="text.secondary">
                Efectivo reportado
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                sx={(theme) =>
                  getSummaryValueSx(theme, diferenciaConError ? "error" : "info")
                }
              >
                {conciliacion.efectivo_reportado != null
                  ? formatCurrency(conciliacion.efectivo_reportado)
                  : "Pendiente"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Diferencia: {formatCurrency(conciliacion.diferencia_efectivo || 0)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderGastosCategoria = (resumen) => {
    const gastos = Array.isArray(resumen?.gastos_por_categoria)
      ? resumen.gastos_por_categoria
      : [];

    return (
      <Paper
        variant="outlined"
        sx={(theme) => getSectionPanelSx(theme, { p: 2.5, radius: 3, accent: "error" })}
      >
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
          Gastos de caja por categoria
        </Typography>
        {gastos.length === 0 ? (
          <Typography color="text.secondary">
            Todavia no hay gastos manuales registrados en esta sesion.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {gastos.map((gasto) => (
              <Paper
                key={gasto.categoria}
                variant="outlined"
                sx={(theme) => getSummaryCardSx(theme, "error", { compact: true, minHeight: 104 })}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Box>
                    <Typography fontWeight="bold">{gasto.categoria}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {gasto.cantidad} movimiento(s)
                    </Typography>
                  </Box>
                  <Typography fontWeight="bold" color="error.main">
                    {formatCurrency(gasto.total)}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    );
  };

  const renderNoCobrosPendientes = (resumen) => {
    const pendientes = Array.isArray(resumen?.no_cobrados_pendientes)
      ? resumen.no_cobrados_pendientes
      : [];

    if (pendientes.length === 0) return null;

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 3,
          borderColor: "warning.main",
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.14), rgba(15,23,42,0.45))",
        }}
      >
        <Stack spacing={2}>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Hay {pendientes.length} registro(s) sin cobro. No se puede cerrar caja hasta validarlos con la password de un admin.
          </Alert>

          <Stack spacing={1.25}>
            {pendientes.map((item) => (
              <Paper
                key={`${item.modulo}-${item.referencia}-${item.fecha}`}
                variant="outlined"
                sx={{ p: 1.5, borderRadius: 2, backgroundColor: "rgba(15,23,42,0.35)" }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={item.modulo} color="warning" />
                      <Chip
                        size="small"
                        label={item.documento ? `${item.referencia} | ${item.documento}` : item.referencia}
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Cliente: {item.cliente_nombre || "Consumidor final"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Motivo: {item.motivo || "Sin motivo"}
                    </Typography>
                    {(item.autorizado_por_nombre || item.autorizado_por_username) && (
                      <Typography variant="caption" color="text.secondary">
                        Autorizado por: {item.autorizado_por_nombre || item.autorizado_por_username}
                      </Typography>
                    )}
                  </Box>

                  <Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={0.5}>
                    <Typography fontWeight="bold" color="warning.main">
                      {formatCurrency(item.monto)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(item.fecha)}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>

        </Stack>
      </Paper>
    );
  };

  const renderPendientesPorValidar = (readOnly = false) => {
    const noCobros = Array.isArray(resumenActivo?.no_cobrados_pendientes)
      ? resumenActivo.no_cobrados_pendientes
      : [];
    const movimientosPendientes = movimientosPendientesLista;

    if (noCobros.length === 0 && movimientosPendientes.length === 0) return null;

    const vistaActual =
      vistaPendientes === "MOVIMIENTOS" && movimientosPendientes.length > 0
        ? "MOVIMIENTOS"
        : noCobros.length > 0
          ? "NO_COBROS"
          : "MOVIMIENTOS";

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 3,
          borderColor: "warning.main",
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.14), rgba(15,23,42,0.45))",
        }}
      >
        <Stack spacing={2}>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Debes validar cada registro pendiente de forma individual antes de cerrar la caja.
          </Alert>

          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
            {noCobros.length > 0 && (
              <Chip
                clickable
                color="warning"
                variant={vistaActual === "NO_COBROS" ? "filled" : "outlined"}
                label={`No cobrados pendientes ${noCobros.length}`}
                onClick={() => setVistaPendientes("NO_COBROS")}
              />
            )}
            {movimientosPendientes.length > 0 && (
              <Chip
                clickable
                color="info"
                variant={vistaActual === "MOVIMIENTOS" ? "filled" : "outlined"}
                label={`Movimientos pendientes ${movimientosPendientes.length}`}
                onClick={() => setVistaPendientes("MOVIMIENTOS")}
              />
            )}
          </Stack>

          <Stack spacing={1.25}>
            {vistaActual === "NO_COBROS"
              ? noCobros.map((item) => {
                  const isActive =
                    validacionPendiente.tipo === "NO_COBRO" &&
                    String(validacionPendiente.referencia) === String(item.referencia);

                  return (
                    <Paper
                      key={`${item.modulo}-${item.referencia}-${item.fecha}`}
                      variant="outlined"
                      sx={{ p: 1.75, borderRadius: 2.5, backgroundColor: "rgba(15,23,42,0.35)" }}
                    >
                      <Stack spacing={1.5}>
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Box>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip size="small" label={item.modulo} color="warning" />
                              <Chip
                                size="small"
                                label={item.documento ? `${item.referencia} | ${item.documento}` : item.referencia}
                                variant="outlined"
                              />
                            </Stack>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              Cliente: {item.cliente_nombre || "Consumidor final"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Motivo: {item.motivo || "Sin motivo"}
                            </Typography>
                          </Box>

                          <Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={0.5}>
                            <Typography fontWeight="bold" color="warning.main">
                              {formatCurrency(item.monto)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(item.fecha)}
                            </Typography>
                          </Stack>
                        </Stack>

                        {!isActive ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            disabled={readOnly}
                            onClick={() =>
                              setValidacionPendiente({
                                tipo: "NO_COBRO",
                                referencia: String(item.referencia),
                                admin_username: "",
                                admin_password: "",
                                nota: "",
                              })
                            }
                          >
                            Validar este no cobrado
                          </Button>
                        ) : (
                          <Stack spacing={1.5}>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Usuario admin"
                                  value={validacionPendiente.admin_username}
                                  onChange={(event) =>
                                    setValidacionPendiente((prev) => ({
                                      ...prev,
                                      admin_username: event.target.value,
                                    }))
                                  }
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="password"
                                  label="Password admin"
                                  value={validacionPendiente.admin_password}
                                  onChange={(event) =>
                                    setValidacionPendiente((prev) => ({
                                      ...prev,
                                      admin_password: event.target.value,
                                    }))
                                  }
                                />
                              </Grid>
                            </Grid>
                            <TextField
                              fullWidth
                              size="small"
                              multiline
                              minRows={2}
                              label="Nota de validacion"
                              value={validacionPendiente.nota}
                              onChange={(event) =>
                                setValidacionPendiente((prev) => ({
                                  ...prev,
                                  nota: event.target.value,
                                }))
                              }
                            />
                            <Stack direction="row" spacing={1.25}>
                              <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                disabled={loadingAction}
                                onClick={() => handleValidarNoCobroPendiente(item)}
                              >
                                Confirmar validacion
                              </Button>
                              <Button
                                size="small"
                                variant="text"
                                onClick={() =>
                                  setValidacionPendiente({
                                    tipo: "",
                                    referencia: "",
                                    admin_username: "",
                                    admin_password: "",
                                    nota: "",
                                  })
                                }
                              >
                                Cancelar
                              </Button>
                            </Stack>
                          </Stack>
                        )}
                      </Stack>
                    </Paper>
                  );
                })
              : movimientosPendientes.map((item) => {
                  const isActive =
                    validacionPendiente.tipo === "MOVIMIENTO" &&
                    String(validacionPendiente.referencia) === String(item.id_caja_movimiento);

                  return (
                    <Paper
                      key={item.id_caja_movimiento}
                      variant="outlined"
                      sx={{ p: 1.75, borderRadius: 2.5, backgroundColor: "rgba(15,23,42,0.35)" }}
                    >
                      <Stack spacing={1.5}>
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Box>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip
                                size="small"
                                color={item.tipo === "INGRESO" ? "success" : "error"}
                                label={item.tipo}
                              />
                              <Chip
                                size="small"
                                variant="outlined"
                                label={item.categoria || "SIN CATEGORIA"}
                              />
                            </Stack>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              Descripcion: {item.descripcion || "Sin descripcion"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Registrado por: {item.nombre || item.username}
                            </Typography>
                          </Box>

                          <Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={0.5}>
                            <Typography
                              fontWeight="bold"
                              color={item.tipo === "INGRESO" ? "success.main" : "error.main"}
                            >
                              {formatCurrency(item.monto)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(item.fecha)}
                            </Typography>
                          </Stack>
                        </Stack>

                        {!isActive ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="info"
                            disabled={readOnly}
                            onClick={() =>
                              setValidacionPendiente({
                                tipo: "MOVIMIENTO",
                                referencia: String(item.id_caja_movimiento),
                                admin_username: "",
                                admin_password: "",
                                nota: "",
                              })
                            }
                          >
                            Validar este movimiento
                          </Button>
                        ) : (
                          <Stack spacing={1.5}>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Usuario admin"
                                  value={validacionPendiente.admin_username}
                                  onChange={(event) =>
                                    setValidacionPendiente((prev) => ({
                                      ...prev,
                                      admin_username: event.target.value,
                                    }))
                                  }
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="password"
                                  label="Password admin"
                                  value={validacionPendiente.admin_password}
                                  onChange={(event) =>
                                    setValidacionPendiente((prev) => ({
                                      ...prev,
                                      admin_password: event.target.value,
                                    }))
                                  }
                                />
                              </Grid>
                            </Grid>
                            <TextField
                              fullWidth
                              size="small"
                              multiline
                              minRows={2}
                              label="Nota de validacion"
                              value={validacionPendiente.nota}
                              onChange={(event) =>
                                setValidacionPendiente((prev) => ({
                                  ...prev,
                                  nota: event.target.value,
                                }))
                              }
                            />
                            <Stack direction="row" spacing={1.25}>
                              <Button
                                size="small"
                                variant="contained"
                                color="info"
                                disabled={loadingAction}
                                onClick={() => handleValidarMovimientoPendiente(item)}
                              >
                                Confirmar validacion
                              </Button>
                              <Button
                                size="small"
                                variant="text"
                                onClick={() =>
                                  setValidacionPendiente({
                                    tipo: "",
                                    referencia: "",
                                    admin_username: "",
                                    admin_password: "",
                                    nota: "",
                                  })
                                }
                              >
                                Cancelar
                              </Button>
                            </Stack>
                          </Stack>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}
          </Stack>
        </Stack>
      </Paper>
    );
  };

  const renderAutorizacionCierre = (readOnly = false) => {
    if (!requiereAutorizacionCierre) return null;

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 3,
          borderColor: "warning.main",
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.14), rgba(15,23,42,0.45))",
        }}
      >
        <Stack spacing={2}>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            La caja no esta cuadrada. Se requiere autorizacion administrativa para
            cerrar con una diferencia de {formatCurrency(diferenciaCierre)}.
          </Alert>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 3,
              borderColor: "error.main",
              background:
                "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(15,23,42,0.35))",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Diferencia actual
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="error.main">
              {formatCurrency(diferenciaCierre)}
            </Typography>
          </Paper>

          {readOnly ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Modo solo lectura: la diferencia de cierre esta visible, pero esta cuenta no puede autorizar cierres.
            </Alert>
          ) : (
            <>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Usuario admin"
                    value={validacionNoCobro.admin_username}
                    onChange={(event) =>
                      setValidacionNoCobro((prev) => ({
                        ...prev,
                        admin_username: event.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Password admin"
                    value={validacionNoCobro.admin_password}
                    onChange={(event) =>
                      setValidacionNoCobro((prev) => ({
                        ...prev,
                        admin_password: event.target.value,
                      }))
                    }
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Nota de validacion"
                placeholder="Ej. cortesia autorizada, diferencia explicada o ajuste administrativo"
                value={validacionNoCobro.validacion_no_cobro_nota}
                onChange={(event) =>
                  setValidacionNoCobro((prev) => ({
                    ...prev,
                    validacion_no_cobro_nota: event.target.value,
                  }))
                }
              />
            </>
          )}
        </Stack>
      </Paper>
    );
  };

  const renderNoCobrosValidados = (resumen) => {
    const validados = Array.isArray(resumen?.no_cobrados_validados)
      ? resumen.no_cobrados_validados
      : [];

    if (validados.length === 0) return null;

    const copyValidationSummary = async () => {
      const lines = [
        `Sesion de caja #${selectedSesion?.id_caja_sesion || sesionActiva?.id_caja_sesion || "-"}`,
        `Registros validados: ${validados.length}`,
        ...(resumen?.no_cobrados_validados_admins || []).length
          ? [
              `Admins: ${(resumen?.no_cobrados_validados_admins || [])
                .map((admin) => admin.nombre || admin.username)
                .filter(Boolean)
                .join(", ")}`,
            ]
          : [],
        "",
        ...validados.map(
          (item) =>
            `${item.modulo} | ${item.documento || item.referencia || "-"} | Admin: ${
              item.admin_nombre || item.admin_username || "Sin dato"
            } | Fecha: ${formatDateTime(item.fecha_validacion)} | Nota: ${
              item.nota_validacion || "Sin nota"
            }`
        ),
      ];

      try {
        await navigator.clipboard.writeText(lines.join("\n"));
        setSuccess("Validaciones administrativas copiadas correctamente.");
      } catch (error) {
        console.error(error);
        setError("No se pudieron copiar las validaciones administrativas.");
      }
    };

    const printValidationsOnly = () => {
      try {
        const sesionObjetivo = selectedSesion || sesionActiva;
        if (!sesionObjetivo) {
          setError("No hay una sesion disponible para imprimir las validaciones.");
          return;
        }

        const html = buildCajaNoCobrosValidadosHtml({
          sesion: sesionObjetivo,
          resumen,
        });

        openPrintDocument({
          title: `Validaciones no cobrado #${sesionObjetivo.id_caja_sesion}`,
          html,
          width: 1100,
          height: 860,
        });
      } catch (error) {
        console.error(error);
        setError(error.message || "No se pudieron imprimir las validaciones administrativas.");
      }
    };

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 3,
          borderColor: "success.main",
          background:
            "linear-gradient(135deg, rgba(34,197,94,0.14), rgba(15,23,42,0.45))",
        }}
      >
        <Stack spacing={2}>
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            {`Hay ${validados.length} registro(s) no cobrado(s) ya validados con autorizacion administrativa.`}
          </Alert>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<ContentCopyIcon />}
              onClick={copyValidationSummary}
            >
              Copiar validaciones
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<PrintIcon />}
              onClick={printValidationsOnly}
            >
              Imprimir validaciones
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {(resumen?.no_cobrados_validados_admins || []).map((admin) => (
              <Chip
                key={admin.username || admin.nombre}
                size="small"
                color="success"
                variant="outlined"
                label={
                  admin.username
                    ? `${admin.nombre || admin.username} (${admin.username})`
                    : admin.nombre || "Admin"
                }
              />
            ))}
          </Stack>

          <Stack spacing={1.25}>
            {validados.map((item) => (
              <Paper
                key={`${item.modulo}-${item.referencia}-${item.fecha_validacion}`}
                variant="outlined"
                sx={{ p: 1.5, borderRadius: 2, backgroundColor: "rgba(15,23,42,0.35)" }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={item.modulo} color="success" />
                      <Chip
                        size="small"
                        label={item.documento ? `${item.referencia} | ${item.documento}` : item.referencia}
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Validado por: {item.admin_nombre || item.admin_username || "Sin dato"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Nota: {item.nota_validacion || "Sin nota"}
                    </Typography>
                  </Box>

                  <Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={0.5}>
                    <Typography fontWeight="bold" color="success.main">
                      {formatDateTime(item.fecha_validacion)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Registro validado
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Paper>
    );
  };

  const exportarPdf = async () => {
    const sesionObjetivo = selectedSesion || sesionActiva;
    const resumenObjetivo = selectedResumen || resumenActivo;
    const movimientosObjetivoBase = selectedSesion ? selectedMovimientos : movimientos;

    if (!sesionObjetivo || !resumenObjetivo) {
      setError("No hay una sesion de caja disponible para exportar.");
      return;
    }

    try {
      setExportingPdf(true);
      setError("");
      const printWindow = openPrintWindow({
        title: `Corte de caja #${sesionObjetivo.id_caja_sesion}`,
        width: 1200,
        height: 900,
      });

      const response = await getCajaResumen(sesionObjetivo.id_caja_sesion);
      const movimientosObjetivo = Array.isArray(response?.movimientos)
        ? response.movimientos
        : movimientosObjetivoBase;
      const sesionPdf = response?.sesion || sesionObjetivo;
      const resumenPdf = response?.resumen || resumenObjetivo;

      openPrintDocument({
        title: `Corte de caja #${sesionPdf.id_caja_sesion}`,
        html: buildCajaCorteHtml({
          sesion: sesionPdf,
          resumen: resumenPdf,
          movimientos: movimientosObjetivo,
        }),
        width: 1200,
        height: 900,
        printWindow,
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo generar el PDF del corte de caja");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <Box>
      <Paper
        elevation={0}
        sx={(currentTheme) => ({
          ...getSummaryCardSx(currentTheme, "primary", { minHeight: 0 }),
          mb: 3,
        })}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography
                variant="overline"
                color="primary.main"
                sx={{ fontWeight: 800, letterSpacing: "0.16em" }}
              >
                Control financiero
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                <AccountBalanceWalletIcon color="primary" />
                <Typography variant="h4" fontWeight="bold">
                  Caja
                </Typography>
              </Stack>

              <Typography variant="body1" color="text.secondary">
                {canSeeAllSessions
                  ? "Administra aperturas, cierres, conciliacion y sesiones de caja por cajero."
                  : "Opera tu caja, registra movimientos y controla tu cierre con diferencia."}
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="error"
              startIcon={<PictureAsPdfIcon />}
              onClick={exportarPdf}
              disabled={loading || loadingAction || exportingPdf || (!sesionActiva && !selectedSesion)}
              sx={{ borderRadius: 999, px: 3, py: 1.15, boxShadow: "none" }}
            >
              {exportingPdf ? "Generando PDF..." : "Exportar corte PDF"}
            </Button>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              color={canSeeAllSessions ? "primary" : "default"}
              label={canSeeAllSessions ? "Vista global de cajas" : "Vista de mi caja"}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              color={sesionActiva ? "success" : "default"}
              icon={sesionActiva ? <LockOpenIcon /> : <LockIcon />}
              label={sesionActiva ? "Caja abierta" : "Caja cerrada"}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              color="info"
              variant="outlined"
              label={`${sesiones.length} sesiones visibles`}
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

      {isCajeroOnly && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Como cajero solo puedes ver y operar tu propia caja. El historial mostrado corresponde unicamente a tus aperturas y cierres.
        </Alert>
      )}

      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Estas en modo solo lectura. Puedes consultar sesiones, cierres, conciliaciones y pendientes, pero no abrir caja, registrar movimientos ni cerrar sesiones.
        </Alert>
      )}

      {loading ? (
        <Paper elevation={2} sx={(theme) => getSectionPanelSx(theme, { p: 5, radius: 3, accent: "primary" })}>
          <Typography color="text.secondary">Cargando modulo de caja...</Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {!sesionActiva ? (
            <Paper elevation={3} sx={(theme) => getSectionPanelSx(theme, { p: 3, radius: 4, accent: "success" })}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                <LockOpenIcon color="success" />
                <Typography variant="h6" fontWeight="bold">
                  Apertura de caja
                </Typography>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Monto de apertura"
                    value={apertura.monto_apertura}
                    onChange={(event) =>
                      setApertura((prev) => ({ ...prev, monto_apertura: event.target.value }))
                    }
                    inputProps={{ min: 0, step: "0.01" }}
                    disabled={!canOperateCaja}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Observaciones de apertura"
                    placeholder="Ej. fondo inicial de caja, cambio disponible"
                    value={apertura.observaciones_apertura}
                    onChange={(event) =>
                      setApertura((prev) => ({ ...prev, observaciones_apertura: event.target.value }))
                    }
                    disabled={!canOperateCaja}
                  />
                </Grid>
              </Grid>

              {canOperateCaja ? (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleAbrirCaja}
                  disabled={loadingAction}
                  sx={{ mt: 3 }}
                >
                  {loadingAction ? "Abriendo..." : "Abrir caja"}
                </Button>
              ) : (
                <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
                  Modo solo lectura: puedes consultar el historial de caja, pero no abrir una sesion nueva.
                </Alert>
              )}
            </Paper>
          ) : (
            <>
              <Paper elevation={3} sx={(theme) => getSectionPanelSx(theme, { p: 3, radius: 4, accent: "primary" })}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={2}
                  mb={2}
                >
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Sesion activa
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Abierta el {formatDateTime(sesionActiva.fecha_apertura)} por {sesionActiva.nombre || sesionActiva.username}
                    </Typography>
                  </Box>

                  <Chip
                    icon={<PaidIcon />}
                    label={`Apertura ${formatCurrency(sesionActiva.monto_apertura)}`}
                    color="primary"
                    variant="outlined"
                  />
                </Stack>

                {renderSummaryCards(resumenActivo)}
              </Paper>

              <Grid container spacing={3}>
                <Grid item xs={12} lg={7}>
                  <Paper elevation={3} sx={(theme) => ({ ...getSectionPanelSx(theme, { p: 3, radius: 4, accent: "info" }), height: "100%" })}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                      <ReceiptLongIcon color="primary" />
                      <Typography variant="h6" fontWeight="bold">
                        Movimientos manuales
                      </Typography>
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <Select
                          fullWidth
                          value={movimiento.tipo}
                          onChange={(event) =>
                            setMovimiento((prev) => ({
                              ...prev,
                              tipo: event.target.value,
                              categoria: "",
                            }))
                          }
                          disabled={!canOperateCaja}
                        >
                          <MenuItem value="INGRESO">Ingreso</MenuItem>
                          <MenuItem value="EGRESO">Egreso</MenuItem>
                        </Select>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Select
                          fullWidth
                          value={movimiento.categoria}
                          onChange={(event) =>
                            setMovimiento((prev) => ({ ...prev, categoria: event.target.value }))
                          }
                          displayEmpty
                          disabled={!canOperateCaja}
                        >
                          <MenuItem value="" disabled>
                            {movimiento.tipo === "EGRESO"
                              ? "Categoria de gasto"
                              : "Categoria de ingreso"}
                          </MenuItem>
                          {(movimiento.tipo === "EGRESO"
                            ? EGRESO_CATEGORIAS
                            : INGRESO_CATEGORIAS
                          ).map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Monto"
                          value={movimiento.monto}
                          onChange={(event) =>
                            setMovimiento((prev) => ({ ...prev, monto: event.target.value }))
                          }
                          inputProps={{ min: 0, step: "0.01" }}
                          disabled={!canOperateCaja}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Descripcion"
                          value={movimiento.descripcion}
                          onChange={(event) =>
                            setMovimiento((prev) => ({ ...prev, descripcion: event.target.value }))
                          }
                          placeholder="Motivo del movimiento"
                          disabled={!canOperateCaja}
                        />
                      </Grid>
                    </Grid>

                    <Alert severity="info" sx={{ mt: 2.5, borderRadius: 2 }}>
                      Los ingresos y egresos manuales se registran de inmediato, pero quedaran pendientes de validacion administrativa hasta el cierre de caja.
                    </Alert>

                    {canOperateCaja ? (
                      <Button
                        variant="contained"
                        onClick={handleRegistrarMovimiento}
                        disabled={loadingAction}
                        sx={{ mt: 2.5 }}
                      >
                        {loadingAction ? "Guardando..." : "Registrar movimiento"}
                      </Button>
                    ) : (
                      <Alert severity="info" sx={{ mt: 2.5, borderRadius: 2 }}>
                        Modo solo lectura: puedes revisar los movimientos manuales, pero no registrar ingresos o egresos.
                      </Alert>
                    )}

                    <Divider sx={{ my: 3 }} />

                    <Stack spacing={1.5}>
                      {movimientos.length === 0 ? (
                        <Typography color="text.secondary">
                          Todavia no hay movimientos manuales registrados en esta caja.
                        </Typography>
                      ) : (
                        movimientos.map((item) => (
                          <Paper key={item.id_caja_movimiento} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                            <Stack
                              direction={{ xs: "column", md: "row" }}
                              justifyContent="space-between"
                              spacing={1}
                            >
                              <Box>
                                <Typography fontWeight="bold">
                                  {item.tipo} {item.categoria ? `| ${item.categoria}` : ""}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {item.descripcion || "Sin descripcion"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDateTime(item.fecha)} | {item.nombre || item.username}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {(item.admin_autoriza_nombre || item.admin_autoriza_username)
                                    ? `Validado por admin: ${item.admin_autoriza_nombre || item.admin_autoriza_username}`
                                    : "Pendiente de validacion administrativa"}
                                </Typography>
                              </Box>

                              <Typography
                                fontWeight="bold"
                                color={item.tipo === "INGRESO" ? "success.main" : "error.main"}
                              >
                                {item.tipo === "INGRESO" ? "+" : "-"} {formatCurrency(item.monto)}
                              </Typography>
                            </Stack>
                          </Paper>
                        ))
                      )}
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} lg={5}>
                  <Paper elevation={3} sx={(theme) => ({ ...getSectionPanelSx(theme, { p: 3, radius: 4, accent: "warning" }), height: "100%" })}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                      <LockIcon color="warning" />
                      <Typography variant="h6" fontWeight="bold">
                        Cierre de caja
                      </Typography>
                    </Stack>

                    <Stack spacing={2}>
                      {renderPendientesPorValidar(!canOperateCaja)}
                      {renderNoCobrosValidados(resumenActivo)}
                      {renderAutorizacionCierre(!canOperateCaja)}

                      <TextField
                        fullWidth
                        type="number"
                        label="Monto contado al cierre"
                        value={cierre.monto_cierre_reportado}
                        onChange={(event) =>
                          setCierre((prev) => ({ ...prev, monto_cierre_reportado: event.target.value }))
                        }
                        inputProps={{ min: 0, step: "0.01" }}
                        disabled={!canOperateCaja}
                      />

                      <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Observaciones de cierre"
                        value={cierre.observaciones_cierre}
                        onChange={(event) =>
                          setCierre((prev) => ({ ...prev, observaciones_cierre: event.target.value }))
                        }
                        placeholder="Ej. diferencia explicada, retiro final, entrega de turno"
                        disabled={!canOperateCaja}
                      />

                      <Paper variant="outlined" sx={(theme) => getSummaryCardSx(theme, "secondary", { compact: true, minHeight: 112 })}>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          Cierre esperado segun sistema
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color="primary.main">
                          {formatCurrency(resumenActivo?.cierre_calculado)}
                        </Typography>
                      </Paper>

                      {canOperateCaja ? (
                        <Button
                          variant="contained"
                          color="warning"
                          onClick={handleCerrarCaja}
                          disabled={
                            loadingAction ||
                            (requiereAutorizacionCierre &&
                              (!String(validacionNoCobro.admin_username || "").trim() ||
                                !String(validacionNoCobro.admin_password || "").trim()))
                          }
                        >
                          {loadingAction ? "Cerrando..." : "Cerrar caja"}
                        </Button>
                      ) : (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                          Modo solo lectura: puedes revisar el cierre, pero no validar pendientes ni cerrar caja.
                        </Alert>
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>

              {renderConciliacion(resumenActivo)}
              {renderGastosCategoria(resumenActivo)}
            </>
          )}

          <Paper elevation={3} sx={(theme) => getSectionPanelSx(theme, { p: 3, radius: 4, accent: "secondary" })}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={2}
              mb={2}
            >
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Historial de sesiones
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {canSeeAllSessions
                    ? "Como administrador puedes consultar sesiones de caja de todos los cajeros."
                    : "Aqui puedes revisar solo tus aperturas y cierres anteriores."}
                </Typography>
              </Box>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                sx={{ width: { xs: "100%", md: "auto" } }}
              >
                {canSeeAllSessions && (
                  <TextField
                    value={filtroUsuario}
                    onChange={(event) => {
                      setFiltroUsuario(event.target.value);
                      setPage(0);
                    }}
                    placeholder="Buscar cajero"
                    sx={{ minWidth: { xs: "100%", md: 220 } }}
                  />
                )}
                <Select
                  value={estadoFiltro}
                  onChange={(event) => {
                    setEstadoFiltro(event.target.value);
                    setPage(0);
                  }}
                  sx={{ minWidth: { xs: "100%", md: 180 } }}
                >
                  <MenuItem value="TODOS">Todos</MenuItem>
                  <MenuItem value="ABIERTA">Abiertas</MenuItem>
                  <MenuItem value="CERRADA">Cerradas</MenuItem>
                </Select>
              </Stack>
            </Stack>

            {esMovil ? (
              <Stack spacing={1.5}>
                {sesiones.map((sesion) => {
                  const selected =
                    Number(selectedSesion?.id_caja_sesion) === Number(sesion.id_caja_sesion);

                  return (
                    <Paper
                      key={sesion.id_caja_sesion}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        borderColor: selected ? "primary.main" : "divider",
                        backgroundColor: selected ? "rgba(59,130,246,0.08)" : "transparent",
                      }}
                    >
                      <Stack spacing={1.25}>
                        <Box display="flex" justifyContent="space-between" gap={2}>
                          <Box>
                            <Typography fontWeight="bold">
                              {sesion.nombre || sesion.username}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {sesion.username}
                            </Typography>
                          </Box>

                          <Chip
                            label={sesion.estado}
                            color={sesion.estado === "ABIERTA" ? "success" : "default"}
                            size="small"
                          />
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          Apertura: {formatDateTime(sesion.fecha_apertura)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cierre: {sesion.fecha_cierre ? formatDateTime(sesion.fecha_cierre) : "Pendiente"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Monto apertura: {formatCurrency(sesion.monto_apertura)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cierre calculado: {sesion.monto_cierre_calculado != null
                            ? formatCurrency(sesion.monto_cierre_calculado)
                            : "Pendiente"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Diferencia: {sesion.diferencia != null ? formatCurrency(sesion.diferencia) : "Pendiente"}
                        </Typography>

                        <Button
                          size="small"
                          onClick={() => verResumenSesion(sesion.id_caja_sesion)}
                          disabled={loadingAction}
                          fullWidth
                        >
                          {selected ? "Resumen abierto" : "Ver resumen"}
                        </Button>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={getTableHeaderRowSx(theme)}>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Cajero</TableCell>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Fecha apertura</TableCell>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Fecha cierre</TableCell>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Estado</TableCell>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Monto apertura</TableCell>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Cierre calculado</TableCell>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Diferencia</TableCell>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Accion</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sesiones.map((sesion) => (
                      <TableRow
                        key={sesion.id_caja_sesion}
                        hover
                        selected={Number(selectedSesion?.id_caja_sesion) === Number(sesion.id_caja_sesion)}
                        sx={
                          Number(selectedSesion?.id_caja_sesion) === Number(sesion.id_caja_sesion)
                            ? {
                                "& td": {
                                  backgroundColor: "rgba(59,130,246,0.10)",
                                },
                              }
                            : undefined
                        }
                      >
                        <TableCell>
                          <Typography fontWeight="bold">
                            {sesion.nombre || sesion.username}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {sesion.username}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDateTime(sesion.fecha_apertura)}</TableCell>
                        <TableCell>
                          {sesion.fecha_cierre ? formatDateTime(sesion.fecha_cierre) : "Pendiente"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={sesion.estado}
                            color={sesion.estado === "ABIERTA" ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatCurrency(sesion.monto_apertura)}</TableCell>
                        <TableCell>
                          {sesion.monto_cierre_calculado != null
                            ? formatCurrency(sesion.monto_cierre_calculado)
                            : "Pendiente"}
                        </TableCell>
                        <TableCell>
                          {sesion.diferencia != null ? formatCurrency(sesion.diferencia) : "Pendiente"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => verResumenSesion(sesion.id_caja_sesion)}
                            disabled={loadingAction}
                          >
                            {Number(selectedSesion?.id_caja_sesion) === Number(sesion.id_caja_sesion)
                              ? "Resumen abierto"
                              : "Ver resumen"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <TablePagination
              component="div"
              count={meta.totalRows}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[8, 12, 20]}
              labelRowsPerPage="Filas por pagina"
            />
          </Paper>

          {selectedSesion && selectedResumen && (
            <Paper ref={resumenSesionRef} elevation={3} sx={(theme) => getSectionPanelSx(theme, { p: 3, radius: 4, accent: "info" })}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={1.5}
                mb={3}
              >
                <Box>
                  <Typography variant="h6" fontWeight="bold" mb={1}>
                    Resumen de sesion #{selectedSesion.id_caja_sesion}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDateTime(selectedSesion.fecha_apertura)}
                    {selectedSesion.fecha_cierre
                      ? ` a ${formatDateTime(selectedSesion.fecha_cierre)}`
                      : " - Caja aun abierta"}
                  </Typography>
                </Box>

                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setSelectedSesion(null);
                    setSelectedResumen(null);
                    setSelectedMovimientos([]);
                  }}
                >
                  Ocultar resumen
                </Button>
              </Stack>

              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                {canSeeAllSessions
                  ? `Resumen de caja del cajero ${selectedSesion.nombre || selectedSesion.username}.`
                  : "Resumen de tu sesion de caja."}
              </Alert>

              {renderSummaryCards(selectedResumen)}
              <Stack spacing={2} sx={{ mt: 3 }}>
                {renderNoCobrosPendientes(selectedResumen)}
                {renderNoCobrosValidados(selectedResumen)}
                {renderConciliacion(selectedResumen)}
                {renderGastosCategoria(selectedResumen)}
              </Stack>
            </Paper>
          )}
        </Stack>
      )}
    </Box>
  );
}

export default Caja;
