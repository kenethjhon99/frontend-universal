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
import { hasAnyModule, hasPermission, hasRole } from "../lib/access";
import { useAppSession } from "../hooks/useAppSession";
import WorkspaceLinks from "../components/WorkspaceLinks";
import SucursalSwitcher from "../components/SucursalSwitcher";
import {
  buildDefaultDateRange,
  formatCurrency,
  formatInteger,
  normalizeApiError,
} from "../lib/reporting";
import { getReporteGeneral } from "../services/reportesService";

function StatCard({ label, value, helper }) {
  return (
    <article className="panel p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
        {label}
      </p>
      <p className="mt-3 break-words text-xl font-black leading-tight text-stone-900">
        {value}
      </p>
      <p className="mt-2 break-words text-sm leading-6 text-stone-500">{helper}</p>
    </article>
  );
}

function DashboardPage() {
  const { session, logout } = useAppSession();
  const dateRange = useMemo(() => buildDefaultDateRange(7), []);
  const activeBranchId = session?.sucursal_activa?.id_sucursal;
  const canManageCompanies = hasRole(session, "SUPER_ADMIN", "SUPER_ADMIN_SAAS");
  const canManageUsers = hasRole(
    session,
    "ADMIN_EMPRESA",
    "ENCARGADO_SUCURSAL"
  );
  const canViewAudit = hasPermission(session, "audit.read");
  const canViewReports =
    hasAnyModule(session, "REPORTES") && hasPermission(session, "reports.read");
  const hasPosModule = hasAnyModule(session, "POS");
  const hasServicesModule =
    hasAnyModule(session, "SERVICIOS", "CARWASH") &&
    hasPermission(session, "services.read");
  const hasInventoryModule = hasAnyModule(session, "INVENTARIO", "COMPRAS", "POS");
  const hasPurchasesModule = hasAnyModule(session, "COMPRAS", "INVENTARIO");
  const [analyticsView, setAnalyticsView] = useState("EMPRESA");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(canViewReports);
  const [analyticsError, setAnalyticsError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadAnalytics = async () => {
      if (!canViewReports || !activeBranchId) {
        setAnalytics(null);
        setAnalyticsLoading(false);
        return;
      }

      try {
        setAnalyticsLoading(true);
        const data = await getReporteGeneral(
          {
            desde: dateRange.desde,
            hasta: dateRange.hasta,
            vista: analyticsView,
            top: 5,
            stock_limit: 5,
          },
          { branchId: activeBranchId }
        );

        if (!ignore) {
          setAnalytics(data);
          setAnalyticsError("");
        }
      } catch (requestError) {
        if (!ignore) {
          setAnalyticsError(
            normalizeApiError(
              requestError,
              "No se pudieron cargar las metricas gerenciales"
            )
          );
        }
      } finally {
        if (!ignore) {
          setAnalyticsLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      ignore = true;
    };
  }, [activeBranchId, analyticsView, canViewReports, dateRange]);

  const cards = [
    {
      label: "Empresa",
      value: session?.empresa?.nombre_legal || "Sin empresa",
      helper: `Slug: ${session?.empresa?.slug || "-"}`,
    },
    {
      label: "Rol activo",
      value: session?.user?.rol || "Sin rol",
      helper: `Usuario: ${session?.user?.username || "-"}`,
    },
    {
      label: "Modulos",
      value: formatInteger((session?.modulos || []).length),
      helper: (session?.modulos || []).join(", ") || "Sin modulos",
    },
    ...(canViewReports
      ? [
          {
            label: "Ventas 7 dias",
            value: analyticsLoading
              ? "..."
              : formatCurrency(analytics?.resumen?.total_ventas),
            helper:
              analyticsView === "EMPRESA"
                ? "Lectura consolidada del tenant"
                : "Lectura de la sucursal activa",
          },
          {
            label: "Utilidad 7 dias",
            value: analyticsLoading
              ? "..."
              : formatCurrency(analytics?.resumen?.utilidad_estimada),
            helper: "Estimacion basada en detalle de venta",
          },
          {
            label: "Stock bajo",
            value: analyticsLoading
              ? "..."
              : formatInteger(analytics?.resumen?.productos_stock_bajo),
            helper: "Alertas actuales del alcance",
          },
        ]
      : []),
  ];

  const lowStockItems = analytics?.stock_bajo || [];
  const branchSummary = analytics?.sucursales_resumen || [];

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:py-7">
          <div>
            <WorkspaceLinks />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              Centro de control
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-stone-900 sm:text-3xl lg:text-4xl">
              Dashboard operativo y gerencial
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
              El panel principal ya combina provisionamiento SaaS, modulos por
              empresa y lectura gerencial sobre la base nueva, manteniendo tenant
              y sucursal aislados.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canViewReports ? (
              <Link className="btn-secondary" to="/analitica/reportes">
                Abrir reportes
              </Link>
            ) : null}
            {canManageCompanies ? (
              <Link className="btn-secondary" to="/platform/empresas">
                Administrar empresas
              </Link>
            ) : null}
            <button className="btn-secondary" type="button" onClick={logout}>
              Cerrar sesion
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          {analyticsError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {analyticsError}
            </div>
          ) : null}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {cards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          {canViewReports ? (
            <article className="panel p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                    Lectura gerencial
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-stone-900">
                    Resumen rapido de los ultimos 7 dias
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={
                      analyticsView === "EMPRESA" ? "chip chip-active" : "chip"
                    }
                    type="button"
                    onClick={() => setAnalyticsView("EMPRESA")}
                  >
                    Vista empresa
                  </button>
                  <button
                    className={
                      analyticsView === "SUCURSAL" ? "chip chip-active" : "chip"
                    }
                    type="button"
                    onClick={() => setAnalyticsView("SUCURSAL")}
                  >
                    Vista sucursal
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                  <p className="text-sm font-bold text-stone-900">
                    Tendencia de ventas y utilidad
                  </p>
                  <div className="mt-5 h-[280px]">
                    {analyticsLoading ? (
                      <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white text-sm text-stone-500">
                        Cargando tendencia...
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics?.ventas_por_dia || []}>
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
                </div>

                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                  <p className="text-sm font-bold text-stone-900">
                    {branchSummary.length > 1
                      ? "Rendimiento por sucursal"
                      : "Metodos de pago"}
                  </p>
                  <div className="mt-5 h-[280px]">
                    {analyticsLoading ? (
                      <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white text-sm text-stone-500">
                        Cargando distribucion...
                      </div>
                    ) : branchSummary.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={branchSummary}>
                          <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                          <XAxis dataKey="codigo" stroke="#78716c" />
                          <YAxis stroke="#78716c" />
                          <Tooltip />
                          <Bar
                            dataKey="total_ventas"
                            fill="#0284c7"
                            radius={[10, 10, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics?.metodos_pago || []}>
                          <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                          <XAxis dataKey="metodo_pago" stroke="#78716c" />
                          <YAxis stroke="#78716c" />
                          <Tooltip />
                          <Bar
                            dataKey="total"
                            fill="#d97706"
                            radius={[10, 10, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ) : (
            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Analitica
              </p>
              <h2 className="mt-3 text-2xl font-black text-stone-900">
                Modulo de reportes desactivado
              </h2>
              <p className="mt-3 text-sm leading-7 text-stone-500">
                Cuando actives `REPORTES` para este tenant, el dashboard mostrara
                KPIs y la vista analitica completa.
              </p>
            </article>
          )}

          <article className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Modulos conectados
            </p>
            <h2 className="mt-3 text-2xl font-black text-stone-900">
              Operacion por etapas
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {hasPosModule ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <h3 className="text-sm font-bold text-stone-900">POS y caja</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    Ventas, caja, comprobantes y stock por sucursal ya trabajan
                    sobre la base multi-empresa nueva.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link className="chip" to="/operacion/ventas">Abrir ventas</Link>
                    <Link className="chip" to="/operacion/caja">Abrir caja</Link>
                  </div>
                </div>
              ) : null}

              {hasServicesModule ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <h3 className="text-sm font-bold text-stone-900">Servicios y carwash</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    El modulo nuevo ya maneja catalogo, ordenes por sucursal,
                    consumo de productos y cobro integrado con caja.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link className="chip" to="/operacion/servicios">Abrir servicios</Link>
                  </div>
                </div>
              ) : null}

              {hasInventoryModule || hasPurchasesModule ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <h3 className="text-sm font-bold text-stone-900">Compras e inventario</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    Las compras impactan inventario y puedes consultar productos
                    entre sucursales de la misma empresa.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {hasPurchasesModule ? (
                      <Link className="chip" to="/operacion/compras">Abrir compras</Link>
                    ) : null}
                    {hasInventoryModule ? (
                      <Link className="chip" to="/operacion/inventario">Ver inventario</Link>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {canManageUsers ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <h3 className="text-sm font-bold text-stone-900">Usuarios</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    Administra usuarios, roles y sucursales asignadas desde el panel nuevo.
                  </p>
                  <Link className="chip mt-4" to="/administracion/usuarios">
                    Abrir usuarios
                  </Link>
                </div>
              ) : null}

              {canViewAudit ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <h3 className="text-sm font-bold text-stone-900">Auditoria</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    Revisa cambios administrativos y acciones sensibles del SaaS.
                  </p>
                  <Link className="chip mt-4" to="/administracion/auditoria">
                    Abrir auditoria
                  </Link>
                </div>
              ) : null}
            </div>
          </article>
        </div>

        <aside className="space-y-6">
          <div className="panel p-6">
            <SucursalSwitcher />
          </div>

          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Sesion actual
            </p>
            <dl className="mt-4 space-y-3 text-sm text-stone-600">
              <div>
                <dt className="font-semibold text-stone-900">Empresa ID</dt>
                <dd>{session?.empresa?.id_empresa || session?.user?.id_empresa}</dd>
              </div>
              <div>
                <dt className="font-semibold text-stone-900">Sucursal activa</dt>
                <dd>
                  {session?.sucursal_activa?.codigo} - {session?.sucursal_activa?.nombre}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-stone-900">Usuario</dt>
                <dd>
                  {session?.user?.nombre} {session?.user?.apellido}
                </dd>
              </div>
            </dl>
          </div>

          {canViewReports ? (
            <div className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Alertas inmediatas
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Alcance
                  </p>
                  <p className="mt-2 text-lg font-black text-stone-900">
                    {analyticsView}
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Cajas abiertas
                  </p>
                  <p className="mt-2 text-lg font-black text-stone-900">
                    {formatInteger(analytics?.resumen?.cajas_abiertas)}
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-bold text-stone-900">Productos a revisar</p>
                  <div className="mt-3 space-y-2 text-sm text-stone-600">
                    {analyticsLoading ? (
                      <p>Cargando alertas...</p>
                    ) : lowStockItems.length === 0 ? (
                      <p>No hay productos en estado critico.</p>
                    ) : (
                      lowStockItems.slice(0, 4).map((item) => (
                        <div
                          key={`${item.id_sucursal}-${item.id_producto}`}
                          className="rounded-2xl border border-stone-200 bg-white px-3 py-3"
                        >
                          <p className="font-semibold text-stone-900">{item.nombre}</p>
                          <p className="mt-1 text-xs text-stone-500">
                            {item.sucursal_codigo} - faltan {formatInteger(item.faltante)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

export default DashboardPage;
