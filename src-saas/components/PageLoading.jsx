/**
 * Fallback de Suspense para rutas lazy. Diseño minimalista, no parpadea
 * (delay implicito porque solo aparece si la carga toma > ~16ms).
 */
function PageLoading({ label = "Cargando…" }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100">
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-3"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-brand-600" />
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
          {label}
        </p>
      </div>
    </div>
  );
}

export default PageLoading;
