import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DownloadIcon from "@mui/icons-material/Download";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import TimelineIcon from "@mui/icons-material/Timeline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

import { getMovimientosStock, getStock } from "../services/stockService";
import { buildKardexHtml, openPrintDocument } from "../utils/printDocuments";
import {
  getTableHeaderCellSx,
  getTableHeaderRowSx,
} from "../utils/tableHeaderStyles";

const MOVIMIENTO_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "ENTRADA", label: "Entradas" },
  { value: "SALIDA", label: "Salidas" },
  { value: "AJUSTE", label: "Ajustes" },
];

const MODULO_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "GENERAL", label: "General" },
  { value: "SERVICIOS", label: "Tienda" },
];

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("es-GT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTipoColor = (tipo) => {
  if (tipo === "ENTRADA") return "success";
  if (tipo === "SALIDA") return "error";
  if (tipo === "AJUSTE") return "warning";
  return "default";
};

const getModuloChip = (moduloOrigen) => {
  const modulo = String(moduloOrigen || "GENERAL").trim().toUpperCase();

  if (modulo === "SERVICIOS") {
    return {
      label: "Tienda",
      color: "success",
      variant: "filled",
    };
  }

  return {
    label: "General",
    color: "primary",
    variant: "outlined",
  };
};

const toCsvValue = (value) => {
  const normalized = String(value ?? "");
  return `"${normalized.replaceAll('"', '""')}"`;
};

