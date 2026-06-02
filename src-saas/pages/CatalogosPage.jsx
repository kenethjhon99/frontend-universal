import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SucursalSwitcher from "../components/SucursalSwitcher";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { hasAnyModule, hasRole } from "../lib/access";
import {
  createCliente,
  deactivateCliente,
  getClientes,
  updateCliente,
} from "../services/clientesService";
import {
  createProducto,
  getProductos,
  updateProducto,
} from "../services/productosService";
import {
  createProveedor,
  deactivateProveedor,
  getProveedores,
  updateProveedor,
} from "../services/proveedoresService";
import { getSucursales } from "../services/sucursalesService";

const PRODUCT_MODULE_OPTIONS = [
  "POS",
  "INVENTARIO",
  "COMPRAS",
  "SERVICIOS",
  "CARWASH",
];

const createProductForm = (session) => ({
  id_producto: null,
  sku: "",
  codigo_barras: "",
  nombre: "",
  descripcion: "",
  precio_compra: "0",
  precio_venta: "0",
  tipo_producto: "PRODUCTO",
  modulo_origen:
    (session?.modulos || []).find((moduleCode) =>
      PRODUCT_MODULE_OPTIONS.includes(String(moduleCode || "").trim().toUpperCase())
    ) || "POS",
  stock_actual: "0",
  stock_minimo: "0",
  ubicacion: "",
  activo: true,
});

const createClienteForm = () => ({
  id_cliente: null,
  codigo: "",
  nombre: "",
  nit: "",
  dui: "",
  telefono: "",
  email: "",
  direccion: "",
  activo: true,
});

const createProveedorForm = () => ({
  id_proveedor: null,
  codigo: "",
  nombre: "",
  nit: "",
  telefono: "",
  email: "",
  direccion: "",
  activo: true,
});

const normalizeError = (error, fallback) =>
  error.response?.data?.error || fallback;

const filterRows = (rows, query, fields) => {
  const search = String(query || "").trim().toLowerCase();

  if (!search) {
    return rows;
  }

  return rows.filter((row) =>
    fields.some((field) =>
      String(row?.[field] || "")
        .toLowerCase()
        .includes(search)
    )
  );
};

const mapProductoToForm = (producto) => ({
  id_producto: producto.id_producto,
  sku: producto.sku || "",
  codigo_barras: producto.codigo_barras || "",
  nombre: producto.nombre || "",
  descripcion: producto.descripcion || "",
  precio_compra: String(producto.precio_compra ?? 0),
  precio_venta: String(producto.precio_venta ?? 0),
  tipo_producto: producto.tipo_producto || "PRODUCTO",
  modulo_origen: producto.modulo_origen || "POS",
  stock_actual: String(producto.stock_actual ?? 0),
  stock_minimo: String(producto.stock_minimo ?? 0),
  ubicacion: producto.ubicacion || "",
  activo: producto.activo !== false,
});

const mapClienteToForm = (cliente) => ({
  id_cliente: cliente.id_cliente,
  codigo: cliente.codigo || "",
  nombre: cliente.nombre || "",
  nit: cliente.nit || "",
  dui: cliente.dui || "",
  telefono: cliente.telefono || "",
  email: cliente.email || "",
  direccion: cliente.direccion || "",
  activo: cliente.activo !== false,
});

const mapProveedorToForm = (proveedor) => ({
  id_proveedor: proveedor.id_proveedor,
  codigo: proveedor.codigo || "",
  nombre: proveedor.nombre || "",
  nit: proveedor.nit || "",
  telefono: proveedor.telefono || "",
  email: proveedor.email || "",
  direccion: proveedor.direccion || "",
  activo: proveedor.activo !== false,
});

