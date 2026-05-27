import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useAppSession } from "../hooks/useAppSession";

const DEFAULT_COMPANY_MODULES = ["POS", "INVENTARIO", "COMPRAS", "REPORTES"];

const normalizeMessage = (error, fallback) =>
  error.response?.data?.error || fallback;

const buildModuleSelection = (
  catalog,
  currentSelection = {},
  fallbackActiveCodes = DEFAULT_COMPANY_MODULES
) => {
  const fallbackSet = new Set(
    fallbackActiveCodes.map((item) => String(item || "").trim().toUpperCase())
  );
  const nextSelection = {};

  for (const moduleRow of catalog) {
    const existing = currentSelection[moduleRow.codigo];
    nextSelection[moduleRow.codigo] = {
      codigo: moduleRow.codigo,
      activo: existing ? existing.activo === true : fallbackSet.has(moduleRow.codigo),
      config: existing?.config || {},
    };
  }

  return nextSelection;
};

const buildCompanyModuleSelection = (catalog, companyModules = []) => {
  const stateByCode = new Map(
    companyModules.map((item) => [
      String(item.codigo || "").trim().toUpperCase(),
      {
        codigo: String(item.codigo || "").trim().toUpperCase(),
        activo: item.activo === true,
        config: item.config || {},
      },
    ])
  );

  const nextSelection = {};

  for (const moduleRow of catalog) {
    const state = stateByCode.get(moduleRow.codigo) || {
      codigo: moduleRow.codigo,
      activo: false,
      config: {},
    };

    nextSelection[moduleRow.codigo] = state;
  }

  return nextSelection;
};

const createInitialForm = (catalog = []) => ({
  empresa: {
    slug: "",
    nombre_legal: "",
    nombre_comercial: "",
    nit: "",
    email: "",
    telefono: "",
    timezone: "America/Guatemala",
  },
  sucursalPrincipal: {
    codigo: "CENTRAL",
    nombre: "Sucursal Principal",
    direccion: "",
    telefono: "",
  },
  adminUsuario: {
    username: "",
    email: "",
    nombre: "",
    apellido: "",
    password: "",
  },
  modulos: buildModuleSelection(catalog),
});

