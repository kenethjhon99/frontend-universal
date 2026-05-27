import { useEffect, useState } from "react";
import SucursalSwitcher from "../components/SucursalSwitcher";
import WorkspaceHero from "../components/WorkspaceHero";
import { getAuditoriaEventos } from "../services/auditoriaService";

const createToday = () => new Date().toISOString().slice(0, 10);
const normalizeError = (error, fallback) =>
  error.response?.data?.error || fallback;

function JsonBlock({ value, emptyLabel }) {
  if (!value) {
    return <p className="text-sm text-stone-500">{emptyLabel}</p>;
  }

  return (
    <pre className="overflow-x-auto rounded-2xl bg-stone-950/95 p-4 text-xs leading-6 text-stone-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function AuditoriaPage() {
  const [eventos, setEventos] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [filters, setFilters] = useState({
    modulo: "",
    accion: "",
    entidad: "",
    desde: createToday(),
    hasta: createToday(),
    search: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedEvent =
    eventos.find((evento) => Number(evento.id_auditoria) === Number(selectedEventId)) ||
    null;

  const loadPage = async () => {
    try {
      setLoading(true);
      setError("");
      const rows = await getAuditoriaEventos({
        ...filters,
        modulo: filters.modulo || undefined,
        accion: filters.accion || undefined,
        entidad: filters.entidad || undefined,
        search: filters.search || undefined,
        limit: 60,
      });
      setEventos(rows);
      setSelectedEventId(rows[0]?.id_auditoria || null);
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo cargar la auditoria"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [filters.modulo, filters.accion, filters.entidad, filters.desde, filters.hasta, filters.search]);

  return (
    <main className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow="Auditoria"
        title="Trazabilidad administrativa"
        description="Consulta quien creo, edito, activo o cambio configuraciones dentro del SaaS multi-empresa."
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <article className="panel p-6">
            <div className="grid gap-3 md:grid-cols-5">
              <select className="field" value={filters.modulo} onChange={(event) => setFilters((prev) => ({ ...prev, modulo: event.target.value }))}>
                <option value="">Todos los modulos</option>
                <option value="EMPRESAS">Empresas</option>
                <option value="SUCURSALES">Sucursales</option>
                <option value="USUARIOS">Usuarios</option>
              </select>
              <select className="field" value={filters.accion} onChange={(event) => setFilters((prev) => ({ ...prev, accion: event.target.value }))}>
                <option value="">Todas las acciones</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="ACTIVATE">Activate</option>
                <option value="DEACTIVATE">Deactivate</option>
              </select>
              <input className="field" type="date" value={filters.desde} onChange={(event) => setFilters((prev) => ({ ...prev, desde: event.target.value }))} />
              <input className="field" type="date" value={filters.hasta} onChange={(event) => setFilters((prev) => ({ ...prev, hasta: event.target.value }))} />
              <input className="field" placeholder="Buscar por usuario, entidad o id" value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} />
            </div>
          </article>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Eventos
              </p>
              <div className="table-shell mt-6 overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Modulo</th>
                      <th>Actor</th>
                      <th>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4}>Cargando auditoria...</td></tr>
                    ) : eventos.length === 0 ? (
                      <tr><td colSpan={4}>No hay eventos para los filtros actuales.</td></tr>
                    ) : (
                      eventos.map((evento) => (
                        <tr
                          key={evento.id_auditoria}
                          className={
                            Number(evento.id_auditoria) === Number(selectedEventId)
                              ? "bg-brand-50"
                              : ""
                          }
                        >
                          <td>
                            <button
                              className="text-left"
                              type="button"
                              onClick={() => setSelectedEventId(evento.id_auditoria)}
                            >
                              <div className="font-semibold text-stone-900">
                                {new Date(evento.created_at).toLocaleString("es-GT")}
                              </div>
                              <div className="mt-1 text-xs text-stone-500">
                                #{evento.id_auditoria}
                              </div>
                            </button>
                          </td>
                          <td>{evento.modulo}</td>
                          <td>{evento.usuario_username || evento.usuario_nombre || "Sistema"}</td>
                          <td>
                            <span className="chip">
                              {evento.accion} {evento.entidad}
                            </span>
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
                Detalle del evento
              </p>
              {selectedEvent ? (
                <div className="mt-4 space-y-5">
                  <div>
                    <h2 className="text-2xl font-black text-stone-900">
                      {selectedEvent.modulo} / {selectedEvent.accion}
                    </h2>
                    <p className="mt-2 text-sm text-stone-500">
                      {selectedEvent.usuario_nombre || selectedEvent.usuario_username || "Sistema"} |{" "}
                      {selectedEvent.sucursal_codigo
                        ? `${selectedEvent.sucursal_codigo} - ${selectedEvent.sucursal_nombre}`
                        : "Sin sucursal"}{" "}
                      | IP {selectedEvent.ip || "N/D"}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Entidad</p>
                      <p className="mt-2 text-lg font-bold text-stone-900">
                        {selectedEvent.entidad} #{selectedEvent.entidad_id}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">User agent</p>
                      <p className="mt-2 text-sm font-medium text-stone-700">
                        {selectedEvent.user_agent || "No disponible"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-bold text-stone-900">Antes</p>
                    <JsonBlock value={selectedEvent.datos_antes} emptyLabel="Sin estado previo registrado." />
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-bold text-stone-900">Despues</p>
                    <JsonBlock value={selectedEvent.datos_despues} emptyLabel="Sin estado posterior registrado." />
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-stone-500">
                  Selecciona un evento del historial para inspeccionar sus cambios.
                </p>
              )}
            </article>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="panel p-6">
            <SucursalSwitcher />
          </div>
          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Cobertura
            </p>
            <p className="mt-3 text-lg font-bold text-stone-900">
              Acciones administrativas
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              El log actual ya registra creacion de empresas, cambios de modulos,
              alta de sucursales y administracion de usuarios.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default AuditoriaPage;
