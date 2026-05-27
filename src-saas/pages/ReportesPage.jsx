import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SucursalSwitcher from "../components/SucursalSwitcher";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { hasRole } from "../lib/access";
import {
  buildDefaultDateRange,
  downloadCsvFile,
  formatCurrency,
  formatInteger,
  normalizeApiError,
} from "../lib/reporting";
import { getReporteGeneral } from "../services/reportesService";
import { getSucursales } from "../services/sucursalesService";
import CortePanel from "../components/reportes/CortePanel";
import CorteProPanel from "../components/reportes/CorteProPanel";

function MetricCard({ label, value, helper }) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-stone-900">{value}</p>
      <p className="mt-3 text-sm leading-6 text-stone-500">{helper}</p>
    </article>
  );
}

function ReportesPage() {
  const { session } = useAppSession();
  const defaultRange = useMemo(() => buildDefaultDateRange(14), []);
  const activeBranchId = session?.sucursal_activa?.id_sucursal || "";
  const isPrivileged = hasRole(session, "SUPER_ADMIN", "ADMIN_EMPRESA");
  const [companyBranches, setCompanyBranches] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(() => ({
    desde: defaultRange.desde,
    hasta: defaultRange.hasta,
    vista: "EMPRESA",
    id_sucursal: String(activeBranchId || ""),
  }));
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    desde: defaultRange.desde,
    hasta: defaultRange.hasta,
    vista: "EMPRESA",
    id_sucursal: String(activeBranchId || ""),
  }));
  const [activeTab, setActiveTab] = useState("general"); // general | corte | corte-pro

  const branchOptions = useMemo(() => {
    if (isPrivileged && companyBranches.length > 0) {
      return companyBranches;
    }

    return Array.isArray(session?.sucursales) ? session.sucursales : [];
  }, [companyBranches, isPrivileged, session?.sucursales]);

  useEffect(() => {
    let ignore = false;

    const loadBranches = async () => {
      if (!isPrivileged) return;

      try {
        const rows = await getSucursales();
        if (!ignore) {
          setCompanyBranches(rows);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(
            normalizeApiError(
              requestError,
              "No se pudo cargar el catalogo de sucursales"
            )
          );
        }
      }
    };

    loadBranches();

    return () => {
      ignore = true;
    };
  }, [isPrivileged]);

  useEffect(() => {
    let ignore = false;

    const loadReport = async () => {
      const authBranchId =
        Number(
          appliedFilters.vista === "SUCURSAL"
            ? appliedFilters.id_sucursal || activeBranchId
            : activeBranchId || appliedFilters.id_sucursal
        ) || Number(branchOptions[0]?.id_sucursal || 0);

      if (!authBranchId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getReporteGeneral(
          {
            desde: appliedFilters.desde,
            hasta: appliedFilters.hasta,
            vista: appliedFilters.vista,
            ...(appliedFilters.vista === "SUCURSAL"
              ? { id_sucursal: Number(appliedFilters.id_sucursal || authBranchId) }
              : {}),
            top: 8,
            stock_limit: 10,
          },
          { branchId: authBranchId }
        );

        if (!ignore) {
          setReport(data);
          setError("");
        }
      } catch (requestError) {
        if (!ignore) {
          setError(
            normalizeApiError(
              requestError,
              "No se pudo cargar el reporte gerencial"
            )
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadReport();

    return () => {
      ignore = true;
    };
  }, [activeBranchId, appliedFilters, branchOptions]);

  const summaryCards = [
    {
      label: "Ventas netas",
      value: formatCurrency(report?.resumen?.total_ventas),
      helper: `${formatInteger(report?.resumen?.ventas_cantidad)} venta(s)`,
    },
    {
      label: "Compras",
      value: formatCurrency(report?.resumen?.total_compras),
      helper: `${formatInteger(report?.resumen?.compras_cantidad)} compra(s)`,
    },
    {
      label: "Utilidad",
      value: formatCurrency(report?.resumen?.utilidad_estimada),
      helper: "Basada en detalle y costo registrado",
    },
    {
      label: "Ticket promedio",
      value: formatCurrency(report?.resumen?.ticket_promedio),
      helper: "Promedio por venta confirmada",
    },
    {
      label: "Stock bajo",
      value: formatInteger(report?.resumen?.productos_stock_bajo),
      helper: "Alertas de inventario actuales",
    },
    {
      label: "Cajas abiertas",
      value: formatInteger(report?.resumen?.cajas_abiertas),
      helper: "Sesiones abiertas en el alcance",
    },
  ];

  const scopeBranches = report?.alcance?.sucursales_consideradas || [];
  const multipleBranches = scopeBranches.length > 1;

  const applyFilters = (event) => {
    event.preventDefault();

    const nextBranchId =
      Number(filters.id_sucursal || activeBranchId || branchOptions[0]?.id_sucursal || 0);

    if (filters.vista === "SUCURSAL" && !nextBranchId) {
      setError("Selecciona una sucursal para esa vista");
      return;
    }

    setAppliedFilters({
      ...filters,
      id_sucursal: filters.vista === "SUCURSAL" ? String(nextBranchId) : "",
    });
  };

  const exportCsv = () => {
    if (!report) return;

    try {
      setExporting(true);
      downloadCsvFile(`reporte-${report.rango?.desde}-a-${report.rango?.hasta}.csv`, [
        ["REPORTE GERENCIAL"],
        ["Empresa", report.empresa?.nombre_legal || ""],
        ["Vista", report.alcance?.vista_resuelta || ""],
        ["Desde", report.rango?.desde || ""],
        ["Hasta", report.rango?.hasta || ""],
        [""],
        ["RESUMEN"],
        ["Ventas", report.resumen?.total_ventas || 0],
        ["Compras", report.resumen?.total_compras || 0],
        ["Utilidad", report.resumen?.utilidad_estimada || 0],
        ["Ticket promedio", report.resumen?.ticket_promedio || 0],
        ["Stock bajo", report.resumen?.productos_stock_bajo || 0],
        [""],
        ["TOP PRODUCTOS"],
        ["Producto", "Cantidad", "Ventas", "Utilidad"],
        ...(report.top_productos || []).map((row) => [
          row.producto_nombre,
          row.cantidad_vendida,
          row.total_ventas,
          row.utilidad_estimada,
        ]),
        [""],
        ["STOCK BAJO"],
        ["Sucursal", "Producto", "Stock", "Minimo", "Faltante"],
        ...(report.stock_bajo || []).map((row) => [
          `${row.sucursal_codigo} - ${row.sucursal_nombre}`,
          row.nombre,
          row.stock_actual,
          row.stock_minimo,
          row.faltante,
        ]),
      ]);
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow="Reportes"
        title="Panel gerencial por empresa o sucursal"
        description="Consulta ventas, compras, utilidad, stock bajo y rendimiento por sucursal sobre la base SaaS nueva."
        actions={
          <>
            <button
              className="btn-secondary"
              type="button"
              onClick={exportCsv}
              disabled={!report || exporting}
            >
              {exporting ? "Exportando..." : "Exportar CSV"}
            </button>
            <Link className="btn-secondary" to="/">
              Volver al dashboard
            </Link>
          </>
        }
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <article className="panel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  Filtros
                </p>
                <h2 className="mt-3 text-2xl font-black text-stone-900">
                  Define el alcance del reporte
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {scopeBranches.map((branch) => (
                  <span
                    key={branch.id_sucursal}
                    className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700"
                  >
                    {branch.codigo} - {branch.nombre}
                  </span>
                ))}
              </div>
            </div>

            <form className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={applyFilters}>
              <select
                className="field"
                value={filters.vista}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, vista: event.target.value }))
                }
              >
                <option value="EMPRESA">Vista empresa</option>
                <option value="SUCURSAL">Vista sucursal</option>
              </select>

              <input
                className="field"
                type="date"
                value={filters.desde}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, desde: event.target.value }))
                }
              />

              <input
                className="field"
                type="date"
                value={filters.hasta}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, hasta: event.target.value }))
                }
              />

              {filters.vista === "SUCURSAL" ? (
                <select
                  className="field"
                  value={filters.id_sucursal}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      id_sucursal: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona sucursal</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id_sucursal} value={branch.id_sucursal}>
                      {branch.codigo} - {branch.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
                  {isPrivileged
                    ? "Incluye todas las sucursales del tenant"
                    : "Incluye tus sucursales asignadas"}
                </div>
              )}

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Consultando..." : "Actualizar"}
              </button>
            </form>
          </article>

          {/* Tab switcher */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "general", label: "General" },
              { id: "corte", label: "Corte" },
              { id: "corte-pro", label: "Corte Pro" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={
                  activeTab === tab.id ? "chip chip-active" : "chip"
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Corte tab */}
          <CortePanel
            isVisible={activeTab === "corte"}
            filters={appliedFilters}
            branchId={
              Number(
                appliedFilters.vista === "SUCURSAL"
                  ? appliedFilters.id_sucursal || activeBranchId
                  : activeBranchId || appliedFilters.id_sucursal
              ) || Number(branchOptions[0]?.id_sucursal || 0)
            }
          />

          {/* Corte Pro tab */}
          <CorteProPanel
            isVisible={activeTab === "corte-pro"}
            filters={appliedFilters}
            branchId={
              Number(
                appliedFilters.vista === "SUCURSAL"
                  ? appliedFilters.id_sucursal || activeBranchId
                  : activeBranchId || appliedFilters.id_sucursal
              ) || Number(branchOptions[0]?.id_sucursal || 0)
            }
          />

          {/* General tab (existente) */}
          {activeTab === "general" ? (
          <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Ventas
              </p>
              <h2 className="mt-3 text-2xl font-black text-stone-900">
                Ventas y utilidad por dia
              </h2>
              <div className="mt-6 h-[320px]">
                {loading ? (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
                    Cargando comportamiento de ventas...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={report?.ventas_por_dia || []}>
                      <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" stroke="#78716c" />
                      <YAxis stroke="#78716c" />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="total_ventas"
                        stroke="#0f766e"
                        fill="#99f6e4"
                        strokeWidth={3}
                      />
                      <Area
                        type="monotone"
                        dataKey="utilidad_estimada"
                        stroke="#16a34a"
                        fillOpacity={0}
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>

            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Compras
              </p>
              <h2 className="mt-3 text-2xl font-black text-stone-900">
                Compras por dia
              </h2>
              <div className="mt-6 h-[320px]">
                {loading ? (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
                    Cargando compras...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report?.compras_por_dia || []}>
                      <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" stroke="#78716c" />
                      <YAxis stroke="#78716c" />
                      <Tooltip />
                      <Bar
                        dataKey="total_compras"
                        fill="#d97706"
                        radius={[10, 10, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Cobros
              </p>
              <h2 className="mt-3 text-2xl font-black text-stone-900">
                Metodos de pago
              </h2>
              <div className="mt-6 h-[300px]">
                {loading ? (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
                    Cargando metodos de pago...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report?.metodos_pago || []}>
                      <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                      <XAxis dataKey="metodo_pago" stroke="#78716c" />
                      <YAxis stroke="#78716c" />
                      <Tooltip />
                      <Bar dataKey="total" fill="#0284c7" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>

            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Rendimiento
              </p>
              <h2 className="mt-3 text-2xl font-black text-stone-900">
                Resumen por sucursal
              </h2>
              <div className="mt-6 h-[300px]">
                {loading ? (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
                    Cargando resumen multi-sucursal...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report?.sucursales_resumen || []}>
                      <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                      <XAxis dataKey="codigo" stroke="#78716c" />
                      <YAxis stroke="#78716c" />
                      <Tooltip />
                      <Bar
                        dataKey="total_ventas"
                        fill="#0f766e"
                        radius={[10, 10, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Top comercial
              </p>
              <h2 className="mt-3 text-2xl font-black text-stone-900">
                Productos con mejor salida
              </h2>
              <div className="table-shell mt-6 overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Ventas</th>
                      <th>Utilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4}>Cargando top productos...</td></tr>
                    ) : (report?.top_productos || []).length === 0 ? (
                      <tr><td colSpan={4}>No hay ventas en el rango consultado.</td></tr>
                    ) : (
                      (report?.top_productos || []).map((row) => (
                        <tr key={row.id_producto}>
                          <td>
                            <div className="font-semibold text-stone-900">
                              {row.producto_nombre}
                            </div>
                            <div className="mt-1 text-xs text-stone-500">{row.sku}</div>
                          </td>
                          <td>{formatInteger(row.cantidad_vendida)}</td>
                          <td>{formatCurrency(row.total_ventas)}</td>
                          <td>{formatCurrency(row.utilidad_estimada)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Alertas
              </p>
              <h2 className="mt-3 text-2xl font-black text-stone-900">
                Stock bajo por sucursal
              </h2>
              <div className="table-shell mt-6 overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      {multipleBranches ? <th>Sucursal</th> : null}
                      <th>Producto</th>
                      <th>Stock</th>
                      <th>Minimo</th>
                      <th>Faltante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={multipleBranches ? 5 : 4}>Cargando alertas...</td></tr>
                    ) : (report?.stock_bajo || []).length === 0 ? (
                      <tr><td colSpan={multipleBranches ? 5 : 4}>No hay productos en estado critico.</td></tr>
                    ) : (
                      (report?.stock_bajo || []).map((row) => (
                        <tr key={`${row.id_sucursal}-${row.id_producto}`}>
                          {multipleBranches ? (
                            <td>{row.sucursal_codigo} - {row.sucursal_nombre}</td>
                          ) : null}
                          <td>
                            <div className="font-semibold text-stone-900">{row.nombre}</div>
                            <div className="mt-1 text-xs text-stone-500">{row.sku}</div>
                          </td>
                          <td>{formatInteger(row.stock_actual)}</td>
                          <td>{formatInteger(row.stock_minimo)}</td>
                          <td>{formatInteger(row.faltante)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
          </>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="panel p-6">
            <SucursalSwitcher />
          </div>

          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Alcance resuelto
            </p>
            <p className="mt-3 text-xl font-black text-stone-900">
              {report?.alcance?.vista_resuelta || filters.vista}
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              {report?.alcance?.restringido_a_sucursales_asignadas
                ? "Este reporte queda limitado a las sucursales asignadas al usuario."
                : "Este reporte puede abarcar todas las sucursales de la empresa."}
            </p>
          </div>

          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Lectura rapida
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="font-semibold text-stone-900">Ventas en efectivo</p>
                <p className="mt-2 text-lg font-black text-stone-900">
                  {formatCurrency(report?.resumen?.total_efectivo)}
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="font-semibold text-stone-900">Ventas a credito</p>
                <p className="mt-2 text-lg font-black text-stone-900">
                  {formatCurrency(report?.resumen?.total_credito)}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default ReportesPage;
