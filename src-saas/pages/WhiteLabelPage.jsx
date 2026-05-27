import { useEffect, useMemo, useState } from "react";
import WorkspaceHero from "../components/WorkspaceHero";
import { normalizeApiError } from "../lib/reporting";
import apiClient from "../services/apiClient";

const createForm = (whiteLabel = {}) => ({
  nivel: whiteLabel.nivel || "NONE",
  estado: whiteLabel.estado || "INACTIVO",
  dominio_principal: whiteLabel.dominio_principal || "",
  subdominio: whiteLabel.subdominio || "",
  ssl_gestionado: whiteLabel.ssl_gestionado !== false,
  correo_dominio: whiteLabel.correo_dominio || "",
  email_from: whiteLabel.email_from || "",
  api_privada_activa: whiteLabel.api_privada_activa === true,
  api_base_path: whiteLabel.api_base_path || "/api/private",
  dedicated_db_estado: whiteLabel.dedicated_db_estado || "NO_APLICA",
});

function WhiteLabelPage() {
  const [form, setForm] = useState(() => createForm());
  const [domainForm, setDomainForm] = useState({
    hostname: "",
    tipo: "DOMINIO_PROPIO",
    es_primario: true,
  });
  const [keyForm, setKeyForm] = useState({
    nombre: "",
    scopes: [],
  });
  const [data, setData] = useState({
    white_label: {},
    dominios: [],
    api_keys: [],
    api_scopes_disponibles: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [apiToken, setApiToken] = useState("");

  const activeDomain = useMemo(
    () => data.dominios.find((item) => item.es_primario) || data.dominios[0] || null,
    [data.dominios]
  );

  const loadPage = async () => {
    const response = await apiClient.get("/empresas/me/white-label");
    const nextData = response.data?.data || {};
    setData({
      white_label: nextData.white_label || {},
      dominios: nextData.dominios || [],
      api_keys: nextData.api_keys || [],
      api_scopes_disponibles: nextData.api_scopes_disponibles || [],
    });
    setForm(createForm(nextData.white_label || {}));
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        await loadPage();
      } catch (requestError) {
        if (!ignore) {
          setError(
            normalizeApiError(
              requestError,
              "No pudimos cargar la configuracion white label."
            )
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const saveWhiteLabel = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await apiClient.put("/empresas/me/white-label", {
        ...form,
        dominio_principal: form.dominio_principal.trim() || null,
        subdominio: form.subdominio.trim() || null,
        correo_dominio: form.correo_dominio.trim() || null,
        email_from: form.email_from.trim() || null,
      });
      await loadPage();
      setSuccess("Configuracion white label actualizada.");
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          "No pudimos guardar la configuracion white label."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const createDomain = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const response = await apiClient.post("/tenant-dominios", {
        hostname: domainForm.hostname.trim(),
        tipo: domainForm.tipo,
        es_primario: domainForm.es_primario,
        white_label_activo: true,
      });
      await loadPage();
      setDomainForm({ hostname: "", tipo: "DOMINIO_PROPIO", es_primario: true });
      setSuccess(
        response.data?.data?.instrucciones_verificacion?.mensaje ||
          "Dominio creado. Revisa las instrucciones DNS para verificarlo."
      );
    } catch (requestError) {
      setError(normalizeApiError(requestError, "No pudimos crear el dominio."));
    } finally {
      setSaving(false);
    }
  };

  const verifyDomain = async (domain) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await apiClient.post(`/tenant-dominios/${domain.id_dominio}/verificar`);
      await loadPage();
      setSuccess("Dominio verificado correctamente.");
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          "No pudimos verificar el dominio. Confirma el TXT en tu DNS."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const createApiKey = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const response = await apiClient.post("/empresas/me/api-keys", keyForm);
      setApiToken(response.data?.data?.token || "");
      setKeyForm({ nombre: "", scopes: [] });
      await loadPage();
      setSuccess("Clave API creada. Copia el token ahora; no se volvera a mostrar.");
    } catch (requestError) {
      setError(normalizeApiError(requestError, "No pudimos crear la clave API."));
    } finally {
      setSaving(false);
    }
  };

  const revokeApiKey = async (apiKey) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await apiClient.post(`/empresas/me/api-keys/${apiKey.id_api_key}/revoke`);
      await loadPage();
      setSuccess("Clave API revocada.");
    } catch (requestError) {
      setError(normalizeApiError(requestError, "No pudimos revocar la clave API."));
    } finally {
      setSaving(false);
    }
  };

  const toggleScope = (scope) => {
    setKeyForm((prev) => {
      const current = new Set(prev.scopes);
      if (current.has(scope)) current.delete(scope);
      else current.add(scope);
      return { ...prev, scopes: [...current] };
    });
  };

  return (
    <div className="min-h-screen bg-stone-100">
      <WorkspaceHero
        eyebrow="Configuracion"
        title="White Label Premium"
        description="Gestiona dominio propio, SSL, correo corporativo, API privada y preparacion para recursos dedicados."
      />

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-6">
          {loading ? (
            <div className="panel px-5 py-4 text-sm text-stone-600">
              Cargando white label...
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

          <form className="panel space-y-6 p-6" onSubmit={saveWhiteLabel}>
            <div>
              <h2 className="text-lg font-black text-stone-950">
                Configuracion premium
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-stone-700">
                    Nivel
                  </span>
                  <select
                    className="field"
                    name="nivel"
                    value={form.nivel}
                    onChange={handleChange}
                  >
                    <option value="NONE">Sin white label</option>
                    <option value="DOMAIN">Dominio propio</option>
                    <option value="DEDICATED_LOGICAL">Recursos dedicados logicos</option>
                    <option value="DEDICATED_DB">Base dedicada</option>
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-stone-700">
                    Estado
                  </span>
                  <select
                    className="field"
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                  >
                    <option value="INACTIVO">Inactivo</option>
                    <option value="SOLICITADO">Solicitado</option>
                    <option value="ACTIVO">Activo</option>
                    <option value="SUSPENDIDO">Suspendido</option>
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-stone-700">
                    Dominio principal
                  </span>
                  <input
                    className="field"
                    name="dominio_principal"
                    value={form.dominio_principal}
                    onChange={handleChange}
                    placeholder="pos.cliente.com"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-stone-700">
                    Subdominio SaaS
                  </span>
                  <input
                    className="field"
                    name="subdominio"
                    value={form.subdominio}
                    onChange={handleChange}
                    placeholder="cliente.app.com"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-stone-700">
                    Dominio de correo
                  </span>
                  <input
                    className="field"
                    name="correo_dominio"
                    value={form.correo_dominio}
                    onChange={handleChange}
                    placeholder="cliente.com"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-stone-700">
                    Remitente
                  </span>
                  <input
                    className="field"
                    name="email_from"
                    value={form.email_from}
                    onChange={handleChange}
                    placeholder="soporte@cliente.com"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-stone-700">
                    Estado base dedicada
                  </span>
                  <select
                    className="field"
                    name="dedicated_db_estado"
                    value={form.dedicated_db_estado}
                    onChange={handleChange}
                  >
                    <option value="NO_APLICA">No aplica</option>
                    <option value="SOLICITADA">Solicitada</option>
                    <option value="PROVISIONANDO">Provisionando</option>
                    <option value="ACTIVA">Activa</option>
                    <option value="ERROR">Error</option>
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-stone-700">
                    Ruta API privada
                  </span>
                  <input
                    className="field"
                    name="api_base_path"
                    value={form.api_base_path}
                    onChange={handleChange}
                  />
                </label>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700">
                  <input
                    name="ssl_gestionado"
                    type="checkbox"
                    checked={form.ssl_gestionado}
                    onChange={handleChange}
                  />
                  SSL gestionado
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700">
                  <input
                    name="api_privada_activa"
                    type="checkbox"
                    checked={form.api_privada_activa}
                    onChange={handleChange}
                  />
                  API privada activa
                </label>
              </div>
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar configuracion"}
              </button>
            </div>
          </form>

          <section className="panel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-stone-950">Dominios</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Agrega dominios propios o subdominios para resolver el tenant automaticamente.
                </p>
              </div>
              <form className="grid gap-3 sm:grid-cols-[1fr_160px_auto]" onSubmit={createDomain}>
                <input
                  className="field"
                  placeholder="pos.cliente.com"
                  value={domainForm.hostname}
                  onChange={(event) =>
                    setDomainForm((prev) => ({ ...prev, hostname: event.target.value }))
                  }
                  required
                />
                <select
                  className="field"
                  value={domainForm.tipo}
                  onChange={(event) =>
                    setDomainForm((prev) => ({ ...prev, tipo: event.target.value }))
                  }
                >
                  <option value="DOMINIO_PROPIO">Dominio</option>
                  <option value="SUBDOMINIO">Subdominio</option>
                </select>
                <button className="btn-secondary" type="submit" disabled={saving}>
                  Agregar
                </button>
              </form>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-stone-200">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Dominio</th>
                    <th>DNS</th>
                    <th>SSL</th>
                    <th>Tipo</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.dominios.map((domain) => (
                    <tr key={domain.id_dominio}>
                      <td>
                        <p className="font-bold text-stone-900">{domain.hostname}</p>
                        {domain.es_primario ? (
                          <p className="mt-1 text-xs text-brand-700">Principal</p>
                        ) : null}
                      </td>
                      <td>
                        <span className={domain.verificado ? "badge-success" : "badge-warning"}>
                          {domain.verificado ? "Verificado" : domain.dns_estado}
                        </span>
                      </td>
                      <td>
                        <span className={domain.ssl_estado === "EMITIDO" ? "badge-success" : "badge-muted"}>
                          {domain.ssl_estado || "PENDIENTE"}
                        </span>
                      </td>
                      <td className="text-xs font-semibold text-stone-500">
                        {domain.tipo}
                      </td>
                      <td className="text-right">
                        {!domain.verificado ? (
                          <button
                            className="btn-secondary py-2"
                            type="button"
                            disabled={saving}
                            onClick={() => verifyDomain(domain)}
                          >
                            Verificar
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {data.dominios.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-stone-500">
                        Aun no hay dominios white label.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <aside className="space-y-6">
          <section className="panel p-6">
            <h2 className="text-lg font-black text-stone-950">Estado premium</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-stone-500">Nivel</span>
                <span className="font-bold text-stone-900">{form.nivel}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-stone-500">Dominio activo</span>
                <span className="font-bold text-stone-900">
                  {activeDomain?.hostname || "Pendiente"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-stone-500">API privada</span>
                <span className={form.api_privada_activa ? "badge-success" : "badge-muted"}>
                  {form.api_privada_activa ? "Activa" : "Inactiva"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-stone-500">Base dedicada</span>
                <span className="font-bold text-stone-900">
                  {form.dedicated_db_estado}
                </span>
              </div>
            </div>
          </section>

          <section className="panel p-6">
            <h2 className="text-lg font-black text-stone-950">API privada</h2>
            <form className="mt-4 space-y-4" onSubmit={createApiKey}>
              <input
                className="field"
                placeholder="Nombre de la clave"
                value={keyForm.nombre}
                onChange={(event) =>
                  setKeyForm((prev) => ({ ...prev, nombre: event.target.value }))
                }
                required
              />
              <div className="grid gap-2">
                {data.api_scopes_disponibles.map((scope) => (
                  <label
                    className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700"
                    key={scope}
                  >
                    <input
                      type="checkbox"
                      checked={keyForm.scopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                    />
                    {scope}
                  </label>
                ))}
              </div>
              <button className="btn-primary w-full" type="submit" disabled={saving}>
                Crear clave
              </button>
            </form>

            {apiToken ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <p className="font-bold">Token visible una sola vez</p>
                <p className="mt-2 break-all font-mono">{apiToken}</p>
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              {data.api_keys.map((apiKey) => (
                <div
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3"
                  key={apiKey.id_api_key}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-stone-900">{apiKey.nombre}</p>
                      <p className="mt-1 font-mono text-xs text-stone-500">
                        {apiKey.key_prefix}...
                      </p>
                    </div>
                    <span className={apiKey.estado === "ACTIVA" ? "badge-success" : "badge-muted"}>
                      {apiKey.estado}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(apiKey.scopes || []).map((scope) => (
                      <span className="badge-muted" key={scope}>
                        {scope}
                      </span>
                    ))}
                  </div>
                  {apiKey.estado === "ACTIVA" ? (
                    <button
                      className="mt-3 text-sm font-bold text-rose-700 hover:underline"
                      type="button"
                      disabled={saving}
                      onClick={() => revokeApiKey(apiKey)}
                    >
                      Revocar
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

export default WhiteLabelPage;
