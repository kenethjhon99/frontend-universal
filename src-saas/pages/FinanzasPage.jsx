import { useEffect, useState } from "react";
import SucursalSwitcher from "../components/SucursalSwitcher";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { hasPermission, hasRole } from "../lib/access";
import {
  createCierrePeriodo,
  createCobroCuentaPorCobrar,
  createNotaFormal,
  createPagoCuentaPorPagar,
  getCierresPeriodo,
  getCuentaPorCobrarById,
  getCuentaPorPagarById,
  getCuentasPorCobrar,
  getCuentasPorPagar,
  getFinanzasOverview,
  getNotasFormales,
} from "../services/finanzasService";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;
const formatMoney = (value) => `Q ${Number(value || 0).toFixed(2)}`;
const normalizeError = (error, fallback) => error.response?.data?.error || fallback;

const createCobroForm = () => ({
  monto: "",
  metodo_pago: "TRANSFERENCIA",
  fecha_movimiento: today(),
  observacion: "",
});

const createPagoForm = () => ({
  monto: "",
  metodo_pago: "TRANSFERENCIA",
  fecha_movimiento: today(),
  observacion: "",
});

const createNotaForm = () => ({
  destino: "CXC",
  tipo_nota: "CREDITO",
  id_cuenta_por_cobrar: "",
  id_cuenta_por_pagar: "",
  monto: "",
  fecha_emision: today(),
  numero_documento: "",
  motivo: "",
  observaciones: "",
});

const createCloseForm = () => ({
  area: "FINANZAS",
  fecha_desde: monthStart(),
  fecha_hasta: today(),
  alcance: "SUCURSAL",
  observaciones: "",
});

function FinanceCard({ label, value, helper }) {
  return (
    <article className="panel p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-stone-900">{value}</p>
      <p className="mt-3 text-sm text-stone-500">{helper}</p>
    </article>
  );
}

