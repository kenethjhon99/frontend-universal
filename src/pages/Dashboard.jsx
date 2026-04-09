import { useCallback, useEffect, useRef, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getReporteGeneral } from "../services/reporteService";
import { getFilterPanelSx } from "../utils/filterPanelStyles";
import {
  getSectionPanelSx,
  getSummaryCardSx,
  getSummaryIconWrapSx,
  getSummaryValueSx,
} from "../utils/summaryCardStyles";
import {
  getTableHeaderCellSx,
  getTableContainerSx,
  getTableHeaderRowSx,
} from "../utils/tableHeaderStyles";

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const toCsvValue = (value) => {
  const normalized = String(value ?? "");
  return `"${normalized.replaceAll('"', '""')}"`;
};

const today = new Date();
const defaultHasta = today.toISOString().slice(0, 10);
const startDate = new Date(today);
startDate.setDate(startDate.getDate() - 6);
const defaultDesde = startDate.toISOString().slice(0, 10);

const formatLastUpdated = (value) => {
  if (!value) return "Sin actualizar";

  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
};

const buildDashboardPrintHtml = ({ desde, hasta, data }) => {
  const ventasProductoRows = data.ventas_de_producto
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.producto_nombre)}</td>
          <td>${escapeHtml(row.codigo_barras || "Sin codigo")}</td>
          <td>${escapeHtml(row.cantidad_vendida)}</td>
          <td>${escapeHtml(formatCurrency(row.total_ventas))}</td>
          <td>${escapeHtml(formatCurrency(row.utilidad_estimada))}</td>
        </tr>
      `
    )
    .join("");

  const stockRows = data.productos_stock_bajo
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.nombre)}</td>
          <td>${escapeHtml(row.codigo_barras || "Sin codigo")}</td>
          <td>${escapeHtml(row.stock)}</td>
          <td>${escapeHtml(row.stock_minimo)}</td>
          <td>${escapeHtml(row.faltante)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Reporte del negocio</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
          h1, h2 { margin: 0 0 10px; }
          .meta { margin-bottom: 18px; color: #4b5563; font-size: 13px; line-height: 1.6; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
          .card { border: 1px solid #d1d5db; border-radius: 10px; padding: 12px; }
          .label { color: #6b7280; font-size: 12px; margin-bottom: 6px; }
          .value { font-size: 20px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f3f4f6; }
          .section { margin-top: 22px; }
        </style>
      </head>
      <body>
        <h1>Reporte del negocio</h1>
        <div class="meta">
          <div><strong>Desde:</strong> ${escapeHtml(desde)}</div>
          <div><strong>Hasta:</strong> ${escapeHtml(hasta)}</div>
          <div><strong>Generado:</strong> ${escapeHtml(new Date().toLocaleString("es-GT"))}</div>
        </div>

        <div class="grid">
          <div class="card"><div class="label">Ventas del periodo</div><div class="value">${escapeHtml(formatCurrency(data.resumen.total_ventas))}</div></div>
          <div class="card"><div class="label">Compras del periodo</div><div class="value">${escapeHtml(formatCurrency(data.resumen.total_compras))}</div></div>
          <div class="card"><div class="label">Utilidad estimada</div><div class="value">${escapeHtml(formatCurrency(data.resumen.utilidad_estimada))}</div></div>
          <div class="card"><div class="label">Productos con poco stock</div><div class="value">${escapeHtml(data.resumen.productos_stock_bajo || 0)}</div></div>
        </div>

        <div class="section">
          <h2>Ventas de producto</h2>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Codigo</th>
                <th>Cantidad</th>
                <th>Total vendido</th>
                <th>Utilidad estimada</th>
              </tr>
            </thead>
            <tbody>${ventasProductoRows || '<tr><td colspan="5">Sin datos</td></tr>'}</tbody>
          </table>
        </div>

        <div class="section">
          <h2>Productos con poco stock</h2>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Codigo</th>
                <th>Stock</th>
                <th>Minimo</th>
                <th>Faltante</th>
              </tr>
            </thead>
            <tbody>${stockRows || '<tr><td colspan="5">Sin datos</td></tr>'}</tbody>
          </table>
        </div>
      </body>
    </html>
  `;
};

