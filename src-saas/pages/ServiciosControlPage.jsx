import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SucursalSwitcher from "../components/SucursalSwitcher";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { hasPermission, hasRole } from "../lib/access";
import {
  buildDefaultDateRange,
  formatCurrency,
  formatDateTime,
  formatInteger,
  normalizeApiError,
} from "../lib/reporting";
import {
  anularOrdenServicio,
  createServiciosChecklistTemplate,
  getReporteServicios,
  getServicioControlById,
  getServiciosAgenda,
  getServiciosCatalogo,
  getServiciosChecklistTemplates,
  getServiciosTecnicos,
  programarOrdenServicio,
  reembolsarOrdenServicio,
  updateChecklistOrdenServicio,
  updateServiciosChecklistTemplate,
  upsertServicioTecnico,
} from "../services/serviciosService";
import { getSucursales } from "../services/sucursalesService";
import { getUsuarios } from "../services/usuariosService";

const SERVICE_MODULES = ["SERVICIOS", "CARWASH"];
const techFormInit = {
  id_usuario: "",
  alias: "",
  especialidades: "",
  color_agenda: "",
  notas: "",
  activo: true,
};
const tplFormInit = (modulo) => ({
  id: null,
  id_servicio_catalogo: "",
  titulo: "",
  instrucciones: "",
  orden: "1",
  obligatorio: true,
  activo: true,
  modulo,
});
const scheduleInit = {
  fecha_programada_inicio: "",
  fecha_programada_fin: "",
  fecha_promesa: "",
  prioridad: "NORMAL",
  tecnico_ids: [],
  id_tecnico_principal: "",
};
const refundInit = { monto: "", motivo: "", metodo_reembolso: "EFECTIVO" };
const cancelInit = {
  motivo: "",
  reintegrar_stock: true,
  metodo_reembolso: "EFECTIVO",
};

const modLabel = (value) =>
  String(value || "").toUpperCase() === "CARWASH" ? "Carwash" : "Servicios";

const toLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const toIso = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

function StatCard({ label, value, helper }) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-stone-900">{value}</p>
      <p className="mt-2 text-sm text-stone-500">{helper}</p>
    </article>
  );
}

