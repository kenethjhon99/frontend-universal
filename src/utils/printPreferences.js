const STORAGE_PREFIX = "pos.printPreferences";

const getUserStorageKey = (user) => {
  const userId =
    user?.id_usuario ||
    user?.id ||
    user?.username ||
    user?.correo ||
    user?.email ||
    null;

  return userId ? `${STORAGE_PREFIX}:${userId}` : null;
};

export const readPrintPreference = (user, preferenceName, fallback = true) => {
  if (typeof window === "undefined") return fallback;

  const storageKey = getUserStorageKey(user);
  if (!storageKey) return fallback;

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    const preferences = rawValue ? JSON.parse(rawValue) : {};
    const value = preferences?.[preferenceName];

    return typeof value === "boolean" ? value : fallback;
  } catch (error) {
    console.warn("No se pudo leer la preferencia de impresion.", error);
    return fallback;
  }
};

export const writePrintPreference = (user, preferenceName, value) => {
  if (typeof window === "undefined") return;

  const storageKey = getUserStorageKey(user);
  if (!storageKey) return;

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    const preferences = rawValue ? JSON.parse(rawValue) : {};

    preferences[preferenceName] = Boolean(value);

    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch (error) {
    console.warn("No se pudo guardar la preferencia de impresion.", error);
  }
};
