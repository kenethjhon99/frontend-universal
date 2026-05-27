import i18n from "./index";

const LOCALE_MAP = {
  es: "es-GT",
  en: "en-US",
};

const getLocale = () => LOCALE_MAP[i18n.language?.split("-")[0]] || "es-GT";

/**
 * Formatea un numero como moneda usando el locale del usuario. Si la moneda
 * no se proporciona, intenta inferirla del lenguaje (GTQ para es, USD para en).
 */
export const formatMoney = (value, currency = null) => {
  const lang = i18n.language?.split("-")[0] || "es";
  const ccy = currency || (lang === "en" ? "USD" : "GTQ");
  try {
    return new Intl.NumberFormat(getLocale(), {
      style: "currency",
      currency: ccy,
      minimumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${ccy} ${Number(value || 0).toFixed(2)}`;
  }
};

export const formatNumber = (value, digits = 0) => {
  try {
    return new Intl.NumberFormat(getLocale(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(value || 0));
  } catch {
    return String(value ?? "");
  }
};

export const formatDate = (value) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(getLocale(), {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
};

export const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(getLocale(), {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
};
