import { useCallback, useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
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
import UsuarioTable from "../components/usuarios/UsuarioTable";
import UsuarioFormModal from "../components/ui/UsuarioFormModal";
import { useAuth } from "../hooks/useAuth";
import { userHasRole } from "../utils/roles";
import { getFilterPanelSx } from "../utils/filterPanelStyles";
import { getRoles } from "../services/rolService";
import {
  activarUsuario,
  asignarRolUsuario,
  crearUsuario,
  desactivarUsuario,
  editarUsuario,
  getUsuarios,
  quitarRolUsuario,
} from "../services/usuarioService";

const normalizarNombreRol = (nombreRol) => {
  const normalized = String(nombreRol || "").trim().toUpperCase();
  return normalized === "SUPERADMIN" ? "SUPER_ADMIN" : normalized;
};

const dedupeRoles = (roles) => {
  const seen = new Set();

  return (Array.isArray(roles) ? roles : [])
    .map((rol) => ({
      ...rol,
      nombre_rol: normalizarNombreRol(rol?.nombre_rol),
    }))
    .filter((rol) => {
      const key = normalizarNombreRol(rol?.nombre_rol);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((rol) => ({
      ...rol,
      nombre_rol: normalizarNombreRol(rol?.nombre_rol),
    }));
};

const normalizarUsuarios = (data) => {
  const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return rows.map((usuario) => ({
    ...usuario,
    roles: dedupeRoles(usuario?.roles),
  }));
};

const normalizarRoles = (data) => {
  const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return dedupeRoles(rows);
};

function Usuarios() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [modalOpen, setModalOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [loadingLista, setLoadingLista] = useState(true);
  const [loadingGuardar, setLoadingGuardar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManageUsuarios = useMemo(() => userHasRole(user, "SUPER_ADMIN"), [user]);

  const cargarCatalogos = useCallback(async () => {
    try {
      setLoadingLista(true);
      setError("");

      const [usuariosData, rolesData] = await Promise.all([
        getUsuarios(),
        canManageUsuarios ? getRoles() : Promise.resolve([]),
      ]);

      setUsuarios(normalizarUsuarios(usuariosData));
      setRoles(normalizarRoles(rolesData));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudieron cargar los usuarios");
    } finally {
      setLoadingLista(false);
    }
  }, [canManageUsuarios]);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    return usuarios.filter((usuario) => {
      const coincideTexto =
        !texto ||
        String(usuario.username || "").toLowerCase().includes(texto) ||
        String(usuario.nombre || "").toLowerCase().includes(texto) ||
        String(usuario.persona_nombre || "").toLowerCase().includes(texto) ||
        String(usuario.persona_apellido || "").toLowerCase().includes(texto) ||
        String(usuario.telefono || "").toLowerCase().includes(texto);

      const coincideEstado =
        estadoFiltro === "TODOS" ||
        (estadoFiltro === "ACTIVOS" && usuario.activo) ||
        (estadoFiltro === "INACTIVOS" && !usuario.activo);

      return coincideTexto && coincideEstado;
    });
  }, [usuarios, busqueda, estadoFiltro]);

  const abrirNuevo = () => {
    setUsuarioEditando(null);
    setModalOpen(true);
  };

  const abrirEditar = (usuario) => {
    setUsuarioEditando(usuario);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setUsuarioEditando(null);
  };

  const sincronizarRolesUsuario = async (idUsuario, rolesSeleccionados, rolesActuales) => {
    const actuales = new Set((rolesActuales || []).map((rol) => Number(rol.id_rol)));
    const nuevos = new Set((rolesSeleccionados || []).map(Number));

    const porAgregar = [...nuevos].filter((idRol) => !actuales.has(idRol));
    const porQuitar = [...actuales].filter((idRol) => !nuevos.has(idRol));

    for (const idRol of porAgregar) {
      await asignarRolUsuario(idUsuario, idRol);
    }

    for (const idRol of porQuitar) {
      await quitarRolUsuario(idUsuario, idRol);
    }
  };

  const guardarUsuario = async (formData) => {
    try {
      setLoadingGuardar(true);
      setError("");
      setSuccess("");

      if (usuarioEditando) {
        await editarUsuario(usuarioEditando.id_usuario, {
          username: formData.username,
          password: formData.password?.trim() || undefined,
          nombre: `${formData.persona.nombre} ${formData.persona.apellido}`.trim(),
          persona: {
            nombre: formData.persona.nombre,
            apellido: formData.persona.apellido,
            dpi_persona: formData.persona.dpi_persona || null,
            telefono: formData.persona.telefono || null,
            direccion_persona: formData.persona.direccion_persona || null,
          },
        });

        await sincronizarRolesUsuario(
          usuarioEditando.id_usuario,
          formData.roles,
          usuarioEditando.roles
        );

        setSuccess("Usuario actualizado correctamente.");
      } else {
        await crearUsuario({
          username: formData.username,
          password: formData.password,
          roles: formData.roles,
          persona: {
            nombre: formData.persona.nombre,
            apellido: formData.persona.apellido,
            dpi_persona: formData.persona.dpi_persona || null,
            telefono: formData.persona.telefono || null,
            direccion_persona: formData.persona.direccion_persona || null,
          },
        });

        setSuccess("Usuario creado correctamente.");
      }

      await cargarCatalogos();
      cerrarModal();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo guardar el usuario");
    } finally {
      setLoadingGuardar(false);
    }
  };

  const toggleActivoUsuario = async (usuario) => {
    const accion = usuario.activo ? "desactivar" : "activar";
    const confirmar = window.confirm(
      `Deseas ${accion} el usuario "${usuario.username}"?`
    );

    if (!confirmar) return;

    try {
      setError("");
      setSuccess("");

      if (usuario.activo) {
        await desactivarUsuario(usuario.id_usuario);
        setSuccess("Usuario desactivado correctamente.");
      } else {
        await activarUsuario(usuario.id_usuario);
        setSuccess("Usuario activado correctamente.");
      }

      await cargarCatalogos();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo actualizar el usuario");
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
            <AdminPanelSettingsIcon color="primary" />
            <Typography variant="h4" fontWeight="bold">
              Usuarios
            </Typography>
          </Stack>

          <Typography variant="body1" color="text.secondary">
            {canManageUsuarios
              ? "Modulo exclusivo para SUPER_ADMIN: crea usuarios, activa cuentas y asigna roles."
              : "Modo solo lectura: puedes consultar usuarios, roles y estados sin realizar cambios."}
          </Typography>
        </Box>

        {canManageUsuarios && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={abrirNuevo}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Nuevo usuario
          </Button>
        )}
      </Stack>

      {!canManageUsuarios && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Este perfil puede consultar los usuarios y sus roles, pero no crear, editar ni desactivar.
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
            label="Buscar usuario"
            placeholder="Buscar por username, nombre o telefono"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
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
            Cargando usuarios...
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
          <UsuarioTable
            usuarios={usuariosFiltrados}
            onEdit={abrirEditar}
            onToggleActivo={toggleActivoUsuario}
            canManage={canManageUsuarios}
          />
        </Paper>
      )}

      {canManageUsuarios && (
        <UsuarioFormModal
          key={`${usuarioEditando?.id_usuario ?? "new"}-${modalOpen ? "open" : "closed"}`}
          open={modalOpen}
          onClose={cerrarModal}
          onSave={guardarUsuario}
          loading={loadingGuardar}
          usuarioEditando={usuarioEditando}
          roles={roles}
        />
      )}
    </Box>
  );
}

export default Usuarios;
