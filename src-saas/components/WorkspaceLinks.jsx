import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  hasAnyModule,
  hasPermission,
  hasRole,
} from "../lib/access";
import { useAppSession } from "../hooks/useAppSession";

function MenuIcon({ open }) {
  return (
    <span className="flex h-5 w-5 flex-col justify-center gap-1" aria-hidden="true">
      <span
        className={`h-0.5 rounded-full bg-current transition ${
          open ? "translate-y-1.5 rotate-45" : ""
        }`}
      />
      <span
        className={`h-0.5 rounded-full bg-current transition ${
          open ? "opacity-0" : ""
        }`}
      />
      <span
        className={`h-0.5 rounded-full bg-current transition ${
          open ? "-translate-y-1.5 -rotate-45" : ""
        }`}
      />
    </span>
  );
}

function WorkspaceLinks() {
  const location = useLocation();
  const { session } = useAppSession();
  const [open, setOpen] = useState(false);

  const groups = useMemo(
    () =>
      [
        {
          title: "Principal",
          links: [{ to: "/", label: "Dashboard", enabled: true }],
        },
        {
          title: "Plataforma SaaS",
          links: [
            {
              to: "/platform/dashboard",
              label: "Dashboard plataforma",
              enabled: hasRole(session, "SUPER_ADMIN", "SUPER_ADMIN_SAAS"),
            },
            {
              to: "/platform/empresas",
              label: "Empresas",
              enabled: hasRole(session, "SUPER_ADMIN", "SUPER_ADMIN_SAAS"),
            },
          ],
        },
        {
          title: "Operacion",
          links: [
            {
              to: "/operacion/ventas",
              label: "Ventas",
              enabled:
                hasAnyModule(session, "POS") &&
                hasPermission(session, "sales.read"),
            },
            {
              to: "/operacion/caja",
              label: "Caja",
              enabled:
                hasAnyModule(session, "POS") &&
                hasPermission(session, "cash.read"),
            },
            {
              to: "/operacion/compras",
              label: "Compras",
              enabled:
                hasAnyModule(session, "COMPRAS", "INVENTARIO") &&
                hasPermission(session, "purchases.read"),
            },
            {
              to: "/operacion/inventario",
              label: "Inventario",
              enabled:
                hasAnyModule(session, "INVENTARIO", "POS", "COMPRAS") &&
                hasPermission(session, "inventory.read"),
            },
            {
              to: "/operacion/servicios",
              label: "Servicios",
              enabled:
                hasAnyModule(session, "SERVICIOS", "CARWASH") &&
                hasPermission(session, "services.read"),
            },
            {
              to: "/operacion/servicios/control",
              label: "Control servicios",
              enabled:
                hasAnyModule(session, "SERVICIOS", "CARWASH") &&
                hasPermission(session, "services.read"),
            },
            {
              to: "/operacion/catalogos",
              label: "Catalogos",
              enabled:
                hasAnyModule(
                  session,
                  "POS",
                  "INVENTARIO",
                  "COMPRAS",
                  "SERVICIOS",
                  "CARWASH"
                ) && hasPermission(session, "catalogs.read"),
            },
            {
              to: "/operacion/finanzas",
              label: "Finanzas",
              enabled:
                hasAnyModule(session, "FINANZAS") &&
                hasPermission(session, "finance.read"),
            },
            {
              to: "/analitica/reportes",
              label: "Reportes",
              enabled:
                hasAnyModule(session, "REPORTES") &&
                hasPermission(session, "reports.read"),
            },
          ],
        },
        {
          title: "Administracion",
          links: [
            {
              to: "/administracion/usuarios",
              label: "Usuarios",
              enabled: hasRole(
                session,
                "ADMIN_EMPRESA",
                "GERENTE",
                "ENCARGADO_SUCURSAL"
              ),
            },
            {
              to: "/administracion/roles",
              label: "Roles",
              enabled: hasPermission(session, "roles.manage"),
            },
            {
              to: "/administracion/comprobantes",
              label: "Comprobantes",
              enabled: hasPermission(session, "comprobantes.read"),
            },
            {
              to: "/administracion/auditoria",
              label: "Auditoria",
              enabled: hasPermission(session, "audit.read"),
            },
          ],
        },
        {
          title: "Cuenta",
          links: [
            {
              to: "/cuenta/seguridad",
              label: "Seguridad",
              enabled: true,
            },
            {
              to: "/cuenta/seguridad/mfa",
              label: "2FA",
              enabled: true,
            },
          ],
        },
      ]
        .map((group) => ({
          ...group,
          links: group.links.filter((item) => item.enabled),
        }))
        .filter((group) => group.links.length > 0),
    [session]
  );

  const activeLabel =
    groups
      .flatMap((group) => group.links)
      .find(
        (item) =>
          location.pathname === item.to ||
          (item.to !== "/" && location.pathname.startsWith(item.to))
      )?.label || "Menu";

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-800 shadow-sm transition hover:border-brand-300 hover:text-brand-800"
        aria-expanded={open}
        aria-label={open ? "Cerrar menu" : "Abrir menu"}
        onClick={() => setOpen((current) => !current)}
      >
        <MenuIcon open={open} />
        <span>{activeLabel}</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            aria-label="Cerrar menu"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute left-0 top-full z-40 mt-3 w-[min(92vw,340px)] overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
            <div className="max-h-[70vh] overflow-y-auto p-3">
              {groups.map((group) => (
                <div key={group.title} className="py-2">
                  <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                    {group.title}
                  </p>
                  <div className="mt-2 space-y-1">
                    {group.links.map((item) => {
                      const isActive =
                        location.pathname === item.to ||
                        (item.to !== "/" &&
                          location.pathname.startsWith(item.to));

                      return (
                        <Link
                          key={item.to}
                          className={`block rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                            isActive
                              ? "bg-brand-50 text-brand-800"
                              : "text-stone-700 hover:bg-stone-50 hover:text-stone-950"
                          }`}
                          to={item.to}
                          onClick={() => setOpen(false)}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}

export default WorkspaceLinks;
