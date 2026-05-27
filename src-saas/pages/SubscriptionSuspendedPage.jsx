import { useEffect, useState } from "react";
import apiClient from "../services/apiClient";
import { useAppSession } from "../hooks/useAppSession";

const REASON_LABELS = {
  subscription_suspended: {
    title: "Tu suscripción está suspendida",
    body: "Detectamos que el último pago no se procesó correctamente. Reactivá tu plan para volver a operar.",
    cta: "Regularizar pago",
  },
  subscription_cancelled: {
    title: "Tu suscripción fue cancelada",
    body: "Tu plan fue cancelado. Activá uno nuevo para continuar usando el sistema.",
    cta: "Elegir plan",
  },
  trial_expired: {
    title: "Tu período de prueba expiró",
    body: "El trial gratuito terminó. Activá un plan para mantener tu cuenta operativa.",
    cta: "Activar plan",
  },
  plan_limit_reached: {
    title: "Alcanzaste el límite de tu plan",
    body: "Tu plan no permite crear más recursos. Actualizá a un plan superior para continuar.",
    cta: "Ver planes",
  },
  company_inactive: {
    title: "Tu empresa está inactiva",
    body: "Comunicate con soporte para reactivar tu cuenta.",
    cta: null,
  },
};

function SubscriptionSuspendedPage() {
  const { logout } = useAppSession();
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Leer el motivo del state del router (history.state) o de un evento global
    const stored = sessionStorage.getItem("saas-suspension-reason");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setReason(parsed.reason);
        setDetails(parsed);
      } catch {
        /* noop */
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadPlans = async () => {
      try {
        setLoadingPlans(true);
        const response = await apiClient.get("/billing/planes");
        if (!mounted) return;
        setPlans(
          Array.isArray(response.data?.data)
            ? response.data.data.filter((plan) => Number(plan.precio_mensual || 0) > 0)
            : []
        );
      } catch {
        if (mounted) {
          setPlans([]);
        }
      } finally {
        if (mounted) {
          setLoadingPlans(false);
        }
      }
    };
    loadPlans();
    return () => {
      mounted = false;
    };
  }, []);

  const copy = REASON_LABELS[reason] || REASON_LABELS.subscription_suspended;

  const handleCheckout = async (planCodigo) => {
    try {
      setLoading(true);
      setError("");
      const response = await apiClient.post("/billing/checkout-session", {
        plan_codigo: planCodigo,
        success_url: `${window.location.origin}/#/`,
        cancel_url: `${window.location.origin}/#/subscription/suspended`,
      });
      const url = response.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        setError("No se pudo iniciar el checkout. Intenta de nuevo.");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "No se pudo iniciar el pago. Verificá tu conexión."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-200 text-3xl">
            ⚠
          </div>
          <h1 className="text-3xl font-black text-stone-900">{copy.title}</h1>
          <p className="mt-3 text-base leading-7 text-stone-700">{copy.body}</p>
          {details?.current != null && details?.max != null ? (
            <p className="mt-3 font-mono text-sm text-stone-600">
              Uso actual: {details.current} / {details.max}
            </p>
          ) : null}
        </div>

        {copy.cta ? (
          <section className="mt-8 panel p-6">
            <h2 className="text-lg font-bold text-stone-900">{copy.cta}</h2>
            <p className="mt-2 text-sm text-stone-600">
              Seleccioná un plan para continuar:
            </p>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {loadingPlans ? (
              <div className="mt-4 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
                Cargando planes disponibles...
              </div>
            ) : null}

            {!loadingPlans && plans.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No hay planes de pago disponibles en este momento. Contacta soporte.
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {plans.map((plan) => (
                <button
                  key={plan.codigo}
                  type="button"
                  onClick={() => handleCheckout(plan.codigo)}
                  disabled={loading}
                  className="rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:border-brand-500 hover:shadow disabled:opacity-50"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                    {plan.codigo}
                  </div>
                  <div className="mt-1 text-lg font-bold text-stone-900">
                    {plan.nombre}
                  </div>
                  <div className="mt-2 text-sm text-stone-600">
                    {plan.moneda || "USD"} {Number(plan.precio_mensual || 0).toFixed(2)}
                    <span className="text-xs"> / mes</span>
                  </div>
                  {Array.isArray(plan.modulos_incluidos) ? (
                    <div className="mt-2 text-xs text-stone-500">
                      {plan.modulos_incluidos.slice(0, 4).join(" · ")}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            className="text-sm font-semibold text-stone-600 hover:underline"
            onClick={() => {
              sessionStorage.removeItem("saas-suspension-reason");
              logout();
            }}
          >
            Cerrar sesión
          </button>
          <span className="text-stone-400">·</span>
          <a
            href="mailto:soporte@tu-saas.com"
            className="text-sm font-semibold text-stone-600 hover:underline"
          >
            Contactar soporte
          </a>
        </div>
      </div>
    </main>
  );
}

export default SubscriptionSuspendedPage;
