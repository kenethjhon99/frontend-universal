import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { formatCurrency, normalizeApiError } from "../lib/reporting";
import {
  getMetrics,
  impersonateEmpresa,
  reactivateEmpresa,
  suspendEmpresa,
} from "../services/platformService";

const formatUsd = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function MetricCard({ label, value, sublabel, accent = "stone" }) {
  const colors = {
    stone: "bg-stone-50 border-stone-200 text-stone-900",
    brand: "bg-brand-50 border-brand-200 text-brand-900",
    rose: "bg-rose-50 border-rose-200 text-rose-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
  };
  return (
    <article
      className={`rounded-3xl border p-5 ${colors[accent] || colors.stone}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      {sublabel ? <p className="mt-1 text-xs opacity-70">{sublabel}</p> : null}
    </article>
  );
}

function PlatformDashboardPage() {
  const navigate = useNavigate();
  const { replaceSession } = useAppSession();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const r = await getMetrics();
      setData(r);
    } catch (err) {
      setError(normalizeApiError(err, "No se pudieron cargar las métricas"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSuspend = async (idEmpresa, slug) => {
    const motivo = window.prompt(
      `Motivo de suspensión de "${slug}":`,
      "Falta de pago"
    );
    if (!motivo) return;
    try {
      await suspendEmpresa(idEmpresa, motivo);
      setSuccess(`Empresa ${slug} suspendida`);
      await load();
    } catch (err) {
      setError(normalizeApiError(err, "No se pudo suspender"));
    }
  };

  const handleReactivate = async (idEmpresa, slug) => {
    if (!window.confirm(`¿Reactivar empresa "${slug}"?`)) return;
    try {
      await reactivateEmpresa(idEmpresa);
      setSuccess(`Empresa ${slug} reactivada`);
      await load();
    } catch (err) {
      setError(normalizeApiError(err, "No se pudo reactivar"));
    }
  };

  const handleImpersonate = async (idEmpresa, slug) => {
    if (
      !window.confirm(
        `¿Iniciar impersonación en "${slug}"? Toda acción quedará auditada con tu usuario.`
      )
    ) {
      return;
    }
    try {
      const r = await impersonateEmpresa(idEmpresa);
      // Reemplazar la sesión actual con el token impersonado (30min)
      replaceSession({
        token: r.token,
        user: {
          id_usuario: r.target.id_usuario,
          id_empresa: r.target.id_empresa,
          username: r.target.username,
          rol: "ADMIN_EMPRESA",
        },
        empresa: {
          id_empresa: r.target.id_empresa,
          slug: r.target.slug,
          nombre_legal: r.target.nombre_legal,
        },
        sucursal_activa: null,
        sucursales: [],
        modulos: [],
        permisos: [],
        impersonation: true,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(normalizeApiError(err, "No se pudo impersonar"));
    }
  };

  return (
    <main className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow="Plataforma SaaS"
        title="Panel de control"
        description="Métricas del SaaS, gestión de empresas, suspensión y soporte vía impersonación auditada."
      />

      <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-stone-500">Cargando…</p>
        ) : data ? (
          <>
            {/* ---------- KPIs ---------- */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="MRR"
                value={formatUsd(data.mrr_usd)}
                sublabel="ingresos mensuales recurrentes"
                accent="brand"
              />
              <MetricCard
                label="ARR"
                value={formatUsd(data.arr_usd)}
                sublabel="proyección anual"
                accent="brand"
              />
              <MetricCard
                label="Nuevas (30d)"
                value={data.nuevas_30d}
                sublabel="empresas registradas"
                accent="emerald"
              />
              <MetricCard
                label="Churn (30d)"
                value={data.churn_30d}
                sublabel="cancelaciones / trials vencidos"
                accent={data.churn_30d > 0 ? "rose" : "stone"}
              />
            </div>

            {/* ---------- Estado / Plan ---------- */}
            <div className="grid gap-6 lg:grid-cols-2">
              <article className="panel p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  Empresas por estado
                </p>
                <table className="table-base mt-4">
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th className="text-right">Empresas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.empresas_por_estado.map((row) => (
                      <tr key={row.estado}>
                        <td>
                          <span className="chip">{row.estado}</span>
                        </td>
                        <td className="text-right font-mono">{row.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>

              <article className="panel p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  Empresas por plan
                </p>
                <table className="table-base mt-4">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th className="text-right">Total</th>
                      <th className="text-right">Activas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.empresas_por_plan.map((row) => (
                      <tr key={row.plan}>
                        <td>
                          <strong>{row.plan}</strong>
                        </td>
                        <td className="text-right font-mono">{row.empresas}</td>
                        <td className="text-right font-mono">{row.activas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            </div>

            {/* ---------- Trials por vencer ---------- */}
            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Trials que vencen en los próximos 7 días (
                {data.trials_proximos_vencer.length})
              </p>
              {data.trials_proximos_vencer.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">
                  Sin trials próximos a vencer.
                </p>
              ) : (
                <table className="table-base mt-4">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Slug</th>
                      <th>Vence</th>
                      <th className="text-right">Días</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trials_proximos_vencer.map((row) => (
                      <tr key={row.id_empresa}>
                        <td>{row.nombre_legal}</td>
                        <td>
                          <code className="font-mono text-xs">{row.slug}</code>
                        </td>
                        <td>
                          {new Date(row.saas_trial_hasta).toLocaleDateString()}
                        </td>
                        <td className="text-right">
                          <span
                            className={
                              row.dias_restantes <= 1
                                ? "badge-warn"
                                : "badge-muted"
                            }
                          >
                            {row.dias_restantes}d
                          </span>
                        </td>
                        <td>
                          <button
                            className="text-xs font-semibold text-brand-700 hover:underline"
                            onClick={() =>
                              handleImpersonate(row.id_empresa, row.slug)
                            }
                          >
                            Impersonar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>

            {/* ---------- Suspendidas ---------- */}
            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Suspendidas / Canceladas ({data.suspendidas.length})
              </p>
              {data.suspendidas.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">
                  Sin empresas suspendidas.
                </p>
              ) : (
                <table className="table-base mt-4">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Slug</th>
                      <th>Plan</th>
                      <th>Última actualización</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.suspendidas.map((row) => (
                      <tr key={row.id_empresa}>
                        <td>{row.nombre_legal}</td>
                        <td>
                          <code className="font-mono text-xs">{row.slug}</code>
                        </td>
                        <td>{row.saas_plan_codigo || "—"}</td>
                        <td>{new Date(row.updated_at).toLocaleString()}</td>
                        <td className="flex gap-2">
                          <button
                            className="text-xs font-semibold text-emerald-700 hover:underline"
                            onClick={() =>
                              handleReactivate(row.id_empresa, row.slug)
                            }
                          >
                            Reactivar
                          </button>
                          <button
                            className="text-xs font-semibold text-brand-700 hover:underline"
                            onClick={() =>
                              handleImpersonate(row.id_empresa, row.slug)
                            }
                          >
                            Impersonar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>

            {/* ---------- Top uso ---------- */}
            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Top 10 empresas por uso (ventas / mes)
              </p>
              <table className="table-base mt-4">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Plan</th>
                    <th className="text-right">Ventas/mes</th>
                    <th className="text-right">Sucursales</th>
                    <th className="text-right">Usuarios</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_uso.map((row) => (
                    <tr key={row.id_empresa}>
                      <td>{row.nombre_legal}</td>
                      <td>{row.saas_plan_codigo}</td>
                      <td className="text-right font-mono">
                        {row.ventas_mes_count || 0}
                      </td>
                      <td className="text-right font-mono">
                        {row.sucursales_count || 0}
                      </td>
                      <td className="text-right font-mono">
                        {row.usuarios_count || 0}
                      </td>
                      <td className="flex gap-2">
                        <button
                          className="text-xs font-semibold text-amber-700 hover:underline"
                          onClick={() =>
                            handleSuspend(row.id_empresa, row.slug)
                          }
                        >
                          Suspender
                        </button>
                        <button
                          className="text-xs font-semibold text-brand-700 hover:underline"
                          onClick={() =>
                            handleImpersonate(row.id_empresa, row.slug)
                          }
                        >
                          Impersonar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default PlatformDashboardPage;
