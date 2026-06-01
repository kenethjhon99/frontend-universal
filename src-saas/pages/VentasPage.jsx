import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SucursalSwitcher from "../components/SucursalSwitcher";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { hasPermission, hasRole } from "../lib/access";
import { getCajaSesionActiva } from "../services/cajaService";
import { getClientes } from "../services/clientesService";
import { getProductos } from "../services/productosService";
import {
  createVenta,
  createVentaReversion,
  getVentaById,
  getVentas,
} from "../services/ventasService";
import { getTiposByModulo } from "../services/comprobantesService";
import { enqueueSale, isNetworkError } from "../lib/offline-queue";
import { isOnline } from "../lib/pwa";
import useBarcodeScanner from "../hooks/useBarcodeScanner";
import { printVentaTicket } from "../lib/ticket-printer";

const createSaleForm = () => ({
  id_cliente: "",
  tipo_comprobante: "TICKET",
  tipo_venta: "CONTADO",
  metodo_pago: "EFECTIVO",
  monto_recibido: "",
  observaciones: "",
  // NO_COBRADO con admin auth
  no_cobrar: false,
  no_cobrado_motivo: "",
  admin_username: "",
  admin_password: "",
});

const createSaleReversionForm = () => ({
  tipo_reversion: "DEVOLUCION",
  metodo_resolucion: "AJUSTE",
  reintegrar_stock: true,
  motivo: "",
  cantidades: {},
});

const normalizeError = (error, fallback) =>
  error.response?.data?.error || fallback;

const getSaleReversionBadgeClasses = (status) => {
  const normalized = String(status || "").trim().toUpperCase();

  if (normalized === "TOTAL") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (normalized === "PARCIAL") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};