function PlatformCompaniesPage() {
  const { session, replaceSession } = useAppSession();
  const [moduleCatalog, setModuleCatalog] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedModules, setSelectedModules] = useState({});
  const [createForm, setCreateForm] = useState(() => createInitialForm());
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [createError, setCreateError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const loadCompanies = async () => {
    const response = await apiClient.get("/empresas");
    const rows = response.data?.data || [];
    setCompanies(rows);
    return rows;
  };

  const loadCompanyDetail = async (idEmpresa) => {
    if (!idEmpresa) {
      setSelectedCompany(null);
      setSelectedModules({});
      return null;
    }

    const response = await apiClient.get(`/empresas/${idEmpresa}`);
    const company = response.data?.data || null;
    setSelectedCompany(company);
    setSelectedModules(
      buildCompanyModuleSelection(moduleCatalog, company?.modulos || [])
    );
    return company;
  };

  useEffect(() => {
    let ignore = false;

    const loadPage = async () => {
      try {
        setLoading(true);
        setPageError("");

        const [catalogResponse, companyRows] = await Promise.all([
          apiClient.get("/empresas/catalogo/modulos"),
          loadCompanies(),
        ]);

        if (ignore) {
          return;
        }

        const catalog = catalogResponse.data?.data || [];
        setModuleCatalog(catalog);
        setCreateForm((prev) => ({
          ...prev,
          modulos: buildModuleSelection(catalog, prev.modulos),
        }));

        if (companyRows.length > 0) {
          setSelectedCompanyId(companyRows[0].id_empresa);
        }
      } catch (error) {
        if (!ignore) {
          setPageError(
            normalizeMessage(
              error,
              "No se pudo cargar el panel de provisionamiento"
            )
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadPage();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const syncSelectedCompany = async () => {
      if (!selectedCompanyId || moduleCatalog.length === 0) {
        return;
      }

      try {
        setSaveError("");
        const company = await loadCompanyDetail(selectedCompanyId);

        if (!ignore && company) {
          setSelectedCompany(company);
        }
      } catch (error) {
        if (!ignore) {
          setSaveError(
            normalizeMessage(
              error,
              "No se pudo cargar la configuracion de la empresa"
            )
          );
        }
      }
    };

    syncSelectedCompany();

    return () => {
      ignore = true;
    };
  }, [selectedCompanyId, moduleCatalog]);

  const handleCreateFieldChange = (section, field, value) => {
    setCreateForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleToggleCreateModule = (codigo) => {
    setCreateForm((prev) => ({
      ...prev,
      modulos: {
        ...prev.modulos,
        [codigo]: {
          ...prev.modulos[codigo],
          activo: !prev.modulos[codigo]?.activo,
        },
      },
    }));
  };

  const handleToggleSelectedModule = (codigo) => {
    setSelectedModules((prev) => ({
      ...prev,
      [codigo]: {
        ...prev[codigo],
        activo: !prev[codigo]?.activo,
      },
    }));
  };

  const handleCreateCompany = async (event) => {
    event.preventDefault();
    setCreateError("");

    try {
      setCreateLoading(true);
      const response = await apiClient.post("/empresas", {
        empresa: createForm.empresa,
        sucursalPrincipal: createForm.sucursalPrincipal,
        adminUsuario: createForm.adminUsuario,
        modulos: Object.values(createForm.modulos),
      });

      const createdCompanyId = response.data?.empresa?.id_empresa;
      const companyRows = await loadCompanies();
      setCreateForm(createInitialForm(moduleCatalog));
      setSelectedCompanyId(
        createdCompanyId || companyRows[0]?.id_empresa || null
      );
    } catch (error) {
      setCreateError(
        normalizeMessage(error, "No se pudo crear la empresa en el SaaS")
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSaveModules = async () => {
    if (!selectedCompanyId) {
      return;
    }

    try {
      setSaveLoading(true);
      setSaveError("");

      await apiClient.put(`/empresas/${selectedCompanyId}/modulos`, {
        modulos: Object.values(selectedModules),
      });

      await Promise.all([loadCompanies(), loadCompanyDetail(selectedCompanyId)]);

      const currentCompanyId =
        session?.empresa?.id_empresa || session?.user?.id_empresa;

      if (Number(currentCompanyId) === Number(selectedCompanyId)) {
        const refreshedSession = await apiClient.get("/auth/me");
        replaceSession(refreshedSession.data);
      }
    } catch (error) {
      setSaveError(
        normalizeMessage(
          error,
          "No se pudo guardar la configuracion de modulos"
        )
      );
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-100 px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="panel p-8 text-sm text-stone-500">
            Cargando panel de provisionamiento...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="panel overflow-hidden">
          <div className="grid gap-6 bg-stone-950 px-8 py-10 text-stone-100 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">
                Plataforma SaaS
              </p>
              <h1 className="mt-3 text-4xl font-black">
                Empresas, modulos y provisionamiento
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
                Desde aqui puedes crear una empresa nueva con su sucursal
                principal, su usuario administrador y el paquete exacto de
                modulos activos. Despues puedes encender o apagar cada modulo
                sin tocar la base de datos.
              </p>
            </div>

            <div className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Sesion de plataforma
              </p>
              <dl className="mt-4 space-y-3 text-sm text-stone-300">
                <div>
                  <dt className="font-semibold text-white">Usuario</dt>
                  <dd>{session?.user?.username}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">Empresa actual</dt>
                  <dd>{session?.empresa?.nombre_legal}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">Rol</dt>
                  <dd>{session?.user?.rol}</dd>
                </div>
              </dl>

              <Link className="btn-secondary mt-6 w-full" to="/">
                Volver al dashboard
              </Link>
            </div>
          </div>
        </section>

        {pageError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {pageError}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="panel p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              Alta de empresa
            </p>
            <h2 className="mt-3 text-2xl font-black text-stone-900">
              Crear empresa nueva
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              Este formulario provisiona tenant, sucursal principal, usuario
              administrador y modulos activos desde el inicio.
            </p>

            <form className="mt-6 space-y-6" onSubmit={handleCreateCompany}>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="field"
                  placeholder="empresa-slug"
                  value={createForm.empresa.slug}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "empresa",
                      "slug",
                      event.target.value.toLowerCase()
                    )
                  }
                  required
                />
                <input
                  className="field"
                  placeholder="Empresa Demo, S.A."
                  value={createForm.empresa.nombre_legal}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "empresa",
                      "nombre_legal",
                      event.target.value
                    )
                  }
                  required
                />
                <input
                  className="field"
                  placeholder="Nombre comercial"
                  value={createForm.empresa.nombre_comercial}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "empresa",
                      "nombre_comercial",
                      event.target.value
                    )
                  }
                />
                <input
                  className="field"
                  placeholder="NIT"
                  value={createForm.empresa.nit}
                  onChange={(event) =>
                    handleCreateFieldChange("empresa", "nit", event.target.value)
                  }
                />
                <input
                  className="field"
                  type="email"
                  placeholder="correo@empresa.com"
                  value={createForm.empresa.email}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "empresa",
                      "email",
                      event.target.value
                    )
                  }
                />
                <input
                  className="field"
                  placeholder="Telefono"
                  value={createForm.empresa.telefono}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "empresa",
                      "telefono",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="field"
                  placeholder="CENTRAL"
                  value={createForm.sucursalPrincipal.codigo}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "sucursalPrincipal",
                      "codigo",
                      event.target.value.toUpperCase()
                    )
                  }
                  required
                />
                <input
                  className="field"
                  placeholder="Sucursal principal"
                  value={createForm.sucursalPrincipal.nombre}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "sucursalPrincipal",
                      "nombre",
                      event.target.value
                    )
                  }
                  required
                />
                <input
                  className="field md:col-span-2"
                  placeholder="Direccion"
                  value={createForm.sucursalPrincipal.direccion}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "sucursalPrincipal",
                      "direccion",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="field"
                  placeholder="admin"
                  value={createForm.adminUsuario.username}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "adminUsuario",
                      "username",
                      event.target.value.toLowerCase()
                    )
                  }
                  required
                />
                <input
                  className="field"
                  type="email"
                  placeholder="admin@empresa.com"
                  value={createForm.adminUsuario.email}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "adminUsuario",
                      "email",
                      event.target.value
                    )
                  }
                />
                <input
                  className="field"
                  placeholder="Nombre"
                  value={createForm.adminUsuario.nombre}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "adminUsuario",
                      "nombre",
                      event.target.value
                    )
                  }
                  required
                />
                <input
                  className="field"
                  placeholder="Apellido"
                  value={createForm.adminUsuario.apellido}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "adminUsuario",
                      "apellido",
                      event.target.value
                    )
                  }
                  required
                />
                <input
                  className="field md:col-span-2"
                  type="password"
                  placeholder="Password temporal segura"
                  value={createForm.adminUsuario.password}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "adminUsuario",
                      "password",
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div>
                <p className="text-sm font-bold text-stone-900">
                  Modulos iniciales
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {moduleCatalog.map((moduleRow) => {
                    const current = createForm.modulos[moduleRow.codigo];

                    return (
                      <label
                        key={moduleRow.codigo}
                        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-stone-900">
                              {moduleRow.nombre}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-400">
                              {moduleRow.codigo}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-stone-500">
                              {moduleRow.descripcion}
                            </p>
                          </div>
                          <input
                            checked={current?.activo === true}
                            className="mt-1 h-5 w-5 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                            type="checkbox"
                            onChange={() =>
                              handleToggleCreateModule(moduleRow.codigo)
                            }
                          />
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {createError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {createError}
                </div>
              ) : null}

              <button className="btn-primary w-full" disabled={createLoading} type="submit">
                {createLoading ? "Creando empresa..." : "Crear empresa y administrador"}
              </button>
            </form>
          </article>

          <div className="space-y-6">
            <article className="panel p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Empresas creadas
              </p>
              <h2 className="mt-3 text-2xl font-black text-stone-900">
                Configuracion por tenant
              </h2>

              <div className="mt-6 space-y-3">
                {companies.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
                    Aun no hay empresas registradas en la plataforma.
                  </div>
                ) : (
                  companies.map((company) => {
                    const isActive = Number(company.id_empresa) === Number(selectedCompanyId);

                    return (
                      <button
                        key={company.id_empresa}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          isActive
                            ? "border-brand-400 bg-brand-50"
                            : "border-stone-200 bg-white hover:border-brand-200"
                        }`}
                        type="button"
                        onClick={() => setSelectedCompanyId(company.id_empresa)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-stone-900">
                              {company.nombre_legal}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-400">
                              {company.slug}
                            </p>
                            <p className="mt-3 text-xs text-stone-500">
                              {company.total_sucursales} sucursales, {company.total_usuarios} usuarios
                            </p>
                          </div>
                          <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">
                            {company.estado}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {(company.modulos_activos || []).length > 0 ? (
                            (company.modulos_activos || []).map((codigo) => (
                              <span
                                key={codigo}
                                className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700"
                              >
                                {codigo}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                              Sin modulos activos
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </article>

            <article className="panel p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Modulos por empresa
              </p>
              <h2 className="mt-3 text-2xl font-black text-stone-900">
                {selectedCompany?.nombre_legal || "Selecciona una empresa"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-500">
                Activa o desactiva modulos por tenant. Esto te permite dejar una
                empresa solo con POS, solo con servicios o con el paquete que
                quieras.
              </p>

              {selectedCompany ? (
                <div className="mt-6 space-y-3">
                  {moduleCatalog.map((moduleRow) => {
                    const current = selectedModules[moduleRow.codigo];

                    return (
                      <label
                        key={moduleRow.codigo}
                        className="flex items-start justify-between gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4"
                      >
                        <div>
                          <p className="text-sm font-bold text-stone-900">
                            {moduleRow.nombre}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-400">
                            {moduleRow.codigo}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-stone-500">
                            {moduleRow.descripcion}
                          </p>
                        </div>
                        <input
                          checked={current?.activo === true}
                          className="mt-1 h-5 w-5 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                          type="checkbox"
                          onChange={() =>
                            handleToggleSelectedModule(moduleRow.codigo)
                          }
                        />
                      </label>
                    );
                  })}

                  {saveError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {saveError}
                    </div>
                  ) : null}

                  <button
                    className="btn-primary w-full"
                    disabled={saveLoading}
                    type="button"
                    onClick={handleSaveModules}
                  >
                    {saveLoading ? "Guardando modulos..." : "Guardar configuracion"}
                  </button>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
                  Selecciona una empresa para editar sus modulos.
                </div>
              )}
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

export default PlatformCompaniesPage;
