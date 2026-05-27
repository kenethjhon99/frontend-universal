import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SucursalSwitcher from "../components/SucursalSwitcher";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { hasRole } from "../lib/access";
import {
  closeCaja,
  createCajaMovimiento,
  getCajaResumen,
  getCajaSesionActiva,
  getCajaSesiones,
  openCaja,
  validateCajaMovimientoPendiente,
  validateNoCobroPendiente,
} from "../services/cajaService";

const INGRESOS = ["APORTE_CAJA", "AJUSTE_INGRESO", "REINTEGRO", "OTRO_INGRESO"];
const EGRESOS = ["COMPRAS_MENORES", "INSUMOS", "VIATICOS", "MANTENIMIENTO", "OTRO_GASTO"];
const normalizeError = (error, fallback) => error.response?.data?.error || fallback;
const createOpenForm = () => ({ monto_apertura: "0.00", observaciones_apertura: "" });
const createMovementForm = () => ({ tipo: "INGRESO", categoria: INGRESOS[0], monto: "", descripcion: "" });
const createCloseForm = () => ({
  monto_cierre_reportado: "",
  observaciones_cierre: "",
  admin_username: "",
  admin_password: "",
  validacion_diferencia_nota: "",
});

function CajaPage() {
  const { session } = useAppSession();
  const [activeData, setActiveData] = useState({ sesion: null, resumen: null, movimientos: [], ventas: [] });
  const [sesiones, setSesiones] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(createOpenForm);
  const [movementForm, setMovementForm] = useState(createMovementForm);
  const [closeForm, setCloseForm] = useState(createCloseForm);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal de validacion de pendientes (G3)
  const [pendingModal, setPendingModal] = useState(null);
  // pendingModal forma: { kind: "no-cobro"|"movimiento", id, descripcion, adminUsername, adminPassword, nota }

  const activeBranchId = session?.sucursal_activa?.id_sucursal;
  const canOperate = hasRole(session, "SUPER_ADMIN", "ADMIN_EMPRESA", "ENCARGADO_SUCURSAL", "CAJERO");
  const activeSession = activeData?.sesion || null;
  const activeSummary = activeData?.resumen || null;

  const reload = async () => {
    if (!activeBranchId) return;

    try {
      setLoading(true);
      setError("");
      const [active, history] = await Promise.all([
        getCajaSesionActiva({ branchId: activeBranchId }),
        getCajaSesiones(
          {
            limit: 20,
            estado: statusFilter !== "TODOS" ? statusFilter : undefined,
            search: search || undefined,
          },
          { branchId: activeBranchId }
        ),
      ]);

      setActiveData(active || { sesion: null, resumen: null, movimientos: [], ventas: [] });
      setSesiones(history);
      setSelectedId(active?.sesion?.id_caja_sesion || history[0]?.id_caja_sesion || null);
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo cargar la caja"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedData(null);
    reload();
  }, [activeBranchId, statusFilter, search]);

  useEffect(() => {
    const loadSelected = async () => {
      if (!selectedId || !activeBranchId) {
        setSelectedData(null);
        return;
      }

      try {
        setLoadingDetail(true);
        const data = await getCajaResumen(selectedId, { branchId: activeBranchId });
        setSelectedData(data);
      } catch (requestError) {
        setError(normalizeError(requestError, "No se pudo cargar el detalle de caja"));
      } finally {
        setLoadingDetail(false);
      }
    };

    loadSelected();
  }, [selectedId, activeBranchId]);

  useEffect(() => {
    if (activeSummary?.cierre_calculado != null) {
      setCloseForm((prev) => ({
        ...prev,
        monto_cierre_reportado: Number(activeSummary.cierre_calculado).toFixed(2),
      }));
    }
  }, [activeSummary?.cierre_calculado, activeSession?.id_caja_sesion]);

  const differencePreview = useMemo(() => {
    const reported = Number(closeForm.monto_cierre_reportado || 0);
    const expected = Number(activeSummary?.cierre_calculado || 0);
    return Number((reported - expected).toFixed(2));
  }, [closeForm.monto_cierre_reportado, activeSummary?.cierre_calculado]);

  const submitOpen = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      const data = await openCaja(openForm, { branchId: activeBranchId });
      setSuccess("Caja abierta correctamente.");
      setOpenForm(createOpenForm());
      setActiveData(data);
      await reload();
      setSelectedId(data?.sesion?.id_caja_sesion || null);
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo abrir la caja"));
    } finally {
      setSaving(false);
    }
  };

  const submitMovement = async (event) => {
    event.preventDefault();
    if (!activeSession?.id_caja_sesion) return;
    try {
      setSaving(true);
      setError("");
      const data = await createCajaMovimiento(activeSession.id_caja_sesion, movementForm, {
        branchId: activeBranchId,
      });
      setSuccess("Movimiento registrado.");
      setMovementForm(createMovementForm());
      setActiveData(data);
      await reload();
      setSelectedId(activeSession.id_caja_sesion);
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo registrar el movimiento"));
    } finally {
      setSaving(false);
    }
  };

  const submitClose = async (event) => {
    event.preventDefault();
    if (!activeSession?.id_caja_sesion) return;
    try {
      setSaving(true);
      setError("");
      const data = await closeCaja(activeSession.id_caja_sesion, closeForm, {
        branchId: activeBranchId,
      });
      setSuccess("Caja cerrada correctamente.");
      setCloseForm(createCloseForm());
      setActiveData({ sesion: null, resumen: null, movimientos: [], ventas: [] });
      setSelectedData(data);
      await reload();
      setSelectedId(data?.sesion?.id_caja_sesion || null);
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo cerrar la caja"));
    } finally {
      setSaving(false);
    }
  };

  const submitPendingValidation = async (event) => {
    event.preventDefault();
    if (!pendingModal || !activeSession?.id_caja_sesion) return;

    try {
      setSaving(true);
      setError("");

      const payload = {
        admin_username: pendingModal.adminUsername || "",
        admin_password: pendingModal.adminPassword || "",
        autorizacion_admin_nota: pendingModal.nota || "",
        validacion_nota: pendingModal.nota || "",
      };

      let data;
      if (pendingModal.kind === "no-cobro") {
        data = await validateNoCobroPendiente(
          activeSession.id_caja_sesion,
          { ...payload, id_venta: pendingModal.id },
          { branchId: activeBranchId }
        );
      } else {
        data = await validateCajaMovimientoPendiente(
          activeSession.id_caja_sesion,
          pendingModal.id,
          payload,
          { branchId: activeBranchId }
        );
      }

      setActiveData(data);
      setPendingModal(null);
      setSuccess("Pendiente validado.");
      await reload();
    } catch (requestError) {
      setError(
        normalizeError(requestError, "No se pudo validar el pendiente")
      );
    } finally {
      setSaving(false);
    }
  };

  const noCobradosPendientes = activeSummary?.no_cobrados_pendientes || [];
  const movimientosPendientes = (activeData?.movimientos || []).filter(
    (m) =>
      (m.referencia_tipo || "MANUAL") === "MANUAL" &&
      !m.autorizado_por_admin_id
  );
  const totalPendientes =
    Number(activeSummary?.no_cobrados_pendientes_count || 0) +
    Number(activeSummary?.movimientos_pendientes_validacion_count || 0);

  const selectedSummary = selectedData?.resumen || null;
  const movementOptions = movementForm.tipo === "INGRESO" ? INGRESOS : EGRESOS;

  return (
    <main className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow="Caja"
        title="Caja operativa por sucursal"
        description="La caja concentra apertura, ventas ligadas, movimientos manuales y cierre con validacion si hay diferencia contra el efectivo esperado."
        actions={<Link className="btn-secondary" to="/operacion/ventas">Ir a ventas</Link>}
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {success ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{success}</div> : null}
          {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

          <div className="grid gap-4 md:grid-cols-4">
            <article className="panel p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Apertura</p><p className="mt-3 text-3xl font-black text-stone-900">Q {Number(activeSummary?.monto_apertura || 0).toFixed(2)}</p></article>
            <article className="panel p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Efectivo sistema</p><p className="mt-3 text-3xl font-black text-stone-900">Q {Number(activeSummary?.cierre_calculado || 0).toFixed(2)}</p></article>
            <article className="panel p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Ventas efectivo</p><p className="mt-3 text-3xl font-black text-stone-900">Q {Number(activeSummary?.total_efectivo || 0).toFixed(2)}</p></article>
            <article className="panel p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Egresos manuales</p><p className="mt-3 text-3xl font-black text-stone-900">Q {Number(activeSummary?.egresos_manuales || 0).toFixed(2)}</p></article>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              {!activeSession ? (
                <article className="panel p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Apertura</p>
                  <h2 className="mt-3 text-2xl font-black text-stone-900">Abrir caja</h2>
                  <form className="mt-6 space-y-4" onSubmit={submitOpen}>
                    <input className="field" type="number" min="0" step="0.01" placeholder="Monto de apertura" value={openForm.monto_apertura} onChange={(event) => setOpenForm((prev) => ({ ...prev, monto_apertura: event.target.value }))} />
                    <textarea className="textarea-field" placeholder="Observaciones de apertura" value={openForm.observaciones_apertura} onChange={(event) => setOpenForm((prev) => ({ ...prev, observaciones_apertura: event.target.value }))} />
                    <button className="btn-primary" disabled={saving || !canOperate} type="submit">{saving ? "Abriendo..." : "Abrir caja"}</button>
                  </form>
                </article>
              ) : (
                <>
                  <article className="panel p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Caja activa</p>
                    <h2 className="mt-3 text-2xl font-black text-stone-900">Sesion #{activeSession.id_caja_sesion}</h2>
                    <p className="mt-3 text-sm leading-6 text-stone-500">Abierta el {new Date(activeSession.fecha_apertura).toLocaleString("es-GT")} por {activeSession.usuario_nombre || activeSession.usuario_username}.</p>
                  </article>

                  <article className="panel p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Movimiento manual</p>
                    <form className="mt-6 grid gap-3 md:grid-cols-2" onSubmit={submitMovement}>
                      <select className="field" value={movementForm.tipo} onChange={(event) => setMovementForm((prev) => ({ ...prev, tipo: event.target.value, categoria: event.target.value === "INGRESO" ? INGRESOS[0] : EGRESOS[0] }))}><option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso</option></select>
                      <select className="field" value={movementForm.categoria} onChange={(event) => setMovementForm((prev) => ({ ...prev, categoria: event.target.value }))}>{movementOptions.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}</select>
                      <input className="field" type="number" min="0" step="0.01" placeholder="Monto" value={movementForm.monto} onChange={(event) => setMovementForm((prev) => ({ ...prev, monto: event.target.value }))} />
                      <input className="field" placeholder="Descripcion" value={movementForm.descripcion} onChange={(event) => setMovementForm((prev) => ({ ...prev, descripcion: event.target.value }))} />
                      <div className="md:col-span-2"><button className="btn-primary" disabled={saving || !canOperate} type="submit">{saving ? "Guardando..." : "Registrar movimiento"}</button></div>
                    </form>
                  </article>

                  {totalPendientes > 0 ? (
                    <article className="panel border-amber-300 p-6">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                          Pendientes de validar ({totalPendientes})
                        </p>
                        <span className="badge-warning">Bloquea cierre</span>
                      </div>
                      <p className="mt-2 text-sm text-stone-600">
                        Cada no-cobrado y cada movimiento manual debe ser validado uno por uno por un administrador antes de cerrar caja.
                      </p>

                      {noCobradosPendientes.length > 0 ? (
                        <div className="mt-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                            Ventas NO_COBRADO ({noCobradosPendientes.length})
                          </p>
                          <ul className="mt-2 space-y-2">
                            {noCobradosPendientes.map((nc) => (
                              <li
                                key={`nc-${nc.id_venta}`}
                                className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
                              >
                                <div>
                                  <div className="font-semibold text-stone-900">
                                    {nc.numero_comprobante}{" "}
                                    <span className="text-xs text-stone-500">
                                      (Q {Number(nc.total || 0).toFixed(2)})
                                    </span>
                                  </div>
                                  <div className="text-xs text-stone-600">
                                    {nc.cliente_nombre || "Consumidor final"} ·
                                    motivo: {nc.no_cobrado_motivo || "—"}
                                  </div>
                                </div>
                                <button
                                  className="btn-secondary"
                                  type="button"
                                  onClick={() =>
                                    setPendingModal({
                                      kind: "no-cobro",
                                      id: nc.id_venta,
                                      descripcion: `Venta ${nc.numero_comprobante} (Q ${Number(nc.total || 0).toFixed(2)})`,
                                      adminUsername: "",
                                      adminPassword: "",
                                      nota: "",
                                    })
                                  }
                                >
                                  Validar
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {movimientosPendientes.length > 0 ? (
                        <div className="mt-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                            Movimientos manuales ({movimientosPendientes.length})
                          </p>
                          <ul className="mt-2 space-y-2">
                            {movimientosPendientes.map((mv) => (
                              <li
                                key={`mv-${mv.id_caja_movimiento}`}
                                className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
                              >
                                <div>
                                  <div className="font-semibold text-stone-900">
                                    {mv.tipo} — {mv.categoria}{" "}
                                    <span className="text-xs text-stone-500">
                                      (Q {Number(mv.monto || 0).toFixed(2)})
                                    </span>
                                  </div>
                                  <div className="text-xs text-stone-600">
                                    {mv.descripcion || "Sin descripcion"}
                                  </div>
                                </div>
                                <button
                                  className="btn-secondary"
                                  type="button"
                                  onClick={() =>
                                    setPendingModal({
                                      kind: "movimiento",
                                      id: mv.id_caja_movimiento,
                                      descripcion: `${mv.tipo} ${mv.categoria} (Q ${Number(mv.monto || 0).toFixed(2)})`,
                                      adminUsername: "",
                                      adminPassword: "",
                                      nota: "",
                                    })
                                  }
                                >
                                  Validar
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </article>
                  ) : null}

                  <article className="panel p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Cierre</p>
                    <form className="mt-6 space-y-4" onSubmit={submitClose}>
                      <div className="grid gap-3 md:grid-cols-2">
                        <input className="field" type="number" min="0" step="0.01" placeholder="Monto reportado" value={closeForm.monto_cierre_reportado} onChange={(event) => setCloseForm((prev) => ({ ...prev, monto_cierre_reportado: event.target.value }))} />
                        <div className="flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">Diferencia previa: Q {differencePreview.toFixed(2)}</div>
                      </div>
                      <textarea className="textarea-field" placeholder="Observaciones de cierre" value={closeForm.observaciones_cierre} onChange={(event) => setCloseForm((prev) => ({ ...prev, observaciones_cierre: event.target.value }))} />
                      {differencePreview !== 0 ? (
                        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <input className="field" placeholder="Usuario admin" value={closeForm.admin_username} onChange={(event) => setCloseForm((prev) => ({ ...prev, admin_username: event.target.value }))} />
                            <input className="field" type="password" placeholder="Password admin" value={closeForm.admin_password} onChange={(event) => setCloseForm((prev) => ({ ...prev, admin_password: event.target.value }))} />
                          </div>
                          <textarea className="textarea-field mt-3" placeholder="Nota de validacion" value={closeForm.validacion_diferencia_nota} onChange={(event) => setCloseForm((prev) => ({ ...prev, validacion_diferencia_nota: event.target.value }))} />
                        </div>
                      ) : null}
                      <button className="btn-danger" disabled={saving || !canOperate} type="submit">{saving ? "Cerrando..." : "Cerrar caja"}</button>
                    </form>
                  </article>
                </>
              )}

              <article className="panel p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Historial</p>
                    <h2 className="mt-3 text-2xl font-black text-stone-900">Sesiones de caja</h2>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <select className="field sm:min-w-[180px]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="TODOS">Todos</option><option value="ABIERTA">Abiertas</option><option value="CERRADA">Cerradas</option></select>
                    <input className="field" placeholder="Buscar por usuario o sesion" value={search} onChange={(event) => setSearch(event.target.value)} />
                  </div>
                </div>

                <div className="table-shell mt-6 overflow-x-auto">
                  <table className="table-base">
                    <thead><tr><th>Sesion</th><th>Usuario</th><th>Efectivo</th><th>Estado</th></tr></thead>
                    <tbody>
                      {loading ? <tr><td colSpan={4}>Cargando sesiones...</td></tr> : sesiones.length === 0 ? <tr><td colSpan={4}>No hay sesiones registradas.</td></tr> : sesiones.map((sesionCaja) => (
                        <tr key={sesionCaja.id_caja_sesion} className={Number(sesionCaja.id_caja_sesion) === Number(selectedId) ? "bg-brand-50" : ""}>
                          <td><button className="text-left" type="button" onClick={() => setSelectedId(sesionCaja.id_caja_sesion)}><div className="font-semibold text-stone-900">Caja #{sesionCaja.id_caja_sesion}</div><div className="mt-1 text-xs text-stone-500">{new Date(sesionCaja.fecha_apertura).toLocaleString("es-GT")}</div></button></td>
                          <td>{sesionCaja.usuario_nombre || sesionCaja.usuario_username}</td>
                          <td>Q {Number(sesionCaja.cierre_calculado || 0).toFixed(2)}</td>
                          <td><span className={sesionCaja.estado === "ABIERTA" ? "badge-success" : "badge-muted"}>{sesionCaja.estado}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>

            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Detalle de sesion</p>
              {loadingDetail ? <p className="mt-4 text-sm text-stone-500">Cargando detalle...</p> : selectedData ? (
                <div className="mt-4 space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-stone-900">Caja #{selectedData.sesion.id_caja_sesion}</h2>
                    <p className="mt-2 text-sm text-stone-500">{selectedData.sesion.sucursal_codigo} - {selectedData.sesion.sucursal_nombre}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Apertura</p><p className="mt-2 text-lg font-black text-stone-900">Q {Number(selectedSummary?.monto_apertura || 0).toFixed(2)}</p></div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Cierre calculado</p><p className="mt-2 text-lg font-black text-stone-900">Q {Number(selectedSummary?.cierre_calculado || 0).toFixed(2)}</p></div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Tarjeta</p><p className="mt-2 text-lg font-black text-stone-900">Q {Number(selectedSummary?.total_tarjeta || 0).toFixed(2)}</p></div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Transferencia</p><p className="mt-2 text-lg font-black text-stone-900">Q {Number(selectedSummary?.total_transferencia || 0).toFixed(2)}</p></div>
                  </div>
                  <div className="table-shell overflow-x-auto">
                    <table className="table-base">
                      <thead><tr><th>Tipo</th><th>Categoria</th><th>Monto</th></tr></thead>
                      <tbody>
                        {(selectedData.movimientos || []).length === 0 ? <tr><td colSpan={3}>Sin movimientos registrados.</td></tr> : selectedData.movimientos.slice(0, 10).map((movimiento) => (
                          <tr key={movimiento.id_caja_movimiento}><td>{movimiento.tipo}</td><td>{movimiento.categoria}{movimiento.referencia_tipo !== "MANUAL" ? ` | ${movimiento.referencia_tipo}` : ""}</td><td>Q {Number(movimiento.monto || 0).toFixed(2)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="table-shell overflow-x-auto">
                    <table className="table-base">
                      <thead><tr><th>Comprobante</th><th>Pago</th><th>Total</th></tr></thead>
                      <tbody>
                        {(selectedData.ventas || []).length === 0 ? <tr><td colSpan={3}>Sin ventas enlazadas.</td></tr> : selectedData.ventas.slice(0, 10).map((venta) => (
                          <tr key={venta.id_venta}><td><div className="font-semibold text-stone-900">{venta.numero_comprobante}</div><div className="mt-1 text-xs text-stone-500">{venta.cliente_nombre || "Consumidor final"}</div></td><td>{venta.metodo_pago}</td><td>Q {Number(venta.total || 0).toFixed(2)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : <p className="mt-4 text-sm leading-6 text-stone-500">Selecciona una sesion del historial para ver su detalle.</p>}
            </article>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="panel p-6"><SucursalSwitcher /></div>
          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Operacion actual</p>
            <p className="mt-3 text-lg font-bold text-stone-900">{session?.sucursal_activa?.codigo} - {session?.sucursal_activa?.nombre}</p>
            <p className="mt-3 text-sm leading-6 text-stone-500">La caja opera sobre la sucursal activa. Si necesitas otra caja de la misma empresa, cambia primero la sucursal.</p>
          </div>
        </aside>
      </section>

      {pendingModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPendingModal(null);
          }}
        >
          <form
            className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl"
            onSubmit={submitPendingValidation}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                {pendingModal.kind === "no-cobro"
                  ? "Validar venta NO_COBRADO"
                  : "Validar movimiento manual"}
              </p>
              <h3 className="mt-2 text-xl font-black text-stone-900">
                {pendingModal.descripcion}
              </h3>
              <p className="mt-2 text-xs text-stone-500">
                Captura las credenciales de un administrador. La validacion
                queda registrada en la auditoria.
              </p>
            </div>
            <input
              autoFocus
              className="field"
              placeholder="Usuario admin"
              value={pendingModal.adminUsername}
              onChange={(event) =>
                setPendingModal((prev) => ({
                  ...prev,
                  adminUsername: event.target.value,
                }))
              }
              required
            />
            <input
              className="field"
              type="password"
              placeholder="Password admin"
              value={pendingModal.adminPassword}
              onChange={(event) =>
                setPendingModal((prev) => ({
                  ...prev,
                  adminPassword: event.target.value,
                }))
              }
              required
            />
            <textarea
              className="textarea-field"
              placeholder="Nota / observacion (opcional)"
              value={pendingModal.nota}
              onChange={(event) =>
                setPendingModal((prev) => ({
                  ...prev,
                  nota: event.target.value,
                }))
              }
            />
            <div className="flex justify-end gap-3">
              <button
                className="btn-secondary"
                type="button"
                onClick={() => setPendingModal(null)}
              >
                Cancelar
              </button>
              <button className="btn-primary" disabled={saving} type="submit">
                {saving ? "Validando..." : "Validar"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}

export default CajaPage;