function VentasPage() {
  const { session } = useAppSession();
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [selectedVentaId, setSelectedVentaId] = useState(null);
  const [cashData, setCashData] = useState(null);
  const [saleForm, setSaleForm] = useState(createSaleForm);
  const [items, setItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reversionForm, setReversionForm] = useState(createSaleReversionForm);
  const [reversionSaving, setReversionSaving] = useState(false);
  const [tiposComprobante, setTiposComprobante] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getTiposByModulo("VENTA")
      .then((tipos) => {
        if (!cancelled) {
          setTiposComprobante(tipos || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTiposComprobante([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeBranchId = session?.sucursal_activa?.id_sucursal;
  const canManageSales = hasRole(
    session,
    "SUPER_ADMIN",
    "ADMIN_EMPRESA",
    "ENCARGADO_SUCURSAL",
    "CAJERO"
  );
  const canRefundSales = hasPermission(session, "sales.refund");

  const loadPage = async () => {
    if (!activeBranchId) {
      setProductos([]);
      setVentas([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [cashSession, productRows, customerRows, saleRows] = await Promise.all([
        getCajaSesionActiva({ branchId: activeBranchId }),
        getProductos({ activo: "true" }, { branchId: activeBranchId }),
        getClientes({ incluir_inactivos: "false" }),
        getVentas(
          {
            limit: 18,
            search: historySearch || undefined,
          },
          { branchId: activeBranchId }
        ),
      ]);

      setCashData(cashSession);
      setProductos(productRows);
      setClientes(customerRows);
      setVentas(saleRows);
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo cargar el modulo POS"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedVentaId(null);
    setVentaDetalle(null);
    resetReversionForm();
    loadPage();
  }, [activeBranchId, historySearch]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedVentaId || !activeBranchId) {
        setVentaDetalle(null);
        return;
      }

      try {
        setLoadingDetail(true);
        const data = await getVentaById(selectedVentaId, {
          branchId: activeBranchId,
        });
        setVentaDetalle(data);
        setReversionForm((prev) => ({
          ...createSaleReversionForm(),
          tipo_reversion: prev.tipo_reversion,
        }));
      } catch (requestError) {
        setError(
          normalizeError(requestError, "No se pudo cargar el detalle de la venta")
        );
      } finally {
        setLoadingDetail(false);
      }
    };

    loadDetail();
  }, [selectedVentaId, activeBranchId]);

  const filteredProducts = useMemo(() => {
    const search = String(productSearch || "").trim().toLowerCase();

    if (!search) {
      return productos;
    }

    return productos.filter((producto) =>
      [producto.nombre, producto.sku, producto.codigo_barras].some((value) =>
        String(value || "").toLowerCase().includes(search)
      )
    );
  }, [productos, productSearch]);

  const summary = useMemo(
    () => ({
      items: items.length,
      unidades: items.reduce((acc, item) => acc + Number(item.cantidad || 0), 0),
      total: items.reduce(
        (acc, item) =>
          acc + Number(item.cantidad || 0) * Number(item.precio_unitario || 0),
        0
      ),
    }),
    [items]
  );

  const activeCashSession = cashData?.sesion || null;
  const activeCashSummary = cashData?.resumen || null;

  const addProduct = (producto) => {
    const stockActual = Number(producto.stock_actual || 0);

    if (stockActual <= 0) {
      return;
    }

    setItems((prev) => {
      const existing = prev.find(
        (item) => Number(item.id_producto) === Number(producto.id_producto)
      );

      if (existing) {
        const nextCantidad = Number(existing.cantidad || 0) + 1;
        if (nextCantidad > stockActual) {
          return prev;
        }

        return prev.map((item) =>
          Number(item.id_producto) === Number(producto.id_producto)
            ? { ...item, cantidad: nextCantidad }
            : item
        );
      }

      return [
        ...prev,
        {
          id_producto: producto.id_producto,
          nombre: producto.nombre,
          sku: producto.sku,
          stock_actual: stockActual,
          cantidad: 1,
          precio_unitario: Number(producto.precio_venta || 0),
        },
      ];
    });
  };

  // ----- Lectura de codigo de barras (escaner USB) -----
  // Si el escaner emite un EAN-13 / UPC / SKU, busca el producto y lo agrega
  // automaticamente. Si no encuentra match, muestra mensaje breve.
  useBarcodeScanner((codigo) => {
    const found = productos.find(
      (p) =>
        String(p.codigo_barras || "") === codigo ||
        String(p.sku || "").toLowerCase() === codigo.toLowerCase()
    );
    if (found) {
      addProduct(found);
      setSuccess(`Agregado: ${found.nombre}`);
      setTimeout(() => setSuccess(""), 1500);
    } else {
      setError(`Producto no encontrado para codigo: ${codigo}`);
      setTimeout(() => setError(""), 2500);
    }
  });

  const updateItem = (idProducto, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (Number(item.id_producto) !== Number(idProducto)) {
          return item;
        }

        const requestedCantidad = Math.max(1, Number(value || 0));
        return {
          ...item,
          cantidad: Math.min(requestedCantidad, Number(item.stock_actual || 0)),
        };
      })
    );
  };

  const removeItem = (idProducto) => {
    setItems((prev) =>
      prev.filter((item) => Number(item.id_producto) !== Number(idProducto))
    );
  };

  const resetForm = () => {
    setSaleForm(createSaleForm());
    setItems([]);
    setError("");
  };

  const resetReversionForm = () => {
    setReversionForm(createSaleReversionForm());
  };

  const updateReversionQuantity = (idVentaDetalle, value) => {
    setReversionForm((prev) => ({
      ...prev,
      cantidades: {
        ...prev.cantidades,
        [idVentaDetalle]: value,
      },
    }));
  };

  const fillAllReversionQuantities = () => {
    setReversionForm((prev) => ({
      ...prev,
      cantidades: (ventaDetalle?.detalles || []).reduce((acc, detalle) => {
        const disponible = Number(detalle.cantidad_disponible_reversion || 0);
        if (disponible > 0) {
          acc[detalle.id_venta_detalle] = disponible;
        }
        return acc;
      }, {}),
    }));
  };

  const reversionEstimate = useMemo(() => {
    if (!ventaDetalle?.detalles?.length) {
      return { items: 0, monto: 0 };
    }

    return ventaDetalle.detalles.reduce(
      (acc, detalle) => {
        const cantidad = Number(
          reversionForm.cantidades?.[detalle.id_venta_detalle] || 0
        );
        if (cantidad <= 0) return acc;
        const subtotal = cantidad * Number(detalle.precio_unitario || 0);
        return {
          items: acc.items + 1,
          monto: acc.monto + subtotal,
        };
      },
      { items: 0, monto: 0 }
    );
  }, [ventaDetalle?.detalles, reversionForm.cantidades]);

  const handleTipoVentaChange = (value) => {
    setSaleForm((prev) => ({
      ...prev,
      tipo_venta: value,
      metodo_pago: value === "CREDITO" ? "CREDITO" : prev.metodo_pago === "CREDITO" ? "EFECTIVO" : prev.metodo_pago,
      monto_recibido: value === "CREDITO" ? "" : prev.monto_recibido,
    }));
  };

  const handleReversionTypeChange = (value) => {
    setReversionForm((prev) => ({
      ...prev,
      tipo_reversion: value,
      metodo_resolucion:
        value === "NOTA_CREDITO" ? "NOTA_CREDITO" : prev.metodo_resolucion,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!activeBranchId) {
      setError("No hay una sucursal activa seleccionada");
      return;
    }

    if (!activeCashSession?.id_caja_sesion) {
      setError("Debes abrir una caja antes de registrar ventas");
      return;
    }

    if (items.length === 0) {
      setError("Agrega al menos un producto a la venta");
      return;
    }

    const payload = {
      id_cliente: saleForm.id_cliente ? Number(saleForm.id_cliente) : null,
      tipo_comprobante: saleForm.tipo_comprobante,
      tipo_venta: saleForm.tipo_venta,
      metodo_pago:
        saleForm.tipo_venta === "CREDITO"
          ? "CREDITO"
          : saleForm.metodo_pago,
      monto_recibido:
        saleForm.no_cobrar ||
        saleForm.tipo_venta === "CREDITO" ||
        saleForm.metodo_pago !== "EFECTIVO"
          ? null
          : saleForm.monto_recibido || null,
      observaciones: saleForm.observaciones || null,
      no_cobrar: saleForm.no_cobrar || undefined,
      no_cobrado_motivo: saleForm.no_cobrar
        ? saleForm.no_cobrado_motivo || null
        : undefined,
      admin_username: saleForm.no_cobrar
        ? saleForm.admin_username || undefined
        : undefined,
      admin_password: saleForm.no_cobrar
        ? saleForm.admin_password || undefined
        : undefined,
      items: items.map((item) => ({
        id_producto: item.id_producto,
        cantidad: Number(item.cantidad || 0),
      })),
      __branchId: activeBranchId,
    };

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Si estamos offline y la venta es CONTADO/EFECTIVO, encolar para
      // sincronizar despues. Las ventas a credito o NO_COBRADO requieren
      // backend al instante (CXC y validacion admin).
      if (
        !isOnline() &&
        saleForm.tipo_venta === "CONTADO" &&
        saleForm.metodo_pago === "EFECTIVO" &&
        !saleForm.no_cobrar
      ) {
        await enqueueSale(payload);
        setSuccess(
          "Venta encolada offline. Se sincronizara cuando vuelva la conexion."
        );
        resetForm();
        return;
      }

      const venta = await createVenta(payload, { branchId: activeBranchId });

      setSuccess("Venta registrada correctamente.");
      resetForm();
      await loadPage();
      if (venta?.venta?.id_venta) {
        setSelectedVentaId(venta.venta.id_venta);
      }
    } catch (requestError) {
      // Si fallo por red y la venta es elegible, encolar
      if (
        isNetworkError(requestError) &&
        saleForm.tipo_venta === "CONTADO" &&
        saleForm.metodo_pago === "EFECTIVO" &&
        !saleForm.no_cobrar
      ) {
        try {
          await enqueueSale(payload);
          setSuccess(
            "Venta encolada offline. Se sincronizara cuando vuelva la conexion."
          );
          resetForm();
          return;
        } catch {
          /* noop, cae al setError */
        }
      }

      setError(normalizeError(requestError, "No se pudo registrar la venta"));
    } finally {
      setSaving(false);
    }
  };

  const handleReversionSubmit = async (event) => {
    event.preventDefault();

    if (!selectedVentaId || !ventaDetalle?.venta) {
      setError("Selecciona una venta antes de registrar una reversion");
      return;
    }

    const reversalItems = (ventaDetalle.detalles || [])
      .map((detalle) => ({
        id_venta_detalle: detalle.id_venta_detalle,
        cantidad: Number(reversionForm.cantidades?.[detalle.id_venta_detalle] || 0),
      }))
      .filter((detalle) => detalle.cantidad > 0);

    if (reversalItems.length === 0) {
      setError("Indica al menos una cantidad a devolver o acreditar");
      return;
    }

    try {
      setReversionSaving(true);
      setError("");
      setSuccess("");

      const data = await createVentaReversion(
        selectedVentaId,
        {
          tipo_reversion: reversionForm.tipo_reversion,
          metodo_resolucion:
            reversionForm.tipo_reversion === "NOTA_CREDITO"
              ? "NOTA_CREDITO"
              : reversionForm.metodo_resolucion,
          reintegrar_stock:
            reversionForm.tipo_reversion === "NOTA_CREDITO"
              ? false
              : reversionForm.reintegrar_stock,
          motivo: reversionForm.motivo || null,
          items: reversalItems,
        },
        { branchId: activeBranchId }
      );

      setVentaDetalle(data);
      await loadPage();
      resetReversionForm();
      setSuccess("Reversion registrada correctamente.");
    } catch (requestError) {
      setError(
        normalizeError(requestError, "No se pudo registrar la reversion")
      );
    } finally {
      setReversionSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <WorkspaceHero
        eyebrow="POS"
        title="Ventas ligadas a caja por sucursal"
        description="Cada venta queda unida a la empresa, la sucursal, el usuario y la caja activa, con salida automatica de inventario y comprobante correlativo."
        actions={
          <Link className="btn-secondary" to="/operacion/caja">
            Ir a caja
          </Link>
        }
      />

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px]">
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
          {!activeCashSession ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
              No hay caja abierta en la sucursal activa. Abre caja antes de vender.
            </div>
          ) : null}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Productos
              </p>
              <p className="mt-3 text-2xl font-black text-stone-900">
                {summary.items}
              </p>
            </article>
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Unidades
              </p>
              <p className="mt-3 text-2xl font-black text-stone-900">
                {summary.unidades}
              </p>
            </article>
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Total
              </p>
              <p className="mt-3 text-2xl font-black text-stone-900">
                Q {summary.total.toFixed(2)}
              </p>
            </article>
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Efectivo sistema
              </p>
              <p className="mt-3 text-2xl font-black text-stone-900">
                Q {Number(activeCashSummary?.cierre_calculado || 0).toFixed(2)}
              </p>
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="panel p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                    Nueva venta
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-stone-900">
                    Punto de venta
                  </h2>
                </div>
                <input
                  className="field lg:max-w-xs"
                  placeholder="Buscar producto para agregar"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                />
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    className="field"
                    value={saleForm.id_cliente}
                    onChange={(event) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        id_cliente: event.target.value,
                      }))
                    }
                  >
                    <option value="">Consumidor final</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id_cliente} value={cliente.id_cliente}>
                        {cliente.nombre}
                      </option>
                    ))}
                  </select>
                  <select
                    className="field"
                    value={saleForm.tipo_comprobante}
                    onChange={(event) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        tipo_comprobante: event.target.value,
                      }))
                    }
                  >
                    {(tiposComprobante.length > 0
                      ? tiposComprobante
                      : [
                          { tipo_comprobante: "TICKET", nombre_default: "Ticket POS" },
                          { tipo_comprobante: "FACTURA", nombre_default: "Factura" },
                          { tipo_comprobante: "CCF", nombre_default: "Credito fiscal" },
                        ]
                    ).map((tipo) => (
                      <option
                        key={tipo.tipo_comprobante}
                        value={tipo.tipo_comprobante}
                      >
                        {tipo.nombre_default || tipo.tipo_comprobante}
                      </option>
                    ))}
                  </select>
                  <select
                    className="field"
                    value={saleForm.tipo_venta}
                    onChange={(event) => handleTipoVentaChange(event.target.value)}
                  >
                    <option value="CONTADO">Contado</option>
                    <option value="CREDITO">Credito</option>
                  </select>
                  <select
                    className="field"
                    value={saleForm.metodo_pago}
                    onChange={(event) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        metodo_pago: event.target.value,
                      }))
                    }
                    disabled={saleForm.tipo_venta === "CREDITO"}
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    {saleForm.tipo_venta === "CREDITO" ? (
                      <option value="CREDITO">Credito</option>
                    ) : null}
                  </select>
                  <input
                    className="field"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Monto recibido"
                    value={saleForm.monto_recibido}
                    onChange={(event) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        monto_recibido: event.target.value,
                      }))
                    }
                    disabled={
                      saleForm.tipo_venta === "CREDITO" ||
                      saleForm.metodo_pago !== "EFECTIVO"
                    }
                  />
                  <div className="flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                    Caja:{" "}
                    {activeCashSession
                      ? `#${activeCashSession.id_caja_sesion} abierta`
                      : "pendiente de apertura"}
                  </div>
                </div>

                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                  <label className="flex items-center gap-3 text-sm font-semibold text-stone-700">
                    <input
                      type="checkbox"
                      checked={saleForm.no_cobrar}
                      onChange={(event) =>
                        setSaleForm((prev) => ({
                          ...prev,
                          no_cobrar: event.target.checked,
                        }))
                      }
                    />
                    Marcar como NO COBRADO (cliente se va sin pagar - requiere admin)
                  </label>
                  {saleForm.no_cobrar ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input
                        className="field md:col-span-2"
                        placeholder="Motivo del no cobro"
                        value={saleForm.no_cobrado_motivo}
                        onChange={(event) =>
                          setSaleForm((prev) => ({
                            ...prev,
                            no_cobrado_motivo: event.target.value,
                          }))
                        }
                        required
                      />
                      <input
                        className="field"
                        placeholder="Usuario admin"
                        value={saleForm.admin_username}
                        onChange={(event) =>
                          setSaleForm((prev) => ({
                            ...prev,
                            admin_username: event.target.value,
                          }))
                        }
                        autoComplete="off"
                      />
                      <input
                        className="field"
                        type="password"
                        placeholder="Password admin"
                        value={saleForm.admin_password}
                        onChange={(event) =>
                          setSaleForm((prev) => ({
                            ...prev,
                            admin_password: event.target.value,
                          }))
                        }
                        autoComplete="new-password"
                      />
                      <p className="text-xs text-stone-500 md:col-span-2">
                        La venta queda pendiente y debe validarse desde Caja antes de cerrar el turno.
                      </p>
                    </div>
                  ) : null}
                </div>

                <textarea
                  className="textarea-field"
                  placeholder="Observaciones de la venta"
                  value={saleForm.observaciones}
                  onChange={(event) =>
                    setSaleForm((prev) => ({
                      ...prev,
                      observaciones: event.target.value,
                    }))
                  }
                />

                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-bold text-stone-900">
                    Productos disponibles en la sucursal activa
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {filteredProducts.slice(0, 10).map((producto) => (
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
                          Stock disponible: {Number(producto.stock_actual || 0)}
                        </div>
                      </button>
                    ))}
                    {filteredProducts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-6 text-sm text-stone-500">
                        No hay productos disponibles para vender en esta sucursal.
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
                        <th>Precio</th>
                        <th>Subtotal</th>
                        <th>Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            Agrega productos para completar la venta.
                          </td>
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
                                  updateItem(item.id_producto, event.target.value)
                                }
                              />
                            </td>
                            <td>Q {Number(item.precio_unitario || 0).toFixed(2)}</td>
                            <td>
                              Q{" "}
                              {(
                                Number(item.cantidad || 0) *
                                Number(item.precio_unitario || 0)
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
                    disabled={saving || !canManageSales || !activeCashSession}
                    type="submit"
                  >
                    {saving ? "Registrando venta..." : "Registrar venta"}
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={resetForm}
                  >
                    Limpiar
                  </button>
                  <Link className="btn-secondary" to="/operacion/catalogos">
                    Clientes y productos
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
                      Ventas recientes
                    </h2>
                  </div>
                  <input
                    className="field lg:max-w-xs"
                    placeholder="Buscar por comprobante o cliente"
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                  />
                </div>

                <div className="table-shell mt-6 overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Comprobante</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={4}>Cargando ventas...</td>
                        </tr>
                      ) : ventas.length === 0 ? (
                        <tr>
                          <td colSpan={4}>No hay ventas registradas.</td>
                        </tr>
                      ) : (
                        ventas.map((venta) => (
                          <tr
                            key={venta.id_venta}
                            className={
                              Number(venta.id_venta) === Number(selectedVentaId)
                                ? "bg-brand-50"
                                : ""
                            }
                          >
                            <td>
                              <button
                                className="text-left"
                                type="button"
                                onClick={() => setSelectedVentaId(venta.id_venta)}
                              >
                                <div className="font-semibold text-stone-900">
                                  {venta.numero_comprobante}
                                </div>
                                <div className="mt-1 text-xs text-stone-500">
                                  {venta.metodo_pago} | {venta.tipo_venta}
                                </div>
                                <div
                                  className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${getSaleReversionBadgeClasses(
                                    venta.estado_reversion
                                  )}`}
                                >
                                  {venta.estado_reversion.replaceAll("_", " ")}
                                </div>
                              </button>
                            </td>
                            <td>{venta.cliente_nombre || "Consumidor final"}</td>
                            <td>
                              <div className="font-semibold text-stone-900">
                                Q {Number(venta.total_neto ?? venta.total ?? 0).toFixed(2)}
                              </div>
                              {Number(venta.monto_revertido || 0) > 0 ? (
                                <div className="mt-1 text-xs text-stone-500">
                                  Revertido: Q {Number(venta.monto_revertido || 0).toFixed(2)}
                                </div>
                              ) : null}
                            </td>
                            <td>
                              {new Date(venta.fecha_venta).toLocaleString("es-GT")}
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
                  Detalle de venta
                </p>
                {loadingDetail ? (
                  <p className="mt-4 text-sm text-stone-500">Cargando detalle...</p>
                ) : ventaDetalle ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-black text-stone-900">
                          {ventaDetalle.venta.numero_comprobante}
                        </h2>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSaleReversionBadgeClasses(
                            ventaDetalle.venta.estado_reversion
                          )}`}
                        >
                          {ventaDetalle.venta.estado_reversion.replaceAll("_", " ")}
                        </span>
                        <button
                          className="btn-secondary"
                          type="button"
                          onClick={() =>
                            printVentaTicket(ventaDetalle, {
                              empresa: session?.empresa,
                              sucursal: session?.sucursal_activa,
                            }).catch((err) =>
                              setError(err?.message || "No se pudo imprimir el ticket")
                            )
                          }
                        >
                          Imprimir ticket
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-stone-500">
                        {ventaDetalle.venta.cliente_nombre || "Consumidor final"} |{" "}
                        {new Date(ventaDetalle.venta.fecha_venta).toLocaleString(
                          "es-GT"
                        )}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                          Total original
                        </p>
                        <p className="mt-2 text-xl font-black text-stone-900">
                          Q {Number(ventaDetalle.venta.total || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                          Total revertido
                        </p>
                        <p className="mt-2 text-xl font-black text-stone-900">
                          Q {Number(ventaDetalle.venta.monto_revertido || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                          Total neto
                        </p>
                        <p className="mt-2 text-xl font-black text-stone-900">
                          Q {Number(ventaDetalle.venta.total_neto || 0).toFixed(2)}
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
                            <th>Precio</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ventaDetalle.detalles.map((detalle) => (
                            <tr key={detalle.id_venta_detalle}>
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
                                Q {Number(detalle.precio_unitario || 0).toFixed(2)}
                              </td>
                              <td>Q {Number(detalle.subtotal || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {canRefundSales ? (
                      <form
                        className="rounded-3xl border border-stone-200 bg-stone-50 p-5"
                        onSubmit={handleReversionSubmit}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                              Reversion
                            </p>
                            <h3 className="mt-2 text-xl font-black text-stone-900">
                              Devolucion o nota de credito
                            </h3>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <select
                              className="field"
                              value={reversionForm.tipo_reversion}
                              onChange={(event) =>
                                handleReversionTypeChange(event.target.value)
                              }
                            >
                              <option value="DEVOLUCION">Devolucion</option>
                              <option value="NOTA_CREDITO">Nota de credito</option>
                            </select>
                            <select
                              className="field"
                              value={
                                reversionForm.tipo_reversion === "NOTA_CREDITO"
                                  ? "NOTA_CREDITO"
                                  : reversionForm.metodo_resolucion
                              }
                              onChange={(event) =>
                                setReversionForm((prev) => ({
                                  ...prev,
                                  metodo_resolucion: event.target.value,
                                }))
                              }
                              disabled={reversionForm.tipo_reversion === "NOTA_CREDITO"}
                            >
                              <option value="AJUSTE">Ajuste interno</option>
                              <option value="EFECTIVO">Devolver efectivo</option>
                              <option value="TARJETA">Reembolso tarjeta</option>
                              <option value="TRANSFERENCIA">Transferencia</option>
                              <option value="NOTA_CREDITO">Nota de credito</option>
                            </select>
                          </div>
                        </div>

                        <textarea
                          className="textarea-field mt-4"
                          placeholder="Motivo de la reversion"
                          value={reversionForm.motivo}
                          onChange={(event) =>
                            setReversionForm((prev) => ({
                              ...prev,
                              motivo: event.target.value,
                            }))
                          }
                        />

                        <label className="mt-4 flex items-center gap-3 text-sm text-stone-600">
                          <input
                            checked={
                              reversionForm.tipo_reversion === "NOTA_CREDITO"
                                ? false
                                : reversionForm.reintegrar_stock
                            }
                            disabled={reversionForm.tipo_reversion === "NOTA_CREDITO"}
                            type="checkbox"
                            onChange={(event) =>
                              setReversionForm((prev) => ({
                                ...prev,
                                reintegrar_stock: event.target.checked,
                              }))
                            }
                          />
                          Reintegrar stock a la sucursal activa
                        </label>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
                          <div className="text-sm">
                            <span className="font-semibold text-stone-900">
                              Estimado: Q {reversionEstimate.monto.toFixed(2)}
                            </span>
                            <span className="ml-2 text-xs text-stone-500">
                              ({reversionEstimate.items}{" "}
                              {reversionEstimate.items === 1 ? "linea" : "lineas"})
                            </span>
                          </div>
                          <button
                            className="btn-secondary"
                            type="button"
                            onClick={fillAllReversionQuantities}
                            disabled={
                              !ventaDetalle.detalles.some(
                                (d) =>
                                  Number(d.cantidad_disponible_reversion || 0) > 0
                              )
                            }
                          >
                            Revertir todo lo disponible
                          </button>
                        </div>

                        <div className="table-shell mt-4 overflow-x-auto">
                          <table className="table-base">
                            <thead>
                              <tr>
                                <th>Producto</th>
                                <th>Disponible</th>
                                <th>Cantidad a revertir</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ventaDetalle.detalles.map((detalle) => (
                                <tr key={`reversion-${detalle.id_venta_detalle}`}>
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
                                        reversionForm.cantidades?.[
                                          detalle.id_venta_detalle
                                        ] || ""
                                      }
                                      onChange={(event) =>
                                        updateReversionQuantity(
                                          detalle.id_venta_detalle,
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
                            disabled={reversionSaving}
                            type="submit"
                          >
                            {reversionSaving
                              ? "Registrando reversion..."
                              : "Registrar reversion"}
                          </button>
                          <button
                            className="btn-secondary"
                            type="button"
                            onClick={resetReversionForm}
                          >
                            Limpiar
                          </button>
                        </div>
                      </form>
                    ) : null}

                    <div className="rounded-3xl border border-stone-200 bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                        Historial de reversiones
                      </p>
                      {ventaDetalle.reversiones?.length ? (
                        <div className="mt-4 space-y-4">
                          {ventaDetalle.reversiones.map((reversion) => (
                            <article
                              key={reversion.id_venta_reversion}
                              className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-stone-900">
                                    {reversion.numero_documento}
                                  </p>
                                  <p className="mt-1 text-xs text-stone-500">
                                    {reversion.tipo_reversion} | {reversion.metodo_resolucion}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-black text-stone-900">
                                    Q {Number(reversion.total || 0).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-stone-500">
                                    {new Date(reversion.created_at).toLocaleString("es-GT")}
                                  </p>
                                </div>
                              </div>
                              <p className="mt-3 text-sm text-stone-600">
                                {reversion.motivo}
                              </p>
                              <div className="mt-3 space-y-2 text-sm text-stone-600">
                                {reversion.detalles?.map((detalle) => (
                                  <div
                                    key={detalle.id_venta_reversion_detalle}
                                    className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3"
                                  >
                                    <span>
                                      {detalle.producto_nombre} ({detalle.sku})
                                    </span>
                                    <span>
                                      {Number(detalle.cantidad || 0).toFixed(3)} x Q{" "}
                                      {Number(detalle.precio_unitario || 0).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-stone-500">
                          Esta venta aun no tiene devoluciones ni notas de credito.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-stone-500">
                    Selecciona una venta del historial para ver su detalle.
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
              Caja activa
            </p>
            {activeCashSession ? (
              <div className="mt-4 space-y-3 text-sm text-stone-600">
                <div>
                  <p className="font-semibold text-stone-900">
                    Sesion #{activeCashSession.id_caja_sesion}
                  </p>
                  <p className="mt-1 text-stone-500">
                    Abierta el{" "}
                    {new Date(activeCashSession.fecha_apertura).toLocaleString(
                      "es-GT"
                    )}
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Apertura
                  </p>
                  <p className="mt-2 text-lg font-black text-stone-900">
                    Q {Number(activeCashSummary?.monto_apertura || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Ventas en efectivo
                  </p>
                  <p className="mt-2 text-lg font-black text-stone-900">
                    Q {Number(activeCashSummary?.total_efectivo || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-stone-500">
                Usa la pantalla de caja para abrir sesion antes de vender en esta
                sucursal.
              </p>
            )}
          </div>

          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Operacion
            </p>
            <p className="mt-3 text-lg font-bold text-stone-900">
              {session?.sucursal_activa?.codigo} - {session?.sucursal_activa?.nombre}
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              La venta siempre descuenta stock de la sucursal activa. Si quieres
              vender desde otra sucursal de la misma empresa, cambia primero la
              sucursal activa desde el switcher.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default VentasPage;
