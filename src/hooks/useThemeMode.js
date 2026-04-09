import { useContext } from "react";
import ThemeModeContext from "../context/theme-mode-context";

export function useThemeMode() {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error("useThemeMode debe usarse dentro de ThemeModeProvider");
  }

  return context;
}
