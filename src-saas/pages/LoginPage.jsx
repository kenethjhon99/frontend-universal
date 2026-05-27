import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSession } from "../hooks/useAppSession";
import { normalizeApiError } from "../lib/reporting";
import apiClient from "../services/apiClient";
import {
  confirmPasswordReset,
  requestPasswordReset,
} from "../services/authSecurityService";
import {
  DEFAULT_BRANDING,
  applyBranding,
  normalizeBranding,
} from "../lib/branding";

const BENEFITS = [
  "Ventas mas agiles",
  "Inventario en tiempo real",
  "Control de sucursales",
  "Reportes inteligentes",
  "Gestion CarWash",
  "Operacion centralizada",
];

function LoginPage() {
  const navigate = useNavigate();
  const { replaceSession } = useAppSession();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [authContext, setAuthContext] = useState({
    mode: "platform",
    tenant: null,
    branding: DEFAULT_BRANDING,
  });
  const [contextLoading, setContextLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [resetForm, setResetForm] = useState({
    email: "",
    token: "",
    newPassword: "",
  });
  const [resetMessage, setResetMessage] = useState("");
  const [debugResetTokens, setDebugResetTokens] = useState([]);

  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [companySelection, setCompanySelection] = useState(null);

  const branding = useMemo(
    () => normalizeBranding(authContext.branding),
    [authContext.branding]
  );

  useEffect(() => {
    let mounted = true;

    apiClient
      .get("/auth/context")
      .then((response) => {
        if (!mounted) return;
        setAuthContext({
          mode: response.data?.mode || "platform",
          tenant: response.data?.tenant || null,
          branding: normalizeBranding(response.data?.branding),
        });
      })
      .catch(() => {
        if (!mounted) return;
        setAuthContext({
          mode: "platform",
          tenant: null,
          branding: DEFAULT_BRANDING,
        });
      })
      .finally(() => {
        if (mounted) setContextLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    applyBranding(branding);
  }, [branding]);

  const finishLogin = (data) => {
    replaceSession(data);
    if (data?.mfa_enrollment_required) {
      navigate("/cuenta/seguridad/mfa", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleAuthResponse = (data) => {
    if (data?.company_selection_required) {
      setCompanySelection({
        challenge_token: data.challenge_token,
        companies: data.companies || [],
      });
      setMfaChallenge(null);
      return;
    }

    if (data?.mfa_required) {
      setMfaChallenge({
        challenge_token: data.challenge_token,
        requested_sucursal_id: data.requested_sucursal_id || null,
      });
      setCompanySelection(null);
      return;
    }

    finishLogin(data);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetChange = (event) => {
    const { name, value } = event.target;
    setResetForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      setLoading(true);
      const response = await apiClient.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });
      handleAuthResponse(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "No pudimos iniciar sesion. Revisa tus datos e intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = async (company) => {
    setError("");
    try {
      setLoading(true);
      const response = await apiClient.post("/auth/select-company", {
        challenge_token: companySelection.challenge_token,
        id_empresa: company.id_empresa,
      });
      handleAuthResponse(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "No pudimos abrir esa empresa. Vuelve a iniciar sesion."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      setLoading(true);
      const response = await apiClient.post("/auth/mfa/verify-login", {
        challenge_token: mfaChallenge.challenge_token,
        code: mfaCode.trim(),
        id_sucursal: mfaChallenge.requested_sucursal_id,
      });
      finishLogin(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error || "Codigo MFA invalido o expirado"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (event) => {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setDebugResetTokens([]);

    try {
      setLoading(true);
      const response = await requestPasswordReset(resetForm.email.trim());
      setResetMessage(
        "Si el correo esta registrado, enviaremos las instrucciones de recuperacion."
      );
      setDebugResetTokens(response.debug_tokens || []);
      setAuthMode("reset-confirm");
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          "No pudimos procesar la solicitud. Intenta nuevamente."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfirm = async (event) => {
    event.preventDefault();
    setError("");
    setResetMessage("");

    try {
      setLoading(true);
      await confirmPasswordReset({
        token: resetForm.token.trim(),
        newPassword: resetForm.newPassword,
      });
      setResetMessage("Tu contrasena fue actualizada. Ya puedes iniciar sesion.");
      setAuthMode("login");
      setForm((prev) => ({ ...prev, email: resetForm.email }));
      setResetForm((prev) => ({ ...prev, token: "", newPassword: "" }));
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          "No pudimos actualizar la contrasena. Revisa el codigo e intenta nuevamente."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const resetSecondarySteps = () => {
    setMfaChallenge(null);
    setMfaCode("");
    setCompanySelection(null);
    setError("");
  };

  const switchToLogin = () => {
    setAuthMode("login");
    setError("");
    setResetMessage("");
    setDebugResetTokens([]);
  };

  const primaryStyle = {
    backgroundColor: branding.color_primario,
  };
  const accentStyle = {
    color: branding.color_primario,
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8 sm:px-6 lg:px-8"
      style={{
        background: `linear-gradient(135deg, ${branding.color_secundario} 0%, #f8fafc 52%, #ffffff 100%)`,
      }}
    >
      <div className="absolute inset-0 bg-white/50" />
      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl lg:min-h-[680px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex min-h-[320px] flex-col justify-between overflow-hidden px-7 py-9 text-white sm:px-10 lg:min-h-full lg:px-12 lg:py-12">
          {branding.hero_image_url ? (
            <img
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              src={branding.hero_image_url}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(145deg, ${branding.color_secundario}, ${branding.color_primario})`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-slate-950/45" />

          <div className="relative">
            <div className="flex items-center gap-4">
              {branding.logo_url ? (
                <img
                  alt={branding.nombre_comercial}
                  className="h-12 w-12 rounded-2xl bg-white object-contain p-2 shadow-lg"
                  src={branding.logo_url}
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-black shadow-lg" style={accentStyle}>
                  {String(branding.nombre_comercial || "S").slice(0, 1)}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                  Acceso empresarial
                </p>
                <h1 className="mt-1 text-2xl font-black leading-tight">
                  {branding.nombre_comercial}
                </h1>
              </div>
            </div>

            <p className="mt-12 max-w-xl text-4xl font-black leading-tight sm:text-5xl">
              {branding.slogan}
            </p>
          </div>

          <div className="relative grid gap-3 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <div
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur"
                key={benefit}
              >
                {benefit}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center bg-white px-7 py-9 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em]" style={accentStyle}>
                {authContext.mode === "tenant"
                  ? authContext.tenant?.nombre_legal || "Tu empresa"
                  : "Bienvenido"}
              </p>
              <h2 className="mt-3 text-3xl font-black text-slate-950">
                {authMode === "login"
                  ? "Iniciar sesion"
                  : authMode === "reset-request"
                    ? "Recuperar acceso"
                    : "Crear nueva contrasena"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {authMode === "login"
                  ? "Ingresa con tu correo y contrasena. Nosotros cargamos tu empresa, permisos, sucursal y modulos automaticamente."
                  : "Usa tu correo para recuperar el acceso de forma segura."}
              </p>
            </div>

            {contextLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Preparando tu experiencia de acceso...
              </div>
            ) : null}

            {resetMessage ? (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {resetMessage}
              </div>
            ) : null}

            {authMode === "login" && !mfaChallenge && !companySelection ? (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Correo electronico
                  </span>
                  <input
                    autoComplete="email"
                    autoFocus
                    className="field"
                    inputMode="email"
                    name="email"
                    placeholder="tu@empresa.com"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                    <span>Contrasena</span>
                    <button
                      className="text-xs font-bold hover:underline"
                      style={accentStyle}
                      type="button"
                      onClick={() => {
                        setResetForm((prev) => ({
                          ...prev,
                          email: form.email,
                        }));
                        setAuthMode("reset-request");
                        setError("");
                      }}
                    >
                      Olvide mi contrasena
                    </button>
                  </span>
                  <input
                    autoComplete="current-password"
                    className="field"
                    name="password"
                    placeholder="Tu contrasena"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                </label>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  className="w-full rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                  style={primaryStyle}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>
            ) : null}

            {authMode === "reset-request" ? (
              <form className="space-y-4" onSubmit={handleResetRequest}>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Correo electronico
                  </span>
                  <input
                    autoComplete="email"
                    autoFocus
                    className="field"
                    inputMode="email"
                    name="email"
                    placeholder="tu@empresa.com"
                    type="email"
                    value={resetForm.email}
                    onChange={handleResetChange}
                    required
                  />
                </label>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  className="w-full rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                  style={primaryStyle}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar instrucciones"}
                </button>
                <button
                  className="block w-full text-sm font-semibold text-slate-500 hover:underline"
                  type="button"
                  onClick={switchToLogin}
                >
                  Volver al inicio de sesion
                </button>
              </form>
            ) : null}

            {authMode === "reset-confirm" ? (
              <form className="space-y-4" onSubmit={handleResetConfirm}>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Codigo de recuperacion
                  </span>
                  <input
                    autoFocus
                    className="field font-mono"
                    name="token"
                    placeholder="Codigo recibido"
                    type="text"
                    value={resetForm.token}
                    onChange={handleResetChange}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Nueva contrasena
                  </span>
                  <input
                    autoComplete="new-password"
                    className="field"
                    name="newPassword"
                    placeholder="Minimo 8 caracteres"
                    type="password"
                    value={resetForm.newPassword}
                    onChange={handleResetChange}
                    minLength={8}
                    required
                  />
                </label>

                {debugResetTokens.length > 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    <p className="font-bold">Modo desarrollo</p>
                    <p className="mt-1 break-all">
                      Token: {debugResetTokens[0]?.token}
                    </p>
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  className="w-full rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                  style={primaryStyle}
                  type="submit"
                  disabled={loading || resetForm.newPassword.length < 8}
                >
                  {loading ? "Actualizando..." : "Actualizar contrasena"}
                </button>
                <button
                  className="block w-full text-sm font-semibold text-slate-500 hover:underline"
                  type="button"
                  onClick={switchToLogin}
                >
                  Volver al inicio de sesion
                </button>
              </form>
            ) : null}

            {companySelection ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Selecciona la empresa con la que deseas trabajar.
                </div>
                <div className="space-y-3">
                  {companySelection.companies.map((company) => (
                    <button
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                      key={company.id_empresa}
                      type="button"
                      disabled={loading}
                      onClick={() => handleCompanySelect(company)}
                    >
                      <span>
                        <span className="block font-bold text-slate-950">
                          {company.nombre_legal}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          Espacio de trabajo empresarial
                        </span>
                      </span>
                      <span className="text-xl" style={accentStyle}>
                        -
                      </span>
                    </button>
                  ))}
                </div>
                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}
                <button
                  className="block w-full text-sm font-semibold text-slate-500 hover:underline"
                  type="button"
                  onClick={resetSecondarySteps}
                >
                  Usar otro correo
                </button>
              </div>
            ) : null}

            {mfaChallenge ? (
              <form className="space-y-4" onSubmit={handleMfaSubmit}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Tu cuenta tiene verificacion de dos pasos. Ingresa el codigo
                  de tu aplicacion de autenticacion o un codigo de respaldo.
                </div>
                <input
                  className="field text-center font-mono text-2xl tracking-[0.5em]"
                  inputMode="numeric"
                  autoFocus
                  placeholder="000000"
                  maxLength={9}
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  required
                />

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  className="w-full rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                  style={primaryStyle}
                  type="submit"
                  disabled={loading || mfaCode.length < 6}
                >
                  {loading ? "Verificando..." : "Verificar y entrar"}
                </button>
                <button
                  className="block w-full text-sm font-semibold text-slate-500 hover:underline"
                  type="button"
                  onClick={resetSecondarySteps}
                >
                  Cancelar
                </button>
              </form>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
