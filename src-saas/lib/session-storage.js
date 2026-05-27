const TOKEN_KEY = "saas.token";
const SESSION_KEY = "saas.session";

const getStorage = () => sessionStorage;

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  return atob(padded);
};

const getTokenPayload = (token) => {
  try {
    const [, payload] = String(token || "").split(".");
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
};

export const isTokenValid = (token) => {
  const payload = getTokenPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 > Date.now();
};

export const clearSession = () => {
  getStorage().removeItem(TOKEN_KEY);
  getStorage().removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
};

export const readSession = () => {
  const token = getStorage().getItem(TOKEN_KEY);
  const rawSession = getStorage().getItem(SESSION_KEY);

  if (!token || !rawSession || !isTokenValid(token)) {
    clearSession();
    return null;
  }

  try {
    return JSON.parse(rawSession);
  } catch {
    clearSession();
    return null;
  }
};

export const writeSession = (session) => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  getStorage().setItem(TOKEN_KEY, session.token);
  getStorage().setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};
