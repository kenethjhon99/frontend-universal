import { useEffect, useState } from "react";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { getAuditoriaCatalogo } from "../services/auditoriaService";
import { getFilterPanelSx } from "../utils/filterPanelStyles";
import {
  getTableHeaderCellSx,
  getTableHeaderRowSx,
} from "../utils/tableHeaderStyles";

const ENTITY_OPTIONS = [
  { value: "PRODUCTOS", label: "Productos" },
  { value: "PROVEEDORES", label: "Proveedores" },
  { value: "CLIENTES", label: "Clientes" },
  { value: "USUARIOS", label: "Usuarios" },
  { value: "ROLES_USUARIO", label: "Roles de usuario" },
  { value: "VENTA_ANULACIONES", label: "Anulaciones de venta" },
  { value: "COMPRA_ANULACIONES", label: "Anulaciones de compra" },
];

const STATUS_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "ACTIVOS", label: "Activos" },
  { value: "INACTIVOS", label: "Inactivos" },
];

const STATUS_FREE_ENTITIES = new Set([
  "VENTA_ANULACIONES",
  "COMPRA_ANULACIONES",
]);

const formatDateTime = (value) => {
  if (!value) return "Sin registro";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin registro";
  }

  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatActor = (username, nombre) => {
  if (nombre && username) {
    return `${nombre} (${username})`;
  }

  return nombre || username || "Sistema";
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildAuditPrintHtml = ({ rows, entidad, estado, busqueda }) => {
  const entidadLabel =
    ENTITY_OPTIONS.find((item) => item.value === entidad)?.label || entidad;
  const generadoEn = formatDateTime(new Date().toISOString());
  const isAnulacionEntity = STATUS_FREE_ENTITIES.has(entidad);

  const rowsHtml = rows
    .map((row) => {
      const estadoLabel = STATUS_FREE_ENTITIES.has(row.entidad)
        ? "Registrado"
        : row.activo
          ? "Activo"
          : "Inactivo";

      return `
        <tr>
          <td>
            <strong>${escapeHtml(row.nombre || "Sin nombre")}</strong><br />
            <span class="muted">${escapeHtml(row.codigo || "Sin codigo")}</span><br />
            <span class="muted">ID: ${escapeHtml(row.registro_id)}</span>
          </td>
          ${
            isAnulacionEntity
              ? `
          <td>${escapeHtml(row.referencia || "Sin referencia")}</td>
          <td>${escapeHtml(row.cantidad_evento ?? "Sin cantidad")}</td>
          <td>${escapeHtml(row.motivo_evento || "Sin motivo")}</td>
          `
              : `
          <td>
            <strong>${escapeHtml(
              ENTITY_OPTIONS.find((item) => item.value === row.entidad)?.label || row.entidad
            )}</strong><br />
            <span class="muted">${escapeHtml(row.detalle || "Sin detalle adicional")}</span>
          </td>
          `
          }
          <td>${escapeHtml(estadoLabel)}</td>
          <td>
            <strong>${escapeHtml(formatActor(row.created_by_username, row.created_by_nombre))}</strong><br />
            <span class="muted">${escapeHtml(formatDateTime(row.created_at))}</span>
          </td>
          <td>
            <strong>${escapeHtml(formatActor(row.updated_by_username, row.updated_by_nombre))}</strong><br />
            <span class="muted">${escapeHtml(formatDateTime(row.updated_at))}</span>
          </td>
          <td>
            ${
              row.inactivado_en
                ? `<strong>${escapeHtml(formatActor(row.inactivado_por_username, row.inactivado_por_nombre))}</strong><br />
                   <span class="muted">${escapeHtml(formatDateTime(row.inactivado_en))}</span>`
                : '<span class="muted">Sin inactivacion</span>'
            }
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Auditoria - ${escapeHtml(entidadLabel)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111827;
            margin: 24px;
          }
          h1 {
            margin: 0 0 8px;
            font-size: 24px;
          }
          .meta {
            margin-bottom: 20px;
            color: #4b5563;
            font-size: 13px;
            line-height: 1.6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 8px;
            vertical-align: top;
            font-size: 12px;
            word-break: break-word;
          }
          th {
            background: #f3f4f6;
            text-align: left;
          }
          .muted {
            color: #6b7280;
          }
          @media print {
            body {
              margin: 12px;
            }
          }
        </style>
      </head>
      <body>
        <h1>Auditoria del sistema</h1>
        <div class="meta">
          <div><strong>Entidad:</strong> ${escapeHtml(entidadLabel)}</div>
          <div><strong>Estado:</strong> ${escapeHtml(estado)}</div>
          <div><strong>Busqueda:</strong> ${escapeHtml(busqueda || "Sin filtro")}</div>
          <div><strong>Generado:</strong> ${escapeHtml(generadoEn)}</div>
          <div><strong>Total registros:</strong> ${escapeHtml(rows.length)}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Registro</th>
              ${isAnulacionEntity ? "<th>Referencia</th><th>Cantidad</th><th>Motivo</th>" : "<th>Detalle</th>"}
              <th>Estado</th>
              <th>Creado</th>
              <th>Actualizado</th>
              <th>Inactivado</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;
};

const getEntityHelperText = (entity) => {
  const selectedEntity = ENTITY_OPTIONS.find((item) => item.value === entity);
  return selectedEntity
    ? `Mostrando auditoria de ${selectedEntity.label.toLowerCase()}.`
    : "Mostrando auditoria del catalogo.";
};

function Auditoria() {
  const theme = useTheme();
  const [registros, setRegistros] = useState([]);
  const [entidad, setEntidad] = useState("PRODUCTOS");
  const [estado, setEstado] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState({ totalRows: 0 });

  useEffect(() => {
    let ignore = false;

    const cargarAuditoria = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getAuditoriaCatalogo({
          entidad,
          estado,
          q: busqueda.trim(),
          page: page + 1,
          limit: rowsPerPage,
        });

        if (ignore) return;

        setRegistros(Array.isArray(response?.data) ? response.data : []);
        setMeta({
          totalRows: Number(response?.meta?.totalRows || 0),
        });
      } catch (err) {
        if (ignore) return;
        console.error(err);
        setError(err.response?.data?.error || "No se pudo cargar la auditoria");
        setRegistros([]);
        setMeta({ totalRows: 0 });
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    cargarAuditoria();

    return () => {
      ignore = true;
    };
  }, [entidad, estado, busqueda, page, rowsPerPage]);

  const limpiarFiltros = () => {
    setEntidad("PRODUCTOS");
    setEstado("TODOS");
    setBusqueda("");
    setPage(0);
  };

  const rows = registros;
  const showStatusFilter = !STATUS_FREE_ENTITIES.has(entidad);
  const isAnulacionEntity = STATUS_FREE_ENTITIES.has(entidad);

  const exportarPdf = async () => {
    try {
      setExportingPdf(true);
      setError("");

      const response = await getAuditoriaCatalogo({
        entidad,
        estado,
        q: busqueda.trim(),
        page: 1,
        limit: Math.max(meta.totalRows || rowsPerPage, rowsPerPage),
      });

      const exportRows = Array.isArray(response?.data) ? response.data : [];

      if (!exportRows.length) {
        setError("No hay registros para exportar con los filtros actuales.");
        return;
      }

      const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");

      if (!printWindow) {
        setError("Tu navegador bloqueo la ventana emergente para generar el PDF.");
        return;
      }

      printWindow.document.open();
      printWindow.document.write(
        buildAuditPrintHtml({
          rows: exportRows,
          entidad,
          estado: showStatusFilter ? estado : "NO APLICA",
          busqueda: busqueda.trim(),
        })
      );
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "No se pudo generar el PDF de auditoria");
    } finally {
      setExportingPdf(false);
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
            <FactCheckIcon color="primary" />
            <Typography variant="h4" fontWeight="bold">
              Auditoria
            </Typography>
          </Stack>

          <Typography variant="body1" color="text.secondary">
            Revisa quien creo, actualizo o inactivo registros clave del sistema.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="error"
          startIcon={<PictureAsPdfIcon />}
          onClick={exportarPdf}
          disabled={loading || exportingPdf}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          {exportingPdf ? "Generando PDF..." : "Exportar PDF"}
        </Button>
      </Stack>

      <Paper elevation={2} sx={(theme) => getFilterPanelSx(theme, { mb: 3 })}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <Select
              value={entidad}
              onChange={(event) => {
                const nuevaEntidad = event.target.value;
                setEntidad(nuevaEntidad);
                if (STATUS_FREE_ENTITIES.has(nuevaEntidad)) {
                  setEstado("TODOS");
                }
                setPage(0);
              }}
              sx={{ minWidth: { xs: "100%", md: 220 } }}
            >
              {ENTITY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>

            {showStatusFilter && (
              <Select
                value={estado}
                onChange={(event) => {
                  setEstado(event.target.value);
                  setPage(0);
                }}
                sx={{ minWidth: { xs: "100%", md: 180 } }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            )}

            <TextField
              fullWidth
              label="Buscar registro"
              placeholder="Codigo, nombre, correo, username o rol"
              value={busqueda}
              onChange={(event) => {
                setBusqueda(event.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />

            <Chip
              icon={<FilterAltOffIcon />}
              label="Limpiar filtros"
              onClick={limpiarFiltros}
              variant="outlined"
              clickable
              sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
            />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {getEntityHelperText(entidad)}
          </Typography>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box
            sx={{
              minHeight: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography color="text.secondary">
              Cargando registros de auditoria...
            </Typography>
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight="bold" mb={1}>
              Sin resultados
            </Typography>
            <Typography color="text.secondary">
              No encontramos registros para los filtros seleccionados.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
                <Table sx={{ minWidth: 980 }}>
                  <TableHead>
                  <TableRow sx={getTableHeaderRowSx(theme)}>
                    <TableCell sx={getTableHeaderCellSx(theme)}>Registro</TableCell>
                    {isAnulacionEntity ? (
                      <>
                        <TableCell sx={getTableHeaderCellSx(theme)}>Referencia</TableCell>
                        <TableCell sx={getTableHeaderCellSx(theme)}>Cantidad</TableCell>
                        <TableCell sx={getTableHeaderCellSx(theme)}>Motivo</TableCell>
                      </>
                    ) : (
                      <TableCell sx={getTableHeaderCellSx(theme)}>Detalle</TableCell>
                    )}
                    <TableCell sx={getTableHeaderCellSx(theme)}>Estado</TableCell>
                    <TableCell sx={getTableHeaderCellSx(theme)}>Creado</TableCell>
                    <TableCell sx={getTableHeaderCellSx(theme)}>Actualizado</TableCell>
                    <TableCell sx={getTableHeaderCellSx(theme)}>Inactivado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow hover key={`${row.entidad}-${row.registro_id}-${index}`}>
                      <TableCell sx={{ minWidth: 220 }}>
                        <Stack spacing={0.75}>
                          <Typography fontWeight="bold">
                            {row.nombre || "Sin nombre"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {row.codigo || "Sin codigo"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {row.registro_id}
                          </Typography>
                        </Stack>
                      </TableCell>
                      {isAnulacionEntity ? (
                        <>
                          <TableCell sx={{ minWidth: 180 }}>
                            <Stack spacing={0.75}>
                              <Chip
                                label={ENTITY_OPTIONS.find((item) => item.value === row.entidad)?.label || row.entidad}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ alignSelf: "flex-start" }}
                              />
                              <Typography variant="body2" color="text.secondary">
                                {row.referencia || "Sin referencia"}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ minWidth: 120 }}>
                            <Typography fontWeight="bold">
                              {row.cantidad_evento ?? "Sin cantidad"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ minWidth: 220 }}>
                            <Typography variant="body2" color="text.secondary">
                              {row.motivo_evento || "Sin motivo"}
                            </Typography>
                          </TableCell>
                        </>
                      ) : (
                        <TableCell sx={{ minWidth: 220 }}>
                          <Stack spacing={0.75}>
                            <Chip
                              label={ENTITY_OPTIONS.find((item) => item.value === row.entidad)?.label || row.entidad}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ alignSelf: "flex-start" }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {row.detalle || "Sin detalle adicional"}
                            </Typography>
                          </Stack>
                        </TableCell>
                      )}
                      <TableCell>
                        <Chip
                          label={
                            STATUS_FREE_ENTITIES.has(row.entidad)
                              ? "Registrado"
                              : row.activo
                                ? "Activo"
                                : "Inactivo"
                          }
                          color={
                            STATUS_FREE_ENTITIES.has(row.entidad)
                              ? "warning"
                              : row.activo
                                ? "success"
                                : "default"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        <Stack spacing={0.75}>
                          <Typography variant="body2" fontWeight="bold">
                            {formatActor(row.created_by_username, row.created_by_nombre)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(row.created_at)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        <Stack spacing={0.75}>
                          <Typography variant="body2" fontWeight="bold">
                            {formatActor(row.updated_by_username, row.updated_by_nombre)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(row.updated_at)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        {row.inactivado_en ? (
                          <Stack spacing={0.75}>
                            <Typography variant="body2" fontWeight="bold">
                              {formatActor(row.inactivado_por_username, row.inactivado_por_nombre)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(row.inactivado_en)}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Sin inactivacion
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

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
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage="Filas por pagina"
            />
          </>
        )}
      </Paper>
    </Box>
  );
}

export default Auditoria;
