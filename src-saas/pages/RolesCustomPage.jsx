import { useEffect, useMemo, useState } from "react";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { hasPermission } from "../lib/access";
import { normalizeApiError } from "../lib/reporting";
import {
  createRolCustom,
  deleteRolCustom,
  getCatalogoPermisos,
  getRolesDisponibles,
  updateRolCustom,
} from "../services/rolesService";

const RIESGO_BADGE = {
  BAJO: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  MEDIO: "bg-sky-50 text-sky-700 border border-sky-200",
  ALTO: "bg-amber-50 text-amber-800 border border-amber-200",
  CRITICO: "bg-rose-50 text-rose-700 border border-rose-200",
};

const emptyForm = () => ({
  id_rol: null,
  codigo: "",
  nombre: "",
  descripcion: "",
  permisos: [],
});

const PLATFORM_ROLE_CODES = new Set(["SUPER_ADMIN", "SUPER_ADMIN_SAAS"]);

function RolesCustomPage() {
  const { session } = useAppSession();
  const canManage = hasPermission(session, "roles.manage");

  const [roles, setRoles] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [mode, setMode] = useState("view"); // 'view' | 'create' | 'edit'
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selected = useMemo(
    () => roles.find((r) => r.id_rol === selectedId) || null,
    [roles, selectedId]
  );

  const permisosPorModulo = useMemo(() => {
    const map = new Map();
    for (const p of catalogo) {
      const key = p.modulo || "OTROS";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return [...map.entries()].map(([modulo, items]) => ({
      modulo,
      items,
    }));
  }, [catalogo]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError("");
      const [rolesRows, catalogoRows] = await Promise.all([
        getRolesDisponibles(),
        getCatalogoPermisos(),
      ]);
      setRoles(
        rolesRows.filter(
          (role) => !PLATFORM_ROLE_CODES.has(String(role.codigo || "").toUpperCase())
        )
      );
      setCatalogo(catalogoRows);
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, "No se pudieron cargar los roles")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (mode === "create") return;
    if (selected) {
      setForm({
        id_rol: selected.id_rol,
        codigo: selected.codigo || "",
        nombre: selected.nombre || "",
        descripcion: selected.descripcion || "",
        permisos: Array.isArray(selected.permisos)
          ? [...selected.permisos]
          : [],
      });
      setMode(selected.es_global ? "view" : "view");
    }
  }, [selectedId]);

  const handleStartCreate = () => {
    setSelectedId(null);
    setForm(emptyForm());
    setMode("create");
    setSuccess("");
    setError("");
  };

  const handleStartEdit = () => {
    if (!selected || selected.es_global) return;
    setMode("edit");
    setSuccess("");
    setError("");
  };

  const handleCancel = () => {
    setSuccess("");
    setError("");
    if (mode === "create") {
      setForm(emptyForm());
      setMode("view");
    } else if (mode === "edit" && selected) {
      setForm({
        id_rol: selected.id_rol,
        codigo: selected.codigo,
        nombre: selected.nombre || "",
        descripcion: selected.descripcion || "",
        permisos: [...(selected.permisos || [])],
      });
      setMode("view");
    }
  };

  const togglePermiso = (codigo) => {
    setForm((prev) => {
      const set = new Set(prev.permisos);
      if (set.has(codigo)) set.delete(codigo);
      else set.add(codigo);
      return { ...prev, permisos: [...set] };
    });
  };

  const toggleModuloAll = (items) => {
    setForm((prev) => {
      const set = new Set(prev.permisos);
      const codes = items.map((i) => i.codigo);
      const allOn = codes.every((c) => set.has(c));
      if (allOn) {
        codes.forEach((c) => set.delete(c));
      } else {
        codes.forEach((c) => set.add(c));
      }
      return { ...prev, permisos: [...set] };
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!canManage) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (mode === "create") {
        const payload = {
          codigo: form.codigo || form.nombre,
          nombre: form.nombre,
          descripcion: form.descripcion || null,
          permisos: form.permisos,
        };
        const created = await createRolCustom(payload);
        setSuccess(`Rol "${created.nombre}" creado correctamente.`);
        await loadPage();
        setSelectedId(created.id_rol);
        setMode("view");
      } else if (mode === "edit") {
        const payload = {
          nombre: form.nombre,
          descripcion: form.descripcion || null,
          permisos: form.permisos,
        };
        await updateRolCustom(form.id_rol, payload);
        setSuccess("Rol actualizado.");
        await loadPage();
        setMode("view");
      }
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, "No se pudo guardar el rol")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || selected.es_global) return;
    if (
      !window.confirm(
        `¿Eliminar el rol "${selected.nombre}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    try {
      setDeleting(true);
      setError("");
      setSuccess("");
      await deleteRolCustom(selected.id_rol);
      setSuccess(`Rol "${selected.nombre}" eliminado.`);
      setSelectedId(null);
      setForm(emptyForm());
      setMode("view");
      await loadPage();
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, "No se pudo eliminar el rol")
      );
    } finally {
      setDeleting(false);
    }
  };

  const readOnly =
    mode === "view" ||
    !canManage ||
    (selected && selected.es_global && mode !== "create");

  const editingTitle =
    mode === "create"
      ? "Nuevo rol custom"
      : selected
        ? selected.nombre
        : "Selecciona un rol";

  return (
    <main className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow="Administración"
        title="Roles y permisos"
        description="Crea roles personalizados para tu empresa y define exactamente qué puede hacer cada usuario. Los roles de plataforma SaaS no se administran dentro de la empresa."
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_1.4fr]">
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
                Roles ({roles.length})
              </p>
              {canManage ? (
                <button
                  className="btn-primary"
                  type="button"
                  onClick={handleStartCreate}
                >
                  Nuevo rol
                </button>
              ) : null}
            </div>

            <div className="mt-5 space-y-2">
              {loading ? (
                <p className="text-sm text-stone-500">Cargando roles…</p>
              ) : roles.length === 0 ? (
                <p className="text-sm text-stone-500">
                  No hay roles configurados.
                </p>
              ) : (
                roles.map((r) => {
                  const isActive = r.id_rol === selectedId && mode !== "create";
                  return (
                    <button
                      key={r.id_rol}
                      type="button"
                      onClick={() => {
                        setSelectedId(r.id_rol);
                        setMode("view");
                        setError("");
                        setSuccess("");
                      }}
                      className={`flex w-full items-start justify-between gap-3 rounded-2xl border p-4 text-left transition ${
                        isActive
                          ? "border-brand-600 bg-brand-50"
                          : "border-stone-200 bg-white hover:border-brand-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900">
                            {r.nombre}
                          </span>
                          {r.es_global ? (
                            <span className="rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-600">
                              Sistema
                            </span>
                          ) : (
                            <span className="rounded-full border border-brand-300 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-500">{r.codigo}</div>
                        {r.descripcion ? (
                          <div className="mt-1 text-xs leading-5 text-stone-500">
                            {r.descripcion}
                          </div>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 font-mono text-[10px] text-stone-600">
                        {Array.isArray(r.permisos) ? r.permisos.length : 0} perm
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </article>
        </div>

        <article className="panel p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Detalle
              </p>
              <h2 className="mt-1 text-2xl font-black text-stone-900">
                {editingTitle}
              </h2>
              {mode === "view" && selected ? (
                <p className="mt-1 text-xs text-stone-500">
                  {selected.es_global
                    ? "Rol del sistema (no editable). Sus permisos están definidos en el SaaS."
                    : "Rol personalizado de tu empresa. Puedes editar nombre, descripción y permisos."}
                </p>
              ) : null}
            </div>

            {mode === "view" && selected && !selected.es_global && canManage ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleStartEdit}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            ) : null}
          </div>

          {!selected && mode !== "create" ? (
            <p className="mt-6 text-sm leading-6 text-stone-500">
              Selecciona un rol del listado o crea uno nuevo para asignar
              permisos. Los permisos están agrupados por módulo y marcados por
              nivel de riesgo:{" "}
              <span className="font-semibold text-emerald-700">BAJO</span>,{" "}
              <span className="font-semibold text-sky-700">MEDIO</span>,{" "}
              <span className="font-semibold text-amber-700">ALTO</span>,{" "}
              <span className="font-semibold text-rose-700">CRITICO</span>.
            </p>
          ) : (
            <form className="mt-5 space-y-5" onSubmit={handleSave}>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Nombre
                  </label>
                  <input
                    className="field mt-1"
                    value={form.nombre}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        nombre: event.target.value,
                      }))
                    }
                    disabled={readOnly}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Código {mode === "create" ? "(opcional)" : ""}
                  </label>
                  <input
                    className="field mt-1 font-mono"
                    value={form.codigo}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        codigo: event.target.value.toUpperCase(),
                      }))
                    }
                    disabled={readOnly || mode === "edit"}
                    placeholder={
                      mode === "create"
                        ? "Se genera desde el nombre si lo dejas vacío"
                        : ""
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                  Descripción
                </label>
                <textarea
                  className="field mt-1"
                  rows={2}
                  value={form.descripcion}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      descripcion: event.target.value,
                    }))
                  }
                  disabled={readOnly}
                  placeholder="¿Qué hace este rol? (Ej. Encargado de turno noche con acceso a caja y reportes)"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Permisos ({form.permisos.length} / {catalogo.length})
                  </label>
                </div>
                <div className="mt-3 space-y-4">
                  {permisosPorModulo.map(({ modulo, items }) => {
                    const codes = items.map((i) => i.codigo);
                    const checkedCount = codes.filter((c) =>
                      form.permisos.includes(c)
                    ).length;
                    const allOn = checkedCount === codes.length;
                    return (
                      <div
                        key={modulo}
                        className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-stone-900">
                              {modulo}
                            </h3>
                            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-mono text-stone-700">
                              {checkedCount}/{codes.length}
                            </span>
                          </div>
                          {!readOnly ? (
                            <button
                              type="button"
                              className="text-xs font-semibold text-brand-700 hover:underline"
                              onClick={() => toggleModuloAll(items)}
                            >
                              {allOn ? "Quitar todos" : "Marcar todos"}
                            </button>
                          ) : null}
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {items.map((p) => {
                            const checked = form.permisos.includes(p.codigo);
                            return (
                              <label
                                key={p.codigo}
                                className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 text-sm transition ${
                                  checked
                                    ? "border-brand-400 bg-white shadow-sm"
                                    : "border-stone-200 bg-white"
                                } ${readOnly ? "cursor-default" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={checked}
                                  disabled={readOnly}
                                  onChange={() => togglePermiso(p.codigo)}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-stone-800">
                                      {p.nombre || p.codigo}
                                    </span>
                                    <span
                                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                        RIESGO_BADGE[p.riesgo] ||
                                        RIESGO_BADGE.BAJO
                                      }`}
                                    >
                                      {p.riesgo || "BAJO"}
                                    </span>
                                  </div>
                                  <div className="font-mono text-[10px] text-stone-500">
                                    {p.codigo}
                                  </div>
                                  {p.descripcion ? (
                                    <div className="mt-1 text-xs leading-5 text-stone-600">
                                      {p.descripcion}
                                    </div>
                                  ) : null}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {mode === "create" || mode === "edit" ? (
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving
                      ? "Guardando…"
                      : mode === "create"
                        ? "Crear rol"
                        : "Guardar cambios"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                </div>
              ) : null}
            </form>
          )}
        </article>
      </section>
    </main>
  );
}

export default RolesCustomPage;
