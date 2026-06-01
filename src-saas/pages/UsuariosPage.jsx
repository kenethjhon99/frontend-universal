import { useEffect, useMemo, useState } from "react";
import SucursalSwitcher from "../components/SucursalSwitcher";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { hasRole } from "../lib/access";
import apiClient from "../services/apiClient";
import { getSucursales } from "../services/sucursalesService";
import {
  createUsuario,
  getAssignableRoles,
  getUsuarioById,
  getUsuarios,
  updateUsuario,
  updateUsuarioEstado,
} from "../services/usuariosService";

const createEmptyForm = () => ({
  username: "",
  email: "",
  nombre: "",
  apellido: "",
  password: "",
  role_codes: [],
  branch_ids: [],
  id_sucursal_default: "",
});

const normalizeError = (error, fallback) =>
  error.response?.data?.error || fallback;

const buildFormFromUser = (user) => ({
  username: user?.username || "",
  email: user?.email || "",
  nombre: user?.nombre || "",
  apellido: user?.apellido || "",
  password: "",
  role_codes: (user?.roles || []).map((role) => role.codigo),
  branch_ids: (user?.sucursales || []).map((branch) => Number(branch.id_sucursal)),
  id_sucursal_default:
    user?.id_sucursal_default ||
    user?.sucursales?.find((branch) => branch.es_predeterminada)?.id_sucursal ||
    "",
});

const PLATFORM_ROLE_CODES = new Set(["SUPER_ADMIN", "SUPER_ADMIN_SAAS"]);