function FinanzasPage() {
  const { session } = useAppSession();
  const activeBranchId = session?.sucursal_activa?.id_sucursal;
  const canRead = hasPermission(session, "finance.read");
  const canManage = hasPermission(session, "finance.manage");
  const canClose = hasPermission(session, "finance.close");
  const isAdmin = hasRole(session, "SUPER_ADMIN", "ADMIN_EMPRESA");

  const [overview, setOverview] = useState(null);
  const [cxcRows, setCxcRows] = useState([]);
  const [cxpRows, setCxpRows] = useState([]);
  const [noteRows, setNoteRows] = useState([]);
  const [closeRows, setCloseRows] = useState([]);
  const [selectedCxcId, setSelectedCxcId] = useState(null);
  const [selectedCxpId, setSelectedCxpId] = useState(null);
  const [cxcDetail, setCxcDetail] = useState(null);
  const [cxpDetail, setCxpDetail] = useState(null);
  const [cobroForm, setCobroForm] = useState(createCobroForm);
  const [pagoForm, setPagoForm] = useState(createPagoForm);
  const [noteForm, setNoteForm] = useState(createNotaForm);
  const [closeForm, setCloseForm] = useState(createCloseForm);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const reload = async () => {
    if (!activeBranchId || !canRead) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [overviewData, cxcData, cxpData, notesData, closesData] =
        await Promise.all([
          getFinanzasOverview({ branchId: activeBranchId }),
          getCuentasPorCobrar({ limit: 12 }, { branchId: activeBranchId }),
          getCuentasPorPagar({ limit: 12 }, { branchId: activeBranchId }),
          getNotasFormales({ limit: 12 }, { branchId: activeBranchId }),
          getCierresPeriodo({ limit: 12 }, { branchId: activeBranchId }),
        ]);

      setOverview(overviewData);
      setCxcRows(cxcData);
      setCxpRows(cxpData);
      setNoteRows(notesData);
      setCloseRows(closesData);
      setSelectedCxcId((prev) => prev || cxcData[0]?.id_cuenta_por_cobrar || null);
      setSelectedCxpId((prev) => prev || cxpData[0]?.id_cuenta_por_pagar || null);
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo cargar finanzas"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedCxcId(null);
    setSelectedCxpId(null);
    setCxcDetail(null);
    setCxpDetail(null);
    reload();
  }, [activeBranchId, canRead]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!activeBranchId) return;

      try {
        setLoadingDetail(true);

        const [cxcData, cxpData] = await Promise.all([
          selectedCxcId
            ? getCuentaPorCobrarById(selectedCxcId, { branchId: activeBranchId })
            : Promise.resolve(null),
          selectedCxpId
            ? getCuentaPorPagarById(selectedCxpId, { branchId: activeBranchId })
            : Promise.resolve(null),
        ]);

        setCxcDetail(cxcData);
        setCxpDetail(cxpData);
      } catch (requestError) {
        setError(normalizeError(requestError, "No se pudo cargar el detalle financiero"));
      } finally {
        setLoadingDetail(false);
      }
    };

    loadDetail();
  }, [selectedCxcId, selectedCxpId, activeBranchId]);

  const submitCobro = async (event) => {
    event.preventDefault();
    if (!selectedCxcId) return;

    try {
      setSaving(true);
      setError("");
      const data = await createCobroCuentaPorCobrar(selectedCxcId, cobroForm, {
        branchId: activeBranchId,
      });
      setSuccess("Cobro registrado correctamente.");
      setCobroForm(createCobroForm());
      setCxcDetail(data);
      await reload();
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo registrar el cobro"));
    } finally {
      setSaving(false);
    }
  };

  const submitPago = async (event) => {
    event.preventDefault();
    if (!selectedCxpId) return;

    try {
      setSaving(true);
      setError("");
      const data = await createPagoCuentaPorPagar(selectedCxpId, pagoForm, {
        branchId: activeBranchId,
      });
      setSuccess("Pago registrado correctamente.");
      setPagoForm(createPagoForm());
      setCxpDetail(data);
      await reload();
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo registrar el pago"));
    } finally {
      setSaving(false);
    }
  };

  const submitNota = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      await createNotaFormal(noteForm, { branchId: activeBranchId });
      setSuccess("Nota formal emitida correctamente.");
      setNoteForm(createNotaForm());
      await reload();
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo emitir la nota"));
    } finally {
      setSaving(false);
    }
  };

  const submitClose = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      await createCierrePeriodo(
        {
          ...closeForm,
          id_sucursal:
            closeForm.alcance === "SUCURSAL" ? Number(activeBranchId) : null,
        },
        { branchId: activeBranchId }
      );
      setSuccess("Cierre de periodo registrado correctamente.");
      setCloseForm(createCloseForm());
      await reload();
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo cerrar el periodo"));
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    {
      label: "CxC abiertas",
      value: overview ? String(overview.resumen.cxc_abiertas) : "0",
      helper: formatMoney(overview?.resumen?.cxc_total),
    },
    {
      label: "CxC vencidas",
      value: overview ? String(overview.resumen.cxc_vencidas) : "0",
      helper: formatMoney(overview?.resumen?.cxc_vencido_total),
    },
    {
      label: "CxP abiertas",
      value: overview ? String(overview.resumen.cxp_abiertas) : "0",
      helper: formatMoney(overview?.resumen?.cxp_total),
    },
    {
      label: "CxP vencidas",
      value: overview ? String(overview.resumen.cxp_vencidas) : "0",
      helper: formatMoney(overview?.resumen?.cxp_vencido_total),
    },
  ];

  return (
    <main className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow="Finanzas"
        title="Cuentas, notas y cierres por sucursal"
        description="Este modulo concentra cuentas por cobrar, cuentas por pagar, notas formales y cierres por periodo dentro del tenant activo."
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {success ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{success}</div> : null}
          {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => <FinanceCard key={card.label} {...card} />)}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="panel p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">CxC</p>
                  <h2 className="mt-3 text-2xl font-black text-stone-900">Clientes por cobrar</h2>
                </div>
                <span className="text-sm text-stone-500">{loading ? "Cargando..." : `${cxcRows.length} cuentas`}</span>
              </div>
              <div className="table-shell mt-6 overflow-x-auto">
                <table className="table-base">
                  <thead><tr><th>Documento</th><th>Cliente</th><th>Saldo</th></tr></thead>
                  <tbody>
                    {cxcRows.length === 0 ? <tr><td colSpan={3}>No hay cuentas por cobrar en esta sucursal.</td></tr> : cxcRows.map((row) => (
                      <tr key={row.id_cuenta_por_cobrar} className={Number(row.id_cuenta_por_cobrar) === Number(selectedCxcId) ? "bg-brand-50" : ""}>
                        <td><button className="text-left" type="button" onClick={() => setSelectedCxcId(row.id_cuenta_por_cobrar)}><div className="font-semibold text-stone-900">{row.numero_documento}</div><div className="mt-1 text-xs text-stone-500">{row.estado_resuelto}</div></button></td>
                        <td>{row.cliente_nombre}</td>
                        <td>{formatMoney(row.saldo_actual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {canManage && cxcDetail ? (
                <form className="mt-6 space-y-3 rounded-3xl border border-stone-200 bg-stone-50 p-5" onSubmit={submitCobro}>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Cobro</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className="field" type="number" min="0" step="0.01" placeholder="Monto" value={cobroForm.monto} onChange={(event) => setCobroForm((prev) => ({ ...prev, monto: event.target.value }))} />
                    <select className="field" value={cobroForm.metodo_pago} onChange={(event) => setCobroForm((prev) => ({ ...prev, metodo_pago: event.target.value }))}>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA">Tarjeta</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="AJUSTE">Ajuste</option>
                    </select>
                    <input className="field" type="date" value={cobroForm.fecha_movimiento} onChange={(event) => setCobroForm((prev) => ({ ...prev, fecha_movimiento: event.target.value }))} />
                    <input className="field" placeholder="Observacion" value={cobroForm.observacion} onChange={(event) => setCobroForm((prev) => ({ ...prev, observacion: event.target.value }))} />
                  </div>
                  <button className="btn-primary" type="submit" disabled={saving}>Registrar cobro</button>
                </form>
              ) : null}
            </article>

            <article className="panel p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">CxP</p>
                  <h2 className="mt-3 text-2xl font-black text-stone-900">Proveedores por pagar</h2>
                </div>
                <span className="text-sm text-stone-500">{loading ? "Cargando..." : `${cxpRows.length} cuentas`}</span>
              </div>
              <div className="table-shell mt-6 overflow-x-auto">
                <table className="table-base">
                  <thead><tr><th>Documento</th><th>Proveedor</th><th>Saldo</th></tr></thead>
                  <tbody>
                    {cxpRows.length === 0 ? <tr><td colSpan={3}>No hay cuentas por pagar en esta sucursal.</td></tr> : cxpRows.map((row) => (
                      <tr key={row.id_cuenta_por_pagar} className={Number(row.id_cuenta_por_pagar) === Number(selectedCxpId) ? "bg-brand-50" : ""}>
                        <td><button className="text-left" type="button" onClick={() => setSelectedCxpId(row.id_cuenta_por_pagar)}><div className="font-semibold text-stone-900">{row.numero_documento}</div><div className="mt-1 text-xs text-stone-500">{row.estado_resuelto}</div></button></td>
                        <td>{row.proveedor_nombre}</td>
                        <td>{formatMoney(row.saldo_actual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {canManage && cxpDetail ? (
                <form className="mt-6 space-y-3 rounded-3xl border border-stone-200 bg-stone-50 p-5" onSubmit={submitPago}>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Pago</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className="field" type="number" min="0" step="0.01" placeholder="Monto" value={pagoForm.monto} onChange={(event) => setPagoForm((prev) => ({ ...prev, monto: event.target.value }))} />
                    <select className="field" value={pagoForm.metodo_pago} onChange={(event) => setPagoForm((prev) => ({ ...prev, metodo_pago: event.target.value }))}>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA">Tarjeta</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="AJUSTE">Ajuste</option>
                    </select>
                    <input className="field" type="date" value={pagoForm.fecha_movimiento} onChange={(event) => setPagoForm((prev) => ({ ...prev, fecha_movimiento: event.target.value }))} />
                    <input className="field" placeholder="Observacion" value={pagoForm.observacion} onChange={(event) => setPagoForm((prev) => ({ ...prev, observacion: event.target.value }))} />
                  </div>
                  <button className="btn-primary" type="submit" disabled={saving}>Registrar pago</button>
                </form>
              ) : null}
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Detalle</p>
              {loadingDetail ? <p className="mt-4 text-sm text-stone-500">Cargando detalle...</p> : (
                <div className="grid gap-6 xl:grid-cols-2">
                  <div>
                    <h3 className="text-xl font-black text-stone-900">Cuenta por cobrar</h3>
                    {cxcDetail ? (
                      <>
                        <p className="mt-2 text-sm text-stone-500">{cxcDetail.cuenta.cliente_nombre} · saldo {formatMoney(cxcDetail.cuenta.saldo_actual)}</p>
                        <div className="mt-4 space-y-2 text-sm text-stone-600">
                          {cxcDetail.movimientos.length === 0 ? <p>Sin movimientos.</p> : cxcDetail.movimientos.slice(0, 8).map((row) => (
                            <div key={row.id_cxc_movimiento} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                              <div className="flex items-center justify-between gap-3"><span>{row.tipo_movimiento}</span><span>{formatMoney(row.monto)}</span></div>
                              <div className="mt-1 text-xs text-stone-500">{row.fecha_movimiento} · saldo {formatMoney(row.saldo_nuevo)}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : <p className="mt-4 text-sm text-stone-500">Selecciona una cuenta por cobrar.</p>}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-stone-900">Cuenta por pagar</h3>
                    {cxpDetail ? (
                      <>
                        <p className="mt-2 text-sm text-stone-500">{cxpDetail.cuenta.proveedor_nombre} · saldo {formatMoney(cxpDetail.cuenta.saldo_actual)}</p>
                        <div className="mt-4 space-y-2 text-sm text-stone-600">
                          {cxpDetail.movimientos.length === 0 ? <p>Sin movimientos.</p> : cxpDetail.movimientos.slice(0, 8).map((row) => (
                            <div key={row.id_cxp_movimiento} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                              <div className="flex items-center justify-between gap-3"><span>{row.tipo_movimiento}</span><span>{formatMoney(row.monto)}</span></div>
                              <div className="mt-1 text-xs text-stone-500">{row.fecha_movimiento} · saldo {formatMoney(row.saldo_nuevo)}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : <p className="mt-4 text-sm text-stone-500">Selecciona una cuenta por pagar.</p>}
                  </div>
                </div>
              )}
            </article>

            <div className="space-y-6">
              {canManage ? (
                <article className="panel p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Notas formales</p>
                  <form className="mt-4 space-y-3" onSubmit={submitNota}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <select className="field" value={noteForm.destino} onChange={(event) => setNoteForm((prev) => ({ ...prev, destino: event.target.value }))}>
                        <option value="CXC">Cuenta por cobrar</option>
                        <option value="CXP">Cuenta por pagar</option>
                      </select>
                      <select className="field" value={noteForm.tipo_nota} onChange={(event) => setNoteForm((prev) => ({ ...prev, tipo_nota: event.target.value }))}>
                        <option value="CREDITO">Nota de credito</option>
                        <option value="DEBITO">Nota de debito</option>
                      </select>
                      {noteForm.destino === "CXC" ? (
                        <select className="field md:col-span-2" value={noteForm.id_cuenta_por_cobrar} onChange={(event) => setNoteForm((prev) => ({ ...prev, id_cuenta_por_cobrar: event.target.value }))}>
                          <option value="">Selecciona cuenta por cobrar</option>
                          {cxcRows.map((row) => <option key={row.id_cuenta_por_cobrar} value={row.id_cuenta_por_cobrar}>{row.numero_documento} · {row.cliente_nombre}</option>)}
                        </select>
                      ) : (
                        <select className="field md:col-span-2" value={noteForm.id_cuenta_por_pagar} onChange={(event) => setNoteForm((prev) => ({ ...prev, id_cuenta_por_pagar: event.target.value }))}>
                          <option value="">Selecciona cuenta por pagar</option>
                          {cxpRows.map((row) => <option key={row.id_cuenta_por_pagar} value={row.id_cuenta_por_pagar}>{row.numero_documento} · {row.proveedor_nombre}</option>)}
                        </select>
                      )}
                      <input className="field" type="number" min="0" step="0.01" placeholder="Monto" value={noteForm.monto} onChange={(event) => setNoteForm((prev) => ({ ...prev, monto: event.target.value }))} />
                      <input className="field" type="date" value={noteForm.fecha_emision} onChange={(event) => setNoteForm((prev) => ({ ...prev, fecha_emision: event.target.value }))} />
                      <input className="field md:col-span-2" placeholder="Numero documental opcional" value={noteForm.numero_documento} onChange={(event) => setNoteForm((prev) => ({ ...prev, numero_documento: event.target.value }))} />
                    </div>
                    <textarea className="textarea-field" placeholder="Motivo" value={noteForm.motivo} onChange={(event) => setNoteForm((prev) => ({ ...prev, motivo: event.target.value }))} />
                    <textarea className="textarea-field" placeholder="Observaciones" value={noteForm.observaciones} onChange={(event) => setNoteForm((prev) => ({ ...prev, observaciones: event.target.value }))} />
                    <button className="btn-primary" type="submit" disabled={saving}>Emitir nota</button>
                  </form>
                </article>
              ) : null}

              {canClose && isAdmin ? (
                <article className="panel p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Cierre por periodo</p>
                  <form className="mt-4 space-y-3" onSubmit={submitClose}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <select className="field" value={closeForm.area} onChange={(event) => setCloseForm((prev) => ({ ...prev, area: event.target.value }))}>
                        <option value="FINANZAS">Finanzas</option>
                        <option value="VENTAS">Ventas</option>
                        <option value="COMPRAS">Compras</option>
                        <option value="SERVICIOS">Servicios</option>
                      </select>
                      <select className="field" value={closeForm.alcance} onChange={(event) => setCloseForm((prev) => ({ ...prev, alcance: event.target.value }))}>
                        <option value="SUCURSAL">Sucursal activa</option>
                        <option value="EMPRESA">Toda la empresa</option>
                      </select>
                      <input className="field" type="date" value={closeForm.fecha_desde} onChange={(event) => setCloseForm((prev) => ({ ...prev, fecha_desde: event.target.value }))} />
                      <input className="field" type="date" value={closeForm.fecha_hasta} onChange={(event) => setCloseForm((prev) => ({ ...prev, fecha_hasta: event.target.value }))} />
                    </div>
                    <textarea className="textarea-field" placeholder="Observaciones del cierre" value={closeForm.observaciones} onChange={(event) => setCloseForm((prev) => ({ ...prev, observaciones: event.target.value }))} />
                    <button className="btn-danger" type="submit" disabled={saving}>Cerrar periodo</button>
                  </form>
                </article>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Notas recientes</p>
              <div className="mt-4 space-y-3">
                {noteRows.length === 0 ? <p className="text-sm text-stone-500">No hay notas formales emitidas.</p> : noteRows.map((row) => (
                  <div key={row.id_nota_formal} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3"><span className="font-semibold text-stone-900">{row.numero_documento}</span><span>{formatMoney(row.monto)}</span></div>
                    <div className="mt-1 text-xs text-stone-500">{row.destino} · {row.tipo_nota} · {row.fecha_emision}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Cierres recientes</p>
              <div className="mt-4 space-y-3">
                {closeRows.length === 0 ? <p className="text-sm text-stone-500">No hay cierres registrados.</p> : closeRows.map((row) => (
                  <div key={row.id_cierre_periodo} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3"><span className="font-semibold text-stone-900">{row.area}</span><span>{row.fecha_desde} a {row.fecha_hasta}</span></div>
                    <div className="mt-1 text-xs text-stone-500">{row.id_sucursal ? "Sucursal activa" : "Empresa completa"} · {row.cerrado_por_nombre || row.cerrado_por_username}</div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="panel p-6"><SucursalSwitcher /></div>
          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Sucursal operativa</p>
            <p className="mt-3 text-lg font-bold text-stone-900">{overview?.sucursal?.codigo} - {overview?.sucursal?.nombre}</p>
            <p className="mt-3 text-sm leading-6 text-stone-500">Las cuentas y cobros/pagos mostrados corresponden a la sucursal activa dentro de la empresa actual.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default FinanzasPage;
