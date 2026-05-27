import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SucursalSwitcher from "../components/SucursalSwitcher";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { hasAnyModule, hasPermission, hasRole } from "../lib/access";
import {
  formatCurrency,
  formatDateTime,
  formatInteger,
  normalizeApiError,
} from "../lib/reporting";
import { getClientes } from "../services/clientesService";
import { getProductos } from "../services/productosService";
import {
  addProductoOrdenServicio,
  cobrarOrdenServicio,
  createOrdenServicio,
  createServicioCatalogo,
  getOrdenServicioById,
  getOrdenesServicio,
  getServiciosCatalogo,
  updateOrdenServicioSeguimiento,
  updateServicioCatalogo,
} from "../services/serviciosService";
import { getSucursales } from "../services/sucursalesService";
import { getUsuarios } from "../services/usuariosService";
import { getTiposByModulo } from "../services/comprobantesService";
import QrCode from "../components/QrCode";

const SERVICE_MODULE_OPTIONS = ["SERVICIOS", "CARWASH"];

const createCatalogForm = (moduleCode) => ({
  id_servicio_catalogo: null,
  modulo: moduleCode || "SERVICIOS",
  codigo: "",
  nombre: "",
  descripcion: "",
  precio_base: "0",
  duracion_minutos: "",
  activo: true,
});

const createOrderForm = () => ({
  id_servicio_catalogo: "",
  id_cliente: "",
  id_usuario_asignado: "",
  nombre_contacto: "",
  telefono_contacto: "",
  placa: "",
  vehiculo_tipo: "",
  color: "",
  marca: "",
  modelo: "",
  anio: "",
  kilometraje: "",
  precio_servicio: "",
  estado: "RECIBIDO",
  observaciones: "",
});

const createTrackingForm = () => ({
  estado: "RECIBIDO",
  id_usuario_asignado: "",
  observaciones: "",
});

const createProductForm = () => ({
  id_producto: "",
  cantidad: "1",
  costo_unitario: "",
  precio_unitario: "",
  cobra_al_cliente: true,
  observacion: "",
});

const createChargeForm = () => ({
  metodo_pago: "EFECTIVO",
  monto_recibido: "",
  tipo_comprobante_fiscal: "",
});

const getModuleTitle = (moduleCode) =>
  moduleCode === "CARWASH" ? "Carwash" : "Servicios";

const getOrderStateBadge = (state) => {
  switch (String(state || "").toUpperCase()) {
    case "ENTREGADO":
      return "badge-success";
    case "ANULADA":
      return "badge-muted";
    case "LISTO":
      return "badge-success";
    case "EN_PROCESO":
      return "badge-warning";
    default:
      return "badge-muted";
  }
};

const getChargeStateBadge = (state) =>
  String(state || "").toUpperCase() === "COBRADO" ? "badge-success" : "badge-warning";

function StatCard({ label, value, helper }) {
  return (
    <article className="panel p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-stone-900">{value}</p>
      <p className="mt-3 text-sm leading-6 text-stone-500">{helper}</p>
    </article>
  );
}