function ServiciosControlPage() {
  const { session } = useAppSession();
  const activeSucursalId = session?.sucursal_activa?.id_sucursal || "";
  const defaultRange = useMemo(() => buildDefaultDateRange(14), []);
  const enabledModules = useMemo(
    () =>
      (session?.modulos || []).filter((item) =>
        SERVICE_MODULES.includes(String(item || "").trim().toUpperCase())
      ),
    [session]
  );
  const defaultModule = enabledModules[0] || "SERVICIOS";
  const canManageAdmin = hasRole(
    session,
    "SUPER_ADMIN",
    "ADMIN_EMPRESA",
    "ENCARGADO_SUCURSAL"
  );
  const canManage = hasPermission(session, "services.manage");
  const canRefund = hasPermission(session, "services.refund");
  const canReadReports = hasPermission(session, "services.reports.read");
  const canReadUsers = hasPermission(session, "users.read");
  const isPrivileged = hasRole(session, "SUPER_ADMIN", "ADMIN_EMPRESA");

  const [selectedBranchId, setSelectedBranchId] = useState(activeSucursalId || "");
  const [filters, setFilters] = useState({
    modulo: defaultModule,
    desde: defaultRange.desde,
    hasta: defaultRange.hasta,
    vista: "EMPRESA",
    agenda_estado: "",
    id_usuario: "",
  });
  const [applied, setApplied] = useState({
    modulo: defaultModule,
    desde: defaultRange.desde,
    hasta: defaultRange.hasta,
    vista: "EMPRESA",
    agenda_estado: "",
    id_usuario: "",
  });
  const [sucursales, setSucursales] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [reporte, setReporte] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [techForm, setTechForm] = useState(techFormInit);
  const [tplForm, setTplForm] = useState(() => tplFormInit(defaultModule));
  const [scheduleForm, setScheduleForm] = useState(scheduleInit);
  const [refundForm, setRefundForm] = useState(refundInit);
  const [cancelForm, setCancelForm] = useState(cancelInit);
  const effectiveBranchId = Number(selectedBranchId || activeSucursalId || 0);

  useEffect(() => {
    if (activeSucursalId) setSelectedBranchId(activeSucursalId);
  }, [activeSucursalId]);

  useEffect(() => {
    if (!enabledModules.includes(filters.modulo)) {
      setFilters((prev) => ({ ...prev, modulo: defaultModule }));
      setApplied((prev) => ({ ...prev, modulo: defaultModule }));
    }
  }, [defaultModule, enabledModules, filters.modulo]);

  useEffect(() => {
    setTplForm(tplFormInit(applied.modulo));
  }, [applied.modulo]);

  useEffect(() => {
    const load = async () => {
      if (!effectiveBranchId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const reportParams = {
          modulo: applied.modulo,
          desde: applied.desde,
          hasta: applied.hasta,
          vista: "SUCURSAL",
          id_sucursal: effectiveBranchId,
          top: 6,
          eventos: 8,
        };
        const result = await Promise.all([
          getSucursales(),
          canReadUsers
            ? getUsuarios(
                { activo: "true", id_sucursal: effectiveBranchId, limit: 100 },
                { branchId: effectiveBranchId }
              )
            : Promise.resolve([]),
          getServiciosCatalogo(
            { modulo: applied.modulo, limit: 150 },
            { branchId: effectiveBranchId }
          ),
          getServiciosTecnicos(
            { activo: "true", limit: 80 },
            { branchId: effectiveBranchId }
          ),
          getServiciosChecklistTemplates(
            { modulo: applied.modulo, activo: "true" },
            { branchId: effectiveBranchId }
          ),
          getServiciosAgenda(
            {
              modulo: applied.modulo,
              desde: applied.desde,
              hasta: applied.hasta,
              agenda_estado: applied.agenda_estado || undefined,
              id_usuario: applied.id_usuario || undefined,
            },
            { branchId: effectiveBranchId }
          ),
          canReadReports
            ? getReporteServicios(reportParams, { branchId: effectiveBranchId })
            : Promise.resolve(null),
        ]);

        setSucursales(result[0] || []);
        setUsuarios(result[1] || []);
        setCatalogo(result[2] || []);
        setTecnicos(result[3] || []);
        setPlantillas(result[4] || []);
        setAgenda(result[5]?.items || []);
        setReporte(result[6]);
      } catch (requestError) {
        setError(
          normalizeApiError(
            requestError,
            "No se pudo cargar el control de servicios"
          )
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [applied, canReadReports, canReadUsers, effectiveBranchId]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedOrderId || !effectiveBranchId) {
        setDetail(null);
        return;
      }

      try {
        setLoadingDetail(true);
        setDetail(
          await getServicioControlById(selectedOrderId, {
            branchId: effectiveBranchId,
          })
        );
      } catch (requestError) {
        setError(
          normalizeApiError(requestError, "No se pudo cargar el detalle operativo")
        );
      } finally {
        setLoadingDetail(false);
      }
    };

    loadDetail();
  }, [effectiveBranchId, selectedOrderId]);

  useEffect(() => {
    if (!detail?.orden) {
      setScheduleForm(scheduleInit);
      setRefundForm(refundInit);
      setCancelForm(cancelInit);
      return;
    }

    setScheduleForm({
      fecha_programada_inicio: toLocalInput(detail.orden.fecha_programada_inicio),
      fecha_programada_fin: toLocalInput(detail.orden.fecha_programada_fin),
      fecha_promesa: toLocalInput(detail.orden.fecha_promesa),
      prioridad: detail.orden.prioridad || "NORMAL",
      tecnico_ids: (detail.tecnicos || []).map((item) => String(item.id_usuario)),
      id_tecnico_principal: String(
        (detail.tecnicos || []).find((item) => item.es_principal)?.id_usuario || ""
      ),
    });
    setRefundForm({
      ...refundInit,
      monto: String(
        Math.max(
          0,
          Number(detail.orden.total || 0) -
            Number(detail.orden.reembolso_monto || 0)
        )
      ),
    });
    setCancelForm(cancelInit);
  }, [detail]);

  const branchOptions = useMemo(() => {
    if (isPrivileged && sucursales.length > 0) return sucursales;
    return Array.isArray(session?.sucursales) ? session.sucursales : [];
  }, [isPrivileged, session?.sucursales, sucursales]);

  const summary = useMemo(
    () => [
      {
        label: "Ordenes",
        value: formatInteger(reporte?.resumen?.ordenes_total || agenda.length),
        helper: "Dentro del rango activo",
      },
      {
        label: "Facturado",
        value: formatCurrency(reporte?.resumen?.total_facturado || 0),
        helper: `${formatInteger(reporte?.resumen?.ordenes_cobradas || 0)} cobradas`,
      },
      {
        label: "Reembolsos",
        value: formatCurrency(reporte?.resumen?.reembolsos_total || 0),
        helper: "Parciales o totales",
      },
      {
        label: "Agenda viva",
        value: formatInteger(
          (reporte?.resumen?.ordenes_programadas || 0) +
            (reporte?.resumen?.ordenes_en_ejecucion || 0)
        ),
        helper: "Programadas o en ejecucion",
      },
    ],
    [agenda.length, reporte]
  );

  const visibleUsers = useMemo(
    () =>
      usuarios.filter((user) =>
        Array.isArray(user.roles)
          ? user.roles.some((role) =>
              ["ADMIN_EMPRESA", "ENCARGADO_SUCURSAL", "CAJERO"].includes(
                String(role.codigo || "").trim().toUpperCase()
              )
            )
          : true
      ),
    [usuarios]
  );

  const reloadAll = () => setApplied((prev) => ({ ...prev }));

  const handleTechSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving("tech");
      setError("");
      setSuccess("");
      await upsertServicioTecnico(
        Number(techForm.id_usuario),
        {
          alias: techForm.alias || null,
          especialidades: techForm.especialidades
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          color_agenda: techForm.color_agenda || null,
          notas: techForm.notas || null,
          activo: techForm.activo,
        },
        { branchId: effectiveBranchId }
      );
      setTechForm(techFormInit);
      setSuccess("Perfil tecnico guardado.");
      reloadAll();
    } catch (requestError) {
      setError(normalizeApiError(requestError, "No se pudo guardar el tecnico"));
    } finally {
      setSaving("");
    }
  };

  const handleTplSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving("tpl");
      setError("");
      setSuccess("");
      const payload = {
        id_servicio_catalogo: Number(tplForm.id_servicio_catalogo),
        titulo: tplForm.titulo,
        instrucciones: tplForm.instrucciones || null,
        orden: Number(tplForm.orden || 1),
        obligatorio: tplForm.obligatorio,
        activo: tplForm.activo,
      };

      if (tplForm.id) {
        await updateServiciosChecklistTemplate(tplForm.id, payload, {
          branchId: effectiveBranchId,
        });
      } else {
        await createServiciosChecklistTemplate(payload, {
          branchId: effectiveBranchId,
        });
      }

      setTplForm(tplFormInit(applied.modulo));
      setSuccess("Plantilla guardada.");
      reloadAll();
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, "No se pudo guardar la plantilla")
      );
    } finally {
      setSaving("");
    }
  };

  const handleScheduleSubmit = async (event) => {
    event.preventDefault();
    if (!detail?.orden) return;

    try {
      setSaving("agenda");
      setError("");
      setSuccess("");
      setDetail(
        await programarOrdenServicio(
          detail.orden.id_orden_servicio,
          {
            fecha_programada_inicio: toIso(scheduleForm.fecha_programada_inicio),
            fecha_programada_fin: toIso(scheduleForm.fecha_programada_fin),
            fecha_promesa: toIso(scheduleForm.fecha_promesa),
            prioridad: scheduleForm.prioridad,
            tecnico_ids: scheduleForm.tecnico_ids.map(Number),
            id_tecnico_principal: scheduleForm.id_tecnico_principal
              ? Number(scheduleForm.id_tecnico_principal)
              : null,
          },
          { branchId: effectiveBranchId }
        )
      );
      setSuccess("Agenda actualizada.");
      reloadAll();
    } catch (requestError) {
      setError(normalizeApiError(requestError, "No se pudo actualizar la agenda"));
    } finally {
      setSaving("");
    }
  };

  const handleChecklistState = async (idItem, estado) => {
    if (!detail?.orden) return;

    try {
      setError("");
      setSuccess("");
      setDetail(
        await updateChecklistOrdenServicio(
          detail.orden.id_orden_servicio,
          idItem,
          { estado, observacion: "" },
          { branchId: effectiveBranchId }
        )
      );
      setSuccess("Checklist actualizado.");
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, "No se pudo actualizar el checklist")
      );
    }
  };

  const handleRefundSubmit = async (event) => {
    event.preventDefault();
    if (!detail?.orden) return;

    try {
      setSaving("refund");
      setError("");
      setSuccess("");
      setDetail(
        await reembolsarOrdenServicio(
          detail.orden.id_orden_servicio,
          {
            monto: Number(refundForm.monto || 0),
            motivo: refundForm.motivo,
            metodo_reembolso: refundForm.metodo_reembolso,
          },
          { branchId: effectiveBranchId }
        )
      );
      setRefundForm(refundInit);
      setSuccess("Reembolso aplicado.");
      reloadAll();
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, "No se pudo procesar el reembolso")
      );
    } finally {
      setSaving("");
    }
  };

  const handleCancelSubmit = async (event) => {
    event.preventDefault();
    if (!detail?.orden) return;

    try {
      setSaving("cancel");
      setError("");
      setSuccess("");
      setDetail(
        await anularOrdenServicio(
          detail.orden.id_orden_servicio,
          {
            motivo: cancelForm.motivo,
            reintegrar_stock: cancelForm.reintegrar_stock,
            metodo_reembolso: cancelForm.metodo_reembolso,
          },
          { branchId: effectiveBranchId }
        )
      );
      setCancelForm(cancelInit);
      setSuccess("Orden anulada correctamente.");
      reloadAll();
    } catch (requestError) {
      setError(normalizeApiError(requestError, "No se pudo anular la orden"));
    } finally {
      setSaving("");
    }
  };

  return (
    <main className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow={modLabel(applied.modulo)}
        title="Control operativo de servicios"
        description="Administra agenda, tecnicos, checklists, reembolsos, anulaciones y reportes del modulo sobre la nueva base SaaS."
        actions={
          <>
            <Link className="btn-secondary" to="/operacion/servicios">
              Operacion
            </Link>
            <Link className="btn-secondary" to="/operacion/caja">
              Caja
            </Link>
          </>
        }
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {success ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <article className="panel p-6">
            <form
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"
              onSubmit={(event) => {
                event.preventDefault();
                setApplied({ ...filters });
              }}
            >
              <select className="field" value={selectedBranchId} onChange={(event) => setSelectedBranchId(event.target.value)}>
                <option value="">Sucursal</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id_sucursal} value={branch.id_sucursal}>
                    {branch.codigo} - {branch.nombre}
                  </option>
                ))}
              </select>
              <select className="field" value={filters.modulo} onChange={(event) => setFilters((prev) => ({ ...prev, modulo: event.target.value }))}>
                {enabledModules.map((item) => (
                  <option key={item} value={item}>
                    {modLabel(item)}
                  </option>
                ))}
              </select>
              <input className="field" type="date" value={filters.desde} onChange={(event) => setFilters((prev) => ({ ...prev, desde: event.target.value }))} />
              <input className="field" type="date" value={filters.hasta} onChange={(event) => setFilters((prev) => ({ ...prev, hasta: event.target.value }))} />
              <select className="field" value={filters.agenda_estado} onChange={(event) => setFilters((prev) => ({ ...prev, agenda_estado: event.target.value }))}>
                <option value="">Toda agenda</option>
                <option value="NO_PROGRAMADA">NO_PROGRAMADA</option>
                <option value="PROGRAMADA">PROGRAMADA</option>
                <option value="EN_EJECUCION">EN_EJECUCION</option>
                <option value="FINALIZADA">FINALIZADA</option>
                <option value="CANCELADA">CANCELADA</option>
              </select>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Cargando..." : "Aplicar"}
              </button>
            </form>
          </article>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summary.map((item) => (
              <StatCard key={item.label} {...item} />
            ))}
          </div>

          <article className="panel p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  Agenda
                </p>
                <h2 className="mt-3 text-2xl font-black text-stone-900">
                  Ordenes programadas
                </h2>
              </div>
              <select className="field sm:max-w-[260px]" value={filters.id_usuario} onChange={(event) => setFilters((prev) => ({ ...prev, id_usuario: event.target.value }))}>
                <option value="">Todos los tecnicos</option>
                {tecnicos.map((item) => (
                  <option key={item.id_usuario} value={item.id_usuario}>
                    {item.alias || `${item.nombre} ${item.apellido}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="table-shell mt-6 overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Agenda</th>
                    <th>Tecnicos</th>
                    <th>Cobro</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5}>Cargando agenda...</td></tr>
                  ) : agenda.length === 0 ? (
                    <tr><td colSpan={5}>No hay ordenes en este rango.</td></tr>
                  ) : (
                    agenda.map((item) => (
                      <tr key={item.id_orden_servicio} className={Number(item.id_orden_servicio) === Number(selectedOrderId) ? "bg-brand-50" : ""}>
                        <td>
                          <button className="text-left" type="button" onClick={() => setSelectedOrderId(item.id_orden_servicio)}>
                            <div className="font-semibold text-stone-900">{item.numero_orden}</div>
                            <div className="mt-1 text-xs text-stone-500">{item.servicio_nombre}</div>
                            <div className="mt-1 text-xs text-stone-500">{formatDateTime(item.fecha_programada_inicio || item.fecha_servicio)}</div>
                          </button>
                        </td>
                        <td>{item.estado} / {item.agenda_estado}</td>
                        <td>{(item.tecnicos || []).length === 0 ? "Sin asignar" : item.tecnicos.map((tech) => tech.alias || tech.nombre).join(", ")}</td>
                        <td>{item.estado_cobro}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="panel p-6">
              <h2 className="text-2xl font-black text-stone-900">Tecnicos</h2>
              <div className="mt-4 space-y-3">
                {tecnicos.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">
                    Aun no hay perfiles tecnicos.
                  </div>
                ) : (
                  tecnicos.map((item) => (
                    <div key={item.id_usuario} className="rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-stone-900">{item.alias || `${item.nombre} ${item.apellido}`}</p>
                          <p className="mt-1 text-xs text-stone-500">{item.username} | prog. {formatInteger(item.workload_programadas)} | ejec. {formatInteger(item.workload_en_ejecucion)}</p>
                        </div>
                        {canManageAdmin ? (
                          <button className="btn-secondary" type="button" onClick={() => setTechForm({ id_usuario: String(item.id_usuario), alias: item.alias || "", especialidades: Array.isArray(item.especialidades) ? item.especialidades.join(", ") : "", color_agenda: item.color_agenda || "", notas: item.notas || "", activo: item.activo !== false })}>
                            Editar
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {canManageAdmin ? (
                <form className="mt-6 space-y-3 rounded-3xl border border-stone-200 bg-white p-4" onSubmit={handleTechSubmit}>
                  <select className="field" value={techForm.id_usuario} onChange={(event) => setTechForm((prev) => ({ ...prev, id_usuario: event.target.value }))}>
                    <option value="">Usuario</option>
                    {visibleUsers.map((user) => (
                      <option key={user.id_usuario} value={user.id_usuario}>
                        {user.nombre} {user.apellido} ({user.username})
                      </option>
                    ))}
                  </select>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className="field" placeholder="Alias" value={techForm.alias} onChange={(event) => setTechForm((prev) => ({ ...prev, alias: event.target.value }))} />
                    <input className="field" placeholder="Color agenda" value={techForm.color_agenda} onChange={(event) => setTechForm((prev) => ({ ...prev, color_agenda: event.target.value }))} />
                  </div>
                  <input className="field" placeholder="Especialidades separadas por coma" value={techForm.especialidades} onChange={(event) => setTechForm((prev) => ({ ...prev, especialidades: event.target.value }))} />
                  <textarea className="textarea-field" placeholder="Notas" value={techForm.notas} onChange={(event) => setTechForm((prev) => ({ ...prev, notas: event.target.value }))} />
                  <button className="btn-primary" type="submit" disabled={saving === "tech"}>
                    {saving === "tech" ? "Guardando..." : "Guardar tecnico"}
                  </button>
                </form>
              ) : null}
            </article>

            <article className="panel p-6">
              <h2 className="text-2xl font-black text-stone-900">Plantillas de checklist</h2>
              <div className="mt-4 space-y-3">
                {plantillas.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">
                    No hay plantillas activas.
                  </div>
                ) : (
                  plantillas.map((item) => (
                    <div key={item.id_servicio_checklist_template} className="rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-stone-900">{item.titulo}</p>
                          <p className="mt-1 text-xs text-stone-500">{item.servicio_nombre} | orden {formatInteger(item.orden)}</p>
                        </div>
                        {canManageAdmin ? (
                          <button className="btn-secondary" type="button" onClick={() => setTplForm({ id: item.id_servicio_checklist_template, id_servicio_catalogo: String(item.id_servicio_catalogo), titulo: item.titulo, instrucciones: item.instrucciones || "", orden: String(item.orden || 1), obligatorio: item.obligatorio !== false, activo: item.activo !== false, modulo: item.modulo })}>
                            Editar
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {canManageAdmin ? (
                <form className="mt-6 space-y-3 rounded-3xl border border-stone-200 bg-white p-4" onSubmit={handleTplSubmit}>
                  <select className="field" value={tplForm.id_servicio_catalogo} onChange={(event) => setTplForm((prev) => ({ ...prev, id_servicio_catalogo: event.target.value }))}>
                    <option value="">Servicio</option>
                    {catalogo.map((item) => (
                      <option key={item.id_servicio_catalogo} value={item.id_servicio_catalogo}>
                        {item.codigo} - {item.nombre}
                      </option>
                    ))}
                  </select>
                  <input className="field" placeholder="Titulo" value={tplForm.titulo} onChange={(event) => setTplForm((prev) => ({ ...prev, titulo: event.target.value }))} />
                  <input className="field" type="number" min="1" step="1" placeholder="Orden" value={tplForm.orden} onChange={(event) => setTplForm((prev) => ({ ...prev, orden: event.target.value }))} />
                  <textarea className="textarea-field" placeholder="Instrucciones" value={tplForm.instrucciones} onChange={(event) => setTplForm((prev) => ({ ...prev, instrucciones: event.target.value }))} />
                  <button className="btn-primary" type="submit" disabled={saving === "tpl"}>
                    {saving === "tpl" ? "Guardando..." : "Guardar plantilla"}
                  </button>
                </form>
              ) : null}
            </article>
          </div>

          {canReadReports ? (
            <div className="grid gap-6 xl:grid-cols-3">
              <article className="panel p-6">
                <h2 className="text-xl font-black text-stone-900">Top servicios</h2>
                <div className="mt-4 space-y-3">
                  {(reporte?.top_servicios || []).length === 0 ? <p className="text-sm text-stone-500">Sin datos.</p> : (reporte?.top_servicios || []).map((item) => (
                    <div key={item.id_servicio_catalogo} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                      <div className="font-semibold text-stone-900">{item.servicio_nombre}</div>
                      <div className="mt-1 text-stone-500">{formatInteger(item.ordenes_total)} ordenes | {formatCurrency(item.total_facturado)}</div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel p-6">
                <h2 className="text-xl font-black text-stone-900">Top tecnicos</h2>
                <div className="mt-4 space-y-3">
                  {(reporte?.top_tecnicos || []).length === 0 ? <p className="text-sm text-stone-500">Sin ranking.</p> : (reporte?.top_tecnicos || []).map((item) => (
                    <div key={item.id_usuario} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                      <div className="font-semibold text-stone-900">{item.alias || item.nombre}</div>
                      <div className="mt-1 text-stone-500">{formatInteger(item.ordenes_asignadas)} asignadas | {formatInteger(item.ordenes_finalizadas)} finalizadas</div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel p-6">
                <h2 className="text-xl font-black text-stone-900">Reversiones recientes</h2>
                <div className="mt-4 space-y-3">
                  {(reporte?.reversiones_recientes || []).length === 0 ? <p className="text-sm text-stone-500">Sin anulaciones ni reembolsos.</p> : (reporte?.reversiones_recientes || []).map((item) => (
                    <div key={item.id_orden_servicio_reversion} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-stone-900">{item.tipo}</span>
                        <span>{formatCurrency(item.monto)}</span>
                      </div>
                      <div className="mt-1 text-stone-500">{item.numero_orden} | {formatDateTime(item.created_at)}</div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="panel p-6">
            <SucursalSwitcher />
          </div>
          <article className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Orden seleccionada
            </p>
            {loadingDetail ? (
              <p className="mt-4 text-sm text-stone-500">Cargando detalle...</p>
            ) : detail?.orden ? (
              <div className="mt-4 space-y-5">
                <div>
                  <h2 className="text-2xl font-black text-stone-900">{detail.orden.numero_orden}</h2>
                  <p className="mt-2 text-sm text-stone-500">{detail.orden.servicio_nombre} | {detail.orden.estado} | {detail.orden.estado_cobro}</p>
                  <p className="mt-2 text-sm text-stone-500">Total {formatCurrency(detail.orden.total)}</p>
                </div>
                {canManageAdmin ? (
                  <form className="space-y-3 rounded-3xl border border-stone-200 bg-stone-50 p-4" onSubmit={handleScheduleSubmit}>
                    <input className="field" type="datetime-local" value={scheduleForm.fecha_programada_inicio} onChange={(event) => setScheduleForm((prev) => ({ ...prev, fecha_programada_inicio: event.target.value }))} />
                    <input className="field" type="datetime-local" value={scheduleForm.fecha_programada_fin} onChange={(event) => setScheduleForm((prev) => ({ ...prev, fecha_programada_fin: event.target.value }))} />
                    <input className="field" type="datetime-local" value={scheduleForm.fecha_promesa} onChange={(event) => setScheduleForm((prev) => ({ ...prev, fecha_promesa: event.target.value }))} />
                    <select className="field" value={scheduleForm.prioridad} onChange={(event) => setScheduleForm((prev) => ({ ...prev, prioridad: event.target.value }))}>
                      <option value="BAJA">BAJA</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="ALTA">ALTA</option>
                      <option value="URGENTE">URGENTE</option>
                    </select>
                    <select className="field min-h-[120px]" multiple value={scheduleForm.tecnico_ids} onChange={(event) => setScheduleForm((prev) => ({ ...prev, tecnico_ids: Array.from(event.target.selectedOptions, (option) => option.value) }))}>
                      {tecnicos.map((item) => (
                        <option key={item.id_usuario} value={item.id_usuario}>
                          {item.alias || `${item.nombre} ${item.apellido}`}
                        </option>
                      ))}
                    </select>
                    <select className="field" value={scheduleForm.id_tecnico_principal} onChange={(event) => setScheduleForm((prev) => ({ ...prev, id_tecnico_principal: event.target.value }))}>
                      <option value="">Tecnico principal</option>
                      {tecnicos.filter((item) => scheduleForm.tecnico_ids.includes(String(item.id_usuario))).map((item) => (
                        <option key={item.id_usuario} value={item.id_usuario}>
                          {item.alias || `${item.nombre} ${item.apellido}`}
                        </option>
                      ))}
                    </select>
                    <button className="btn-secondary" type="submit" disabled={saving === "agenda"}>
                      {saving === "agenda" ? "Guardando..." : "Guardar agenda"}
                    </button>
                  </form>
                ) : null}
                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-bold text-stone-900">Checklist</p>
                  <div className="mt-4 space-y-3">
                    {(detail.checklist || []).length === 0 ? (
                      <p className="text-sm text-stone-500">Sin checklist.</p>
                    ) : (
                      (detail.checklist || []).map((item) => (
                        <div key={item.id_orden_servicio_checklist} className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                          <div className="font-semibold text-stone-900">{item.titulo}</div>
                          <div className="mt-1 text-xs text-stone-500">{item.estado}</div>
                          {canManage ? (
                            <div className="mt-3 flex gap-2">
                              <button className="btn-secondary" type="button" onClick={() => handleChecklistState(item.id_orden_servicio_checklist, "CUMPLIDO")}>
                                Cumplido
                              </button>
                              <button className="btn-secondary" type="button" onClick={() => handleChecklistState(item.id_orden_servicio_checklist, "OMITIDO")}>
                                Omitido
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {canRefund ? (
                  <form className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50 p-4" onSubmit={handleRefundSubmit}>
                    <input className="field" type="number" min="0.01" step="0.01" placeholder="Monto" value={refundForm.monto} onChange={(event) => setRefundForm((prev) => ({ ...prev, monto: event.target.value }))} />
                    <select className="field" value={refundForm.metodo_reembolso} onChange={(event) => setRefundForm((prev) => ({ ...prev, metodo_reembolso: event.target.value }))}>
                      <option value="EFECTIVO">EFECTIVO</option>
                      <option value="TARJETA">TARJETA</option>
                      <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                      <option value="AJUSTE">AJUSTE</option>
                    </select>
                    <textarea className="textarea-field" placeholder="Motivo del reembolso" value={refundForm.motivo} onChange={(event) => setRefundForm((prev) => ({ ...prev, motivo: event.target.value }))} />
                    <button className="btn-secondary" type="submit" disabled={saving === "refund"}>
                      {saving === "refund" ? "Procesando..." : "Aplicar reembolso"}
                    </button>
                  </form>
                ) : null}
                {canRefund ? (
                  <form className="space-y-3 rounded-3xl border border-rose-200 bg-rose-50 p-4" onSubmit={handleCancelSubmit}>
                    <select className="field" value={cancelForm.metodo_reembolso} onChange={(event) => setCancelForm((prev) => ({ ...prev, metodo_reembolso: event.target.value }))}>
                      <option value="EFECTIVO">EFECTIVO</option>
                      <option value="TARJETA">TARJETA</option>
                      <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                      <option value="AJUSTE">AJUSTE</option>
                    </select>
                    <label className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-medium text-stone-700">
                      <input checked={cancelForm.reintegrar_stock} type="checkbox" onChange={(event) => setCancelForm((prev) => ({ ...prev, reintegrar_stock: event.target.checked }))} />
                      Reintegrar stock
                    </label>
                    <textarea className="textarea-field" placeholder="Motivo de anulacion" value={cancelForm.motivo} onChange={(event) => setCancelForm((prev) => ({ ...prev, motivo: event.target.value }))} />
                    <button className="btn-primary" type="submit" disabled={saving === "cancel"}>
                      {saving === "cancel" ? "Anulando..." : "Anular orden"}
                    </button>
                  </form>
                ) : null}
                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-bold text-stone-900">Reversiones</p>
                  <div className="mt-4 space-y-3">
                    {(detail.reversiones || []).length === 0 ? (
                      <p className="text-sm text-stone-500">Sin reversiones registradas.</p>
                    ) : (
                      (detail.reversiones || []).map((item) => (
                        <div key={item.id_orden_servicio_reversion} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-stone-900">{item.tipo}</span>
                            <span>{formatCurrency(item.monto)}</span>
                          </div>
                          <div className="mt-1 text-stone-500">{item.motivo}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-stone-500">
                Selecciona una orden de la agenda para administrar agenda,
                checklist, reembolsos y anulacion.
              </p>
            )}
          </article>
        </aside>
      </section>
    </main>
  );
}

export default ServiciosControlPage;
