import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import WorkspaceHero from "../components/WorkspaceHero";
import { useAppSession } from "../hooks/useAppSession";
import { formatDateTime, normalizeApiError } from "../lib/reporting";
import {
  listSessions,
  logoutAllSessions,
  revokeSession,
} from "../services/authSecurityService";

const describeDevice = (session) => {
  const agent = String(session?.user_agent || "").trim();
  if (!agent) return "Dispositivo sin identificar";

  if (/iphone|ipad|android|mobile/i.test(agent)) return "Dispositivo movil";
  if (/windows/i.test(agent)) return "Windows";
  if (/macintosh|mac os/i.test(agent)) return "macOS";
  if (/linux/i.test(agent)) return "Linux";
  return "Navegador";
};

function AccountSecurityPage() {
  const navigate = useNavigate();
  const { logout } = useAppSession();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await listSessions();
      setSessions(data);
    } catch (err) {
      setError(normalizeApiError(err, "No se pudieron cargar tus sesiones"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevoke = async (session) => {
    try {
      setWorkingId(session.id_refresh_token);
      setError("");
      await revokeSession(session.id_refresh_token);
      setMessage("Sesion cerrada correctamente.");
      await loadSessions();
    } catch (err) {
      setError(normalizeApiError(err, "No se pudo cerrar esa sesion"));
    } finally {
      setWorkingId(null);
    }
  };

  const handleLogoutAll = async () => {
    try {
      setWorkingId("all");
      setError("");
      await logoutAllSessions();
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(normalizeApiError(err, "No se pudieron cerrar las sesiones"));
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow="Cuenta"
        title="Seguridad de acceso"
        description="Administra tus sesiones activas y la proteccion de tu cuenta sin salir del espacio de trabajo."
        actions={
          <Link className="btn-secondary" to="/cuenta/seguridad/mfa">
            Configurar 2FA
          </Link>
        }
      />

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_360px]">
        <article className="panel p-6">
          <div className="flex flex-col gap-2 border-b border-stone-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-stone-900">
                Sesiones activas
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Revisa donde esta abierta tu cuenta y cierra accesos que no
                reconozcas.
              </p>
            </div>
            <button
              className="btn-secondary"
              type="button"
              onClick={loadSessions}
              disabled={loading}
            >
              Actualizar
            </button>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="text-sm text-stone-500">Cargando sesiones...</p>
            ) : sessions.length === 0 ? (
              <p className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                No hay sesiones activas registradas.
              </p>
            ) : (
              sessions.map((session) => (
                <div
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                  key={session.id_refresh_token}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-bold text-stone-900">
                        {describeDevice(session)}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        IP: {session.ip || "Sin dato"}
                      </p>
                      <p className="mt-2 max-w-2xl break-all text-xs text-stone-400">
                        {session.user_agent || "User agent no disponible"}
                      </p>
                    </div>
                    <button
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      type="button"
                      disabled={workingId === session.id_refresh_token}
                      onClick={() => handleRevoke(session)}
                    >
                      {workingId === session.id_refresh_token
                        ? "Cerrando..."
                        : "Cerrar sesion"}
                    </button>
                  </div>
                  <dl className="mt-4 grid gap-3 border-t border-stone-100 pt-4 text-xs text-stone-500 sm:grid-cols-3">
                    <div>
                      <dt className="font-semibold text-stone-700">Creada</dt>
                      <dd className="mt-1">{formatDateTime(session.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-stone-700">
                        Ultimo uso
                      </dt>
                      <dd className="mt-1">
                        {formatDateTime(session.last_used_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-stone-700">Expira</dt>
                      <dd className="mt-1">{formatDateTime(session.expires_at)}</dd>
                    </div>
                  </dl>
                </div>
              ))
            )}
          </div>
        </article>

        <aside className="space-y-6">
          <article className="panel p-6">
            <h2 className="text-lg font-bold text-stone-900">
              Proteccion recomendada
            </h2>
            <div className="mt-4 space-y-3 text-sm text-stone-600">
              <p>Usa 2FA en cuentas administrativas.</p>
              <p>Cierra sesiones que no reconozcas.</p>
              <p>Cambia tu contrasena si pierdes un dispositivo.</p>
            </div>
            <Link className="btn-primary mt-5 inline-flex" to="/cuenta/seguridad/mfa">
              Revisar 2FA
            </Link>
          </article>

          <article className="panel border-rose-200 bg-rose-50 p-6">
            <h2 className="text-lg font-bold text-rose-900">
              Cerrar todo
            </h2>
            <p className="mt-2 text-sm leading-6 text-rose-700">
              Cierra tu cuenta en todos los dispositivos. Tendras que iniciar
              sesion nuevamente.
            </p>
            <button
              className="mt-5 w-full rounded-xl bg-rose-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-800 disabled:opacity-60"
              type="button"
              disabled={workingId === "all"}
              onClick={handleLogoutAll}
            >
              {workingId === "all" ? "Cerrando..." : "Cerrar todas las sesiones"}
            </button>
          </article>
        </aside>
      </section>
    </main>
  );
}

export default AccountSecurityPage;

