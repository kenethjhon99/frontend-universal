import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SucursalSwitcher from "../components/SucursalSwitcher";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { hasRole } from "../lib/access";
import {
  createStockMovimiento,
  getStock,
  getStockMovimientos,
  updateStockConfig,
} from "../services/stockService";
import { getSucursales } from "../services/sucursalesService";

const createConfigForm = () => ({
  stock_minimo: "0",
  stock_maximo: "",
  ubicacion: "",
});

const createMovementForm = () => ({
  tipo: "ENTRADA",
  cantidad: "1",
  nueva_existencia: "",
  observacion: "",
});

const normalizeError = (error, fallback) => {
  const issues = error.response?.data?.details?.issues;
  if (Array.isArray(issues) && issues.length > 0) {
    const first = issues[0];
    return `${first.path || "Campo"}: ${first.message}`;
  }
  return error.response?.data?.error || fallback;
};

function InventarioPage() {
  const { session } = useAppSession();
  const [sucursales, setSucursales] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState(
    session?.sucursal_activa?.id_sucursal || ""
  );
  const [search, setSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingMovimientos, setLoadingMovimientos] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);
  const [configForm, setConfigForm] = useState(createConfigForm);
  const [movementForm, setMovementForm] = useState(createMovementForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManageInventory = hasRole(
    session,
    "SUPER_ADMIN",
    "ADMIN_EMPRESA",
    "ENCARGADO_SUCURSAL"
  );
  const activeSucursal = session?.sucursal_activa;
  const activeSucursalId = session?.sucursal_activa?.id_sucursal;
  const effectiveSucursales = useMemo(() => {
    if (sucursales.length > 0) {
      return sucursales;
    }

    if (!activeSucursalId) {
      return [];
    }

    return [
      {
        id_sucursal: activeSucursalId,
        codigo: activeSucursal?.codigo || "ACTIVA",
        nombre: activeSucursal?.nombre || "Sucursal activa",
      },
    ];
  }, [activeSucursal, activeSucursalId, sucursales]);
  const effectiveBranchId = Number(selectedBranchId || activeSucursalId || 0);
  const effectiveBranch = effectiveSucursales.find(
    (item) => Number(item.id_sucursal) === Number(effectiveBranchId)
  );

  const loadStock = async () => {
    try {
      setLoadingStock(true);
      setError("");
      if (!effectiveBranchId) {
        setStockRows([]);
        return;
      }

      const [branchRows, data] = await Promise.all([
        getSucursales(),
        getStock({}, { branchId: effectiveBranchId }),
      ]);
      setSucursales(branchRows);
      setStockRows(data);
    } catch (requestError) {
      setError(
        normalizeError(requestError, "No se pudo cargar el inventario")
      );
    } finally {
      setLoadingStock(false);
    }
  };

  const loadMovements = async (idProducto = null) => {
    try {
      setLoadingMovimientos(true);
      if (!effectiveBranchId) {
        setMovimientos([]);
        return;
      }

      const data = await getStockMovimientos({
        id_producto: idProducto || undefined,
        limit: 100,
      }, { branchId: effectiveBranchId });
      setMovimientos(data);
    } catch (requestError) {
      setError(
        normalizeError(requestError, "No se pudo cargar el kardex")
      );
    } finally {
      setLoadingMovimientos(false);
    }
  };

  useEffect(() => {
    if (!selectedBranchId && activeSucursalId) {
      setSelectedBranchId(activeSucursalId);
    }
  }, [activeSucursalId, selectedBranchId]);

  useEffect(() => {
    setSelectedProductId(null);
    loadStock();
    loadMovements(null);
  }, [activeSucursalId, effectiveBranchId]);

  useEffect(() => {
    loadMovements(selectedProductId);
  }, [selectedProductId, effectiveBranchId]);

  const filteredStock = useMemo(() => {
    const searchTerm = String(search || "").trim().toLowerCase();

    return stockRows.filter((row) => {
      const matchesSearch =
        !searchTerm ||
        String(row.nombre || "").toLowerCase().includes(searchTerm) ||
        String(row.sku || "").toLowerCase().includes(searchTerm) ||
        String(row.codigo_barras || "").toLowerCase().includes(searchTerm);

      const matchesLowStock = !onlyLowStock || row.bajo_minimo;
      return matchesSearch && matchesLowStock;
    });
  }, [stockRows, search, onlyLowStock]);

  const selectedStock = useMemo(
    () =>
      stockRows.find(
        (row) => Number(row.id_producto) === Number(selectedProductId)
      ) || null,
    [stockRows, selectedProductId]
  );

  const summary = useMemo(
    () => ({
      productos: stockRows.length,
      unidades: stockRows.reduce(
        (acc, item) => acc + Number(item.stock_actual || 0),
        0
      ),
      bajoMinimo: stockRows.filter((item) => item.bajo_minimo).length,
    }),
    [stockRows]
  );

  useEffect(() => {
    if (!selectedStock) {
      setConfigForm(createConfigForm());
      setMovementForm(createMovementForm());
      return;
    }

    setConfigForm({
      stock_minimo: String(selectedStock.stock_minimo ?? 0),
      stock_maximo:
        selectedStock.stock_maximo !== null &&
        selectedStock.stock_maximo !== undefined
          ? String(selectedStock.stock_maximo)
          : "",
      ubicacion: selectedStock.ubicacion || "",
    });
    setMovementForm(createMovementForm());
  }, [selectedStock]);

  const handleSaveConfig = async (event) => {
    event.preventDefault();

    if (!selectedStock) {
      return;
    }

    try {
      setSavingConfig(true);
      setError("");
      setSuccess("");

      await updateStockConfig(selectedStock.id_producto, {
        stock_minimo: Number(configForm.stock_minimo || 0),
        stock_maximo:
          configForm.stock_maximo === ""
            ? null
            : Number(configForm.stock_maximo || 0),
        ubicacion: configForm.ubicacion || null,
      }, { branchId: effectiveBranchId });

      setSuccess("Configuracion de stock actualizada.");
      await loadStock();
      await loadMovements(selectedStock.id_producto);
    } catch (requestError) {
      setError(
        normalizeError(
          requestError,
          "No se pudo actualizar la configuracion de stock"
        )
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCreateMovement = async (event) => {
    event.preventDefault();

    if (!selectedStock) {
      return;
    }

    try {
      setSavingMovement(true);
      setError("");
      setSuccess("");

      const payload = {
        id_producto: selectedStock.id_producto,
        tipo: movementForm.tipo,
        observacion: movementForm.observacion || null,
      };

      if (movementForm.tipo === "AJUSTE") {
        payload.nueva_existencia = Number(
          movementForm.nueva_existencia || selectedStock.stock_actual || 0
        );
      } else {
        payload.cantidad = Number(movementForm.cantidad || 0);
      }

      await createStockMovimiento(payload, { branchId: effectiveBranchId });
      setSuccess("Movimiento de inventario registrado.");
      setMovementForm(createMovementForm());
      await loadStock();
      await loadMovements(selectedStock.id_producto);
    } catch (requestError) {
      setError(
        normalizeError(
          requestError,
          "No se pudo registrar el movimiento de inventario"
        )
      );
    } finally {
      setSavingMovement(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <WorkspaceHero
        eyebrow="Inventario"
        title="Stock y movimientos por sucursal"
        description="Este workspace usa la sucursal activa para consultar existencias, configurar minimos y registrar entradas, salidas o ajustes manuales con trazabilidad."
        actions={
          <Link className="btn-secondary" to="/operacion/catalogos">
            Ir a catalogos
          </Link>
        }
      />

      <section className="mx-auto grid max-w-7xl min-w-0 gap-4 overflow-hidden px-3 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
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

          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <article className="panel min-w-0 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Productos
              </p>
              <p className="mt-3 text-2xl font-black text-stone-900">
                {summary.productos}
              </p>
            </article>
            <article className="panel min-w-0 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Unidades visibles
              </p>
              <p className="mt-3 text-2xl font-black text-stone-900">
                {summary.unidades}
              </p>
            </article>
            <article className="panel min-w-0 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Bajo minimo
              </p>
              <p className="mt-3 text-2xl font-black text-stone-900">
                {summary.bajoMinimo}
              </p>
            </article>
          </div>

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <article className="panel min-w-0 overflow-hidden p-4 sm:p-6">
              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,520px)] lg:items-end">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                    Stock actual
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-stone-900">
                    Existencias por sucursal
                  </h2>
                </div>
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  <label className="field-group sm:col-span-2">
                    <span className="field-label">Sucursal consultada</span>
                    <select
                      aria-label="Sucursal consultada para inventario"
                      className="field"
                      value={selectedBranchId}
                      onChange={(event) => setSelectedBranchId(event.target.value)}
                    >
                      {effectiveSucursales.length === 0 ? (
                        <option value="">Sin sucursales disponibles</option>
                      ) : null}
                      {effectiveSucursales.map((sucursal) => (
                        <option
                          key={sucursal.id_sucursal}
                          value={sucursal.id_sucursal}
                        >
                          {sucursal.codigo} - {sucursal.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group md:col-span-1">
                    <span className="field-label">Buscar producto</span>
                    <input
                      className="field"
                      placeholder="Nombre, SKU o codigo"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  <label className="flex min-w-0 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700">
                    <input
                      checked={onlyLowStock}
                      type="checkbox"
                      onChange={(event) => setOnlyLowStock(event.target.checked)}
                    />
                    Solo bajo minimo
                  </label>
                </div>
              </div>

              <div className="mt-5 space-y-3 md:hidden">
                {loadingStock ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-stone-500">
                    Cargando inventario...
                  </div>
                ) : filteredStock.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-stone-500">
                    No hay productos para el filtro actual.
                  </div>
                ) : (
                  filteredStock.map((row) => (
                    <button
                      key={row.id_stock}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        Number(row.id_producto) === Number(selectedProductId)
                          ? "border-brand-300 bg-brand-50"
                          : "border-slate-200 bg-white"
                      }`}
                      type="button"
                      onClick={() => setSelectedProductId(row.id_producto)}
                    >
                      <div className="min-w-0">
                        <p className="break-words text-base font-black text-stone-900">
                          {row.nombre}
                        </p>
                        <p className="mt-1 break-words text-xs text-stone-500">
                          {row.sku || "Sin SKU"}
                          {row.codigo_barras ? ` | ${row.codigo_barras}` : ""}
                        </p>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                            Stock
                          </p>
                          <p className="mt-1 font-black text-stone-900">
                            {Number(row.stock_actual || 0)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                            Minimo
                          </p>
                          <p className="mt-1 font-black text-stone-900">
                            {Number(row.stock_minimo || 0)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="badge-muted">{row.modulo_origen}</span>
                        {row.bajo_minimo ? (
                          <span className="badge-warning">Bajo minimo</span>
                        ) : null}
                      </div>
                      <p className="mt-3 break-words text-sm text-stone-500">
                        {row.ubicacion || "Sin ubicacion"}
                      </p>
                    </button>
                  ))
                )}
              </div>

              <div className="table-shell mt-6 hidden overflow-x-auto md:block">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Modulo</th>
                      <th>Stock</th>
                      <th>Ubicacion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingStock ? (
                      <tr><td colSpan={4}>Cargando inventario...</td></tr>
                    ) : filteredStock.length === 0 ? (
                      <tr><td colSpan={4}>No hay productos para el filtro actual.</td></tr>
                    ) : (
                      filteredStock.map((row) => (
                        <tr
                          key={row.id_stock}
                          className={
                            Number(row.id_producto) === Number(selectedProductId)
                              ? "bg-brand-50"
                              : ""
                          }
                        >
                          <td>
                            <button
                              className="text-left"
                              type="button"
                              onClick={() => setSelectedProductId(row.id_producto)}
                            >
                              <div className="font-semibold text-stone-900">
                                {row.nombre}
                              </div>
                              <div className="mt-1 text-xs text-stone-500">
                                {row.sku}
                                {row.codigo_barras ? ` | ${row.codigo_barras}` : ""}
                              </div>
                            </button>
                          </td>
                          <td>{row.modulo_origen}</td>
                          <td>
                            <div className="font-semibold text-stone-900">
                              {Number(row.stock_actual || 0)}
                            </div>
                            <div className="mt-1 text-xs text-stone-500">
                              Min {Number(row.stock_minimo || 0)}
                            </div>
                            {row.bajo_minimo ? (
                              <div className="mt-2">
                                <span className="badge-warning">
                                  Bajo minimo
                                </span>
                              </div>
                            ) : null}
                          </td>
                          <td>{row.ubicacion || "Sin ubicacion"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <div className="min-w-0 space-y-5">
              <article className="panel min-w-0 overflow-hidden p-4 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  Producto seleccionado
                </p>
                {selectedStock ? (
                  <div className="mt-4 space-y-5">
                    <div>
                      <h2 className="text-2xl font-black text-stone-900">
                        {selectedStock.nombre}
                      </h2>
                      <p className="mt-2 text-sm text-stone-500">
                        {selectedStock.sku}
                        {selectedStock.codigo_barras
                          ? ` | ${selectedStock.codigo_barras}`
                          : ""}
                      </p>
                    </div>

                    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-stone-400">
                          Stock actual
                        </p>
                        <p className="mt-2 text-2xl font-black text-stone-900">
                          {Number(selectedStock.stock_actual || 0)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-stone-400">
                          Stock minimo
                        </p>
                        <p className="mt-2 text-2xl font-black text-stone-900">
                          {Number(selectedStock.stock_minimo || 0)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-stone-400">
                          Modulo
                        </p>
                        <p className="mt-2 text-2xl font-black text-stone-900">
                          {selectedStock.modulo_origen}
                        </p>
                      </div>
                    </div>

                    {canManageInventory ? (
                      <>
                        <form className="space-y-4" onSubmit={handleSaveConfig}>
                          <h3 className="text-sm font-bold text-stone-900">
                            Configuracion de stock
                          </h3>
                          <div className="grid min-w-0 gap-3 md:grid-cols-3">
                            <input className="field" type="number" min="0" step="0.01" placeholder="Stock minimo" value={configForm.stock_minimo} onChange={(event) => setConfigForm((prev) => ({ ...prev, stock_minimo: event.target.value }))} />
                            <input className="field" type="number" min="0" step="0.01" placeholder="Stock maximo" value={configForm.stock_maximo} onChange={(event) => setConfigForm((prev) => ({ ...prev, stock_maximo: event.target.value }))} />
                            <input className="field" placeholder="Ubicacion" value={configForm.ubicacion} onChange={(event) => setConfigForm((prev) => ({ ...prev, ubicacion: event.target.value }))} />
                          </div>
                          <button className="btn-primary" disabled={savingConfig} type="submit">
                            {savingConfig ? "Guardando..." : "Guardar configuracion"}
                          </button>
                        </form>

                        <form className="space-y-4 border-t border-stone-200 pt-5" onSubmit={handleCreateMovement}>
                          <h3 className="text-sm font-bold text-stone-900">
                            Movimiento manual
                          </h3>
                          <div className="grid min-w-0 gap-3 md:grid-cols-2">
                            <select className="field" value={movementForm.tipo} onChange={(event) => setMovementForm((prev) => ({ ...prev, tipo: event.target.value }))}>
                              <option value="ENTRADA">Entrada</option>
                              <option value="SALIDA">Salida</option>
                              <option value="AJUSTE">Ajuste</option>
                            </select>
                            {movementForm.tipo === "AJUSTE" ? (
                              <input className="field" type="number" min="0" step="0.01" placeholder="Nueva existencia" value={movementForm.nueva_existencia} onChange={(event) => setMovementForm((prev) => ({ ...prev, nueva_existencia: event.target.value }))} />
                            ) : (
                              <input className="field" type="number" min="0" step="0.01" placeholder="Cantidad" value={movementForm.cantidad} onChange={(event) => setMovementForm((prev) => ({ ...prev, cantidad: event.target.value }))} />
                            )}
                          </div>
                          <textarea className="textarea-field" placeholder="Observacion del movimiento" value={movementForm.observacion} onChange={(event) => setMovementForm((prev) => ({ ...prev, observacion: event.target.value }))} />
                          <button className="btn-primary" disabled={savingMovement} type="submit">
                            {savingMovement ? "Registrando..." : "Registrar movimiento"}
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-stone-500">
                    Selecciona un producto de la tabla para ver su detalle,
                    configurar minimos o registrar movimientos manuales.
                  </p>
                )}
              </article>

              <article className="panel min-w-0 overflow-hidden p-4 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  Kardex reciente
                </p>
                <div className="mt-4 space-y-3 md:hidden">
                  {loadingMovimientos ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-stone-500">
                      Cargando movimientos...
                    </div>
                  ) : movimientos.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-stone-500">
                      No hay movimientos recientes.
                    </div>
                  ) : (
                    movimientos.map((item) => (
                      <article
                        key={item.id_movimiento}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={item.tipo === "SALIDA" ? "badge-warning" : item.tipo === "AJUSTE" ? "badge-muted" : "badge-success"}>
                            {item.tipo}
                          </span>
                          <span className="text-sm font-black text-stone-900">
                            {Number(item.cantidad || 0)}
                          </span>
                        </div>
                        <p className="mt-3 break-words font-semibold text-stone-900">
                          {item.producto_nombre}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {new Date(item.created_at).toLocaleString("es-GT")}
                        </p>
                        <p className="mt-3 break-words text-sm text-stone-500">
                          {item.observacion || "Sin observacion"}
                        </p>
                      </article>
                    ))
                  )}
                </div>

                <div className="table-shell mt-4 hidden overflow-x-auto md:block">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingMovimientos ? (
                        <tr><td colSpan={4}>Cargando movimientos...</td></tr>
                      ) : movimientos.length === 0 ? (
                        <tr><td colSpan={4}>No hay movimientos recientes.</td></tr>
                      ) : (
                        movimientos.map((item) => (
                          <tr key={item.id_movimiento}>
                            <td>{new Date(item.created_at).toLocaleString("es-GT")}</td>
                            <td>
                              <span className={item.tipo === "SALIDA" ? "badge-warning" : item.tipo === "AJUSTE" ? "badge-muted" : "badge-success"}>
                                {item.tipo}
                              </span>
                            </td>
                            <td>{Number(item.cantidad || 0)}</td>
                            <td>
                              <div className="font-semibold text-stone-900">
                                {item.producto_nombre}
                              </div>
                              <div className="mt-1 text-xs text-stone-500">
                                {item.observacion || "Sin observacion"}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          </div>
        </div>

        <aside className="min-w-0 space-y-5">
          <div className="panel p-6">
            <SucursalSwitcher />
          </div>

          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Sucursal activa
            </p>
            <p className="mt-3 text-lg font-bold text-stone-900">
              {session?.sucursal_activa?.codigo} - {session?.sucursal_activa?.nombre}
            </p>
            <p className="mt-3 text-sm font-semibold text-stone-900">
              Consultando:
            </p>
            <p className="mt-1 text-sm text-stone-600">
              {effectiveBranch
                ? `${effectiveBranch.codigo} - ${effectiveBranch.nombre}`
                : "Sucursal actual"}
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              Si cambias de sucursal, las existencias y movimientos se recalculan
              sobre esa sucursal porque el stock es totalmente independiente por
              tienda.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default InventarioPage;