function CatalogosPage() {
  const { session } = useAppSession();
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [productError, setProductError] = useState("");
  const [clientError, setClientError] = useState("");
  const [providerError, setProviderError] = useState("");
  const [success, setSuccess] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [providerSearch, setProviderSearch] = useState("");
  const [productSaving, setProductSaving] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);
  const [providerSaving, setProviderSaving] = useState(false);
  const [productForm, setProductForm] = useState(() => createProductForm(session));
  const [clientForm, setClientForm] = useState(createClienteForm);
  const [providerForm, setProviderForm] = useState(createProveedorForm);
  const [selectedBranchId, setSelectedBranchId] = useState(
    session?.sucursal_activa?.id_sucursal || ""
  );

  const activeSucursalId = session?.sucursal_activa?.id_sucursal;
  const effectiveBranchId = Number(selectedBranchId || activeSucursalId || 0);
  const canManageProducts = hasRole(
    session,
    "SUPER_ADMIN",
    "ADMIN_EMPRESA",
    "ENCARGADO_SUCURSAL"
  );
  const canManageClients = hasRole(
    session,
    "SUPER_ADMIN",
    "ADMIN_EMPRESA",
    "ENCARGADO_SUCURSAL",
    "CAJERO"
  );
  const canManageProviders = hasRole(
    session,
    "SUPER_ADMIN",
    "ADMIN_EMPRESA",
    "ENCARGADO_SUCURSAL"
  );
  const showProducts = hasAnyModule(session, "POS", "INVENTARIO");
  const showClients = hasAnyModule(session, "POS", "SERVICIOS", "CARWASH");
  const showProviders = hasAnyModule(session, "COMPRAS", "INVENTARIO");

  const loadPage = async () => {
    try {
      setLoading(true);
      setPageError("");

      const tasks = [
        getSucursales(),
        showProducts
          ? effectiveBranchId
            ? getProductos({ activo: "true" }, { branchId: effectiveBranchId })
            : Promise.resolve([])
          : Promise.resolve([]),
        showClients
          ? getClientes({ incluir_inactivos: "true" })
          : Promise.resolve([]),
        showProviders
          ? getProveedores({ incluir_inactivos: "true" })
          : Promise.resolve([]),
      ];

      const [branchRows, productRows, clientRows, providerRows] = await Promise.all(tasks);
      setSucursales(branchRows);
      setProductos(productRows);
      setClientes(clientRows);
      setProveedores(providerRows);
    } catch (error) {
      setPageError(
        normalizeError(error, "No se pudo cargar el modulo de catalogos")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [activeSucursalId, effectiveBranchId, showProducts, showClients, showProviders]);

  useEffect(() => {
    if (!selectedBranchId && activeSucursalId) {
      setSelectedBranchId(activeSucursalId);
    }
  }, [activeSucursalId, selectedBranchId]);

  const filteredProducts = useMemo(
    () =>
      filterRows(productos, productSearch, [
        "sku",
        "codigo_barras",
        "nombre",
        "descripcion",
      ]),
    [productos, productSearch]
  );

  const filteredClientes = useMemo(
    () =>
      filterRows(clientes, clientSearch, [
        "codigo",
        "nombre",
        "nit",
        "email",
        "telefono",
      ]),
    [clientes, clientSearch]
  );

  const filteredProveedores = useMemo(
    () =>
      filterRows(proveedores, providerSearch, [
        "codigo",
        "nombre",
        "nit",
        "email",
        "telefono",
      ]),
    [proveedores, providerSearch]
  );

  const productSummary = useMemo(
    () => ({
      total: productos.length,
      activos: productos.filter((item) => item.activo).length,
      stockTotal: productos.reduce(
        (acc, item) => acc + Number(item.stock_actual || 0),
        0
      ),
    }),
    [productos]
  );

  const resetProductForm = () => {
    setProductForm(createProductForm(session));
    setProductError("");
  };

  const resetClientForm = () => {
    setClientForm(createClienteForm());
    setClientError("");
  };

  const resetProviderForm = () => {
    setProviderForm(createProveedorForm());
    setProviderError("");
  };

  const handleProductFieldChange = (field, value) => {
    setProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleClientFieldChange = (field, value) => {
    setClientForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProviderFieldChange = (field, value) => {
    setProviderForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    setProductError("");
    setSuccess("");

    try {
      setProductSaving(true);

      const payload = {
        sku: productForm.sku,
        codigo_barras: productForm.codigo_barras || null,
        nombre: productForm.nombre,
        descripcion: productForm.descripcion || null,
        precio_compra: Number(productForm.precio_compra || 0),
        precio_venta: Number(productForm.precio_venta || 0),
        tipo_producto: productForm.tipo_producto,
        modulo_origen: productForm.modulo_origen,
        activo: productForm.activo,
        stock_por_sucursal: [
          {
            id_sucursal: effectiveBranchId,
            stock_actual: Number(productForm.stock_actual || 0),
            stock_minimo: Number(productForm.stock_minimo || 0),
            ubicacion: productForm.ubicacion || null,
          },
        ],
      };

      if (productForm.id_producto) {
        await updateProducto(productForm.id_producto, payload, {
          branchId: effectiveBranchId,
        });
        setSuccess("Producto actualizado correctamente.");
      } else {
        await createProducto(payload, { branchId: effectiveBranchId });
        setSuccess("Producto creado correctamente.");
      }

      await loadPage();
      resetProductForm();
    } catch (error) {
      setProductError(
        normalizeError(error, "No se pudo guardar el producto")
      );
    } finally {
      setProductSaving(false);
    }
  };

  const handleClientSubmit = async (event) => {
    event.preventDefault();
    setClientError("");
    setSuccess("");

    try {
      setClientSaving(true);

      const payload = {
        codigo: clientForm.codigo || null,
        nombre: clientForm.nombre,
        nit: clientForm.nit || null,
        dui: clientForm.dui || null,
        telefono: clientForm.telefono || null,
        email: clientForm.email || null,
        direccion: clientForm.direccion || null,
        activo: clientForm.activo,
      };

      if (clientForm.id_cliente) {
        await updateCliente(clientForm.id_cliente, payload);
        setSuccess("Cliente actualizado correctamente.");
      } else {
        await createCliente(payload);
        setSuccess("Cliente creado correctamente.");
      }

      await loadPage();
      resetClientForm();
    } catch (error) {
      setClientError(normalizeError(error, "No se pudo guardar el cliente"));
    } finally {
      setClientSaving(false);
    }
  };

  const handleProviderSubmit = async (event) => {
    event.preventDefault();
    setProviderError("");
    setSuccess("");

    try {
      setProviderSaving(true);

      const payload = {
        codigo: providerForm.codigo || null,
        nombre: providerForm.nombre,
        nit: providerForm.nit || null,
        telefono: providerForm.telefono || null,
        email: providerForm.email || null,
        direccion: providerForm.direccion || null,
        activo: providerForm.activo,
      };

      if (providerForm.id_proveedor) {
        await updateProveedor(providerForm.id_proveedor, payload);
        setSuccess("Proveedor actualizado correctamente.");
      } else {
        await createProveedor(payload);
        setSuccess("Proveedor creado correctamente.");
      }

      await loadPage();
      resetProviderForm();
    } catch (error) {
      setProviderError(
        normalizeError(error, "No se pudo guardar el proveedor")
      );
    } finally {
      setProviderSaving(false);
    }
  };

  const handleDeactivateCliente = async (cliente) => {
    if (!window.confirm(`Deseas desactivar a ${cliente.nombre}?`)) {
      return;
    }

    try {
      setClientError("");
      setSuccess("");
      await deactivateCliente(cliente.id_cliente);
      setSuccess("Cliente desactivado correctamente.");
      await loadPage();
    } catch (error) {
      setClientError(
        normalizeError(error, "No se pudo desactivar el cliente")
      );
    }
  };

  const handleDeactivateProveedor = async (proveedor) => {
    if (!window.confirm(`Deseas desactivar a ${proveedor.nombre}?`)) {
      return;
    }

    try {
      setProviderError("");
      setSuccess("");
      await deactivateProveedor(proveedor.id_proveedor);
      setSuccess("Proveedor desactivado correctamente.");
      await loadPage();
    } catch (error) {
      setProviderError(
        normalizeError(error, "No se pudo desactivar el proveedor")
      );
    }
  };

  return (
    <main className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow="Primer Modulo Real"
        title="Catalogos base multi-empresa"
        description="Aqui ya operamos sobre la base nueva del SaaS. Puedes administrar productos, clientes y proveedores respetando empresa, sucursal activa y modulos habilitados."
        actions={
          hasAnyModule(session, "INVENTARIO", "POS", "COMPRAS") ? (
            <Link className="btn-secondary" to="/operacion/inventario">
              Ir a inventario
            </Link>
          ) : null
        }
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
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

          {showProducts ? (
            <article className="panel p-6">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] xl:items-end">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                    Productos
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-stone-900">
                    Catalogo por empresa
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-stone-500">
                    Los productos existen una sola vez por empresa y su stock se
                    controla por sucursal.
                  </p>
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(220px,0.9fr)_minmax(260px,1.1fr)]">
                  <label className="field-group">
                    <span className="field-label">Sucursal consultada</span>
                    <select
                      aria-label="Sucursal consultada para productos y stock"
                      className="field"
                      value={selectedBranchId}
                      onChange={(event) => setSelectedBranchId(event.target.value)}
                    >
                      {sucursales.length === 0 ? (
                        <option value="">Sin sucursales disponibles</option>
                      ) : null}
                      {sucursales.map((sucursal) => (
                        <option
                          key={sucursal.id_sucursal}
                          value={sucursal.id_sucursal}
                        >
                          {sucursal.codigo} - {sucursal.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group">
                    <span className="field-label">Buscar producto</span>
                    <input
                      aria-label="Buscar producto por nombre SKU o codigo"
                      className="field"
                      placeholder="Nombre, SKU o codigo"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Productos
                  </p>
                  <p className="mt-3 text-2xl font-black text-stone-900">
                    {productSummary.total}
                  </p>
                </article>
                <article className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Activos
                  </p>
                  <p className="mt-3 text-2xl font-black text-stone-900">
                    {productSummary.activos}
                  </p>
                </article>
                <article className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Stock visible
                  </p>
                  <p className="mt-3 text-2xl font-black text-stone-900">
                    {productSummary.stockTotal}
                  </p>
                </article>
              </div>

              {canManageProducts ? (
                <form className="mt-6 space-y-4" onSubmit={handleProductSubmit}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <input
                      className="field"
                      placeholder="SKU"
                      value={productForm.sku}
                      onChange={(event) =>
                        handleProductFieldChange("sku", event.target.value)
                      }
                      required
                    />
                    <input
                      className="field"
                      placeholder="Codigo de barras"
                      value={productForm.codigo_barras}
                      onChange={(event) =>
                        handleProductFieldChange(
                          "codigo_barras",
                          event.target.value
                        )
                      }
                    />
                    <input
                      className="field"
                      placeholder="Nombre del producto"
                      value={productForm.nombre}
                      onChange={(event) =>
                        handleProductFieldChange("nombre", event.target.value)
                      }
                      required
                    />
                    <select
                      className="field"
                      value={productForm.modulo_origen}
                      onChange={(event) =>
                        handleProductFieldChange(
                          "modulo_origen",
                          event.target.value
                        )
                      }
                    >
                      {PRODUCT_MODULE_OPTIONS.filter((option) =>
                        hasAnyModule(session, option)
                      ).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <label className="field-group">
                      <span className="field-label">Precio compra</span>
                      <input
                        className="field"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={productForm.precio_compra}
                        onChange={(event) =>
                          handleProductFieldChange(
                            "precio_compra",
                            event.target.value
                          )
                        }
                      />
                    </label>
                    <label className="field-group">
                      <span className="field-label">Precio venta</span>
                      <input
                        className="field"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={productForm.precio_venta}
                        onChange={(event) =>
                          handleProductFieldChange(
                            "precio_venta",
                            event.target.value
                          )
                        }
                      />
                    </label>
                    <label className="field-group">
                      <span className="field-label">Stock inicial</span>
                      <input
                        className="field"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={productForm.stock_actual}
                        onChange={(event) =>
                          handleProductFieldChange("stock_actual", event.target.value)
                        }
                        disabled={Boolean(productForm.id_producto)}
                      />
                    </label>
                    <label className="field-group">
                      <span className="field-label">Stock minimo</span>
                      <input
                        className="field"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={productForm.stock_minimo}
                        onChange={(event) =>
                          handleProductFieldChange("stock_minimo", event.target.value)
                        }
                      />
                    </label>
                    <input
                      className="field md:col-span-2 xl:col-span-2"
                      placeholder="Ubicacion en bodega"
                      value={productForm.ubicacion}
                      onChange={(event) =>
                        handleProductFieldChange("ubicacion", event.target.value)
                      }
                    />
                    <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700">
                      <input
                        checked={productForm.activo}
                        type="checkbox"
                        onChange={(event) =>
                          handleProductFieldChange("activo", event.target.checked)
                        }
                      />
                      Producto activo
                    </label>
                  </div>
                  <textarea
                    className="textarea-field"
                    placeholder="Descripcion"
                    value={productForm.descripcion}
                    onChange={(event) =>
                      handleProductFieldChange("descripcion", event.target.value)
                    }
                  />
                  {productError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {productError}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="btn-primary"
                      disabled={productSaving}
                      type="submit"
                    >
                      {productSaving
                        ? "Guardando producto..."
                        : productForm.id_producto
                          ? "Actualizar producto"
                          : "Crear producto"}
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={resetProductForm}
                    >
                      Limpiar formulario
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="table-shell mt-6 overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Modulo</th>
                      <th>Precios</th>
                      <th>Stock</th>
                      <th>Estado</th>
                      {canManageProducts ? <th>Acciones</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={canManageProducts ? 6 : 5}>
                          Cargando productos...
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={canManageProducts ? 6 : 5}>
                          No hay productos para el filtro actual.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((producto) => (
                        <tr key={producto.id_producto}>
                          <td>
                            <div className="font-semibold text-stone-900">
                              {producto.nombre}
                            </div>
                            <div className="mt-1 text-xs text-stone-500">
                              {producto.sku}
                              {producto.codigo_barras
                                ? ` | ${producto.codigo_barras}`
                                : ""}
                            </div>
                          </td>
                          <td>{producto.modulo_origen}</td>
                          <td>
                            <div>Compra: Q {Number(producto.precio_compra || 0).toFixed(2)}</div>
                            <div>Venta: Q {Number(producto.precio_venta || 0).toFixed(2)}</div>
                          </td>
                          <td>
                            <div>{Number(producto.stock_actual || 0)}</div>
                            <div className="mt-1 text-xs text-stone-500">
                              Min {Number(producto.stock_minimo || 0)}
                            </div>
                          </td>
                          <td>
                            <span
                              className={
                                producto.activo
                                  ? "badge-success"
                                  : "badge-muted"
                              }
                            >
                              {producto.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          {canManageProducts ? (
                            <td>
                              <button
                                className="chip"
                                type="button"
                                onClick={() =>
                                  setProductForm(mapProductoToForm(producto))
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
            </article>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            {showClients ? (
              <article className="panel p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                      Clientes
                    </p>
                    <h2 className="mt-3 text-2xl font-black text-stone-900">
                      Base de clientes
                    </h2>
                  </div>
                  <input
                    className="field lg:max-w-xs"
                    placeholder="Buscar cliente"
                    value={clientSearch}
                    onChange={(event) => setClientSearch(event.target.value)}
                  />
                </div>

                {canManageClients ? (
                  <form className="mt-6 space-y-4" onSubmit={handleClientSubmit}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input className="field" placeholder="Codigo opcional" value={clientForm.codigo} onChange={(event) => handleClientFieldChange("codigo", event.target.value)} />
                      <input className="field" placeholder="Nombre" value={clientForm.nombre} onChange={(event) => handleClientFieldChange("nombre", event.target.value)} required />
                      <input className="field" placeholder="NIT" value={clientForm.nit} onChange={(event) => handleClientFieldChange("nit", event.target.value)} />
                      <input className="field" placeholder="DUI" value={clientForm.dui} onChange={(event) => handleClientFieldChange("dui", event.target.value)} />
                      <input className="field" placeholder="Telefono" value={clientForm.telefono} onChange={(event) => handleClientFieldChange("telefono", event.target.value)} />
                      <input className="field" type="email" placeholder="Email" value={clientForm.email} onChange={(event) => handleClientFieldChange("email", event.target.value)} />
                    </div>
                    <textarea className="textarea-field" placeholder="Direccion" value={clientForm.direccion} onChange={(event) => handleClientFieldChange("direccion", event.target.value)} />
                    <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700">
                      <input checked={clientForm.activo} type="checkbox" onChange={(event) => handleClientFieldChange("activo", event.target.checked)} />
                      Cliente activo
                    </label>
                    {clientError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{clientError}</div> : null}
                    <div className="flex flex-wrap gap-3">
                      <button className="btn-primary" disabled={clientSaving} type="submit">
                        {clientSaving ? "Guardando cliente..." : clientForm.id_cliente ? "Actualizar cliente" : "Crear cliente"}
                      </button>
                      <button className="btn-secondary" type="button" onClick={resetClientForm}>
                        Limpiar formulario
                      </button>
                    </div>
                  </form>
                ) : null}

                <div className="table-shell mt-6 overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Contacto</th>
                        <th>Estado</th>
                        {canManageClients ? <th>Acciones</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={canManageClients ? 4 : 3}>Cargando clientes...</td></tr>
                      ) : filteredClientes.length === 0 ? (
                        <tr><td colSpan={canManageClients ? 4 : 3}>No hay clientes para el filtro actual.</td></tr>
                      ) : (
                        filteredClientes.map((cliente) => (
                          <tr key={cliente.id_cliente}>
                            <td>
                              <div className="font-semibold text-stone-900">{cliente.nombre}</div>
                              <div className="mt-1 text-xs text-stone-500">
                                {cliente.codigo || "Sin codigo"}
                                {cliente.nit ? ` | ${cliente.nit}` : ""}
                              </div>
                            </td>
                            <td>
                              <div>{cliente.telefono || "Sin telefono"}</div>
                              <div className="mt-1 text-xs text-stone-500">{cliente.email || "Sin email"}</div>
                            </td>
                            <td>
                              <span className={cliente.activo ? "badge-success" : "badge-muted"}>
                                {cliente.activo ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            {canManageClients ? (
                              <td>
                                <div className="flex flex-wrap gap-2">
                                  <button className="chip" type="button" onClick={() => setClientForm(mapClienteToForm(cliente))}>
                                    Editar
                                  </button>
                                  {cliente.activo ? (
                                    <button className="chip" type="button" onClick={() => handleDeactivateCliente(cliente)}>
                                      Desactivar
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            ) : null}

            {showProviders ? (
              <article className="panel p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                      Proveedores
                    </p>
                    <h2 className="mt-3 text-2xl font-black text-stone-900">
                      Compras e inventario
                    </h2>
                  </div>
                  <input className="field lg:max-w-xs" placeholder="Buscar proveedor" value={providerSearch} onChange={(event) => setProviderSearch(event.target.value)} />
                </div>

                {canManageProviders ? (
                  <form className="mt-6 space-y-4" onSubmit={handleProviderSubmit}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input className="field" placeholder="Codigo opcional" value={providerForm.codigo} onChange={(event) => handleProviderFieldChange("codigo", event.target.value)} />
                      <input className="field" placeholder="Nombre" value={providerForm.nombre} onChange={(event) => handleProviderFieldChange("nombre", event.target.value)} required />
                      <input className="field" placeholder="NIT" value={providerForm.nit} onChange={(event) => handleProviderFieldChange("nit", event.target.value)} />
                      <input className="field" placeholder="Telefono" value={providerForm.telefono} onChange={(event) => handleProviderFieldChange("telefono", event.target.value)} />
                      <input className="field" type="email" placeholder="Email" value={providerForm.email} onChange={(event) => handleProviderFieldChange("email", event.target.value)} />
                    </div>
                    <textarea className="textarea-field" placeholder="Direccion" value={providerForm.direccion} onChange={(event) => handleProviderFieldChange("direccion", event.target.value)} />
                    <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700">
                      <input checked={providerForm.activo} type="checkbox" onChange={(event) => handleProviderFieldChange("activo", event.target.checked)} />
                      Proveedor activo
                    </label>
                    {providerError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{providerError}</div> : null}
                    <div className="flex flex-wrap gap-3">
                      <button className="btn-primary" disabled={providerSaving} type="submit">
                        {providerSaving ? "Guardando proveedor..." : providerForm.id_proveedor ? "Actualizar proveedor" : "Crear proveedor"}
                      </button>
                      <button className="btn-secondary" type="button" onClick={resetProviderForm}>
                        Limpiar formulario
                      </button>
                    </div>
                  </form>
                ) : null}

                <div className="table-shell mt-6 overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Proveedor</th>
                        <th>Contacto</th>
                        <th>Estado</th>
                        {canManageProviders ? <th>Acciones</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={canManageProviders ? 4 : 3}>Cargando proveedores...</td></tr>
                      ) : filteredProveedores.length === 0 ? (
                        <tr><td colSpan={canManageProviders ? 4 : 3}>No hay proveedores para el filtro actual.</td></tr>
                      ) : (
                        filteredProveedores.map((proveedor) => (
                          <tr key={proveedor.id_proveedor}>
                            <td>
                              <div className="font-semibold text-stone-900">{proveedor.nombre}</div>
                              <div className="mt-1 text-xs text-stone-500">
                                {proveedor.codigo || "Sin codigo"}
                                {proveedor.nit ? ` | ${proveedor.nit}` : ""}
                              </div>
                            </td>
                            <td>
                              <div>{proveedor.telefono || "Sin telefono"}</div>
                              <div className="mt-1 text-xs text-stone-500">{proveedor.email || "Sin email"}</div>
                            </td>
                            <td>
                              <span className={proveedor.activo ? "badge-success" : "badge-muted"}>
                                {proveedor.activo ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            {canManageProviders ? (
                              <td>
                                <div className="flex flex-wrap gap-2">
                                  <button className="chip" type="button" onClick={() => setProviderForm(mapProveedorToForm(proveedor))}>
                                    Editar
                                  </button>
                                  {proveedor.activo ? (
                                    <button className="chip" type="button" onClick={() => handleDeactivateProveedor(proveedor)}>
                                      Desactivar
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            ) : null}
          </div>
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
                <dt className="font-semibold text-stone-900">Empresa</dt>
                <dd>{session?.empresa?.nombre_legal}</dd>
              </div>
              <div>
                <dt className="font-semibold text-stone-900">Sucursal</dt>
                <dd>{session?.sucursal_activa?.codigo} - {session?.sucursal_activa?.nombre}</dd>
              </div>
              <div>
                <dt className="font-semibold text-stone-900">Consulta productos en</dt>
                <dd>
                  {sucursales.find(
                    (item) => Number(item.id_sucursal) === Number(effectiveBranchId)
                  )?.nombre || "Sucursal actual"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-stone-900">Usuario</dt>
                <dd>{session?.user?.nombre} {session?.user?.apellido}</dd>
              </div>
            </dl>
          </div>

          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Modulos visibles
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(session?.modulos || []).map((moduleCode) => (
                <span key={moduleCode} className="badge-muted">
                  {moduleCode}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-stone-500">
              Este workspace es la primera migracion funcional al SaaS nuevo. Lo
              siguiente sera profundizar inventario, compras y ventas usando
              estas mismas bases.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default CatalogosPage;