function Inventario() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stockRows, setStockRows] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(
    searchParams.get("id_producto") || ""
  );
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [busquedaMovimiento, setBusquedaMovimiento] = useState("");
  const [moduloFiltro, setModuloFiltro] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(false);
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingMovimientos, setLoadingMovimientos] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStock = async () => {
      try {
        setLoadingStock(true);
        setError("");
        const data = await getStock();
        setStockRows(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || "No se pudo cargar el inventario.");
      } finally {
        setLoadingStock(false);
      }
    };

    loadStock();
  }, []);

  useEffect(() => {
    const loadMovimientos = async () => {
      try {
        setLoadingMovimientos(true);
        setError("");
        const data = await getMovimientosStock({
          id_producto: selectedProductId || undefined,
          tipo: tipoMovimiento || undefined,
          desde: desde || undefined,
          hasta: hasta || undefined,
          q: busquedaMovimiento || undefined,
          limit: 200,
        });
        setMovimientos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || "No se pudo cargar el kardex.");
      } finally {
        setLoadingMovimientos(false);
      }
    };

    loadMovimientos();
  }, [selectedProductId, tipoMovimiento, desde, hasta, busquedaMovimiento]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    if (selectedProductId) {
      nextParams.set("id_producto", selectedProductId);
    } else {
      nextParams.delete("id_producto");
    }

    const current = searchParams.toString();
    const next = nextParams.toString();

    if (current !== next) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [selectedProductId, searchParams, setSearchParams]);

  const productosFiltrados = useMemo(() => {
    const texto = busquedaProducto.trim().toLowerCase();

    return stockRows.filter((producto) => {
      const matchesModulo =
        !moduloFiltro ||
        String(producto.modulo_origen || "GENERAL").trim().toUpperCase() === moduloFiltro;

      const matchesSearch =
        !texto ||
        String(producto.nombre || "").toLowerCase().includes(texto) ||
        String(producto.codigo_barras || "").toLowerCase().includes(texto) ||
        String(producto.descripcion || "").toLowerCase().includes(texto);

      const matchesLowStock = !soloBajoMinimo || Boolean(producto.bajo_minimo);

      return matchesModulo && matchesSearch && matchesLowStock;
    });
  }, [stockRows, busquedaProducto, moduloFiltro, soloBajoMinimo]);

  const selectedProduct = useMemo(() => {
    return stockRows.find(
      (producto) => String(producto.id_producto) === String(selectedProductId)
    );
  }, [stockRows, selectedProductId]);

  const resumenInventario = useMemo(() => {
    return productosFiltrados.reduce(
      (acc, producto) => {
        const existencia = Number(producto.existencia || 0);
        const stockMinimo = Number(producto.stock_minimo || 0);

        acc.unidades += existencia;
        if (stockMinimo > 0 && existencia <= stockMinimo) {
          acc.bajoMinimo += 1;
        }

        return acc;
      },
      {
        productos: productosFiltrados.length,
        unidades: 0,
        bajoMinimo: 0,
      }
    );
  }, [productosFiltrados]);

  const movimientosFiltrados = useMemo(() => {
    if (!moduloFiltro) return movimientos;

    return movimientos.filter(
      (movimiento) =>
        String(movimiento.producto_modulo_origen || "GENERAL").trim().toUpperCase() === moduloFiltro
    );
  }, [movimientos, moduloFiltro]);

  const resumenMovimientos = useMemo(() => {
    return movimientosFiltrados.reduce(
      (acc, movimiento) => {
        const cantidad = Number(movimiento.cantidad || 0);
        if (movimiento.tipo === "ENTRADA") acc.entradas += cantidad;
        if (movimiento.tipo === "SALIDA") acc.salidas += cantidad;
        if (movimiento.tipo === "AJUSTE") acc.ajustes += 1;
        return acc;
      },
      { entradas: 0, salidas: 0, ajustes: 0 }
    );
  }, [movimientosFiltrados]);

  const valorEstimadoStock = useMemo(() => {
    if (!selectedProduct) return 0;

    return Number(selectedProduct.existencia || 0) * Number(selectedProduct.precio_compra || 0);
  }, [selectedProduct]);

  const ultimoMovimiento = useMemo(() => {
    return movimientosFiltrados[0] || null;
  }, [movimientosFiltrados]);

  const limpiarFiltros = () => {
    setBusquedaProducto("");
    setBusquedaMovimiento("");
    setModuloFiltro("");
    setTipoMovimiento("");
    setDesde("");
    setHasta("");
    setSoloBajoMinimo(false);
    setSelectedProductId("");
  };

  const seleccionarProducto = (productoId) => {
    setSelectedProductId(String(productoId || ""));
    setBusquedaMovimiento("");
    setTipoMovimiento("");
    setDesde("");
    setHasta("");
  };

  const cards = [
    {
      label: "Productos en inventario",
      value: resumenInventario.productos,
      helper: "Catalogo con stock registrado",
      icon: <WarehouseIcon color="primary" />,
    },
    {
      label: "Unidades disponibles",
      value: resumenInventario.unidades,
      helper: "Existencia total actual",
      icon: <Inventory2Icon color="primary" />,
    },
    {
      label: "Productos bajo minimo",
      value: resumenInventario.bajoMinimo,
      helper: "Requieren atencion o compra",
      icon: <WarningAmberIcon color={resumenInventario.bajoMinimo > 0 ? "warning" : "disabled"} />,
    },
    {
      label: selectedProduct ? "Stock del producto" : "Movimientos visibles",
      value: selectedProduct ? Number(selectedProduct.existencia || 0) : movimientos.length,
      helper: selectedProduct
        ? `${selectedProduct.nombre} | Minimo ${Number(selectedProduct.stock_minimo || 0)}`
        : "Filas visibles en el kardex",
      icon: <TimelineIcon color="primary" />,
    },
  ];

  const exportarPdf = async () => {
    try {
      setExportingPdf(true);
      setError("");

      if (!movimientosFiltrados.length) {
        setError("No hay movimientos visibles para exportar en PDF.");
        return;
      }

      openPrintDocument({
        title: selectedProduct
          ? `Kardex ${selectedProduct.nombre}`
          : "Kardex de inventario",
        html: buildKardexHtml({
          producto: selectedProduct,
          movimientos: movimientosFiltrados,
          filtros: {
            desde,
            hasta,
            modulo: moduloFiltro || "Todos",
            tipo: tipoMovimiento || "Todos",
            q: busquedaMovimiento,
          },
          resumen: resumenMovimientos,
        }),
        width: 1200,
        height: 900,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo generar el PDF del kardex.");
    } finally {
      setExportingPdf(false);
    }
  };

  const exportarExcel = async () => {
    try {
      setExportingExcel(true);
      setError("");

      if (!movimientosFiltrados.length) {
        setError("No hay movimientos visibles para exportar a Excel.");
        return;
      }

      const lines = [
        ["KARDEX DE INVENTARIO"],
        ["Producto", selectedProduct?.nombre || "Todos los productos"],
        ["Codigo", selectedProduct?.codigo_barras || "Todos"],
        ["Modulo", moduloFiltro || "Todos"],
        ["Desde", desde || "Sin filtro"],
        ["Hasta", hasta || "Sin filtro"],
        ["Tipo", tipoMovimiento || "Todos"],
        ["Busqueda", busquedaMovimiento || "Sin filtro"],
        [""],
        ["RESUMEN"],
        ["Entradas visibles", resumenMovimientos.entradas],
        ["Salidas visibles", resumenMovimientos.salidas],
        ["Ajustes visibles", resumenMovimientos.ajustes],
        selectedProduct ? ["Stock actual", Number(selectedProduct.existencia || 0)] : [],
        selectedProduct ? ["Stock minimo", Number(selectedProduct.stock_minimo || 0)] : [],
        [""],
        ["MOVIMIENTOS"],
        [
          "Fecha",
          "Producto",
          "Codigo",
          "Tipo",
          "Cantidad",
          "Antes",
          "Despues",
          "Motivo",
          "Usuario",
        ],
        ...movimientosFiltrados.map((movimiento) => [
          formatDateTime(movimiento.fecha),
          movimiento.producto_nombre || "Producto",
          movimiento.producto_codigo_barras || "Sin codigo",
          movimiento.tipo || "-",
          Number(movimiento.cantidad || 0),
          Number(movimiento.existencia_antes || 0),
          Number(movimiento.existencia_despues || 0),
          movimiento.motivo || "Sin detalle",
          movimiento.usuario_nombre || movimiento.usuario_username || "Sistema",
        ]),
      ].filter((line) => Array.isArray(line) && line.length > 0);

      const csv = lines.map((line) => line.map(toCsvValue).join(",")).join("\n");
      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = selectedProduct
        ? `kardex-${selectedProduct.nombre}-${selectedProduct.id_producto}.csv`
        : "kardex-inventario.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo exportar el kardex.");
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <Box>
      <Stack spacing={1.5} mb={3}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TimelineIcon color="primary" />
          <Typography variant="h4" fontWeight="bold">
            Inventario y Kardex
          </Typography>
        </Stack>

        <Typography variant="body1" color="text.secondary">
          Consulta existencias actuales y revisa la trazabilidad de entradas, salidas y ajustes por producto.
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
        Este modulo usa los movimientos reales registrados por ventas, compras, anulaciones, ajustes y repuestos de taller.
      </Alert>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        justifyContent="flex-end"
        alignItems={{ xs: "stretch", sm: "center" }}
        mb={3}
      >
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportarExcel}
          disabled={loadingMovimientos || exportingExcel}
        >
          {exportingExcel ? "Exportando..." : "Exportar Excel"}
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<PictureAsPdfIcon />}
          onClick={exportarPdf}
          disabled={loadingMovimientos || exportingPdf}
        >
          {exportingPdf ? "Generando PDF..." : "Exportar PDF"}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
        }}
      >
        {cards.map((card) => (
          <Paper
            key={card.label}
            elevation={2}
            sx={{
              p: 2.5,
              borderRadius: 4,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {card.label}
              </Typography>
              {card.icon}
            </Stack>
            <Typography variant="h4" fontWeight="bold">
              {card.value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {card.helper}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "360px minmax(0, 1fr)" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 2.5,
            borderRadius: 4,
            minWidth: 0,
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Stock actual
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Selecciona un producto para enfocar su kardex.
              </Typography>
            </Box>

            <TextField
              label="Buscar producto"
              placeholder="Nombre, codigo o descripcion"
              value={busquedaProducto}
              onChange={(event) => setBusquedaProducto(event.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="modulo-inventario-label">Modulo</InputLabel>
              <Select
                labelId="modulo-inventario-label"
                label="Modulo"
                value={moduloFiltro}
                onChange={(event) => setModuloFiltro(event.target.value)}
              >
                {MODULO_OPTIONS.map((option) => (
                  <MenuItem key={option.value || "all"} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={soloBajoMinimo}
                  onChange={(event) => setSoloBajoMinimo(event.target.checked)}
                />
              }
              label="Mostrar solo stock bajo"
            />

            <Stack direction="row" spacing={1.5}>
              <Button
                variant={selectedProductId ? "outlined" : "contained"}
                fullWidth
                onClick={() => seleccionarProducto("")}
              >
                Todos
              </Button>
              <Button variant="text" fullWidth onClick={limpiarFiltros}>
                Limpiar
              </Button>
            </Stack>

            {selectedProduct && (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.75,
                  borderRadius: 3,
                  borderColor: "primary.main",
                  background:
                    "linear-gradient(180deg, rgba(37,99,235,0.10) 0%, rgba(37,99,235,0.03) 100%)",
                  boxShadow: "0 10px 24px rgba(37,99,235,0.12)",
                  transition: "transform 220ms ease, box-shadow 220ms ease, opacity 220ms ease",
                  animation: "inventarioSelectedCardIn 220ms ease",
                  transformOrigin: "top left",
                  "@keyframes inventarioSelectedCardIn": {
                    "0%": {
                      opacity: 0,
                      transform: "translateY(-8px) scale(0.985)",
                    },
                    "100%": {
                      opacity: 1,
                      transform: "translateY(0) scale(1)",
                    },
                  },
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "0 14px 28px rgba(37,99,235,0.16)",
                  },
                }}
              >
                <Stack spacing={0.75}>
                  <Typography variant="body2" color="text.secondary">
                    Producto seleccionado
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {selectedProduct.nombre}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {(() => {
                      const moduloChip = getModuloChip(selectedProduct.modulo_origen);
                      return (
                        <Chip
                          size="small"
                          color={moduloChip.color}
                          variant={moduloChip.variant}
                          label={moduloChip.label}
                        />
                      );
                    })()}
                    <Chip
                      size="small"
                      color="primary"
                      variant="filled"
                      label={`Stock ${Number(selectedProduct.existencia || 0)}`}
                    />
                    <Chip
                      size="small"
                      color={selectedProduct.bajo_minimo ? "warning" : "default"}
                      variant="outlined"
                      label={`Min ${Number(selectedProduct.stock_minimo || 0)}`}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={selectedProduct.codigo_barras || "Sin codigo"}
                    />
                  </Stack>
                </Stack>
              </Paper>
            )}

            <Divider />

            {loadingStock ? (
              <Stack alignItems="center" spacing={2} py={4}>
                <CircularProgress />
                <Typography color="text.secondary">Cargando inventario...</Typography>
              </Stack>
            ) : (
              <TableContainer sx={{ maxHeight: 560, borderRadius: 3 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow sx={getTableHeaderRowSx(theme)}>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Producto</TableCell>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Modulo</TableCell>
                      <TableCell align="right" sx={getTableHeaderCellSx(theme)}>Stock</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productosFiltrados.map((producto) => {
                      const selected =
                        String(producto.id_producto) === String(selectedProductId);

                      return (
                        <TableRow
                          key={producto.id_producto}
                          hover
                          selected={selected}
                          onClick={() => seleccionarProducto(producto.id_producto)}
                          sx={{
                            cursor: "pointer",
                            transition: "all 180ms ease",
                            backgroundColor: selected ? "rgba(37,99,235,0.10)" : "transparent",
                            boxShadow: selected
                              ? "inset 3px 0 0 #2563eb"
                              : "inset 0 0 0 transparent",
                            "& .MuiTableCell-root": {
                              borderBottomColor: "divider",
                              transition: "all 180ms ease",
                              backgroundColor: selected ? "rgba(37,99,235,0.04)" : "transparent",
                            },
                            "& .MuiTypography-root": {
                              color: selected ? "primary.main" : "inherit",
                            },
                            "&:hover": {
                              backgroundColor: selected
                                ? "rgba(37,99,235,0.14)"
                                : "rgba(148,163,184,0.08)",
                            },
                          }}
                        >
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography fontWeight={700}>
                                {producto.nombre}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Codigo: {producto.codigo_barras || "Sin codigo"}
                              </Typography>
                              {producto.bajo_minimo && (
                                <Chip
                                  size="small"
                                  color="warning"
                                  label={`Bajo minimo | Faltan ${Number(producto.faltante || 0)}`}
                                  sx={{ width: "fit-content" }}
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const moduloChip = getModuloChip(producto.modulo_origen);
                              return (
                                <Chip
                                  size="small"
                                  color={moduloChip.color}
                                  variant={moduloChip.variant}
                                  label={moduloChip.label}
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="bold">
                              {Number(producto.existencia || 0)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Min {Number(producto.stock_minimo || 0)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {!loadingStock && productosFiltrados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography color="text.secondary">
                            No hay productos que coincidan con el filtro actual.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </Paper>

        <Paper
          elevation={2}
          sx={{
            p: 2.5,
            borderRadius: 4,
            minWidth: 0,
          }}
        >
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Kardex de movimientos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedProduct
                    ? `Producto enfocado: ${selectedProduct.nombre}`
                    : "Mostrando movimientos de todos los productos."}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {selectedProduct && (
                  <Chip
                    color="primary"
                    variant="outlined"
                    label={`Stock ${Number(selectedProduct.existencia || 0)}`}
                  />
                )}
                {selectedProduct && (
                  (() => {
                    const moduloChip = getModuloChip(selectedProduct.modulo_origen);
                    return (
                      <Chip
                        color={moduloChip.color}
                        variant={moduloChip.variant}
                        label={`Modulo ${moduloChip.label}`}
                      />
                    );
                  })()
                )}
                {selectedProduct && Number(selectedProduct.stock_minimo || 0) > 0 && (
                  <Chip
                    color={selectedProduct.bajo_minimo ? "warning" : "default"}
                    variant="outlined"
                    label={`Minimo ${Number(selectedProduct.stock_minimo || 0)}`}
                  />
                )}
                {selectedProduct?.ubicacion && (
                  <Chip
                    variant="outlined"
                    label={`Ubicacion ${selectedProduct.ubicacion}`}
                  />
                )}
              </Stack>
            </Stack>

            {(selectedProduct || ultimoMovimiento) && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))",
                  },
                  gap: 1.5,
                }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.75,
                    borderRadius: 3,
                    background:
                      "linear-gradient(180deg, rgba(37,99,235,0.06) 0%, rgba(37,99,235,0.02) 100%)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Valor estimado del stock
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    Q {valorEstimadoStock.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Basado en existencia actual y precio de compra registrado.
                  </Typography>
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.75,
                    borderRadius: 3,
                    background:
                      "linear-gradient(180deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.02) 100%)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Ultimo movimiento registrado
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {ultimoMovimiento
                      ? `${ultimoMovimiento.tipo} | ${Number(ultimoMovimiento.cantidad || 0)} unidad(es)`
                      : "Sin movimientos visibles"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {ultimoMovimiento
                      ? `${formatDateTime(ultimoMovimiento.fecha)} | ${ultimoMovimiento.motivo || "Sin detalle"}`
                      : "Ajusta los filtros o selecciona un producto para ver su traza."}
                  </Typography>
                </Paper>
              </Box>
            )}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                  xl: "repeat(5, minmax(0, 1fr))",
                },
                gap: 1.5,
              }}
            >
              <TextField
                label="Buscar en movimientos"
                placeholder="Motivo, usuario o producto"
                value={busquedaMovimiento}
                onChange={(event) => setBusquedaMovimiento(event.target.value)}
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel id="tipo-movimiento-label">Tipo</InputLabel>
                <Select
                  labelId="tipo-movimiento-label"
                  label="Tipo"
                  value={tipoMovimiento}
                  onChange={(event) => setTipoMovimiento(event.target.value)}
                >
                  {MOVIMIENTO_OPTIONS.map((option) => (
                    <MenuItem key={option.value || "all"} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Desde"
                type="date"
                value={desde}
                onChange={(event) => setDesde(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              <TextField
                label="Hasta"
                type="date"
                value={hasta}
                onChange={(event) => setHasta(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              <Button
                variant="outlined"
                startIcon={<AutorenewIcon />}
                onClick={() => {
                  setTipoMovimiento("");
                  setBusquedaMovimiento("");
                  setDesde("");
                  setHasta("");
                }}
                sx={{ minHeight: 56 }}
              >
                Limpiar filtros
              </Button>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, minmax(0, 1fr))",
                },
                gap: 1.5,
              }}
            >
              <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Entradas visibles
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {resumenMovimientos.entradas}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Salidas visibles
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                  {resumenMovimientos.salidas}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Ajustes visibles
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {resumenMovimientos.ajustes}
                </Typography>
              </Paper>
            </Box>

            {loadingMovimientos ? (
              <Stack alignItems="center" spacing={2} py={6}>
                <CircularProgress />
                <Typography color="text.secondary">Cargando kardex...</Typography>
              </Stack>
            ) : (
              <TableContainer sx={{ maxHeight: 620, borderRadius: 3 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow sx={getTableHeaderRowSx(theme)}>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Fecha</TableCell>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Producto</TableCell>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Tipo</TableCell>
                      <TableCell align="right" sx={getTableHeaderCellSx(theme)}>Cantidad</TableCell>
                      <TableCell align="right" sx={getTableHeaderCellSx(theme)}>Antes</TableCell>
                      <TableCell align="right" sx={getTableHeaderCellSx(theme)}>Despues</TableCell>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Motivo</TableCell>
                      <TableCell sx={getTableHeaderCellSx(theme)}>Usuario</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {movimientosFiltrados.map((movimiento, index) => (
                      <TableRow key={`${movimiento.id_producto}-${movimiento.fecha}-${index}`} hover>
                        <TableCell>
                          {formatDateTime(movimiento.fecha)}
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography fontWeight={700}>
                              {movimiento.producto_nombre || "Producto"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {movimiento.producto_codigo_barras || "Sin codigo"}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={getTipoColor(movimiento.tipo)}
                            label={movimiento.tipo}
                          />
                        </TableCell>
                        <TableCell align="right">{Number(movimiento.cantidad || 0)}</TableCell>
                        <TableCell align="right">{Number(movimiento.existencia_antes || 0)}</TableCell>
                        <TableCell align="right">{Number(movimiento.existencia_despues || 0)}</TableCell>
                        <TableCell>{movimiento.motivo || "Sin detalle"}</TableCell>
                        <TableCell>
                          {movimiento.usuario_nombre || movimiento.usuario_username || "Sistema"}
                        </TableCell>
                      </TableRow>
                    ))}

                    {!loadingMovimientos && movimientosFiltrados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Typography color="text.secondary">
                            No hay movimientos para los filtros seleccionados.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}

export default Inventario;
