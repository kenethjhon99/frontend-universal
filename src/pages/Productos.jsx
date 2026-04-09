import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductoFormModal from "../components/productos/ProductoFormModal";
import ProductoTable from "../components/productos/ProductoTable";

import {
  getProductos,
  crearProducto,
  editarProducto,
  desactivarProducto,
} from "../services/productoService";

import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import { useAuth } from "../hooks/useAuth";
import { isServiciosManagerUser, userHasRole } from "../utils/roles";
import { getFilterPanelSx } from "../utils/filterPanelStyles";

const MODULO_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "GENERAL", label: "General" },
  { value: "SERVICIOS", label: "Tienda" },
];

function Productos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isServiciosManager = useMemo(() => isServiciosManagerUser(user), [user]);
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [scopeFiltro, setScopeFiltro] = useState("GENERAL");
  const [modalOpen, setModalOpen] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(true);
  const [error, setError] = useState("");

  const canManageProductos = useMemo(() => {
    return userHasRole(user, "SUPER_ADMIN", "ADMIN", "ENCARGADO_SERVICIOS");
  }, [user]);

  const canFilterScopes = useMemo(() => {
    return userHasRole(user, "SUPER_ADMIN", "ADMIN");
  }, [user]);

  const cargarProductos = useCallback(async () => {
    try {
      setLoadingLista(true);
      setError("");

      const scope = isServiciosManager
        ? "SERVICIOS"
        : canFilterScopes && scopeFiltro === "TODOS"
          ? undefined
          : scopeFiltro;

      const data = await getProductos({ scope });
      setProductos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudieron cargar los productos");
    } finally {
      setLoadingLista(false);
    }
  }, [canFilterScopes, isServiciosManager, scopeFiltro]);

  useEffect(() => {
    if (isServiciosManager && scopeFiltro !== "SERVICIOS") {
      setScopeFiltro("SERVICIOS");
      return;
    }

    if (!canFilterScopes && scopeFiltro !== "GENERAL") {
      setScopeFiltro("GENERAL");
      return;
    }

    cargarProductos();
  }, [cargarProductos, canFilterScopes, isServiciosManager, scopeFiltro]);

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase();

    return productos.filter((producto) => {
      return (
        String(producto.nombre || "").toLowerCase().includes(texto) ||
        String(producto.descripcion || "").toLowerCase().includes(texto) ||
        String(producto.codigo_barras || "").toLowerCase().includes(texto)
      );
    });
  }, [productos, busqueda]);

  const abrirNuevo = () => {
    setProductoEditando(null);
    setModalOpen(true);
  };

  const abrirEditar = (producto) => {
    setProductoEditando(producto);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setProductoEditando(null);
  };

  const guardarProducto = async (formData) => {
    try {
      setLoading(true);

      if (productoEditando) {
        await editarProducto(productoEditando.id_producto, formData);
      } else {
        await crearProducto(formData);
      }

      await cargarProductos();
      cerrarModal();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "No se pudo guardar el producto");
    } finally {
      setLoading(false);
    }
  };

  const eliminarProducto = async (producto) => {
    const confirmar = window.confirm(
      `Deseas desactivar el producto "${producto.nombre}"?`
    );

    if (!confirmar) return;

    try {
      await desactivarProducto(producto.id_producto);
      await cargarProductos();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "No se pudo desactivar el producto");
    }
  };

  const verKardexProducto = (producto) => {
    navigate(`/inventario?id_producto=${producto.id_producto}`);
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
            <Inventory2Icon color="primary" />
            <Typography variant="h4" fontWeight="bold">
              Productos
            </Typography>
          </Stack>

          <Typography variant="body1" color="text.secondary">
            {isServiciosManager
              ? "Administra solo los productos exclusivos de tienda, sin tocar el catalogo general del POS."
              : "Administra el catalogo general y los productos exclusivos de tienda sin mezclar ambos flujos."}
          </Typography>
        </Box>

        {canManageProductos && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={abrirNuevo}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontWeight: 600,
              boxShadow: 3,
              width: { xs: "100%", sm: "auto" },
            }}
          >
            Nuevo producto
          </Button>
        )}
      </Stack>

      {!canManageProductos && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Puedes consultar el catalogo general, pero solo un administrador
          puede crear, editar o desactivar productos. Los productos marcados como tienda quedan disponibles solo en Servicios &gt; Tienda.
        </Alert>
      )}

      <Paper elevation={2} sx={(theme) => getFilterPanelSx(theme, { mb: 3 })}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            fullWidth={!canFilterScopes}
            label="Buscar producto"
            placeholder="Buscar por nombre, descripcion o codigo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          {canFilterScopes && (
            <FormControl sx={{ minWidth: { xs: "100%", md: 220 } }}>
              <InputLabel id="productos-modulo-label">Modulo</InputLabel>
              <Select
                labelId="productos-modulo-label"
                label="Modulo"
                value={scopeFiltro}
                onChange={(e) => setScopeFiltro(e.target.value)}
              >
                {MODULO_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
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
          <Typography color="text.secondary">Cargando productos...</Typography>
        </Paper>
      ) : (
        <Paper
          elevation={2}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <ProductoTable
            productos={productosFiltrados}
            onEdit={abrirEditar}
            onDelete={eliminarProducto}
            onViewKardex={verKardexProducto}
            canManage={canManageProductos}
            showModulo={canFilterScopes || isServiciosManager}
          />
        </Paper>
      )}

      {canManageProductos && (
        <ProductoFormModal
          key={`${productoEditando?.id_producto ?? "new"}-${
            modalOpen ? "open" : "closed"
          }`}
          open={modalOpen}
          onClose={cerrarModal}
          onSave={guardarProducto}
          productoEditando={productoEditando}
          loading={loading}
          forceModuloOrigen={isServiciosManager ? "SERVICIOS" : null}
          hideModuloSelector={isServiciosManager}
        />
      )}
    </Box>
  );
}

export default Productos;
