import { useEffect, useState } from "react";
import WorkspaceHero from "../components/WorkspaceHero";
import { normalizeApiError } from "../lib/reporting";
import {
  disable as disableMfa,
  enroll as enrollMfa,
  getStatus,
  regenerateBackupCodes,
  verifyEnrollment,
} from "../services/mfaService";

/**
 * Pantalla de gestion del 2FA del usuario actual.
 *
 * Estados:
 *  - loading: cargando estado inicial
 *  - disabled: MFA no enrolado → mostrar boton "Activar"
 *  - enrolling: muestra otpauth URI + backup codes + input para confirmar
 *  - enabled: MFA activo → mostrar info + boton "Regenerar codigos" / "Desactivar"
 *
 * El QR del otpauth URI lo dibujamos con un servicio publico para no agregar
 * deps de QR. Mostramos tambien el secret en texto por si el user no escanea.
 */
function MfaSettingsPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Estado de enrollment
  const [enrollData, setEnrollData] = useState(null);
  const [confirmCode, setConfirmCode] = useState("");

  // Estado de disable / regenerate
  const [disablePassword, setDisablePassword] = useState("");
  const [newBackupCodes, setNewBackupCodes] = useState(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getStatus();
      setStatus(data);
    } catch (err) {
      setError(normalizeApiError(err, "No se pudo cargar el estado de MFA"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleStartEnrollment = async () => {
    try {
      setError("");
      setSuccess("");
      const data = await enrollMfa();
      setEnrollData(data);
    } catch (err) {
      setError(normalizeApiError(err, "No se pudo iniciar la activación"));
    }
  };

  const handleConfirmEnrollment = async (event) => {
    event.preventDefault();
    try {
      setError("");
      await verifyEnrollment(confirmCode.trim());
      setSuccess(
        "MFA activado correctamente. Guarda los códigos de respaldo en un lugar seguro."
      );
      setConfirmCode("");
      // Mantenemos enrollData visible para que el usuario aún vea los backup codes
      await loadStatus();
    } catch (err) {
      setError(normalizeApiError(err, "Código inválido"));
    }
  };

  const handleDisable = async (event) => {
    event.preventDefault();
    if (
      !window.confirm(
        "¿Estás seguro de desactivar MFA? Tu cuenta volverá a depender solo del password."
      )
    ) {
      return;
    }
    try {
      setError("");
      await disableMfa(disablePassword);
      setSuccess("MFA desactivado.");
      setDisablePassword("");
      setEnrollData(null);
      setNewBackupCodes(null);
      await loadStatus();
    } catch (err) {
      setError(normalizeApiError(err, "No se pudo desactivar MFA"));
    }
  };

  const handleRegenerateCodes = async () => {
    if (
      !window.confirm(
        "¿Regenerar códigos de respaldo? Los anteriores quedarán inválidos."
      )
    ) {
      return;
    }
    try {
      setError("");
      const data = await regenerateBackupCodes();
      setNewBackupCodes(data.backup_codes);
      setSuccess(
        "Códigos regenerados. Guardalos en un lugar seguro — no se vuelven a mostrar."
      );
    } catch (err) {
      setError(normalizeApiError(err, "No se pudieron regenerar los códigos"));
    }
  };

  const qrSrc = enrollData?.otpauth_uri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
        enrollData.otpauth_uri
      )}`
    : null;

  return (
    <main className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow="Seguridad"
        title="Autenticación de dos factores (2FA)"
        description="Agregá una capa extra de seguridad: además del password, te pediremos un código de tu app authenticator (Google Authenticator, Authy, 1Password)."
      />

      <section className="mx-auto max-w-3xl space-y-6 px-6 py-8">
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

        {loading ? (
          <p className="text-sm text-stone-500">Cargando…</p>
        ) : status?.habilitado ? (
          // ----- MFA HABILITADO -----
          <article className="panel space-y-4 p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                ✓
              </span>
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  2FA activado
                </h2>
                <p className="text-sm text-stone-500">
                  Activado el{" "}
                  {status.habilitado_en
                    ? new Date(status.habilitado_en).toLocaleDateString()
                    : "—"}
                  {" · "}
                  Último uso:{" "}
                  {status.ultimo_uso_at
                    ? new Date(status.ultimo_uso_at).toLocaleString()
                    : "nunca"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
              <p>
                <strong>Códigos de respaldo restantes:</strong>{" "}
                <span className="font-mono">
                  {status.backup_codes_restantes}
                </span>{" "}
                / 8
              </p>
              {status.backup_codes_restantes < 3 ? (
                <p className="mt-1 text-amber-700">
                  Te quedan pocos códigos. Regenerá un set nuevo antes de
                  perderlos.
                </p>
              ) : null}
            </div>

            {newBackupCodes ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Nuevos códigos de respaldo (guardalos AHORA):
                </p>
                <div className="mt-3 grid gap-1 font-mono text-sm md:grid-cols-2">
                  {newBackupCodes.map((c) => (
                    <code
                      key={c}
                      className="rounded bg-white px-2 py-1 text-stone-900"
                    >
                      {c}
                    </code>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold text-brand-700 hover:underline"
                  onClick={() =>
                    navigator.clipboard?.writeText(newBackupCodes.join("\n"))
                  }
                >
                  Copiar al portapapeles
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRegenerateCodes}
              >
                Regenerar códigos de respaldo
              </button>
            </div>

            <form
              className="space-y-3 border-t border-stone-200 pt-5"
              onSubmit={handleDisable}
            >
              <p className="text-sm font-semibold text-stone-900">
                Desactivar 2FA
              </p>
              <p className="text-xs text-stone-500">
                Reduce la seguridad de tu cuenta. Confirma tu password.
              </p>
              <input
                type="password"
                className="field"
                placeholder="Tu password actual"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                required
              />
              <button
                type="submit"
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                Desactivar 2FA
              </button>
            </form>
          </article>
        ) : enrollData ? (
          // ----- ENROLLMENT EN PROGRESO -----
          <article className="panel space-y-5 p-6">
            <div>
              <h2 className="text-xl font-bold text-stone-900">
                Paso 1: Escaneá el código
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                Abrí tu app authenticator (Google Authenticator, Authy,
                1Password, Microsoft Authenticator…) y escaneá este QR.
              </p>
              {qrSrc ? (
                <div className="mt-4 flex justify-center">
                  <img
                    src={qrSrc}
                    alt="Código QR para configurar 2FA"
                    width={240}
                    height={240}
                    className="rounded-2xl border border-stone-200"
                  />
                </div>
              ) : null}
              <details className="mt-3 text-sm text-stone-600">
                <summary className="cursor-pointer">
                  ¿No podés escanear? Ingresá manual el código:
                </summary>
                <code className="mt-2 block break-all rounded-lg bg-stone-100 p-2 font-mono text-xs">
                  {enrollData.secret}
                </code>
              </details>
            </div>

            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Guardá tus códigos de respaldo (no vuelven a mostrarse):
              </p>
              <div className="mt-3 grid gap-1 font-mono text-sm md:grid-cols-2">
                {enrollData.backup_codes?.map((c) => (
                  <code
                    key={c}
                    className="rounded bg-white px-2 py-1 text-stone-900"
                  >
                    {c}
                  </code>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 text-xs font-semibold text-brand-700 hover:underline"
                onClick={() =>
                  navigator.clipboard?.writeText(
                    (enrollData.backup_codes || []).join("\n")
                  )
                }
              >
                Copiar al portapapeles
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleConfirmEnrollment}>
              <h3 className="text-base font-bold text-stone-900">
                Paso 2: Ingresá el primer código de tu app
              </h3>
              <input
                className="field text-center font-mono text-2xl tracking-[0.5em]"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={confirmCode.length < 6}
              >
                Activar 2FA
              </button>
              <button
                type="button"
                className="block w-full text-sm font-semibold text-stone-500 hover:underline"
                onClick={() => {
                  setEnrollData(null);
                  setConfirmCode("");
                }}
              >
                Cancelar
              </button>
            </form>
          </article>
        ) : (
          // ----- MFA NO ENROLADO -----
          <article className="panel space-y-4 p-6">
            <h2 className="text-xl font-bold text-stone-900">
              2FA no activado
            </h2>
            <p className="text-sm leading-6 text-stone-600">
              Aumentá significativamente la seguridad de tu cuenta. Una vez
              activado, además del password necesitarás un código temporal de
              tu app authenticator para iniciar sesión.
            </p>
            <ul className="space-y-2 text-sm text-stone-700">
              <li>• Compatible con Google Authenticator, Authy, 1Password.</li>
              <li>• Recibirás 8 códigos de respaldo de un solo uso.</li>
              <li>• Tomá menos de 2 minutos.</li>
            </ul>
            <button
              type="button"
              className="btn-primary"
              onClick={handleStartEnrollment}
            >
              Activar 2FA
            </button>
          </article>
        )}
      </section>
    </main>
  );
}

export default MfaSettingsPage;
