/**
 * Setup Sentry para el frontend SaaS.
 *
 * No-op si VITE_SENTRY_DSN no esta definido.
 * Para activarlo en build: VITE_SENTRY_DSN=https://xxx@sentry.io/yyy npm run build
 */
import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN || "";
const ENV = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE;
const RELEASE = import.meta.env.VITE_SENTRY_RELEASE || undefined;

let initialized = false;

export const initSentry = () => {
  if (initialized) return;
  initialized = true;

  if (!DSN) {
    // eslint-disable-next-line no-console
    console.info("[sentry] VITE_SENTRY_DSN no definido, captura desactivada");
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    release: RELEASE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Sanitizar headers/cookies/storage que pudieran haberse colado
      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.authorization;
        delete event.request.headers.Cookie;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });
};

/**
 * Setea el contexto de usuario en Sentry cuando inicia la sesion (post-login).
 * No metemos email/username — solo id + tags de tenant/rol.
 */
export const setSentryUser = (session) => {
  if (!DSN || !initialized) return;
  if (!session?.user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: String(session.user.id_usuario || ""),
  });
  Sentry.setTag("id_empresa", String(session.user.id_empresa || ""));
  Sentry.setTag("rol", String(session.user.rol || ""));
  if (session.empresa?.slug) {
    Sentry.setTag("empresa_slug", session.empresa.slug);
  }
};

export const clearSentryUser = () => {
  if (!DSN || !initialized) return;
  Sentry.setUser(null);
};

// Re-export para uso directo en componentes
export { Sentry };
