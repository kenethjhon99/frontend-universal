import { useEffect, useMemo, useState } from "react";
import SucursalSwitcher from "../components/SucursalSwitcher";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { hasPermission, hasRole } from "../lib/access";
import { normalizeApiError } from "../lib/reporting";
import {
  createComprobantesSerie,
  getComprobantesCatalog,
  getComprobantesSeries,
  updateComprobantesSerie,
} from "../services/comprobantesService";
import { getSucursales } from "../services/sucursalesService";

const createForm = () => ({
  id_sucursal: "",
  modulo: "VENTA",
  tipo_comprobante: "TICKET",
  serie: "",
  nombre: "",
  ultimo_correlativo: 0,
  activo: true,
});

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "true", label: "Activas" },
  { value: "false", label: "Inactivas" },
];

function SeriesComprobantePage() {
  const { session } = useAppSession();
  const [series, setSeries] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [filters, setFilters] = useState({
    modulo: "",
    id_sucursal: "",
    activo: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editing, setEditing] = useState(null); // serie seleccionada en panel derecho
  const [editForm, setEditForm] = useState({
    nombre: "",
    activo: true,
    ultimo_correlativo: 0,
  });
  const [editSaving, setEditSaving] = useState(false);

  const [createForm_, setCreateFormState] = useState(createForm);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const canManage = hasPermission(session, "comprobantes.manage");
  const canAdjustCorrelative = hasRole(
    session,
    "SUPER_ADMIN",
    "ADMIN_EMPRESA"
  );

  const tiposPorModulo = useMemo(() => {
    const map = new Map();
    catalog.forEach((entry) => map.set(entry.modulo, entry.tipos || []));
    return map;
  }, [catalog]);

  const tiposActuales = useMemo(
    () => tiposPorModulo.get(createForm_.modulo) || [],
    [tiposPorModulo, createForm_.modulo]
  );

  const loadPage = async () => {
    try {
      setLoading(true);
      setError("");

      const [serieRows, sucursalRows, catalogRows] = await Promise.all([
        getComprobantesSeries({
          modulo: filters.modulo || undefined,
          id_sucursal: filters.id_sucursal || undefined,
          activo: filters.activo || undefined,
        }),
        getSucursales(),
        getComprobantesCatalog().catch(() => []),
      ]);

      setSeries(serieRows);
      setSucursales(sucursalRows);
      setCatalog(catalogRows);
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, "No se pudieron cargar las series")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [filters.modulo, filters.id_sucursal, filters.activo]);

  useEffect(() => {
    if (!editing) {
      return;
    }

    setEditForm({
      nombre: editing.nombre || "",
      activo: editing.activo,
      ultimo_correlativo: Number(editing.ultimo_correlativo || 0),
    });
  }, [editing?.id_comprobante_serie]);

  const handleCreate = async (event) => {
    event.preventDefault();

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      await createComprobantesSerie({
        ...createForm_,
        id_sucursal: Number(createForm_.id_sucursal),
        ultimo_correlativo: Number(createForm_.ultimo_correlativo || 0),
      });

      setSuccess("Serie creada correctamente.");
      setShowCreate(false);
      setCreateFormState(createForm());
      await loadPage();
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, "No se pudo crear la serie")
      );
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editing) {
      return;
    }

    try {
      setEditSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        nombre: editForm.nombre,
        activo: editForm.activo,
      };

      if (
        canAdjustCorrelative &&
        Number(editForm.ultimo_correlativo) !==
          Number(editing.ultimo_correlativo)
      ) {
        payload.ultimo_correlativo = Number(editForm.ultimo_correlativo);
      }

      await updateComprobantesSerie(editing.id_comprobante_serie, payload);

      setSuccess("Serie actualizada.");
      await loadPage();
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, "No se pudo actualizar la serie")
      );
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow="Comprobantes"
        title="Series y correlativos"
        description="Configura los rangos de comprobantes (TICKET, FACTURA, CCF, ordenes de servicio y devoluciones) por sucursal. El sistema garantiza correlativos atomicos y unicos por empresa."
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
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

          <article className="panel p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Filtros
              </p>
              <SucursalSwitcher />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <select
                className="field"
                value={filters.modulo}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, modulo: event.target.value }))
                }
              >
                <option value="">Todos los modulos</option>
                {catalog.map((entry) => (
                  <option key={entry.modulo} value={entry.modulo}>
                    {entry.label || entry.modulo}
                  </option>
                ))}
              </select>
              <select
                className="field"
                value={filters.id_sucursal}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    id_sucursal: event.target.value,
                  }))
                }
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map((sucursal) => (
                  <option
                    key={sucursal.id_sucursal}
                    value={sucursal.id_sucursal}
                  >
                    {sucursal.codigo} - {sucursal.nombre}
                  </option>
                ))}
              </select>
              <select
                className="field"
                value={filters.activo}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, activo: event.target.value }))
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </article>

          <article className="panel p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Series ({series.length})
              </p>
              {canManage ? (
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => {
                    setShowCreate((value) => !value);
                    setCreateFormState(createForm());
                  }}
                >
                  {showCreate ? "Cancelar" : "Nueva serie"}
                </button>
              ) : null}
            </div>

            {showCreate && canManage ? (
              <form
                className="mt-5 space-y-3 rounded-3xl border border-stone-200 bg-stone-50 p-4"
                onSubmit={handleCreate}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    className="field"
                    value={createForm_.modulo}
                    onChange={(event) =>
                      setCreateFormState((prev) => {
                        const tipos = tiposPorModulo.get(event.target.value) || [];
                        const firstTipo = tipos[0]?.tipo_comprobante || "";
                        const firstSerie = tipos[0]?.serie_default || "";
                        const firstNombre = tipos[0]?.nombre_default || "";
                        return {
                          ...prev,
                          modulo: event.target.value,
                          tipo_comprobante: firstTipo,
                          serie: firstSerie,
                          nombre: firstNombre,
                        };
                      })
                    }
                  >
                    {catalog.map((entry) => (
                      <option key={entry.modulo} value={entry.modulo}>
                        {entry.label || entry.modulo}
                      </option>
                    ))}
                  </select>
                  <select
                    className="field"
                    value={createForm_.tipo_comprobante}
                    onChange={(event) => {
                      const found = tiposActuales.find(
                        (tipo) => tipo.tipo_comprobante === event.target.value
                      );
                      setCreateFormState((prev) => ({
                        ...prev,
                        tipo_comprobante: event.target.value,
                        serie: found?.serie_default || prev.serie,
                        nombre: found?.nombre_default || prev.nombre,
                      }));
                    }}
                  >
                    {tiposActuales.map((tipo) => (
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
                    value={createForm_.id_sucursal}
                    onChange={(event) =>
                      setCreateFormState((prev) => ({
                        ...prev,
                        id_sucursal: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Selecciona sucursal...</option>
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
                    placeholder="Serie (ej. FAC-A)"
                    value={createForm_.serie}
                    onChange={(event) =>
                      setCreateFormState((prev) => ({
                        ...prev,
                        serie: event.target.value.toUpperCase(),
                      }))
                    }
                    required
                  />
                  <input
                    className="field md:col-span-2"
                    placeholder="Nombre visible (ej. Factura serie A)"
                    value={createForm_.nombre}
                    onChange={(event) =>
                      setCreateFormState((prev) => ({
                        ...prev,
                        nombre: event.target.value,
                      }))
                    }
                    required
                  />
                  <input
                    className="field"
                    type="number"
                    min="0"
                    placeholder="Correlativo inicial (default 0)"
                    value={createForm_.ultimo_correlativo}
                    onChange={(event) =>
                      setCreateFormState((prev) => ({
                        ...prev,
                        ultimo_correlativo: event.target.value,
                      }))
                    }
                  />
                  <label className="flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={createForm_.activo}
                      onChange={(event) =>
                        setCreateFormState((prev) => ({
                          ...prev,
                          activo: event.target.checked,
                        }))
                      }
                    />
                    Activa al crear
                  </label>
                </div>
                <button
                  className="btn-primary"
                  disabled={creating}
                  type="submit"
                >
                  {creating ? "Creando..." : "Crear serie"}
                </button>
              </form>
            ) : null}

            <div className="table-shell mt-6 overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Modulo / Tipo</th>
                    <th>Sucursal</th>
                    <th>Serie</th>
                    <th>Proximo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5}>Cargando series...</td>
                    </tr>
                  ) : series.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        No hay series para los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    series.map((row) => (
                      <tr
                        key={row.id_comprobante_serie}
                        className={
                          editing?.id_comprobante_serie ===
                          row.id_comprobante_serie
                            ? "bg-brand-50"
                            : ""
                        }
                      >
                        <td>
                          <button
                            className="text-left"
                            type="button"
                            onClick={() => setEditing(row)}
                          >
                            <div className="font-semibold text-stone-900">
                              {row.modulo}
                            </div>
                            <div className="text-xs text-stone-500">
                              {row.tipo_comprobante} - {row.nombre}
                            </div>
                          </button>
                        </td>
                        <td>{row.sucursal_nombre || `#${row.id_sucursal}`}</td>
                        <td>
                          <span className="chip">{row.serie}</span>
                        </td>
                        <td className="font-mono text-xs">
                          {row.proximo_numero}
                        </td>
                        <td>
                          <span
                            className={
                              row.activo ? "badge-success" : "badge-muted"
                            }
                          >
                            {row.activo ? "ACTIVA" : "INACTIVA"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
            Detalle de serie
          </p>
          {!editing ? (
            <p className="mt-4 text-sm leading-6 text-stone-500">
              Selecciona una serie del listado para ver detalles, activarla o
              desactivarla. Solo SUPER_ADMIN o ADMIN_EMPRESA pueden ajustar el
              correlativo manualmente, y el correlativo no puede retroceder.
            </p>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleUpdate}>
              <div>
                <h2 className="text-2xl font-black text-stone-900">
                  {editing.modulo} / {editing.tipo_comprobante}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {editing.sucursal_nombre || `Sucursal #${editing.id_sucursal}`}
                  {" | "}
                  Serie <strong>{editing.serie}</strong>
                </p>
                <p className="mt-2 font-mono text-xs text-stone-600">
                  Proximo numero: <strong>{editing.proximo_numero}</strong>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                  Nombre
                </label>
                <input
                  className="field mt-1"
                  value={editForm.nombre}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      nombre: event.target.value,
                    }))
                  }
                  disabled={!canManage}
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={editForm.activo}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      activo: event.target.checked,
                    }))
                  }
                  disabled={!canManage}
                />
                Serie activa
              </label>

              {canAdjustCorrelative ? (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Ajustar correlativo (no puede retroceder)
                  </label>
                  <input
                    className="field mt-1"
                    type="number"
                    min={Number(editing.ultimo_correlativo || 0)}
                    value={editForm.ultimo_correlativo}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        ultimo_correlativo: event.target.value,
                      }))
                    }
                  />
                  <p className="mt-1 text-xs text-stone-500">
                    Actual: <strong>{editing.ultimo_correlativo}</strong>. Solo subir
                    permitido. Cualquier ajuste queda registrado en auditoria.
                  </p>
                </div>
              ) : null}

              {canManage ? (
                <button
                  className="btn-primary"
                  disabled={editSaving}
                  type="submit"
                >
                  {editSaving ? "Guardando..." : "Guardar cambios"}
                </button>
              ) : (
                <p className="text-xs text-stone-500">
                  No tienes permisos para editar series.
                </p>
              )}
            </form>
          )}
        </article>
      </section>
    </main>
  );
}

export default SeriesComprobantePage;
