import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
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
import AddIcon from "@mui/icons-material/Add";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ProveedorTable from "../components/proveedores/ProveedorTable";
import { useAuth } from "../hooks/useAuth";
import { userHasRole } from "../utils/roles";
import CompraDetalleModal from "../components/ui/CompraDetalleModal";
import ProveedorFormModal from "../components/ui/ProveedorFormModal";
import { getFilterPanelSx } from "../utils/filterPanelStyles";
import {
  crearProveedor,
  desactivarProveedor,
  editarProveedor,
  getProveedores,
} from "../services/proveedorService";
import { getCompraById, getCompras } from "../services/compraService";

const normalizarProveedores = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

function Proveedores() {
  const { user } = useAuth();
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [nitFiltro, setNitFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [modalOpen, setModalOpen] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState(null);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [comprasProveedor, setComprasProveedor] = useState([]);
  const [totalComprasProveedor, setTotalComprasProveedor] = useState(0);
  const [compraDetalle, setCompraDetalle] = useState(null);
  const [loadingLista, setLoadingLista] = useState(true);
  const [loadingGuardar, setLoadingGuardar] = useState(false);
  const [loadingComprasProveedor, setLoadingComprasProveedor] = useState(false);
  const [loadingCompraDetalle, setLoadingCompraDetalle] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManageProveedores = useMemo(() => userHasRole(user, "ADMIN"), [user]);

  const cargarProveedores = useCallback(async () => {
    try {
      setLoadingLista(true);
      setError("");
      const data = await getProveedores({ incluirInactivos: true });
      setProveedores(normalizarProveedores(data));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudieron cargar los proveedores");
    } finally {
      setLoadingLista(false);
    }
  }, []);

  useEffect(() => {
    cargarProveedores();
  }, [cargarProveedores]);

  const proveedoresFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();
    const nitTexto = nitFiltro.toLowerCase().trim();

    return proveedores.filter((proveedor) => {
      const coincideTexto =
        !texto ||
        String(proveedor.nombre || "").toLowerCase().includes(texto) ||
        String(proveedor.correo || "").toLowerCase().includes(texto) ||
        String(proveedor.telefono || "").toLowerCase().includes(texto) ||
        String(proveedor.direccion || "").toLowerCase().includes(texto);

      const coincideNit =
        !nitTexto ||
        String(proveedor.nit || "").toLowerCase().includes(nitTexto);

      const coincideEstado =
        estadoFiltro === "TODOS" ||
        (estadoFiltro === "ACTIVOS" && proveedor.estado) ||
        (estadoFiltro === "INACTIVOS" && !proveedor.estado);

      return (
        coincideTexto &&
        coincideNit &&
        coincideEstado
      );
    });
  }, [proveedores, busqueda, nitFiltro, estadoFiltro]);

  const cargarComprasProveedor = async (proveedor) => {
    try {
      setProveedorSeleccionado(proveedor);
      setLoadingComprasProveedor(true);

      const data = await getCompras({
        id_proveedor: proveedor.id_proveedor,
        limit: 10,
        sortBy: "fecha",
        sortDir: "desc",
      });

      const compras = Array.isArray(data?.data) ? data.data : [];
      setComprasProveedor(compras);
      setTotalComprasProveedor(Number(data?.meta?.totalRows || compras.length));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo cargar el historial de compras");
      setComprasProveedor([]);
      setTotalComprasProveedor(0);
    } finally {
      setLoadingComprasProveedor(false);
    }
  };

  const abrirDetalleCompra = async (id_compra) => {
    try {
      setLoadingCompraDetalle(true);
      const data = await getCompraById(id_compra);
      setCompraDetalle(data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo cargar el detalle de la compra");
    } finally {
      setLoadingCompraDetalle(false);
    }
  };

  const abrirNuevo = () => {
    setProveedorEditando(null);
    setModalOpen(true);
  };

  const abrirEditar = (proveedor) => {
    setProveedorEditando(proveedor);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setProveedorEditando(null);
  };

  const guardarProveedor = async (formData) => {
    try {
      setLoadingGuardar(true);
      setError("");
      setSuccess("");

      if (proveedorEditando) {
        const response = await editarProveedor(proveedorEditando.id_proveedor, formData);
        const proveedorActualizado = response?.proveedor;
        setSuccess("Proveedor actualizado correctamente.");

        if (
          proveedorActualizado &&
          proveedorSeleccionado?.id_proveedor === proveedorActualizado.id_proveedor
        ) {
          setProveedorSeleccionado(proveedorActualizado);
        }
      } else {
        const response = await crearProveedor(formData);
        const proveedorCreado = response?.proveedor;
        setSuccess("Proveedor creado correctamente.");

        if (proveedorCreado) {
          setProveedorSeleccionado(proveedorCreado);
          setComprasProveedor([]);
          setTotalComprasProveedor(0);
        }
      }

      await cargarProveedores();
      cerrarModal();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo guardar el proveedor");
    } finally {
      setLoadingGuardar(false);
    }
  };

  const inactivarProveedor = async (proveedor) => {
    if (!proveedor.estado) return;

    const confirmar = window.confirm(
      `Deseas desactivar el proveedor "${proveedor.nombre}"?`
    );

    if (!confirmar) return;

    try {
      setError("");
      setSuccess("");
      await desactivarProveedor(proveedor.id_proveedor);
      setSuccess("Proveedor desactivado correctamente.");
      await cargarProveedores();

      if (proveedorSeleccionado?.id_proveedor === proveedor.id_proveedor) {
        setProveedorSeleccionado((prev) =>
          prev ? { ...prev, estado: false } : prev
        );
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo desactivar el proveedor");
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
            <LocalShippingIcon color="primary" />
            <Typography variant="h4" fontWeight="bold">
              Proveedores
            </Typography>
          </Stack>

          <Typography variant="body1" color="text.secondary">
            {canManageProveedores
              ? "Administra los proveedores disponibles para el modulo de compras"
              : "Modo solo lectura: puedes consultar proveedores y su historial de compras."}
          </Typography>
        </Box>

        {canManageProveedores && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={abrirNuevo}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Nuevo proveedor
          </Button>
        )}
      </Stack>

      {!canManageProveedores && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Este perfil puede consultar proveedores y compras relacionadas, pero no crear, editar ni desactivar.
        </Alert>
      )}

      <Paper elevation={2} sx={(theme) => getFilterPanelSx(theme, { mb: 3 })}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <TextField
            fullWidth
            label="Buscar proveedor"
            placeholder="Buscar por nombre, correo, telefono o direccion"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
          <TextField
            label="Filtrar por NIT"
            placeholder="Ej. CF o 1234567-8"
            value={nitFiltro}
            onChange={(event) => setNitFiltro(event.target.value)}
            sx={{ minWidth: { xs: "100%", md: 220 } }}
          />
          <Select
            value={estadoFiltro}
            onChange={(event) => setEstadoFiltro(event.target.value)}
            sx={{ minWidth: { xs: "100%", md: 180 } }}
          >
            <MenuItem value="TODOS">Todos</MenuItem>
            <MenuItem value="ACTIVOS">Activos</MenuItem>
            <MenuItem value="INACTIVOS">Inactivos</MenuItem>
          </Select>
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

      {loadingLista ? (
        <Paper
          elevation={2}
          sx={{
            p: 5,
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <CircularProgress />
          <Typography color="text.secondary">
            Cargando proveedores...
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
          <ProveedorTable
            proveedores={proveedoresFiltrados}
            onEdit={abrirEditar}
            onDeactivate={inactivarProveedor}
            onViewHistory={cargarComprasProveedor}
            canManage={canManageProveedores}
          />
        </Paper>
      )}

      <Paper elevation={2} sx={{ p: 3, mt: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Historial de compras relacionadas
        </Typography>

        {!proveedorSeleccionado ? (
          <Typography color="text.secondary">
            Selecciona un proveedor en la tabla para ver sus compras recientes.
          </Typography>
        ) : loadingComprasProveedor ? (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={24} />
            <Typography color="text.secondary">
              Cargando compras de {proveedorSeleccionado.nombre}...
            </Typography>
          </Stack>
        ) : (
          <Box>
            <Stack spacing={0.5} mb={2}>
              <Typography variant="subtitle1" fontWeight="bold">
                {proveedorSeleccionado.nombre}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                NIT: {proveedorSeleccionado.nit}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Compras encontradas: {totalComprasProveedor}
              </Typography>
            </Stack>

            {comprasProveedor.length === 0 ? (
              <Typography color="text.secondary">
                Este proveedor todavia no tiene compras registradas.
              </Typography>
            ) : (
              <List disablePadding>
                {comprasProveedor.map((compra, index) => (
                  <Box key={compra.id_compra}>
                    <ListItem
                      disableGutters
                      sx={{ py: 1.5, cursor: "pointer" }}
                      onClick={() => abrirDetalleCompra(compra.id_compra)}
                    >
                      <ListItemText
                        primary={`Compra #${compra.id_compra} | ${compra.no_documento || "Sin documento"}`}
                        secondary={`${compra.fecha || "Sin fecha"} | ${compra.estado || "Sin estado"} | Clic para ver detalle`}
                      />
                      <Typography fontWeight="bold" color="primary.main">
                        Q {Number(compra.total || 0).toFixed(2)}
                      </Typography>
                    </ListItem>
                    {index < comprasProveedor.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}

            {totalComprasProveedor > comprasProveedor.length && (
              <Typography variant="body2" color="text.secondary" mt={2}>
                Mostrando las 10 compras mas recientes.
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {canManageProveedores && (
        <ProveedorFormModal
          key={`${proveedorEditando?.id_proveedor ?? "new"}-${modalOpen ? "open" : "closed"}`}
          open={modalOpen}
          onClose={cerrarModal}
          onSave={guardarProveedor}
          loading={loadingGuardar}
          proveedorEditando={proveedorEditando}
        />
      )}

      <CompraDetalleModal
        open={Boolean(compraDetalle) || loadingCompraDetalle}
        onClose={() => setCompraDetalle(null)}
        compraData={compraDetalle}
        loading={loadingCompraDetalle}
      />
    </Box>
  );
}

export default Proveedores;
