import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SucursalSwitcher from "../components/SucursalSwitcher";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { hasPermission, hasRole } from "../lib/access";
import {
  createCompra,
  createCompraAjusteCosto,
  createCompraDevolucion,
  getCompraById,
  getCompras,
} from "../services/comprasService";
import { getProductos } from "../services/productosService";
import { getProveedores } from "../services/proveedoresService";
import { getSucursales } from "../services/sucursalesService";

const createPurchaseForm = () => ({
  id_proveedor: "",
  numero_documento: "",
  fecha_compra: new Date().toISOString().slice(0, 10),
  observaciones: "",
});

const createPurchaseReturnForm = () => ({
  motivo: "",
  cantidades: {},
});

const createCostAdjustmentForm = () => ({
  motivo: "",
  costos: {},
});

const normalizeError = (error, fallback) =>
  error.response?.data?.error || fallback;

const getPurchaseReversionBadgeClasses = (status) => {
  const normalized = String(status || "").trim().toUpperCase();

  if (normalized === "TOTAL") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (normalized === "PARCIAL") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};

function ComprasPage() {
  const { session } = useAppSession();
  const [sucursales, setSucursales] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [compras, setCompras] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(
    session?.sucursal_activa?.id_sucursal || ""
  );
  const [selectedCompraId, setSelectedCompraId] = useState(null);
  const [compraDetalle, setCompraDetalle] = useState(null);
  const [purchaseForm, setPurchaseForm] = useState(createPurchaseForm);
  const [items, setItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [returnForm, setReturnForm] = useState(createPurchaseReturnForm);
  const [costAdjustmentForm, setCostAdjustmentForm] = useState(
    createCostAdjustmentForm
  );
  const [returnSaving, setReturnSaving] = useState(false);
  const [adjustmentSaving, setAdjustmentSaving] = useState(false);

  const canManagePurchases = hasRole(
    session,
    "SUPER_ADMIN",
    "ADMIN_EMPRESA",
    "ENCARGADO_SUCURSAL"
  );
  const canAdjustPurchases = hasPermission(session, "purchases.adjust");
  const activeSucursalId = session?.sucursal_activa?.id_sucursal;
  const effectiveBranchId = Number(selectedBranchId || activeSucursalId || 0);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError("");

      const [branchRows, productRows, providerRows, purchaseRows] =
        await Promise.all([
          getSucursales(),
          effectiveBranchId
            ? getProductos({ activo: "true" }, { branchId: effectiveBranchId })
            : Promise.resolve([]),
          getProveedores({ incluir_inactivos: "false" }),
          effectiveBranchId
            ? getCompras({ limit: 20, search: historySearch || undefined }, { branchId: effectiveBranchId })
            : Promise.resolve([]),
        ]);

      setSucursales(branchRows);
      setProductos(productRows);
      setProveedores(providerRows);
      setCompras(purchaseRows);
    } catch (requestError) {
      setError(
        normalizeError(requestError, "No se pudo cargar el modulo de compras")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedBranchId && activeSucursalId) {
      setSelectedBranchId(activeSucursalId);
    }
  }, [activeSucursalId, selectedBranchId]);

  useEffect(() => {
    setSelectedCompraId(null);
    setCompraDetalle(null);
    resetReturnForm();
    resetCostAdjustmentForm();
    loadPage();
  }, [effectiveBranchId, historySearch]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedCompraId || !effectiveBranchId) {
        setCompraDetalle(null);
        return;
      }

      try {
        setLoadingDetail(true);
        const data = await getCompraById(selectedCompraId, {
          branchId: effectiveBranchId,
        });
        setCompraDetalle(data);
        resetReturnForm();
        setCostAdjustmentForm({
          motivo: "",
          costos: Object.fromEntries(
            (data?.detalles || []).map((detalle) => [
              detalle.id_compra_detalle,
              String(Number(detalle.costo_unitario || 0).toFixed(2)),
            ])
          ),
        });
      } catch (requestError) {
        setError(
          normalizeError(requestError, "No se pudo cargar el detalle de la compra")
        );
      } finally {
        setLoadingDetail(false);
      }
    };

    loadDetail();
  }, [selectedCompraId, effectiveBranchId]);

  const filteredProducts = useMemo(() => {
    const search = String(productSearch || "").trim().toLowerCase();

    if (!search) {
      return productos;
    }

    return productos.filter((producto) =>
      [producto.nombre, producto.sku, producto.codigo_barras]
        .some((value) => String(value || "").toLowerCase().includes(search))
    );
  }, [productos, productSearch]);

  const selectedBranch = useMemo(
    () =>
      sucursales.find(
        (sucursal) => Number(sucursal.id_sucursal) === Number(effectiveBranchId)
      ) || null,
    [sucursales, effectiveBranchId]
  );

  const summary = useMemo(
    () => ({
      items: items.length,
      unidades: items.reduce((acc, item) => acc + Number(item.cantidad || 0), 0),
      total: items.reduce(
        (acc, item) =>
          acc + Number(item.cantidad || 0) * Number(item.costo_unitario || 0),
        0
      ),
    }),
    [items]
  );

  const addProduct = (producto) => {
    setItems((prev) => {
      const existing = prev.find(
        (item) => Number(item.id_producto) === Number(producto.id_producto)
      );

      if (existing) {
        return prev.map((item) =>
          Number(item.id_producto) === Number(producto.id_producto)
            ? { ...item, cantidad: Number(item.cantidad || 0) + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          id_producto: producto.id_producto,
          nombre: producto.nombre,
          sku: producto.sku,
          stock_actual: Number(producto.stock_actual || 0),
          cantidad: 1,
          costo_unitario: Number(producto.precio_compra || 0),
        },
      ];
    });
  };

  const updateItem = (idProducto, field, value) => {
    setItems((prev) =>
      prev.map((item) =>
        Number(item.id_producto) === Number(idProducto)
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const removeItem = (idProducto) => {
    setItems((prev) =>
      prev.filter((item) => Number(item.id_producto) !== Number(idProducto))
    );
  };

  const resetForm = () => {
    setPurchaseForm(createPurchaseForm());
    setItems([]);
    setError("");
  };

  const resetReturnForm = () => {
    setReturnForm(createPurchaseReturnForm());
  };

  const resetCostAdjustmentForm = () => {
    setCostAdjustmentForm(createCostAdjustmentForm());
  };

  const updateReturnQuantity = (idCompraDetalle, value) => {
    setReturnForm((prev) => ({
      ...prev,
      cantidades: {
        ...prev.cantidades,
        [idCompraDetalle]: value,
      },
    }));
  };

  const updateAdjustmentCost = (idCompraDetalle, value) => {
    setCostAdjustmentForm((prev) => ({
      ...prev,
      costos: {
        ...prev.costos,
        [idCompraDetalle]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!effectiveBranchId) {
      setError("Selecciona una sucursal de destino");
      return;
    }

    if (!purchaseForm.id_proveedor) {
      setError("Selecciona un proveedor");
      return;
    }

    if (items.length === 0) {
      setError("Agrega al menos un producto a la compra");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const compra = await createCompra(
        {
          id_proveedor: Number(purchaseForm.id_proveedor),
          numero_documento: purchaseForm.numero_documento || null,
          fecha_compra: purchaseForm.fecha_compra || null,
          observaciones: purchaseForm.observaciones || null,
          items: items.map((item) => ({
            id_producto: item.id_producto,
            cantidad: Number(item.cantidad || 0),
            costo_unitario: Number(item.costo_unitario || 0),
          })),
        },
        { branchId: effectiveBranchId }
      );

      setSuccess("Compra registrada correctamente.");
      resetForm();
      await loadPage();
      if (compra?.compra?.id_compra) {
        setSelectedCompraId(compra.compra.id_compra);
      }
    } catch (requestError) {
      setError(
        normalizeError(requestError, "No se pudo registrar la compra")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReturnSubmit = async (event) => {
    event.preventDefault();

    if (!selectedCompraId || !compraDetalle?.compra) {
      setError("Selecciona una compra antes de registrar una devolucion");
      return;
    }

    const detailItems = (compraDetalle.detalles || [])
      .map((detalle) => ({
        id_compra_detalle: detalle.id_compra_detalle,
        cantidad: Number(returnForm.cantidades?.[detalle.id_compra_detalle] || 0),
      }))
      .filter((detalle) => detalle.cantidad > 0);

    if (detailItems.length === 0) {
      setError("Indica al menos una cantidad a devolver al proveedor");
      return;
    }

    try {
      setReturnSaving(true);
      setError("");
      setSuccess("");

      const data = await createCompraDevolucion(
        selectedCompraId,
        {
          motivo: returnForm.motivo || null,
          items: detailItems,
        },
        { branchId: effectiveBranchId }
      );

      setCompraDetalle(data);
      await loadPage();
      resetReturnForm();
      setSuccess("Devolucion a proveedor registrada correctamente.");
    } catch (requestError) {
      setError(
        normalizeError(requestError, "No se pudo registrar la devolucion")
      );
    } finally {
      setReturnSaving(false);
    }
  };

  const handleCostAdjustmentSubmit = async (event) => {
    event.preventDefault();

    if (!selectedCompraId || !compraDetalle?.compra) {
      setError("Selecciona una compra antes de ajustar costos");
      return;
    }

    const detailItems = (compraDetalle.detalles || [])
      .map((detalle) => ({
        id_compra_detalle: detalle.id_compra_detalle,
        costo_unitario_nuevo: Number(
          costAdjustmentForm.costos?.[detalle.id_compra_detalle] ??
            detalle.costo_unitario
        ),
      }))
      .filter(
        (detalle) =>
          Number.isFinite(detalle.costo_unitario_nuevo) &&
          Number(detalle.costo_unitario_nuevo) >= 0 &&
          Number(detalle.costo_unitario_nuevo).toFixed(2) !==
            Number(
              compraDetalle.detalles.find(
                (row) => Number(row.id_compra_detalle) === Number(detalle.id_compra_detalle)
              )?.costo_unitario || 0
            ).toFixed(2)
      );

    if (detailItems.length === 0) {
      setError("No hay cambios de costo pendientes por aplicar");
      return;
    }

    try {
      setAdjustmentSaving(true);
      setError("");
      setSuccess("");

      const data = await createCompraAjusteCosto(
        selectedCompraId,
        {
          motivo: costAdjustmentForm.motivo || null,
          items: detailItems,
        },
        { branchId: effectiveBranchId }
      );

      setCompraDetalle(data);
      await loadPage();
      setCostAdjustmentForm({
        motivo: "",
        costos: Object.fromEntries(
          (data?.detalles || []).map((detalle) => [
            detalle.id_compra_detalle,
            String(Number(detalle.costo_unitario || 0).toFixed(2)),
          ])
        ),
      });
      setSuccess("Ajuste de costo aplicado correctamente.");
    } catch (requestError) {
      setError(
        normalizeError(requestError, "No se pudo ajustar el costo de la compra")
      );
    } finally {
      setAdjustmentSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow="Compras"
        title="Ingreso de mercaderia por sucursal"
        description="Registra compras en la base nueva del SaaS, ligadas a empresa, sucursal, usuario y proveedor, con impacto automatico en inventario."
        actions={
          <Link className="btn-secondary" to="/operacion/inventario">
            Ver inventario
          </Link>
        }
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
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

          <div className="grid gap-4 md:grid-cols-3">
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Productos
              </p>
              <p className="mt-3 text-3xl font-black text-stone-900">
                {summary.items}
              </p>
            </article>
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Unidades
              </p>
              <p className="mt-3 text-3xl font-black text-stone-900">
                {summary.unidades}
              </p>
            </article>
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Total estimado
              </p>
              <p className="mt-3 text-3xl font-black text-stone-900">
                Q {summary.total.toFixed(2)}
              </p>
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="panel p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                    Nueva compra
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-stone-900">
                    Registrar ingreso
                  </h2>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    className="field sm:min-w-[220px]"
                    value={selectedBranchId}
                    onChange={(event) => setSelectedBranchId(event.target.value)}
                  >
                    {sucursales.map((sucursal) => (
                      <option
                        key={sucursal.id_sucursal}
                        value={sucursal.id_sucursal}
                      >
                        {sucursal.codigo} - {sucursal.nombre}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field"
                    placeholder="Buscar producto para agregar"
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                  />
                </div>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    className="field"
                    value={purchaseForm.id_proveedor}
                    onChange={(event) =>
                      setPurchaseForm((prev) => ({
                        ...prev,
                        id_proveedor: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Selecciona un proveedor</option>
                    {proveedores.map((proveedor) => (
                      <option
                        key={proveedor.id_proveedor}
                        value={proveedor.id_proveedor}
                      >
                        {proveedor.nombre}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field"
                    placeholder="Numero de documento"
                    value={purchaseForm.numero_documento}
                    onChange={(event) =>
                      setPurchaseForm((prev) => ({
                        ...prev,
                        numero_documento: event.target.value,
                      }))
                    }
                  />
                  <input
                    className="field"
                    type="date"
                    value={purchaseForm.fecha_compra}
                    onChange={(event) =>
                      setPurchaseForm((prev) => ({
                        ...prev,
                        fecha_compra: event.target.value,
                      }))
                    }
                  />
                  <div className="flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                    Destino: {selectedBranch?.codigo} - {selectedBranch?.nombre}
                  </div>
                </div>

                <textarea
                  className="textarea-field"
                  placeholder="Observaciones de la compra"
                  value={purchaseForm.observaciones}
                  onChange={(event) =>
                    setPurchaseForm((prev) => ({
                      ...prev,
                      observaciones: event.target.value,
                    }))
                  }
                />

                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-bold text-stone-900">
                    Productos disponibles
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {filteredProducts.slice(0, 8).map((producto) => (
                      <button
                        key={producto.id_producto}
                        className="rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:border-brand-300"
                        type="button"
                        onClick={() => addProduct(producto)}
                      >
                        <div className="font-semibold text-stone-900">
                          {producto.nombre}
                        </div>
                        <div className="mt-1 text-xs text-stone-500">
                          {producto.sku}
                          {producto.codigo_barras
                            ? ` | ${producto.codigo_barras}`
                            : ""}
                        </div>
                        <div className="mt-3 text-sm text-stone-600">
                          Stock actual: {Number(producto.stock_actual || 0)}
                        </div>
                      </button>
                    ))}
                    {filteredProducts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-6 text-sm text-stone-500">
                        No hay productos disponibles para esta sucursal.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="table-shell overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Costo</th>
                        <th>Subtotal</th>
                        <th>Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5}>Agrega productos para completar la compra.</td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id_producto}>
                            <td>
                              <div className="font-semibold text-stone-900">
                                {item.nombre}
                              </div>
                              <div className="mt-1 text-xs text-stone-500">
                                {item.sku}
                              </div>
                            </td>
                            <td>
                              <input
                                className="field min-w-[110px]"
                                type="number"
                                min="1"
                                step="1"
                                value={item.cantidad}
                                onChange={(event) =>
                                  updateItem(
                                    item.id_producto,
                                    "cantidad",
                                    event.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="field min-w-[140px]"
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.costo_unitario}
                                onChange={(event) =>
                                  updateItem(
                                    item.id_producto,
                                    "costo_unitario",
                                    event.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              Q{" "}
                              {(
                                Number(item.cantidad || 0) *
                                Number(item.costo_unitario || 0)
                              ).toFixed(2)}
                            </td>
                            <td>
                              <button
                                className="chip"
                                type="button"
                                onClick={() => removeItem(item.id_producto)}
                              >
                                Quitar
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    className="btn-primary"
                    disabled={saving || !canManagePurchases}
                    type="submit"
                  >
                    {saving ? "Registrando compra..." : "Registrar compra"}
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={resetForm}
                  >
                    Limpiar
                  </button>
                  <Link className="btn-secondary" to="/operacion/catalogos">
                    Administrar proveedores
                  </Link>
                </div>
              </form>
            </article>

            <div className="space-y-6">
              <article className="panel p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                      Historial
                    </p>
                    <h2 className="mt-3 text-2xl font-black text-stone-900">
                      Compras recientes
                    </h2>
                  </div>
                  <input
                    className="field lg:max-w-xs"
                    placeholder="Buscar por proveedor o documento"
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                  />
                </div>

                <div className="table-shell mt-6 overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Documento</th>
                        <th>Proveedor</th>
                        <th>Total</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={4}>Cargando compras...</td></tr>
                      ) : compras.length === 0 ? (
                        <tr><td colSpan={4}>No hay compras registradas.</td></tr>
                      ) : (
                        compras.map((compra) => (
                          <tr
                            key={compra.id_compra}
                            className={
                              Number(compra.id_compra) === Number(selectedCompraId)
                                ? "bg-brand-50"
                                : ""
                            }
                          >
                            <td>
                              <button
                                className="text-left"
                                type="button"
                                onClick={() => setSelectedCompraId(compra.id_compra)}
                              >
                                <div className="font-semibold text-stone-900">
                                  {compra.numero_documento || `Compra #${compra.id_compra}`}
                                </div>
                                <div className="mt-1 text-xs text-stone-500">
                                  {compra.tipo_documento}
                                </div>
                                <div
                                  className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${getPurchaseReversionBadgeClasses(
                                    compra.estado_reversion
                                  )}`}
                                >
                                  {compra.estado_reversion.replaceAll("_", " ")}
                                </div>
                              </button>
                            </td>
                            <td>{compra.proveedor_nombre}</td>
                            <td>
                              <div className="font-semibold text-stone-900">
                                Q {Number(compra.total_neto ?? compra.total ?? 0).toFixed(2)}
                              </div>
                              {Number(compra.monto_revertido || 0) > 0 ? (
                                <div className="mt-1 text-xs text-stone-500">
                                  Revertido: Q {Number(compra.monto_revertido || 0).toFixed(2)}
                                </div>
                              ) : null}
                            </td>
                            <td>
                              {new Date(compra.fecha_compra).toLocaleString("es-GT")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="panel p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  Detalle de compra
                </p>
                {loadingDetail ? (
                  <p className="mt-4 text-sm text-stone-500">Cargando detalle...</p>
                ) : compraDetalle ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-black text-stone-900">
                          {compraDetalle.compra.numero_documento ||
                            `Compra #${compraDetalle.compra.id_compra}`}
                        </h2>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPurchaseReversionBadgeClasses(
                            compraDetalle.compra.estado_reversion
                          )}`}
                        >
                          {compraDetalle.compra.estado_reversion.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-stone-500">
                        {compraDetalle.compra.proveedor_nombre} |{" "}
                        {new Date(compraDetalle.compra.fecha_compra).toLocaleString("es-GT")}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                          Total original
                        </p>
                        <p className="mt-2 text-xl font-black text-stone-900">
                          Q {Number(compraDetalle.compra.total || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                          Total devuelto
                        </p>
                        <p className="mt-2 text-xl font-black text-stone-900">
                          Q {Number(compraDetalle.compra.monto_revertido || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                          Total neto
                        </p>
                        <p className="mt-2 text-xl font-black text-stone-900">
                          Q {Number(compraDetalle.compra.total_neto || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="table-shell overflow-x-auto">
                      <table className="table-base">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Disponible</th>
                            <th>Costo</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {compraDetalle.detalles.map((detalle) => (
                            <tr key={detalle.id_compra_detalle}>
                              <td>
                                <div className="font-semibold text-stone-900">
                                  {detalle.producto_nombre}
                                </div>
                                <div className="mt-1 text-xs text-stone-500">
                                  {detalle.sku}
                                </div>
                              </td>
                              <td>{Number(detalle.cantidad || 0)}</td>
                              <td>{Number(detalle.cantidad_disponible_reversion || 0)}</td>
                              <td>
                                Q {Number(detalle.costo_unitario || 0).toFixed(2)}
                              </td>
                              <td>
                                Q {Number(detalle.subtotal || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <form
                        className="rounded-3xl border border-stone-200 bg-stone-50 p-5"
                        onSubmit={handleReturnSubmit}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                          Devolucion proveedor
                        </p>
                        <h3 className="mt-2 text-xl font-black text-stone-900">
                          Sacar mercaderia del stock
                        </h3>

                        <textarea
                          className="textarea-field mt-4"
                          placeholder="Motivo de la devolucion"
                          value={returnForm.motivo}
                          onChange={(event) =>
                            setReturnForm((prev) => ({
                              ...prev,
                              motivo: event.target.value,
                            }))
                          }
                        />

                        <div className="table-shell mt-4 overflow-x-auto">
                          <table className="table-base">
                            <thead>
                              <tr>
                                <th>Producto</th>
                                <th>Disponible</th>
                                <th>Cantidad</th>
                              </tr>
                            </thead>
                            <tbody>
                              {compraDetalle.detalles.map((detalle) => (
                                <tr key={`return-${detalle.id_compra_detalle}`}>
                                  <td>
                                    <div className="font-semibold text-stone-900">
                                      {detalle.producto_nombre}
                                    </div>
                                    <div className="mt-1 text-xs text-stone-500">
                                      {detalle.sku}
                                    </div>
                                  </td>
                                  <td>
                                    {Number(
                                      detalle.cantidad_disponible_reversion || 0
                                    ).toFixed(3)}
                                  </td>
                                  <td>
                                    <input
                                      className="field min-w-[140px]"
                                      type="number"
                                      min="0"
                                      max={Number(
                                        detalle.cantidad_disponible_reversion || 0
                                      )}
                                      step="0.001"
                                      value={
                                        returnForm.cantidades?.[
                                          detalle.id_compra_detalle
                                        ] || ""
                                      }
                                      onChange={(event) =>
                                        updateReturnQuantity(
                                          detalle.id_compra_detalle,
                                          event.target.value
                                        )
                                      }
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            className="btn-primary"
                            disabled={returnSaving || !canManagePurchases}
                            type="submit"
                          >
                            {returnSaving
                              ? "Registrando devolucion..."
                              : "Registrar devolucion"}
                          </button>
                          <button
                            className="btn-secondary"
                            type="button"
                            onClick={resetReturnForm}
                          >
                            Limpiar
                          </button>
                        </div>
                      </form>

                      {canAdjustPurchases ? (
                        <form
                          className="rounded-3xl border border-stone-200 bg-stone-50 p-5"
                          onSubmit={handleCostAdjustmentSubmit}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                            Ajuste de costo
                          </p>
                          <h3 className="mt-2 text-xl font-black text-stone-900">
                            Recalcular costo de compra
                          </h3>

                          <textarea
                            className="textarea-field mt-4"
                            placeholder="Motivo del ajuste"
                            value={costAdjustmentForm.motivo}
                            onChange={(event) =>
                              setCostAdjustmentForm((prev) => ({
                                ...prev,
                                motivo: event.target.value,
                              }))
                            }
                          />

                          <div className="table-shell mt-4 overflow-x-auto">
                            <table className="table-base">
                              <thead>
                                <tr>
                                  <th>Producto</th>
                                  <th>Costo actual</th>
                                  <th>Costo nuevo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {compraDetalle.detalles.map((detalle) => (
                                  <tr key={`cost-${detalle.id_compra_detalle}`}>
                                    <td>
                                      <div className="font-semibold text-stone-900">
                                        {detalle.producto_nombre}
                                      </div>
                                      <div className="mt-1 text-xs text-stone-500">
                                        {detalle.sku}
                                      </div>
                                    </td>
                                    <td>
                                      Q {Number(detalle.costo_unitario || 0).toFixed(2)}
                                    </td>
                                    <td>
                                      <input
                                        className="field min-w-[140px]"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                          costAdjustmentForm.costos?.[
                                            detalle.id_compra_detalle
                                          ] ?? String(
                                            Number(detalle.costo_unitario || 0).toFixed(2)
                                          )
                                        }
                                        onChange={(event) =>
                                          updateAdjustmentCost(
                                            detalle.id_compra_detalle,
                                            event.target.value
                                          )
                                        }
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              className="btn-primary"
                              disabled={adjustmentSaving}
                              type="submit"
                            >
                              {adjustmentSaving
                                ? "Aplicando ajustes..."
                                : "Aplicar ajuste"}
                            </button>
                            <button
                              className="btn-secondary"
                              type="button"
                              onClick={resetCostAdjustmentForm}
                            >
                              Limpiar
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </div>

                    <div className="rounded-3xl border border-stone-200 bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                        Devoluciones registradas
                      </p>
                      {compraDetalle.devoluciones?.length ? (
                        <div className="mt-4 space-y-4">
                          {compraDetalle.devoluciones.map((devolucion) => (
                            <article
                              key={devolucion.id_compra_reversion}
                              className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-stone-900">
                                    {devolucion.numero_documento}
                                  </p>
                                  <p className="mt-1 text-xs text-stone-500">
                                    {devolucion.tipo_reversion}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-black text-stone-900">
                                    Q {Number(devolucion.total || 0).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-stone-500">
                                    {new Date(devolucion.created_at).toLocaleString("es-GT")}
                                  </p>
                                </div>
                              </div>
                              <p className="mt-3 text-sm text-stone-600">
                                {devolucion.motivo}
                              </p>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-stone-500">
                          Esta compra aun no tiene devoluciones al proveedor.
                        </p>
                      )}
                    </div>

                    <div className="rounded-3xl border border-stone-200 bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                        Ajustes de costo
                      </p>
                      {compraDetalle.ajustes_costo?.length ? (
                        <div className="mt-4 space-y-4">
                          {compraDetalle.ajustes_costo.map((ajuste) => (
                            <article
                              key={ajuste.id_compra_ajuste_costo}
                              className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-stone-900">
                                    {ajuste.producto_nombre}
                                  </p>
                                  <p className="mt-1 text-xs text-stone-500">
                                    {ajuste.sku}
                                  </p>
                                </div>
                                <div className="text-right text-sm text-stone-600">
                                  <div>
                                    Q {Number(ajuste.costo_unitario_anterior || 0).toFixed(2)}{" "}
                                    a Q {Number(ajuste.costo_unitario_nuevo || 0).toFixed(2)}
                                  </div>
                                  <div className="mt-1 font-semibold text-stone-900">
                                    Dif. total: Q {Number(ajuste.diferencia_total || 0).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              <p className="mt-3 text-sm text-stone-600">
                                {ajuste.motivo}
                              </p>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-stone-500">
                          Esta compra aun no tiene ajustes de costo.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-stone-500">
                    Selecciona una compra del historial para ver su detalle.
                  </p>
                )}
              </article>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="panel p-6">
            <SucursalSwitcher />
          </div>

          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Compra destino
            </p>
            <p className="mt-3 text-lg font-bold text-stone-900">
              {selectedBranch?.codigo} - {selectedBranch?.nombre}
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              Esta compra impacta el stock de la sucursal seleccionada, aunque tu
              sesion siga activa en otra sucursal de la misma empresa.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default ComprasPage;