function UsuariosPage() {
  const { session, replaceSession } = useAppSession();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formMode, setFormMode] = useState("create");
  const [form, setForm] = useState(createEmptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManageAdmins = hasRole(session, "ADMIN_EMPRESA");
  const actorId = session?.user?.id_usuario;
  const isEditing = formMode === "edit";
  const isEditingSelf =
    isEditing && Number(selectedUser?.id_usuario) === Number(actorId);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError("");

      const [userRows, roleRows, branchRows] = await Promise.all([
        getUsuarios({
          activo:
            statusFilter === "ACTIVOS"
              ? "true"
              : statusFilter === "INACTIVOS"
                ? "false"
                : undefined,
          search: search || undefined,
          limit: 50,
        }),
        getAssignableRoles(),
        getSucursales(),
      ]);

      setUsuarios(userRows);
      setRoles(
        roleRows.filter(
          (role) => !PLATFORM_ROLE_CODES.has(String(role.codigo || "").toUpperCase())
        )
      );
      setSucursales(branchRows);
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo cargar el modulo de usuarios"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [search, statusFilter]);

  useEffect(() => {
    const loadSelectedUser = async () => {
      if (!selectedUserId) {
        setSelectedUser(null);
        return;
      }

      try {
        setLoadingDetail(true);
        const user = await getUsuarioById(selectedUserId);
        setSelectedUser(user);
      } catch (requestError) {
        setError(normalizeError(requestError, "No se pudo cargar el detalle del usuario"));
      } finally {
        setLoadingDetail(false);
      }
    };

    loadSelectedUser();
  }, [selectedUserId]);

  const summary = useMemo(
    () => ({
      total: usuarios.length,
      activos: usuarios.filter((user) => user.activo === true).length,
      encargados: usuarios.filter((user) =>
        (user.roles || []).some((role) => role.codigo === "ENCARGADO_SUCURSAL")
      ).length,
      cajeros: usuarios.filter((user) =>
        (user.roles || []).some((role) => role.codigo === "CAJERO")
      ).length,
    }),
    [usuarios]
  );

  const resetForm = () => {
    setFormMode("create");
    setSelectedUserId(null);
    setSelectedUser(null);
    setForm(createEmptyForm());
    setError("");
  };

  const startEdit = async (idUsuario) => {
    try {
      setLoadingDetail(true);
      setError("");
      const user = await getUsuarioById(idUsuario);
      setSelectedUserId(user.id_usuario);
      setSelectedUser(user);
      setFormMode("edit");
      setForm(buildFormFromUser(user));
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo abrir el usuario para editar"));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRoleToggle = (roleCode) => {
    setForm((prev) => {
      const nextRoles = prev.role_codes.includes(roleCode)
        ? prev.role_codes.filter((current) => current !== roleCode)
        : [...prev.role_codes, roleCode];

      return {
        ...prev,
        role_codes: nextRoles,
      };
    });
  };

  const handleBranchToggle = (branchId) => {
    setForm((prev) => {
      const currentIds = prev.branch_ids.map(Number);
      const exists = currentIds.includes(branchId);
      const nextBranchIds = exists
        ? currentIds.filter((currentId) => currentId !== branchId)
        : [...currentIds, branchId];
      const nextDefault =
        nextBranchIds.includes(Number(prev.id_sucursal_default))
          ? prev.id_sucursal_default
          : nextBranchIds[0] || "";

      return {
        ...prev,
        branch_ids: nextBranchIds,
        id_sucursal_default: nextDefault,
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.username || !form.nombre || !form.apellido) {
      setError("username, nombre y apellido son requeridos");
      return;
    }

    if (!isEditing && !form.password) {
      setError("Debes indicar un password para el nuevo usuario");
      return;
    }

    if (!isEditingSelf && form.role_codes.length === 0) {
      setError("Selecciona al menos un rol");
      return;
    }

    if (!isEditingSelf && form.branch_ids.length === 0) {
      setError("Selecciona al menos una sucursal");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        username: form.username,
        email: form.email || null,
        nombre: form.nombre,
        apellido: form.apellido,
        ...(form.password ? { password: form.password } : {}),
      };

      if (!isEditingSelf) {
        payload.role_codes = form.role_codes;
        payload.branch_ids = form.branch_ids;
        payload.id_sucursal_default = Number(form.id_sucursal_default);
      }

      const data = isEditing
        ? await updateUsuario(selectedUser.id_usuario, payload)
        : await createUsuario(payload);

      if (isEditing && Number(data?.id_usuario) === Number(actorId)) {
        const sessionResponse = await apiClient.get("/auth/me");
        replaceSession(sessionResponse.data);
      }

      setSuccess(isEditing ? "Usuario actualizado correctamente." : "Usuario creado correctamente.");
      await loadPage();
      setSelectedUserId(data?.id_usuario || null);
      setSelectedUser(data || null);
      setFormMode("edit");
      setForm(buildFormFromUser(data));
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo guardar el usuario"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (user) => {
    const nextActivo = !(user.activo === true);
    const confirmed = window.confirm(
      nextActivo
        ? `Deseas activar el usuario ${user.username}?`
        : `Deseas desactivar el usuario ${user.username}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");
      await updateUsuarioEstado(user.id_usuario, nextActivo);
      setSuccess(nextActivo ? "Usuario activado." : "Usuario desactivado.");
      await loadPage();
      if (Number(selectedUserId) === Number(user.id_usuario)) {
        const refreshed = await getUsuarioById(user.id_usuario);
        setSelectedUser(refreshed);
      }
    } catch (requestError) {
      setError(normalizeError(requestError, "No se pudo actualizar el estado del usuario"));
    }
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <WorkspaceHero
        eyebrow="Usuarios"
        title="Roles y sucursales por usuario"
        description="Administra cuentas, asigna roles y define exactamente en que sucursales puede operar cada persona dentro de la empresa."
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

          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Total usuarios</p>
              <p className="mt-3 text-2xl font-black text-stone-900">{summary.total}</p>
            </article>
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Activos</p>
              <p className="mt-3 text-2xl font-black text-stone-900">{summary.activos}</p>
            </article>
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Encargados</p>
              <p className="mt-3 text-2xl font-black text-stone-900">{summary.encargados}</p>
            </article>
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Cajeros</p>
              <p className="mt-3 text-2xl font-black text-stone-900">{summary.cajeros}</p>
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="panel p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                    {isEditing ? "Editar usuario" : "Nuevo usuario"}
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-stone-900">
                    {isEditing ? selectedUser?.username : "Crear cuenta de acceso"}
                  </h2>
                </div>
                <button className="btn-secondary" type="button" onClick={resetForm}>
                  Nuevo usuario
                </button>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="field"
                    placeholder="username"
                    value={form.username}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, username: event.target.value }))
                    }
                  />
                  <input
                    className="field"
                    type="email"
                    placeholder="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                  <input
                    className="field"
                    placeholder="nombre"
                    value={form.nombre}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, nombre: event.target.value }))
                    }
                  />
                  <input
                    className="field"
                    placeholder="apellido"
                    value={form.apellido}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, apellido: event.target.value }))
                    }
                  />
                </div>

                <input
                  className="field"
                  type="password"
                  placeholder={
                    isEditing
                      ? "Nuevo password opcional"
                      : "Password inicial"
                  }
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                />

                {isEditingSelf ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                    Puedes actualizar tus datos basicos y password, pero por seguridad
                    tus roles y sucursales se gestionan desde otra cuenta administrativa.
                  </div>
                ) : (
                  <>
                    <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-sm font-bold text-stone-900">Roles asignados</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {roles.map((role) => (
                          <label
                            key={role.codigo}
                            className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4"
                          >
                            <input
                              className="mt-1 h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                              type="checkbox"
                              checked={form.role_codes.includes(role.codigo)}
                              onChange={() => handleRoleToggle(role.codigo)}
                            />
                            <span>
                              <span className="block text-sm font-semibold text-stone-900">
                                {role.nombre}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-stone-500">
                                {role.descripcion}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-sm font-bold text-stone-900">
                        Sucursales permitidas
                      </p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {sucursales.map((branch) => (
                          <label
                            key={branch.id_sucursal}
                            className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4"
                          >
                            <input
                              className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                              type="checkbox"
                              checked={form.branch_ids.includes(Number(branch.id_sucursal))}
                              onChange={() => handleBranchToggle(Number(branch.id_sucursal))}
                            />
                            <span>
                              <span className="block text-sm font-semibold text-stone-900">
                                {branch.codigo} - {branch.nombre}
                              </span>
                              <span className="mt-1 block text-xs text-stone-500">
                                {branch.total_usuarios_asignados} usuarios asignados
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <select
                      className="field"
                      value={form.id_sucursal_default}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          id_sucursal_default: event.target.value,
                        }))
                      }
                    >
                      <option value="">Selecciona sucursal por defecto</option>
                      {sucursales
                        .filter((branch) =>
                          form.branch_ids.includes(Number(branch.id_sucursal))
                        )
                        .map((branch) => (
                          <option key={branch.id_sucursal} value={branch.id_sucursal}>
                            {branch.codigo} - {branch.nombre}
                          </option>
                        ))}
                    </select>
                  </>
                )}

                <div className="flex flex-wrap gap-3">
                  <button className="btn-primary" disabled={saving} type="submit">
                    {saving
                      ? "Guardando..."
                      : isEditing
                        ? "Actualizar usuario"
                        : "Crear usuario"}
                  </button>
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
                      Usuarios de la empresa
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <select
                      className="field sm:min-w-[180px]"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <option value="TODOS">Todos</option>
                      <option value="ACTIVOS">Activos</option>
                      <option value="INACTIVOS">Inactivos</option>
                    </select>
                    <input
                      className="field"
                      placeholder="Buscar por username o nombre"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>

                <div className="table-shell mt-6 overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Roles</th>
                        <th>Sucursales</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5}>Cargando usuarios...</td>
                        </tr>
                      ) : usuarios.length === 0 ? (
                        <tr>
                          <td colSpan={5}>No hay usuarios registrados.</td>
                        </tr>
                      ) : (
                        usuarios.map((user) => (
                          <tr
                            key={user.id_usuario}
                            className={
                              Number(user.id_usuario) === Number(selectedUserId)
                                ? "bg-brand-50"
                                : ""
                            }
                          >
                            <td>
                              <button
                                className="text-left"
                                type="button"
                                onClick={() => setSelectedUserId(user.id_usuario)}
                              >
                                <div className="font-semibold text-stone-900">
                                  {user.username}
                                </div>
                                <div className="mt-1 text-xs text-stone-500">
                                  {user.nombre} {user.apellido}
                                </div>
                              </button>
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-2">
                                {(user.roles || []).map((role) => (
                                  <span key={role.codigo} className="chip">
                                    {role.nombre}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              {(user.sucursales || []).map((branch) => branch.codigo).join(", ")}
                            </td>
                            <td>
                              <span className={user.activo ? "badge-success" : "badge-muted"}>
                                {user.activo ? "ACTIVO" : "INACTIVO"}
                              </span>
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  className="chip"
                                  type="button"
                                  onClick={() => startEdit(user.id_usuario)}
                                >
                                  Editar
                                </button>
                                <button
                                  className="chip"
                                  type="button"
                                  onClick={() => handleToggleEstado(user)}
                                  disabled={Number(user.id_usuario) === Number(actorId)}
                                >
                                  {user.activo ? "Desactivar" : "Activar"}
                                </button>
                              </div>
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
                  Detalle
                </p>
                {loadingDetail ? (
                  <p className="mt-4 text-sm text-stone-500">Cargando detalle...</p>
                ) : selectedUser ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <h2 className="text-2xl font-black text-stone-900">
                        {selectedUser.username}
                      </h2>
                      <p className="mt-2 text-sm text-stone-500">
                        {selectedUser.nombre} {selectedUser.apellido}
                        {selectedUser.email ? ` | ${selectedUser.email}` : ""}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                        Sucursal por defecto
                      </p>
                      <p className="mt-2 text-lg font-bold text-stone-900">
                        {selectedUser.sucursal_default
                          ? `${selectedUser.sucursal_default.codigo} - ${selectedUser.sucursal_default.nombre}`
                          : "Sin sucursal por defecto"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-stone-900">Sucursales asignadas</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(selectedUser.sucursales || []).map((branch) => (
                          <span
                            key={branch.id_sucursal}
                            className={branch.es_predeterminada ? "badge-success" : "chip"}
                          >
                            {branch.codigo} - {branch.nombre}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-stone-900">Roles</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(selectedUser.roles || []).map((role) => (
                          <span key={role.codigo} className="chip">
                            {role.nombre}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => startEdit(selectedUser.id_usuario)}
                      >
                        Editar este usuario
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-stone-500">
                    Selecciona un usuario del historial para ver su detalle y editarlo.
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
              Alcance
            </p>
            <p className="mt-3 text-lg font-bold text-stone-900">
              {canManageAdmins
                ? "Administracion de empresa"
                : "Gestion de personal por sucursal"}
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              {canManageAdmins
                ? "Puedes crear admins de empresa, encargados y cajeros dentro de tu tenant."
                : "Como encargado solo puedes gestionar cajeros dentro de tus sucursales asignadas."}
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default UsuariosPage;
