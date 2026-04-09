import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ClienteTable from "../components/clientes/ClienteTable";
import ClienteFormModal from "../components/ui/ClienteFormModal";
import { useAuth } from "../hooks/useAuth";
import { userHasRole } from "../utils/roles";
import { getFilterPanelSx } from "../utils/filterPanelStyles";
import {
  crearCliente,
  desactivarCliente,
  editarCliente,
  getClientes,
} from "../services/clienteService";

const normalizarClientes = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
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

function Clientes() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [nitFiltro, setNitFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [modalOpen, setModalOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [loadingLista, setLoadingLista] = useState(true);
  const [loadingGuardar, setLoadingGuardar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const cargarClientes = useCallback(async () => {
    try {
      setLoadingLista(true);
      setError("");
      const data = await getClientes({ incluirInactivos: true });
      setClientes(normalizarClientes(data));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudieron cargar los clientes");
    } finally {
      setLoadingLista(false);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();
    const nitTexto = nitFiltro.toLowerCase().trim();

    return clientes.filter((cliente) => {
      const coincideTexto =
        !texto ||
        String(cliente.nombre || "").toLowerCase().includes(texto) ||
        String(cliente.codigo || "").toLowerCase().includes(texto) ||
        String(cliente.correo || "").toLowerCase().includes(texto) ||
        String(cliente.telefono || "").toLowerCase().includes(texto) ||
        String(cliente.direccion || "").toLowerCase().includes(texto);

      const coincideNit =
        !nitTexto ||
        String(cliente.nit || "").toLowerCase().includes(nitTexto);

      const coincideEstado =
        estadoFiltro === "TODOS" ||
        (estadoFiltro === "ACTIVOS" && cliente.estado) ||
        (estadoFiltro === "INACTIVOS" && !cliente.estado);

      return coincideTexto && coincideNit && coincideEstado;
    });
  }, [clientes, busqueda, nitFiltro, estadoFiltro]);

  const ultimoCodigoGenerado = useMemo(() => {
    return obtenerUltimoCodigoCliente(clientes);
  }, [clientes]);

  const canManageClientes = useMemo(() => {
    return userHasRole(user, "ADMIN");
  }, [user]);

  const abrirNuevo = () => {
    setClienteEditando(null);
    setModalOpen(true);
  };

  const abrirEditar = (cliente) => {
    setClienteEditando(cliente);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setClienteEditando(null);
  };

  const guardarCliente = async (formData) => {
    try {
      setLoadingGuardar(true);
      setError("");
      setSuccess("");

      if (clienteEditando) {
        await editarCliente(clienteEditando.id_cliente, formData);
        setSuccess("Cliente actualizado correctamente.");
      } else {
        const response = await crearCliente(formData);
        const codigoGenerado = response?.cliente?.codigo;
        setSuccess(
          codigoGenerado
            ? `Cliente creado correctamente. Codigo asignado: ${codigoGenerado}.`
            : "Cliente creado correctamente."
        );
      }

      await cargarClientes();
      cerrarModal();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo guardar el cliente");
    } finally {
      setLoadingGuardar(false);
    }
  };

  const inactivarCliente = async (cliente) => {
    if (!cliente.estado) return;

    const confirmar = window.confirm(
      `Deseas desactivar el cliente "${cliente.nombre}"?`
    );

    if (!confirmar) return;

    try {
      setError("");
      setSuccess("");
      await desactivarCliente(cliente.id_cliente);
      setSuccess("Cliente desactivado correctamente.");
      await cargarClientes();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo desactivar el cliente");
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
            <PersonOutlineIcon color="primary" />
            <Typography variant="h4" fontWeight="bold">
              Clientes
            </Typography>
          </Stack>

          <Typography variant="body1" color="text.secondary">
            Administra el catalogo de clientes del sistema
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {ultimoCodigoGenerado?.codigo
              ? `Ultimo codigo generado: ${ultimoCodigoGenerado.codigo}`
              : "Aun no hay codigos generados para clientes."}
          </Typography>
        </Box>

        {canManageClientes && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={abrirNuevo}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Nuevo cliente
          </Button>
        )}
      </Stack>

      {!canManageClientes && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Puedes consultar los clientes, pero solo un administrador puede crear, editar o desactivar.
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
            label="Buscar cliente"
            placeholder="Buscar por nombre, codigo, correo, telefono o direccion"
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
            Cargando clientes...
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
          <ClienteTable
            clientes={clientesFiltrados}
            onEdit={abrirEditar}
            onDeactivate={inactivarCliente}
            canManage={canManageClientes}
          />
        </Paper>
      )}

      {canManageClientes && (
        <ClienteFormModal
          key={`${clienteEditando?.id_cliente ?? "new"}-${modalOpen ? "open" : "closed"}`}
          open={modalOpen}
          onClose={cerrarModal}
          onSave={guardarCliente}
          loading={loadingGuardar}
          clienteEditando={clienteEditando}
        />
      )}
    </Box>
  );
}

export default Clientes;