function ServiciosPage() {
  const { session } = useAppSession();
  const enabledModules = useMemo(
    () =>
      (session?.modulos || []).filter((moduleCode) =>
        SERVICE_MODULE_OPTIONS.includes(String(moduleCode || "").trim().toUpperCase())
      ),
    [session]
  );
  const defaultModule = enabledModules[0] || "SERVICIOS";
  const activeSucursalId = session?.sucursal_activa?.id_sucursal;
  const [currentModule, setCurrentModule] = useState(defaultModule);
  const [selectedBranchId, setSelectedBranchId] = useState(
    session?.sucursal_activa?.id_sucursal || ""
  );
  const [sucursales, setSucursales] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [orderStateFilter, setOrderStateFilter] = useState("");
  const [chargeStateFilter, setChargeStateFilter] = useState("");
  const [catalogForm, setCatalogForm] = useState(() => createCatalogForm(defaultModule));
  const [orderForm, setOrderForm] = useState(createOrderForm);
  const [trackingForm, setTrackingForm] = useState(createTrackingForm);
  const [productForm, setProductForm] = useState(createProductForm);
  const [chargeForm, setChargeForm] = useState(createChargeForm);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [charging, setCharging] = useState(false);
  const [pageError, setPageError] = useState("");
  const [success, setSuccess] = useState("");
  const [tiposComprobanteFiscal, setTiposComprobanteFiscal] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getTiposByModulo("VENTA")
      .then((tipos) => {
        if (!cancelled) setTiposComprobanteFiscal(tipos || []);
      })
      .catch(() => {
        if (!cancelled) setTiposComprobanteFiscal([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveBranchId = Number(selectedBranchId || activeSucursalId || 0);
  const canManageCatalog = hasRole(
    session,
    "SUPER_ADMIN",
    "ADMIN_EMPRESA",
    "ENCARGADO_SUCURSAL"
  );
  const canOperateServices = hasPermission(session, "services.manage");
  const canManageTracking = hasRole(
    session,
    "SUPER_ADMIN",
    "ADMIN_EMPRESA",
    "ENCARGADO_SUCURSAL"
  );

  const loadPage = async () => {
    try {
      setLoading(true);
      setPageError("");

      const [branchRows, catalogRows, clientRows, userRows, productRows, orderRows] =
        await Promise.all([
          getSucursales(),
          getServiciosCatalogo(
            { modulo: currentModule, limit: 100 },
            { branchId: effectiveBranchId }
          ),
          getClientes({ incluir_inactivos: "false", limit: 200 }),
          effectiveBranchId && canManageTracking
            ? getUsuarios({
                activo: "true",
                id_sucursal: effectiveBranchId,
                limit: 100,
              })
            : Promise.resolve([]),
          effectiveBranchId
            ? getProductos({ activo: "true" }, { branchId: effectiveBranchId })
            : Promise.resolve([]),
          effectiveBranchId
            ? getOrdenesServicio(
                {
                  modulo: currentModule,
                  limit: 30,
                  search: orderSearch || undefined,
                  estado: orderStateFilter || undefined,
                  estado_cobro: chargeStateFilter || undefined,
                },
                { branchId: effectiveBranchId }
              )
            : Promise.resolve([]),
        ]);

      setSucursales(branchRows);
      setCatalogo(catalogRows);
      setClientes(clientRows);
      setUsuarios(userRows);
      setProductos(productRows);
      setOrdenes(orderRows);
    } catch (error) {
      setPageError(
        normalizeApiError(error, "No se pudo cargar el modulo de servicios")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSucursalId) {
      setSelectedBranchId(activeSucursalId);
    }
  }, [activeSucursalId]);

  useEffect(() => {
    if (!enabledModules.includes(currentModule)) {
      setCurrentModule(defaultModule);
    }
  }, [currentModule, defaultModule, enabledModules]);

  useEffect(() => {
    setCatalogForm(createCatalogForm(currentModule));
    setOrderForm(createOrderForm());
    setSelectedOrderId(null);
    setOrderDetail(null);
  }, [currentModule]);

  useEffect(() => {
    loadPage();
  }, [canManageTracking, effectiveBranchId, currentModule, orderSearch, orderStateFilter, chargeStateFilter]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedOrderId || !effectiveBranchId) {
        setOrderDetail(null);
        return;
      }

      try {
        setLoadingDetail(true);
        const data = await getOrdenServicioById(selectedOrderId, {
          branchId: effectiveBranchId,
        });
        setOrderDetail(data);
      } catch (error) {
        setPageError(
          normalizeApiError(
            error,
            "No se pudo cargar el detalle de la orden seleccionada"
          )
        );
      } finally {
        setLoadingDetail(false);
      }
    };

    loadDetail();
  }, [selectedOrderId, effectiveBranchId]);

  useEffect(() => {
    if (!orderDetail?.orden) {
      setTrackingForm(createTrackingForm());
      setProductForm(createProductForm());
      setChargeForm(createChargeForm());
      return;
    }

    setTrackingForm({
      estado: orderDetail.orden.estado || "RECIBIDO",
      id_usuario_asignado: orderDetail.orden.id_usuario_asignado || "",
      observaciones: orderDetail.orden.observaciones || "",
    });
    setProductForm(createProductForm());
    setChargeForm({
      metodo_pago: "EFECTIVO",
      monto_recibido: String(orderDetail.orden.total || 0),
    });
  }, [orderDetail]);

  const selectedBranch = useMemo(
    () =>
      sucursales.find(
        (sucursal) => Number(sucursal.id_sucursal) === Number(effectiveBranchId)
      ) || null,
    [sucursales, effectiveBranchId]
  );

  const visibleCatalog = useMemo(() => {
    const search = String(catalogSearch || "").trim().toLowerCase();

    if (!search) {
      return catalogo;
    }

    return catalogo.filter((item) =>
      [item.codigo, item.nombre, item.descripcion]
        .some((value) => String(value || "").toLowerCase().includes(search))
    );
  }, [catalogSearch, catalogo]);

  const availableServices = useMemo(
    () => catalogo.filter((item) => item.activo !== false),
    [catalogo]
  );

  const filteredProducts = useMemo(() => {
    const search = String(productSearch || "").trim().toLowerCase();

    if (!search) {
      return productos;
    }

    return productos.filter((item) =>
      [item.nombre, item.sku, item.codigo_barras]
        .some((value) => String(value || "").toLowerCase().includes(search))
    );
  }, [productos, productSearch]);

  const orderSummary = useMemo(
    () => ({
      total: ordenes.length,
      pendientes: ordenes.filter((item) => item.estado_cobro !== "COBRADO").length,
      enProceso: ordenes.filter((item) => item.estado === "EN_PROCESO").length,
      facturado: ordenes
        .filter((item) => item.estado_cobro === "COBRADO")
        .reduce((acc, item) => acc + Number(item.total || 0), 0),
    }),
    [ordenes]
  );

  const selectedCatalogItem = useMemo(
    () =>
      availableServices.find(
        (item) =>
          Number(item.id_servicio_catalogo) ===
          Number(orderForm.id_servicio_catalogo || 0)
      ) || null,
    [availableServices, orderForm.id_servicio_catalogo]
  );

  const assignableUsers = useMemo(
    () =>
      usuarios.filter((user) =>
        Array.isArray(user.roles)
          ? user.roles.some((role) =>
              ["ADMIN_EMPRESA", "ENCARGADO_SUCURSAL", "CAJERO"].includes(
                String(role.codigo || "").trim().toUpperCase()
              )
            )
          : false
      ),
    [usuarios]
  );

  const resetCatalogForm = () => setCatalogForm(createCatalogForm(currentModule));
  const resetOrderForm = () => setOrderForm(createOrderForm());

  const reloadCurrentDetail = async (orderId = selectedOrderId) => {
    if (!orderId || !effectiveBranchId) {
      return;
    }

    const data = await getOrdenServicioById(orderId, {
      branchId: effectiveBranchId,
    });
    setOrderDetail(data);
  };

  const handleCatalogSubmit = async (event) => {
    event.preventDefault();

    try {
      setCatalogSaving(true);
      setPageError("");
      setSuccess("");

      const payload = {
        modulo: currentModule,
        codigo: catalogForm.codigo,
        nombre: catalogForm.nombre,
        descripcion: catalogForm.descripcion || null,
        precio_base: Number(catalogForm.precio_base || 0),
        duracion_minutos:
          catalogForm.duracion_minutos === ""
            ? null
            : Number(catalogForm.duracion_minutos || 0),
        activo: catalogForm.activo,
      };

      if (catalogForm.id_servicio_catalogo) {
        await updateServicioCatalogo(catalogForm.id_servicio_catalogo, payload, {
          branchId: effectiveBranchId,
        });
        setSuccess("Servicio actualizado correctamente.");
      } else {
        await createServicioCatalogo(payload, { branchId: effectiveBranchId });
        setSuccess("Servicio creado correctamente.");
      }

      resetCatalogForm();
      await loadPage();
    } catch (error) {
      setPageError(
        normalizeApiError(error, "No se pudo guardar el servicio en catalogo")
      );
    } finally {
      setCatalogSaving(false);
    }
  };

  const handleOrderSubmit = async (event) => {
    event.preventDefault();

    if (!effectiveBranchId) {
      setPageError("Selecciona una sucursal para registrar la orden");
      return;
    }

    try {
      setOrderSaving(true);
      setPageError("");
      setSuccess("");

      const data = await createOrdenServicio(
        {
          id_servicio_catalogo: Number(orderForm.id_servicio_catalogo),
          id_cliente: orderForm.id_cliente ? Number(orderForm.id_cliente) : null,
          id_usuario_asignado: orderForm.id_usuario_asignado
            ? Number(orderForm.id_usuario_asignado)
            : null,
          nombre_contacto: orderForm.nombre_contacto || null,
          telefono_contacto: orderForm.telefono_contacto || null,
          placa: orderForm.placa || null,
          vehiculo_tipo: orderForm.vehiculo_tipo || null,
          color: orderForm.color || null,
          marca: orderForm.marca || null,
          modelo: orderForm.modelo || null,
          anio: orderForm.anio ? Number(orderForm.anio) : null,
          kilometraje: orderForm.kilometraje || null,
          precio_servicio:
            orderForm.precio_servicio === ""
              ? undefined
              : Number(orderForm.precio_servicio),
          estado: orderForm.estado,
          observaciones: orderForm.observaciones || null,
        },
        { branchId: effectiveBranchId }
      );

      setSuccess("Orden registrada correctamente.");
      resetOrderForm();
      await loadPage();
      if (data?.orden?.id_orden_servicio) {
        setSelectedOrderId(data.orden.id_orden_servicio);
      }
    } catch (error) {
      setPageError(
        normalizeApiError(error, "No se pudo registrar la orden de servicio")
      );
    } finally {
      setOrderSaving(false);
    }
  };

  const handleTrackingSubmit = async (event) => {
    event.preventDefault();

    if (!orderDetail?.orden?.id_orden_servicio) {
      return;
    }

    try {
      setTrackingSaving(true);
      setPageError("");
      setSuccess("");

      const data = await updateOrdenServicioSeguimiento(
        orderDetail.orden.id_orden_servicio,
        {
          estado: trackingForm.estado,
          id_usuario_asignado: trackingForm.id_usuario_asignado
            ? Number(trackingForm.id_usuario_asignado)
            : null,
          observaciones: trackingForm.observaciones || null,
        },
        { branchId: effectiveBranchId }
      );

      setSuccess("Seguimiento actualizado correctamente.");
      setOrderDetail(data);
      await loadPage();
    } catch (error) {
      setPageError(
        normalizeApiError(error, "No se pudo actualizar el seguimiento")
      );
    } finally {
      setTrackingSaving(false);
    }
  };

  const handleAddProduct = async (event) => {
    event.preventDefault();

    if (!orderDetail?.orden?.id_orden_servicio) {
      return;
    }

    try {
      setProductSaving(true);
      setPageError("");
      setSuccess("");

      const data = await addProductoOrdenServicio(
        orderDetail.orden.id_orden_servicio,
        {
          id_producto: Number(productForm.id_producto),
          cantidad: Number(productForm.cantidad || 0),
          costo_unitario:
            productForm.costo_unitario === ""
              ? undefined
              : Number(productForm.costo_unitario),
          precio_unitario:
            productForm.precio_unitario === ""
              ? undefined
              : Number(productForm.precio_unitario),
          cobra_al_cliente: productForm.cobra_al_cliente,
          observacion: productForm.observacion || null,
        },
        { branchId: effectiveBranchId }
      );

      setSuccess("Producto agregado a la orden.");
      setOrderDetail(data);
      setProductForm(createProductForm());
      await loadPage();
    } catch (error) {
      setPageError(
        normalizeApiError(error, "No se pudo agregar el producto a la orden")
      );
    } finally {
      setProductSaving(false);
    }
  };

  const handleChargeSubmit = async (event) => {
    event.preventDefault();

    if (!orderDetail?.orden?.id_orden_servicio) {
      return;
    }

    try {
      setCharging(true);
      setPageError("");
      setSuccess("");

      const data = await cobrarOrdenServicio(
        orderDetail.orden.id_orden_servicio,
        {
          metodo_pago: chargeForm.metodo_pago,
          monto_recibido:
            chargeForm.metodo_pago === "EFECTIVO" &&
            chargeForm.monto_recibido !== ""
              ? Number(chargeForm.monto_recibido)
              : undefined,
          tipo_comprobante_fiscal:
            chargeForm.tipo_comprobante_fiscal || undefined,
        },
        { branchId: effectiveBranchId }
      );

      setSuccess("Cobro registrado correctamente.");
      setOrderDetail(data);
      await loadPage();
    } catch (error) {
      setPageError(
        normalizeApiError(error, "No se pudo registrar el cobro de la orden")
      );
    } finally {
      setCharging(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow={getModuleTitle(currentModule)}
        title="Operacion de servicios y carwash"
        description="Este modulo nuevo trabaja sobre la base SaaS multi-empresa. El catalogo es por empresa, las ordenes se operan por sucursal y el cobro en efectivo se integra con caja."
        actions={
          <>
            <Link className="btn-secondary" to="/operacion/servicios/control">
              Centro de control
            </Link>
            {hasAnyModule(session, "INVENTARIO", "POS") ? (
              <Link className="btn-secondary" to="/operacion/inventario">
                Ver inventario
              </Link>
            ) : null}
            {hasAnyModule(session, "POS") ? (
              <Link className="btn-secondary" to="/operacion/caja">
                Ir a caja
              </Link>
            ) : null}
          </>
        }
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-6">
          {success ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}
          {pageError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {pageError}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              label="Catalogo"
              value={formatInteger(catalogo.length)}
              helper={`${getModuleTitle(currentModule)} disponibles para la empresa`}
            />
            <StatCard
              label="Ordenes"
              value={formatInteger(orderSummary.total)}
              helper="Lectura filtrada por sucursal seleccionada"
            />
            <StatCard
              label="Pendientes"
              value={formatInteger(orderSummary.pendientes)}
              helper="Ordenes aun no cobradas"
            />
            <StatCard
              label="Cobrado"
              value={formatCurrency(orderSummary.facturado)}
              helper="Total cobrado en el historial visible"
            />
          </div>

          <article className="panel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  Configuracion operativa
                </p>
                <h2 className="mt-3 text-2xl font-black text-stone-900">
                  Catalogo y apertura de orden
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {enabledModules.map((moduleCode) => (
                  <button
                    key={moduleCode}
                    className={
                      currentModule === moduleCode ? "chip chip-active" : "chip"
                    }
                    type="button"
                    onClick={() => setCurrentModule(moduleCode)}
                  >
                    {getModuleTitle(moduleCode)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="space-y-4 rounded-3xl border border-stone-200 bg-stone-50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-stone-900">
                      Catalogo {getModuleTitle(currentModule)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-500">
                      Los servicios viven una sola vez por empresa y luego se usan
                      en cualquier sucursal autorizada.
                    </p>
                  </div>
                  <input
                    className="field sm:max-w-[220px]"
                    placeholder="Buscar servicio"
                    value={catalogSearch}
                    onChange={(event) => setCatalogSearch(event.target.value)}
                  />
                </div>

                {canManageCatalog ? (
                  <form className="space-y-4" onSubmit={handleCatalogSubmit}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        className="field"
                        placeholder="Codigo"
                        required
                        value={catalogForm.codigo}
                        onChange={(event) =>
                          setCatalogForm((prev) => ({
                            ...prev,
                            codigo: event.target.value,
                          }))
                        }
                      />
                      <input
                        className="field"
                        placeholder="Nombre del servicio"
                        required
                        value={catalogForm.nombre}
                        onChange={(event) =>
                          setCatalogForm((prev) => ({
                            ...prev,
                            nombre: event.target.value,
                          }))
                        }
                      />
                      <input
                        className="field"
                        min="0"
                        step="0.01"
                        type="number"
                        placeholder="Precio base"
                        value={catalogForm.precio_base}
                        onChange={(event) =>
                          setCatalogForm((prev) => ({
                            ...prev,
                            precio_base: event.target.value,
                          }))
                        }
                      />
                      <input
                        className="field"
                        min="1"
                        step="1"
                        type="number"
                        placeholder="Duracion (min)"
                        value={catalogForm.duracion_minutos}
                        onChange={(event) =>
                          setCatalogForm((prev) => ({
                            ...prev,
                            duracion_minutos: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <textarea
                      className="textarea-field"
                      placeholder="Descripcion del servicio"
                      value={catalogForm.descripcion}
                      onChange={(event) =>
                        setCatalogForm((prev) => ({
                          ...prev,
                          descripcion: event.target.value,
                        }))
                      }
                    />
                    <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700">
                      <input
                        checked={catalogForm.activo}
                        type="checkbox"
                        onChange={(event) =>
                          setCatalogForm((prev) => ({
                            ...prev,
                            activo: event.target.checked,
                          }))
                        }
                      />
                      Servicio activo
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button className="btn-primary" disabled={catalogSaving} type="submit">
                        {catalogSaving
                          ? "Guardando..."
                          : catalogForm.id_servicio_catalogo
                            ? "Actualizar servicio"
                            : "Crear servicio"}
                      </button>
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={resetCatalogForm}
                      >
                        Limpiar
                      </button>
                    </div>
                  </form>
                ) : null}

                <div className="table-shell overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th>Precio</th>
                        <th>Estado</th>
                        {canManageCatalog ? <th>Accion</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={canManageCatalog ? 4 : 3}>Cargando catalogo...</td>
                        </tr>
                      ) : visibleCatalog.length === 0 ? (
                        <tr>
                          <td colSpan={canManageCatalog ? 4 : 3}>
                            No hay servicios para el filtro actual.
                          </td>
                        </tr>
                      ) : (
                        visibleCatalog.map((item) => (
                          <tr key={item.id_servicio_catalogo}>
                            <td>
                              <div className="font-semibold text-stone-900">
                                {item.nombre}
                              </div>
                              <div className="mt-1 text-xs text-stone-500">
                                {item.codigo}
                                {item.duracion_minutos
                                  ? ` | ${item.duracion_minutos} min`
                                  : ""}
                              </div>
                            </td>
                            <td>{formatCurrency(item.precio_base)}</td>
                            <td>
                              <span
                                className={item.activo ? "badge-success" : "badge-muted"}
                              >
                                {item.activo ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            {canManageCatalog ? (
                              <td>
                                <button
                                  className="chip"
                                  type="button"
                                  onClick={() =>
                                    setCatalogForm({
                                      id_servicio_catalogo: item.id_servicio_catalogo,
                                      modulo: item.modulo,
                                      codigo: item.codigo || "",
                                      nombre: item.nombre || "",
                                      descripcion: item.descripcion || "",
                                      precio_base: String(item.precio_base ?? 0),
                                      duracion_minutos: item.duracion_minutos || "",
                                      activo: item.activo !== false,
                                    })
                                  }
                                >
                                  Editar
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4 rounded-3xl border border-stone-200 bg-stone-50 p-5">
                <div>
                  <p className="text-sm font-bold text-stone-900">Nueva orden</p>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    La orden queda ligada a la sucursal seleccionada, con opcion
                    de cliente, vehiculo y responsable operativo.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleOrderSubmit}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      className="field"
                      required
                      value={orderForm.id_servicio_catalogo}
                      onChange={(event) => {
                        const serviceRow = availableServices.find(
                          (item) =>
                            Number(item.id_servicio_catalogo) ===
                            Number(event.target.value)
                        );
                        setOrderForm((prev) => ({
                          ...prev,
                          id_servicio_catalogo: event.target.value,
                          precio_servicio: serviceRow
                            ? String(serviceRow.precio_base ?? 0)
                            : "",
                        }));
                      }}
                    >
                      <option value="">Selecciona un servicio</option>
                      {availableServices.map((item) => (
                        <option
                          key={item.id_servicio_catalogo}
                          value={item.id_servicio_catalogo}
                        >
                          {item.codigo} - {item.nombre}
                        </option>
                      ))}
                    </select>
                    <select
                      className="field"
                      value={orderForm.id_cliente}
                      onChange={(event) =>
                        setOrderForm((prev) => ({
                          ...prev,
                          id_cliente: event.target.value,
                        }))
                      }
                    >
                      <option value="">Cliente opcional</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id_cliente} value={cliente.id_cliente}>
                          {cliente.nombre}
                        </option>
                      ))}
                    </select>
                    <input className="field" placeholder="Contacto" value={orderForm.nombre_contacto} onChange={(event) => setOrderForm((prev) => ({ ...prev, nombre_contacto: event.target.value }))} />
                    <input className="field" placeholder="Telefono contacto" value={orderForm.telefono_contacto} onChange={(event) => setOrderForm((prev) => ({ ...prev, telefono_contacto: event.target.value }))} />
                    <input className="field" placeholder="Placa" value={orderForm.placa} onChange={(event) => setOrderForm((prev) => ({ ...prev, placa: event.target.value }))} />
                    <input className="field" placeholder="Tipo vehiculo" value={orderForm.vehiculo_tipo} onChange={(event) => setOrderForm((prev) => ({ ...prev, vehiculo_tipo: event.target.value }))} />
                    <input className="field" placeholder="Marca" value={orderForm.marca} onChange={(event) => setOrderForm((prev) => ({ ...prev, marca: event.target.value }))} />
                    <input className="field" placeholder="Modelo" value={orderForm.modelo} onChange={(event) => setOrderForm((prev) => ({ ...prev, modelo: event.target.value }))} />
                    <input className="field" placeholder="Color" value={orderForm.color} onChange={(event) => setOrderForm((prev) => ({ ...prev, color: event.target.value }))} />
                    <input className="field" min="1900" step="1" type="number" placeholder="Anio" value={orderForm.anio} onChange={(event) => setOrderForm((prev) => ({ ...prev, anio: event.target.value }))} />
                    <input className="field" placeholder="Kilometraje" value={orderForm.kilometraje} onChange={(event) => setOrderForm((prev) => ({ ...prev, kilometraje: event.target.value }))} />
                    <input className="field" min="0" step="0.01" type="number" placeholder="Precio servicio" value={orderForm.precio_servicio} onChange={(event) => setOrderForm((prev) => ({ ...prev, precio_servicio: event.target.value }))} />
                    <select className="field" value={orderForm.estado} onChange={(event) => setOrderForm((prev) => ({ ...prev, estado: event.target.value }))}>
                      <option value="RECIBIDO">RECIBIDO</option>
                      <option value="EN_PROCESO">EN_PROCESO</option>
                      <option value="LISTO">LISTO</option>
                    </select>
                    <select className="field md:col-span-2" value={orderForm.id_usuario_asignado} onChange={(event) => setOrderForm((prev) => ({ ...prev, id_usuario_asignado: event.target.value }))}>
                      <option value="">Responsable opcional</option>
                      {assignableUsers.map((user) => (
                        <option key={user.id_usuario} value={user.id_usuario}>
                          {user.nombre} {user.apellido} ({user.username})
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    className="textarea-field"
                    placeholder="Observaciones iniciales"
                    value={orderForm.observaciones}
                    onChange={(event) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        observaciones: event.target.value,
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-3">
                    <button className="btn-primary" disabled={orderSaving || !canOperateServices} type="submit">
                      {orderSaving ? "Registrando..." : "Registrar orden"}
                    </button>
                    <button className="btn-secondary" type="button" onClick={resetOrderForm}>
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </article>

          <article className="panel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  Historial
                </p>
                <h2 className="mt-3 text-2xl font-black text-stone-900">
                  Ordenes recientes
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input className="field" placeholder="Buscar por orden, placa o cliente" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} />
                <select className="field" value={orderStateFilter} onChange={(event) => setOrderStateFilter(event.target.value)}>
                  <option value="">Todos los estados</option>
                  {["RECIBIDO", "EN_PROCESO", "LISTO", "ENTREGADO", "ANULADA"].map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                <select className="field" value={chargeStateFilter} onChange={(event) => setChargeStateFilter(event.target.value)}>
                  <option value="">Todo cobro</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="COBRADO">COBRADO</option>
                </select>
              </div>
            </div>

            <div className="table-shell mt-6 overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Servicio</th>
                    <th>Estado</th>
                    <th>Cobro</th>
                    <th>Total</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6}>Cargando ordenes...</td>
                    </tr>
                  ) : ordenes.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No hay ordenes para el filtro actual.</td>
                    </tr>
                  ) : (
                    ordenes.map((item) => (
                      <tr
                        key={item.id_orden_servicio}
                        className={
                          Number(item.id_orden_servicio) === Number(selectedOrderId)
                            ? "bg-brand-50"
                            : ""
                        }
                      >
                        <td>
                          <button
                            className="text-left"
                            type="button"
                            onClick={() => setSelectedOrderId(item.id_orden_servicio)}
                          >
                            <div className="font-semibold text-stone-900">
                              {item.numero_orden}
                            </div>
                            <div className="mt-1 text-xs text-stone-500">
                              {item.placa || item.nombre_contacto || "Sin referencia"}
                            </div>
                          </button>
                        </td>
                        <td>{item.servicio_nombre}</td>
                        <td>
                          <span className={getOrderStateBadge(item.estado)}>
                            {item.estado}
                          </span>
                        </td>
                        <td>
                          <span className={getChargeStateBadge(item.estado_cobro)}>
                            {item.estado_cobro}
                          </span>
                        </td>
                        <td>{formatCurrency(item.total)}</td>
                        <td>{formatDateTime(item.fecha_servicio)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <aside className="space-y-6">
          <div className="panel p-6">
            <SucursalSwitcher />
          </div>

          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Contexto activo
            </p>
            <dl className="mt-4 space-y-3 text-sm text-stone-600">
              <div>
                <dt className="font-semibold text-stone-900">Modulo</dt>
                <dd>{getModuleTitle(currentModule)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-stone-900">Sucursal</dt>
                <dd>{selectedBranch?.codigo} - {selectedBranch?.nombre}</dd>
              </div>
              <div>
                <dt className="font-semibold text-stone-900">Ordenes en proceso</dt>
                <dd>{formatInteger(orderSummary.enProceso)}</dd>
              </div>
            </dl>
          </div>

          <article className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Detalle operativo
            </p>
            {loadingDetail ? (
              <p className="mt-4 text-sm text-stone-500">Cargando detalle...</p>
            ) : orderDetail?.orden ? (
              <div className="mt-4 space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black text-stone-900">
                      {orderDetail.orden.numero_orden}
                    </h2>
                    <span className={getOrderStateBadge(orderDetail.orden.estado)}>
                      {orderDetail.orden.estado}
                    </span>
                    <span className={getChargeStateBadge(orderDetail.orden.estado_cobro)}>
                      {orderDetail.orden.estado_cobro}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-500">
                    {orderDetail.orden.servicio_nombre} |{" "}
                    {formatDateTime(orderDetail.orden.fecha_servicio)}
                  </p>
                </div>

                {orderDetail.orden.codigo_publico ? (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Seguimiento publico para el cliente
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <QrCode
                        value={`${window.location.origin}/saas.html#/publico/orden/${orderDetail.orden.codigo_publico}`}
                        size={140}
                        alt="QR seguimiento"
                      />
                      <div className="flex-1 min-w-[180px] text-xs text-emerald-900">
                        <p className="font-bold">Comparte este QR o link:</p>
                        <a
                          className="mt-2 block break-all underline"
                          href={`${window.location.origin}/saas.html#/publico/orden/${orderDetail.orden.codigo_publico}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {window.location.origin}/saas.html#/publico/orden/
                          {orderDetail.orden.codigo_publico}
                        </a>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                  <div>Cliente: {orderDetail.orden.cliente_nombre || orderDetail.orden.nombre_contacto || "Consumidor final"}</div>
                  <div className="mt-2">
                    Vehiculo: {orderDetail.orden.placa || "-"} | {orderDetail.orden.marca || "-"} {orderDetail.orden.modelo || ""}
                  </div>
                  <div className="mt-2">
                    Asignado: {orderDetail.orden.asignado_nombre || "Sin asignar"}
                  </div>
                  <div className="mt-3 text-base font-bold text-stone-900">
                    Total: {formatCurrency(orderDetail.orden.total)}
                  </div>
                </div>

                {canManageTracking ? (
                  <form className="space-y-3 rounded-3xl border border-stone-200 bg-stone-50 p-4" onSubmit={handleTrackingSubmit}>
                    <p className="text-sm font-bold text-stone-900">Seguimiento</p>
                    <select className="field" value={trackingForm.estado} onChange={(event) => setTrackingForm((prev) => ({ ...prev, estado: event.target.value }))}>
                      {["RECIBIDO", "EN_PROCESO", "LISTO", "ENTREGADO", "ANULADA"].map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    <select className="field" value={trackingForm.id_usuario_asignado} onChange={(event) => setTrackingForm((prev) => ({ ...prev, id_usuario_asignado: event.target.value }))}>
                      <option value="">Sin responsable</option>
                      {assignableUsers.map((user) => (
                        <option key={user.id_usuario} value={user.id_usuario}>
                          {user.nombre} {user.apellido} ({user.username})
                        </option>
                      ))}
                    </select>
                    <textarea className="textarea-field" placeholder="Observaciones" value={trackingForm.observaciones} onChange={(event) => setTrackingForm((prev) => ({ ...prev, observaciones: event.target.value }))} />
                    <button className="btn-secondary" disabled={trackingSaving} type="submit">
                      {trackingSaving ? "Actualizando..." : "Guardar seguimiento"}
                    </button>
                  </form>
                ) : null}
                <form className="space-y-3 rounded-3xl border border-stone-200 bg-stone-50 p-4" onSubmit={handleAddProduct}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-stone-900">Consumir producto</p>
                    </div>
                    <input className="field sm:max-w-[220px]" placeholder="Buscar producto" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
                  </div>
                  <select className="field" value={productForm.id_producto} onChange={(event) => setProductForm((prev) => ({ ...prev, id_producto: event.target.value }))}>
                    <option value="">Selecciona un producto</option>
                    {filteredProducts.slice(0, 50).map((product) => (
                      <option key={product.id_producto} value={product.id_producto}>
                        {product.nombre} | stock {formatInteger(product.stock_actual)}
                      </option>
                    ))}
                  </select>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className="field" min="0.001" step="0.001" type="number" placeholder="Cantidad" value={productForm.cantidad} onChange={(event) => setProductForm((prev) => ({ ...prev, cantidad: event.target.value }))} />
                    <input className="field" min="0" step="0.01" type="number" placeholder="Precio cliente (opcional)" value={productForm.precio_unitario} onChange={(event) => setProductForm((prev) => ({ ...prev, precio_unitario: event.target.value }))} />
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700">
                    <input checked={productForm.cobra_al_cliente} type="checkbox" onChange={(event) => setProductForm((prev) => ({ ...prev, cobra_al_cliente: event.target.checked }))} />
                    Cobrar este producto al cliente
                  </label>
                  <textarea className="textarea-field" placeholder="Observacion del consumo" value={productForm.observacion} onChange={(event) => setProductForm((prev) => ({ ...prev, observacion: event.target.value }))} />
                  <button className="btn-secondary" disabled={productSaving || !canOperateServices} type="submit">
                    {productSaving ? "Agregando..." : "Agregar producto"}
                  </button>
                </form>

                <div className="table-shell overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetail.productos.length === 0 ? (
                        <tr>
                          <td colSpan={3}>La orden aun no consume productos.</td>
                        </tr>
                      ) : (
                        orderDetail.productos.map((item) => (
                          <tr key={item.id_orden_servicio_producto}>
                            <td>
                              <div className="font-semibold text-stone-900">
                                {item.producto_nombre}
                              </div>
                              <div className="mt-1 text-xs text-stone-500">
                                {item.cobra_al_cliente ? "Se cobra" : "Uso interno"}
                              </div>
                            </td>
                            <td>{formatInteger(item.cantidad)}</td>
                            <td>{formatCurrency(item.subtotal)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {orderDetail.orden.estado_cobro !== "COBRADO" ? (
                  <form className="space-y-3 rounded-3xl border border-stone-200 bg-stone-50 p-4" onSubmit={handleChargeSubmit}>
                    <p className="text-sm font-bold text-stone-900">Cobro de orden</p>
                    <select className="field" value={chargeForm.metodo_pago} onChange={(event) => setChargeForm((prev) => ({ ...prev, metodo_pago: event.target.value, monto_recibido: event.target.value === "EFECTIVO" ? String(orderDetail.orden.total || 0) : "" }))}>
                      <option value="EFECTIVO">EFECTIVO</option>
                      <option value="TARJETA">TARJETA</option>
                      <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                      <option value="CORTESIA">CORTESIA</option>
                    </select>
                    {chargeForm.metodo_pago === "EFECTIVO" ? (
                      <input className="field" min="0" step="0.01" type="number" placeholder="Monto recibido" value={chargeForm.monto_recibido} onChange={(event) => setChargeForm((prev) => ({ ...prev, monto_recibido: event.target.value }))} />
                    ) : null}
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                        Comprobante fiscal (opcional)
                      </label>
                      <select
                        className="field mt-1"
                        value={chargeForm.tipo_comprobante_fiscal}
                        onChange={(event) =>
                          setChargeForm((prev) => ({
                            ...prev,
                            tipo_comprobante_fiscal: event.target.value,
                          }))
                        }
                      >
                        <option value="">Sin comprobante fiscal</option>
                        {(tiposComprobanteFiscal.length > 0
                          ? tiposComprobanteFiscal
                          : [
                              { tipo_comprobante: "TICKET", nombre_default: "Ticket POS" },
                              { tipo_comprobante: "FACTURA", nombre_default: "Factura" },
                              { tipo_comprobante: "CCF", nombre_default: "Credito fiscal" },
                            ]
                        ).map((tipo) => (
                          <option key={tipo.tipo_comprobante} value={tipo.tipo_comprobante}>
                            {tipo.nombre_default || tipo.tipo_comprobante}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-stone-500">
                        Adicional al numero de orden interno. Util para emitir factura al cliente.
                      </p>
                    </div>
                    <button className="btn-primary" disabled={charging || !canOperateServices} type="submit">
                      {charging ? "Registrando cobro..." : "Cobrar orden"}
                    </button>
                  </form>
                ) : (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                    Orden cobrada por {orderDetail.orden.metodo_pago || "SIN_METODO"} el{" "}
                    {formatDateTime(orderDetail.orden.fecha_cobro)}.
                    {orderDetail.orden.numero_comprobante_fiscal ? (
                      <div className="mt-1">
                        Comprobante fiscal: <strong>{orderDetail.orden.numero_comprobante_fiscal}</strong>
                        {orderDetail.orden.tipo_comprobante_fiscal
                          ? ` (${orderDetail.orden.tipo_comprobante_fiscal})`
                          : ""}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-stone-500">
                Selecciona una orden del historial para ver detalle, seguimiento,
                consumo de productos y cobro.
              </p>
            )}
          </article>
        </aside>
      </section>
    </main>
  );
}

export default ServiciosPage;
