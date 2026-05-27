import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, setLanguage } from "../i18n";

/**
 * Selector compacto de idioma. Persiste en localStorage.
 */
function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      className="field max-w-[140px] text-sm"
      value={i18n.language?.split("-")[0] || "es"}
      onChange={(event) => setLanguage(event.target.value)}
      aria-label="Language"
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}

export default LanguageSwitcher;
