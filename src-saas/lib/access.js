const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    "company.create",
    "company.read",
    "company.branding.read",
    "company.branding.update",
    "company.white_label.read",
    "company.white_label.update",
    "company.api_keys.manage",
    "company.modules.catalog.read",
    "company.modules.read",
    "company.modules.update",
    "audit.read",
  ],
  SUPER_ADMIN_SAAS: [
    "company.create",
    "company.read",
    "company.branding.read",
    "company.branding.update",
    "company.white_label.read",
    "company.white_label.update",
    "company.api_keys.manage",
    "company.modules.catalog.read",
    "company.modules.read",
    "company.modules.update",
    "audit.read",
  ],
  ADMIN_EMPRESA: [
    "company.read",
    "company.branding.read",
    "company.branding.update",
    "company.white_label.read",
    "company.white_label.update",
    "company.api_keys.manage",
    "company.modules.read",
    "branches.read",
    "branches.create",
    "users.read",
    "users.create",
    "users.update",
    "users.status",
    "audit.read",
    "catalogs.read",
    "catalogs.manage",
    "inventory.read",
    "inventory.manage",
    "purchases.read",
    "purchases.manage",
    "purchases.adjust",
    "finance.read",
    "finance.manage",
    "finance.close",
    "reports.read",
    "services.read",
    "services.manage",
    "services.refund",
    "services.reports.read",
    "sales.read",
    "sales.manage",
    "sales.refund",
    "cash.read",
    "cash.manage",
  ],
  ENCARGADO_SUCURSAL: [
    "branches.read",
    "users.read",
    "users.create",
    "users.update",
    "users.status",
    "catalogs.read",
    "catalogs.manage",
    "inventory.read",
    "inventory.manage",
    "purchases.read",
    "purchases.manage",
    "purchases.adjust",
    "finance.read",
    "finance.manage",
    "reports.read",
    "services.read",
    "services.manage",
    "services.refund",
    "services.reports.read",
    "sales.read",
    "sales.manage",
    "sales.refund",
    "cash.read",
    "cash.manage",
  ],
  CAJERO: [
    "catalogs.read",
    "services.read",
    "services.manage",
    "sales.read",
    "sales.manage",
    "cash.read",
    "cash.manage",
  ],
  GERENTE: [
    "branches.read",
    "users.read",
    "catalogs.read",
    "inventory.read",
    "purchases.read",
    "finance.read",
    "reports.read",
    "services.read",
    "services.reports.read",
    "sales.read",
    "cash.read",
    "comprobantes.read",
  ],
  BODEGUERO: [
    "catalogs.read",
    "inventory.read",
    "inventory.manage",
    "purchases.read",
    "comprobantes.read",
  ],
  COMPRAS: [
    "catalogs.read",
    "inventory.read",
    "purchases.read",
    "purchases.manage",
    "purchases.adjust",
    "comprobantes.read",
  ],
  OPERADOR_CARWASH: [
    "catalogs.read",
    "inventory.read",
    "services.read",
    "services.manage",
    "cash.read",
    "comprobantes.read",
  ],
  SUPERVISOR_CARWASH: [
    "catalogs.read",
    "inventory.read",
    "services.read",
    "services.manage",
    "services.refund",
    "services.reports.read",
    "reports.read",
    "cash.read",
    "comprobantes.read",
  ],
};

const getSessionPermissions = (session) => {
  const currentRole = String(session?.user?.rol || "").trim().toUpperCase();

  if (["SUPER_ADMIN", "SUPER_ADMIN_SAAS"].includes(currentRole)) {
    return (ROLE_PERMISSIONS[currentRole] || []).map((permission) =>
      String(permission).trim().toLowerCase()
    );
  }

  return [
    ...new Set([
      ...((Array.isArray(session?.permisos) ? session.permisos : []).map(
        (permission) => String(permission || "").trim().toLowerCase()
      )),
      ...((ROLE_PERMISSIONS[currentRole] || []).map((permission) =>
        String(permission).trim().toLowerCase()
      )),
    ]),
  ];
};

export const hasRole = (session, ...roles) => {
  const currentRole = String(session?.user?.rol || "").trim().toUpperCase();
  return roles
    .map((item) => String(item || "").trim().toUpperCase())
    .includes(currentRole);
};

export const hasModule = (session, moduleCode) => {
  const modules = Array.isArray(session?.modulos) ? session.modulos : [];
  return modules
    .map((item) => String(item || "").trim().toUpperCase())
    .includes(String(moduleCode || "").trim().toUpperCase());
};

export const hasAnyModule = (session, ...moduleCodes) =>
  moduleCodes.some((moduleCode) => hasModule(session, moduleCode));

export const hasPermission = (session, permission) =>
  getSessionPermissions(session).includes(
    String(permission || "").trim().toLowerCase()
  );

export const hasAnyPermission = (session, ...permissions) =>
  permissions.some((permission) => hasPermission(session, permission));
