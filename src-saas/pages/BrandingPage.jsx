import { useEffect, useMemo, useState } from "react";
import WorkspaceHero from "../components/WorkspaceHero";
import { applyBranding, normalizeBranding } from "../lib/branding";
import { normalizeApiError } from "../lib/reporting";
import apiClient from "../services/apiClient";
import { useAppSession } from "../hooks/useAppSession";

const createFormFromBranding = (branding = {}) => {
  const normalized = normalizeBranding(branding);
  return {
    nombre_comercial: normalized.nombre_comercial || "",
    slogan: normalized.slogan || "",
    logo_principal_url: normalized.logo_principal_url || normalized.logo_url || "",
    logo_secundario_url: normalized.logo_secundario_url || "",
    logo_dark_url: normalized.logo_dark_url || "",
    favicon_url: normalized.favicon_url || "",
    color_primario: normalized.color_primario,
    color_secundario: normalized.color_secundario,
    color_acento: normalized.color_acento,
    login_hero_image_url:
      normalized.login?.hero_image_url || normalized.hero_image_url || "",
    pwa_name: normalized.pwa?.name || normalized.nombre_comercial || "",
    pwa_short_name: normalized.pwa?.short_name || "",
  };
};

const buildPayload = (form) => ({
  nombre_comercial: form.nombre_comercial.trim(),
  slogan: form.slogan.trim(),
  logo_principal_url: form.logo_principal_url.trim() || null,
  logo_secundario_url: form.logo_secundario_url.trim() || null,
  logo_dark_url: form.logo_dark_url.trim() || null,
  favicon_url: form.favicon_url.trim() || null,
  color_primario: form.color_primario,
  color_secundario: form.color_secundario,
  color_acento: form.color_acento,
  login: {
    hero_image_url: form.login_hero_image_url.trim() || null,
  },
  pwa: {
    name: form.pwa_name.trim() || form.nombre_comercial.trim(),
    short_name: form.pwa_short_name.trim() || form.nombre_comercial.trim().slice(0, 12),
  },
});

function BrandingPage() {
  const { session, replaceSession } = useAppSession();
  const [form, setForm] = useState(() => createFormFromBranding(session?.branding));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const previewBranding = useMemo(
    () => normalizeBranding(buildPayload(form)),
    [form]
  );

  useEffect(() => {
    let ignore = false;

    const loadBranding = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await apiClient.get("/empresas/me/branding");
        if (ignore) return;
        setForm(createFormFromBranding(response.data?.data));
      } catch (requestError) {
        if (!ignore) {
          setError(
            normalizeApiError(
              requestError,
              "No pudimos cargar la marca de la empresa."
            )
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadBranding();

    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveBranding = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const payload = buildPayload(form);
      const response = await apiClient.put("/empresas/me/branding", payload);
      const branding = normalizeBranding(response.data?.branding || payload);
      applyBranding(branding);
      replaceSession({ ...session, branding });
      setForm(createFormFromBranding(branding));
      setSuccess("Marca empresarial actualizada.");
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          "No pudimos guardar la marca. Revisa los campos e intenta nuevamente."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow="Administracion"
        title="Branding empresarial"
        description="Configura la identidad visual que veran tus usuarios en el acceso, la app y la PWA."
      />

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form className="panel space-y-6 p-6" onSubmit={saveBranding}>
          {loading ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
              Cargando configuracion de marca...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <section>
            <h2 className="text-lg font-black text-stone-950">Identidad</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold text-stone-700">
                  Nombre comercial
                </span>
                <input
                  className="field"
                  name="nombre_comercial"
                  value={form.nombre_comercial}
                  onChange={handleChange}
                  maxLength={160}
                  required
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-stone-700">
                  Eslogan
                </span>
                <input
                  className="field"
                  name="slogan"
                  value={form.slogan}
                  onChange={handleChange}
                  maxLength={240}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black text-stone-950">Colores</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {[
                ["color_primario", "Primario"],
                ["color_secundario", "Secundario"],
                ["color_acento", "Acento"],
              ].map(([name, label]) => (
                <label key={name}>
                  <span className="mb-2 block text-sm font-semibold text-stone-700">
                    {label}
                  </span>
                  <div className="flex gap-2">
                    <input
                      aria-label={label}
                      className="h-12 w-14 rounded-2xl border border-stone-300 bg-white p-1"
                      name={name}
                      type="color"
                      value={form[name]}
                      onChange={handleChange}
                    />
                    <input
                      className="field font-mono"
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      pattern="^#[0-9a-fA-F]{6}$"
                    />
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black text-stone-950">Activos visuales</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {[
                ["logo_principal_url", "Logo principal"],
                ["logo_secundario_url", "Logo secundario"],
                ["logo_dark_url", "Logo modo oscuro"],
                ["favicon_url", "Favicon"],
                ["login_hero_image_url", "Imagen de acceso"],
              ].map(([name, label]) => (
                <label key={name}>
                  <span className="mb-2 block text-sm font-semibold text-stone-700">
                    {label}
                  </span>
                  <input
                    className="field"
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black text-stone-950">PWA</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold text-stone-700">
                  Nombre de app
                </span>
                <input
                  className="field"
                  name="pwa_name"
                  value={form.pwa_name}
                  onChange={handleChange}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-stone-700">
                  Nombre corto
                </span>
                <input
                  className="field"
                  name="pwa_short_name"
                  value={form.pwa_short_name}
                  onChange={handleChange}
                  maxLength={16}
                />
              </label>
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar marca"}
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <section className="panel overflow-hidden">
            <div
              className="px-6 py-8 text-white"
              style={{
                background: `linear-gradient(145deg, ${previewBranding.color_secundario}, ${previewBranding.color_primario})`,
              }}
            >
              <div className="flex items-center gap-3">
                {previewBranding.logo_url ? (
                  <img
                    alt=""
                    className="h-12 w-12 rounded-2xl bg-white object-contain p-2"
                    src={previewBranding.logo_url}
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-black"
                    style={{ color: previewBranding.color_primario }}
                  >
                    {previewBranding.nombre_comercial.slice(0, 1)}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                    Acceso empresarial
                  </p>
                  <p className="font-black">{previewBranding.nombre_comercial}</p>
                </div>
              </div>
              <p className="mt-10 text-3xl font-black leading-tight">
                {previewBranding.slogan}
              </p>
            </div>
            <div className="space-y-3 p-6">
              <button
                className="w-full rounded-2xl px-5 py-3 text-sm font-black text-white"
                style={{ backgroundColor: previewBranding.color_primario }}
                type="button"
              >
                Entrar
              </button>
              <div
                className="rounded-2xl border px-4 py-3 text-sm font-semibold"
                style={{
                  borderColor: previewBranding.color_acento,
                  color: previewBranding.color_acento,
                }}
              >
                Inventario, ventas y sucursales bajo tu marca.
              </div>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

export default BrandingPage;
