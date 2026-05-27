export const DEFAULT_BRANDING = {
  nombre_comercial: "Sistema Universal POS",
  nombre_legal: null,
  slogan: "El sistema se adapta a tu negocio, no tu negocio al sistema.",
  logo_principal_url: null,
  logo_secundario_url: null,
  logo_dark_url: null,
  logo_url: null,
  favicon_url: null,
  color_primario: "#2563eb",
  color_secundario: "#0f172a",
  color_acento: "#16a34a",
  modo_oscuro: false,
  login: {},
  dashboard: {},
  nav: {},
  documentos: {},
  email: {},
  pwa: {},
};

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

const normalizeColor = (value, fallback) =>
  HEX_COLOR_RE.test(String(value || "").trim())
    ? String(value).trim().toLowerCase()
    : fallback;

export const normalizeBranding = (branding) => {
  const safe = branding && typeof branding === "object" ? branding : {};
  const login =
    safe.login && typeof safe.login === "object"
      ? safe.login
      : {
          hero_image_url: safe.hero_image_url || null,
          beneficios: safe.beneficios || [],
        };

  return {
    ...DEFAULT_BRANDING,
    ...safe,
    logo_url:
      safe.logo_url ||
      safe.logo_principal_url ||
      DEFAULT_BRANDING.logo_principal_url,
    hero_image_url: safe.hero_image_url || login.hero_image_url || null,
    color_primario: normalizeColor(
      safe.color_primario,
      DEFAULT_BRANDING.color_primario
    ),
    color_secundario: normalizeColor(
      safe.color_secundario,
      DEFAULT_BRANDING.color_secundario
    ),
    color_acento: normalizeColor(safe.color_acento, DEFAULT_BRANDING.color_acento),
    login,
    dashboard:
      safe.dashboard && typeof safe.dashboard === "object" ? safe.dashboard : {},
    nav: safe.nav && typeof safe.nav === "object" ? safe.nav : {},
    documentos:
      safe.documentos && typeof safe.documentos === "object"
        ? safe.documentos
        : {},
    email: safe.email && typeof safe.email === "object" ? safe.email : {},
    pwa: safe.pwa && typeof safe.pwa === "object" ? safe.pwa : {},
  };
};

const hexToRgb = (hex) => {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
};

const rgba = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const upsertHeadLink = (selector, attrs) => {
  let link = document.head.querySelector(selector);
  if (!link) {
    link = document.createElement("link");
    document.head.appendChild(link);
  }

  Object.entries(attrs).forEach(([key, value]) => {
    if (value) link.setAttribute(key, value);
  });
};

let manifestObjectUrl = null;

const applyManifest = (branding) => {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return;
  }

  const pwa = branding.pwa || {};
  const name = pwa.name || branding.nombre_comercial || DEFAULT_BRANDING.nombre_comercial;
  const shortName = pwa.short_name || name.slice(0, 12);
  const icon = pwa.icon_url || branding.favicon_url || branding.logo_url || null;
  const manifest = {
    name,
    short_name: shortName,
    start_url: ".",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: branding.color_primario,
    icons: icon
      ? [
          {
            src: icon,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: icon,
            sizes: "512x512",
            type: "image/png",
          },
        ]
      : [],
  };

  if (manifestObjectUrl && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(manifestObjectUrl);
  }
  manifestObjectUrl = URL.createObjectURL(
    new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" })
  );
  upsertHeadLink("link[rel='manifest']", {
    rel: "manifest",
    href: manifestObjectUrl,
  });
};

export const applyBranding = (input) => {
  const branding = normalizeBranding(input);
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", branding.color_primario);
  root.style.setProperty("--brand-primary-dark", branding.color_primario);
  root.style.setProperty("--brand-secondary", branding.color_secundario);
  root.style.setProperty("--brand-accent", branding.color_acento);
  root.style.setProperty("--brand-ring", rgba(branding.color_primario, 0.16));
  root.style.setProperty("--brand-soft", rgba(branding.color_primario, 0.1));
  root.style.setProperty("--brand-border", rgba(branding.color_primario, 0.35));

  document.title = branding.nombre_comercial || DEFAULT_BRANDING.nombre_comercial;

  if (branding.favicon_url) {
    upsertHeadLink("link[rel='icon']", {
      rel: "icon",
      href: branding.favicon_url,
    });
  }

  applyManifest(branding);
  return branding;
};
