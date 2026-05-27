import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatCurrency,
  formatInteger,
  normalizeApiError,
  downloadCsvFile,
} from "../../lib/reporting";
import { getCorteVentasDetalladoPro } from "../../services/reportesService";

const PIE_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
];

function CorteProPanel({ filters, branchId, isVisible }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isVisible) return;
    let ignore = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getCorteVentasDetalladoPro(
          {
            desde: filters.desde,
            hasta: filters.hasta,
            vista: filters.vista,
            ...(filters.vista === "SUCURSAL" && filters.id_sucursal
              ? { id_sucursal: Number(filters.id_sucursal) }
              : {}),
            top: 10,
            page,
            limit: 25,
          },
          { branchId }
        );

        if (!ignore) setData(result);
      } catch (requestError) {
        if (!ignore) {
          setError(
            normalizeApiError(
              requestError,
              "No se pudo cargar el corte detallado"
            )
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [filters, branchId, page, isVisible]);

  if (!isVisible) return null;

  const exportCsv = () => {
    if (!data) return;
    downloadCsvFile(
      `corte-pro-${data.rango?.desde}-a-${data.rango?.hasta}.csv`,
      [
        ["CORTE DETALLADO PRO"],
        ["Empresa", data.empresa?.nombre_legal || ""],
        ["Vista", data.alcance?.vista_resuelta || ""],
        ["Desde", data.rango?.desde || ""],
        ["Hasta", data.rango?.hasta || ""],
        [""],
        ["RESUMEN"],
        ["Ventas", data.resumen?.ventas_cantidad ?? 0],
        ["Total neto", data.resumen?.total_neto ?? 0],
        ["Utilidad", data.resumen?.utilidad_estimada ?? 0],
        [""],
        ["TOP PRODUCTOS POR TOTAL"],
        ["Producto", "Cantidad neta", "Total neto"],
        ...(data.top_productos_por_total || []).map((p) => [
          p.producto_nombre,
          p.cantidad_vendida_neta,
          p.total_neto,
        ]),
        [""],
        ["TOP PRODUCTOS POR CANTIDAD"],
        ["Producto", "Cantidad neta", "Total neto"],
        ...(data.top_productos_por_cantidad || []).map((p) => [
          p.producto_nombre,
          p.cantidad_vendida_neta,
          p.total_neto,
        ]),
        [""],
        ["VENTAS"],
        [
          "Numero",
          "Fecha",
          "Usuario",
          "Cliente",
          "Tipo venta",
          "Metodo pago",
          "Estado",
          "Estado reversion",
          "Total original",
          "Revertido",
          "Total neto",
        ],
        ...(data.ventas || []).map((v) => [
          v.numero_comprobante,
          v.fecha_venta,
          v.usuario_username,
          v.cliente_nombre || "",
          v.tipo_venta,
          v.metodo_pago,
          v.estado,
          v.estado_reversion,
          v.total_original,
          v.monto_revertido,
          v.total_neto,
        ]),
      ]
    );
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-500">
        Calculando corte detallado...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const meta = data.meta || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn-secondary" type="button" onClick={exportCsv}>
          Exportar CSV
        </button>
      </div>

      {/* Pies + barras */}
      <div className="grid gap-6 xl:grid-cols-2">
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
            Por metodo de pago
          </p>
          <div className="mt-4 h-[280px]">
            {(data.por_metodo_pago || []).length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-stone-500">
                Sin datos
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.por_metodo_pago}
                    dataKey="total_neto"
                    nameKey="metodo_pago"
                    outerRadius={100}
                    label={(entry) =>
                      `${entry.metodo_pago}: ${formatCurrency(entry.total_neto)}`
                    }
                  >
                    {(data.por_metodo_pago || []).map((_, index) => (
                      <Cell
                        key={index}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
            Por tipo de venta
          </p>
          <div className="mt-4 h-[280px]">
            {(data.por_tipo_venta || []).length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-stone-500">
                Sin datos
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.por_tipo_venta}
                    dataKey="total_neto"
                    nameKey="tipo_venta"
                    outerRadius={100}
                    label={(entry) =>
                      `${entry.tipo_venta}: ${formatCurrency(entry.total_neto)}`
                    }
                  >
                    {(data.por_tipo_venta || []).map((_, index) => (
                      <Cell
                        key={index}
                        fill={PIE_COLORS[(index + 3) % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </div>

      {/* Top productos */}
      <article className="panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
          Top productos por venta neta
        </p>
        <div className="mt-4 h-[320px]">
          {(data.top_productos_por_total || []).length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-stone-500">
              Sin datos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.top_productos_por_total}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                <XAxis type="number" stroke="#78716c" />
                <YAxis
                  dataKey="producto_nombre"
                  type="category"
                  stroke="#78716c"
                  width={140}
                />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="total_neto" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>

      {/* Tabla de top por cantidad */}
      <article className="panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
          Top productos por cantidad vendida
        </p>
        <div className="table-shell mt-4 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Cantidad neta</th>
                <th>Total neto</th>
              </tr>
            </thead>
            <tbody>
              {(data.top_productos_por_cantidad || []).length === 0 ? (
                <tr>
                  <td colSpan={4}>Sin datos.</td>
                </tr>
              ) : (
                data.top_productos_por_cantidad.map((p) => (
                  <tr key={p.id_producto}>
                    <td>
                      <div className="font-semibold text-stone-900">
                        {p.producto_nombre}
                      </div>
                      {p.codigo_barras ? (
                        <div className="text-xs text-stone-500">
                          {p.codigo_barras}
                        </div>
                      ) : null}
                    </td>
                    <td>{p.sku || "-"}</td>
                    <td>{formatInteger(p.cantidad_vendida_neta)}</td>
                    <td>{formatCurrency(p.total_neto)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* Tabla paginada de ventas */}
      <article className="panel p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
            Ventas (pag {meta.page} de {meta.totalPages})
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              type="button"
              disabled={meta.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              className="btn-secondary"
              type="button"
              disabled={meta.page >= meta.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>

        <div className="table-shell mt-4 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Numero</th>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Cliente</th>
                <th>Tipo / Pago</th>
                <th>Estado</th>
                <th>Total neto</th>
              </tr>
            </thead>
            <tbody>
              {(data.ventas || []).length === 0 ? (
                <tr>
                  <td colSpan={7}>Sin ventas en el rango.</td>
                </tr>
              ) : (
                data.ventas.map((v) => (
                  <tr key={v.id_venta}>
                    <td>
                      <div className="font-mono text-xs">
                        {v.numero_comprobante || `#${v.id_venta}`}
                      </div>
                    </td>
                    <td className="text-xs text-stone-600">
                      {new Date(v.fecha_venta).toLocaleString("es-GT")}
                    </td>
                    <td>{v.usuario_username}</td>
                    <td>{v.cliente_nombre || "Consumidor final"}</td>
                    <td>
                      <div className="text-xs">{v.tipo_venta}</div>
                      <div className="text-xs text-stone-500">
                        {v.metodo_pago}
                      </div>
                    </td>
                    <td>
                      <span
                        className={
                          v.estado_reversion === "TOTAL"
                            ? "badge-warning"
                            : v.estado_reversion === "PARCIAL"
                              ? "badge-warning"
                              : "badge-success"
                        }
                      >
                        {v.estado_reversion}
                      </span>
                    </td>
                    <td>
                      <div className="font-semibold">
                        {formatCurrency(v.total_neto)}
                      </div>
                      {Number(v.monto_revertido || 0) > 0 ? (
                        <div className="text-xs text-amber-700">
                          -{formatCurrency(v.monto_revertido)}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

export default CorteProPanel;
