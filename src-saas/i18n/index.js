import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import es from "./locales/es.json";
import en from "./locales/en.json";

const STORAGE_KEY = "saas.lang";

export const SUPPORTED_LANGUAGES = [
  { code: "es", label: "Espanol" },
  { code: "en", label: "English" },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    fallbackLng: "es",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: {
      escapeValue: false, // React ya escapa
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

/**
 * Cambia el idioma activo y lo persiste.
 */
export const setLanguage = (lang) => {
  i18n.changeLanguage(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* noop */
  }
};

export const getCurrentLanguage = () => i18n.language || "es";

export default i18n;