function Dashboard() {
  const theme = useTheme();
  const [desde, setDesde] = useState(defaultDesde);
  const [hasta, setHasta] = useState(defaultHasta);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [data, setData] = useState({
    resumen: {},
    ventas_por_dia: [],
    compras_por_fecha: [],
    ventas_de_producto: [],
    productos_stock_bajo: [],
  });
  const requestInFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const cargarReportes = useCallback(
    async ({ silent = false } = {}) => {
      if (requestInFlightRef.current) return;
      requestInFlightRef.current = true;

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
          setError("");
        }

        const response = await getReporteGeneral({ desde, hasta });

        setData({
          resumen: response?.resumen || {},
          ventas_por_dia: Array.isArray(response?.ventas_por_dia) ? response.ventas_por_dia : [],
          compras_por_fecha: Array.isArray(response?.compras_por_fecha) ? response.compras_por_fecha : [],
          ventas_de_producto: Array.isArray(response?.ventas_de_producto) ? response.ventas_de_producto : [],
          productos_stock_bajo: Array.isArray(response?.productos_stock_bajo) ? response.productos_stock_bajo : [],
        });
        setLastUpdated(new Date());
        hasLoadedRef.current = true;
        if (!silent) {
          setError("");
        }
      } catch (err) {
        console.error(err);
        if (!silent || !hasLoadedRef.current) {
          setError(err.response?.data?.error || "No se pudieron cargar los reportes");
        }
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        requestInFlightRef.current = false;
      }
    },
    [desde, hasta]
  );

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  useEffect(() => {
    const handleFocusRefresh = () => {
      cargarReportes({ silent: true });
    };

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === "visible") {
        cargarReportes({ silent: true });
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        cargarReportes({ silent: true });
      }
    }, 60000);

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [cargarReportes]);

  const summaryCards = [
    {
      label: "Ventas del periodo",
      value: formatCurrency(data.resumen.total_ventas),
      helper: `${data.resumen.ventas_cantidad || 0} venta(s)`,
      tone: "primary",
      icon: PointOfSaleRoundedIcon,
    },
    {
      label: "Compras del periodo",
      value: formatCurrency(data.resumen.total_compras),
      helper: `${data.resumen.compras_cantidad || 0} compra(s)`,
      tone: "info",
      icon: ShoppingBagRoundedIcon,
    },
    {
      label: "Utilidad estimada",
      value: formatCurrency(data.resumen.utilidad_estimada),
      helper: "Basada en ventas netas y costo registrado",
      tone: "success",
      icon: TrendingUpRoundedIcon,
    },
    {
      label: "Productos con poco stock",
      value: String(data.resumen.productos_stock_bajo || 0),
      helper: "Productos por debajo o al limite del minimo",
      tone: "warning",
      icon: Inventory2RoundedIcon,
    },
  ];

  const exportarPdf = () => {
    if (loading) return;

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
    if (!printWindow) {
      setError("Tu navegador bloqueo la ventana emergente para generar el PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildDashboardPrintHtml({ desde, hasta, data }));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const exportarExcel = async () => {
    try {
      setExporting(true);
      setError("");

      const lines = [
        ["REPORTE DEL NEGOCIO"],
        ["Desde", desde],
        ["Hasta", hasta],
        [""],
        ["RESUMEN"],
        ["Ventas del periodo", data.resumen.total_ventas],
        ["Compras del periodo", data.resumen.total_compras],
        ["Utilidad estimada", data.resumen.utilidad_estimada],
        ["Productos con poco stock", data.resumen.productos_stock_bajo],
        [""],
        ["VENTAS DE PRODUCTO"],
        ["Producto", "Codigo", "Cantidad", "Total vendido", "Utilidad estimada"],
        ...data.ventas_de_producto.map((row) => [
          row.producto_nombre,
          row.codigo_barras || "Sin codigo",
          row.cantidad_vendida,
          row.total_ventas,
          row.utilidad_estimada,
        ]),
        [""],
        ["PRODUCTOS CON POCO STOCK"],
        ["Producto", "Codigo", "Stock", "Minimo", "Faltante"],
        ...data.productos_stock_bajo.map((row) => [
          row.nombre,
          row.codigo_barras || "Sin codigo",
          row.stock,
          row.stock_minimo,
          row.faltante,
        ]),
      ];

      const csv = lines.map((line) => line.map(toCsvValue).join(",")).join("\n");
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reporte-negocio-${desde}-a-${hasta}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <Paper
        elevation={0}
        sx={(currentTheme) =>
          getSectionPanelSx(currentTheme, {
            p: { xs: 2.4, md: 3 },
            radius: 4,
            accent: "primary",
          })
        }
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", lg: "flex-start" }}
          >
            <Box maxWidth={760}>
              <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: "0.16em" }}>
                Centro de control
              </Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                Reportes del negocio
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Revisa comportamiento diario, ventas de producto, compras por fecha, poco stock y utilidad estimada con una vista gerencial mas clara y siempre actualizada.
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.1}
              useFlexGap
              flexWrap="wrap"
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <Chip
                color="primary"
                variant="outlined"
                label={`Actualizado: ${formatLastUpdated(lastUpdated)}`}
                sx={{ alignSelf: "flex-start" }}
              />
              <Chip
                color="secondary"
                variant="outlined"
                label="Actualizacion automatica cada 60s"
                sx={{ alignSelf: "flex-start" }}
              />
              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => cargarReportes({ silent: true })}
                disabled={loading || refreshing}
                sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
              >
                {refreshing ? "Actualizando..." : "Actualizar ahora"}
              </Button>
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} useFlexGap flexWrap="wrap">
            <Chip
              size="small"
              color="success"
              variant="outlined"
              label={`${data.resumen.ventas_cantidad || 0} venta(s) registradas`}
            />
            <Chip
              size="small"
              color="info"
              variant="outlined"
              label={`${data.resumen.compras_cantidad || 0} compra(s) en el periodo`}
            />
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label={`${data.resumen.productos_stock_bajo || 0} alerta(s) de stock`}
            />
          </Stack>
        </Stack>
      </Paper>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        justifyContent="flex-end"
        alignItems={{ xs: "stretch", sm: "center" }}
        mb={3}
        mt={3}
      >
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportarExcel}
          disabled={loading || exporting}
        >
          {exporting ? "Exportando..." : "Exportar Excel"}
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<PictureAsPdfIcon />}
          onClick={exportarPdf}
          disabled={loading}
        >
          Exportar PDF
        </Button>
      </Stack>

      <Paper elevation={2} sx={(theme) => getFilterPanelSx(theme, { mb: 3 })}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Desde"
            type="date"
            value={desde}
            onChange={(event) => setDesde(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: "100%", md: 220 } }}
          />
          <TextField
            label="Hasta"
            type="date"
            value={hasta}
            onChange={(event) => setHasta(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: "100%", md: 220 } }}
          />
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {summaryCards.map((card) => {
          const IconComponent = card.icon;

          return (
            <Grid item xs={12} sm={6} lg={3} key={card.label}>
              <Paper elevation={2} sx={(theme) => getSummaryCardSx(theme, card.tone)}>
                <Stack spacing={2.25} height="100%">
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="body2" color="text.secondary" mb={0.75}>
                        {card.label}
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        mb={1}
                        sx={(theme) => getSummaryValueSx(theme, card.tone)}
                      >
                        {loading ? "..." : card.value}
                      </Typography>
                    </Box>
                    <Box sx={(theme) => getSummaryIconWrapSx(theme, card.tone)}>
                      <IconComponent fontSize="small" />
                    </Box>
                  </Stack>

                  <Typography variant="body2" color="text.secondary" mt="auto">
                    {card.helper}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          );
        })}

        <Grid item xs={12} lg={8}>
          <Paper elevation={2} sx={(theme) => getSectionPanelSx(theme, { p: 3, radius: 4, accent: "primary" })}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" mb={2}>
              <Box>
                <Typography variant="h6" fontWeight="bold" mb={0.5}>
                  Ventas y utilidad por dia
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tendencia reciente de ventas netas y margen estimado.
                </Typography>
              </Box>
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`${data.ventas_por_dia.length || 0} punto(s)`}
                sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
              />
            </Stack>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data.ventas_por_dia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total_ventas" name="Ventas" stroke="#2563eb" strokeWidth={3} />
                <Line type="monotone" dataKey="utilidad_estimada" name="Utilidad" stroke="#16a34a" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper elevation={2} sx={(theme) => getSectionPanelSx(theme, { p: 3, radius: 4, accent: "warning" })}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" mb={2}>
              <Box>
                <Typography variant="h6" fontWeight="bold" mb={0.5}>
                  Compras por fecha
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Comportamiento de ingresos de inventario en el periodo.
                </Typography>
              </Box>
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                label={`${data.compras_por_fecha.length || 0} punto(s)`}
                sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
              />
            </Stack>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.compras_por_fecha}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_compras" name="Compras" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Paper elevation={2} sx={(theme) => getSectionPanelSx(theme, { p: 3, radius: 4, accent: "info" })}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" mb={2}>
              <Box>
                <Typography variant="h6" fontWeight="bold" mb={0.5}>
                  Ventas de producto
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Productos con mayor salida y mejor rendimiento comercial.
                </Typography>
              </Box>
              <Chip
                size="small"
                color="info"
                variant="outlined"
                label={`${data.ventas_de_producto.length || 0} producto(s)`}
                sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
              />
            </Stack>
            <TableContainer sx={getTableContainerSx(theme)}>
              <Table>
                <TableHead>
                  <TableRow sx={getTableHeaderRowSx(theme)}>
                    <TableCell sx={getTableHeaderCellSx(theme)}>Producto</TableCell>
                    <TableCell sx={getTableHeaderCellSx(theme)}>Cantidad</TableCell>
                    <TableCell sx={getTableHeaderCellSx(theme)}>Total vendido</TableCell>
                    <TableCell sx={getTableHeaderCellSx(theme)}>Utilidad estimada</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.ventas_de_producto.map((row) => (
                    <TableRow key={row.id_producto}>
                      <TableCell>
                        <Typography fontWeight="bold">{row.producto_nombre}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {row.codigo_barras || "Sin codigo"}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.cantidad_vendida}</TableCell>
                      <TableCell>{formatCurrency(row.total_ventas)}</TableCell>
                      <TableCell>{formatCurrency(row.utilidad_estimada)}</TableCell>
                    </TableRow>
                  ))}
                  {!loading && data.ventas_de_producto.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>No hay ventas en el rango seleccionado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper elevation={2} sx={(theme) => getSectionPanelSx(theme, { p: 3, radius: 4, accent: "warning" })}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" mb={2}>
              <Box>
                <Typography variant="h6" fontWeight="bold" mb={0.5}>
                  Productos con poco stock
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Detecta rapido los articulos que necesitan reposicion.
                </Typography>
              </Box>
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                label={`${data.productos_stock_bajo.length || 0} alerta(s)`}
                sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
              />
            </Stack>
            <TableContainer sx={getTableContainerSx(theme)}>
              <Table>
                <TableHead>
                  <TableRow sx={getTableHeaderRowSx(theme)}>
                    <TableCell sx={getTableHeaderCellSx(theme)}>Producto</TableCell>
                    <TableCell sx={getTableHeaderCellSx(theme)}>Stock</TableCell>
                    <TableCell sx={getTableHeaderCellSx(theme)}>Minimo</TableCell>
                    <TableCell sx={getTableHeaderCellSx(theme)}>Faltante</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.productos_stock_bajo.map((row) => (
                    <TableRow key={row.id_producto}>
                      <TableCell>
                        <Typography fontWeight="bold">{row.nombre}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {row.codigo_barras || "Sin codigo"}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.stock}</TableCell>
                      <TableCell>{row.stock_minimo}</TableCell>
                      <TableCell>{row.faltante}</TableCell>
                    </TableRow>
                  ))}
                  {!loading && data.productos_stock_bajo.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>No hay productos en estado critico.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
