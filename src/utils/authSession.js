const TOKEN_KEY = "token";
const USER_KEY = "user";

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
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
  if (!token) return false;

  const payload = getTokenPayload(token);
  if (!payload?.exp) return false;

  return payload.exp * 1000 > Date.now();
};

export const clearStoredSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const readStoredSession = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);

  if (!token || !rawUser || !isTokenValid(token)) {
    clearStoredSession();
    return { user: null, token: null };
  }

  try {
    return {
      token,
      user: JSON.parse(rawUser),
    };
  } catch {
    clearStoredSession();
    return { user: null, token: null };
  }
};

export const storeSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return { token, user };
};
