import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getOrdenPublica } from "../services/publicoService";

const STATE_BADGE = {
  RECIBIDO: "bg-stone-100 text-stone-700",
  EN_PROCESO: "bg-amber-100 text-amber-800",
  LISTO: "bg-emerald-100 text-emerald-800",
  ENTREGADO: "bg-emerald-200 text-emerald-900",
  ANULADA: "bg-rose-100 text-rose-700",
};

function PublicOrderStatusPage() {
  const { codigo } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (!codigo) return;
    try {
      setLoading(true);
      setError("");
      const result = await getOrdenPublica(codigo);
      setData(result);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.error || "No se pudo cargar la orden"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Auto-refresh cada 30s mientras la orden no este entregada/anulada
    const interval = setInterval(() => {
      if (
        data?.estado &&
        !["ENTREGADO", "ANULADA"].includes(String(data.estado).toUpperCase())
      ) {
        load();
      }
    }, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, data?.estado]);

  return (
    <main className="min-h-screen bg-stone-50 p-4">
      <div className="mx-auto max-w-md">
        {loading && !data ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
            Buscando orden...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                {data.empresa?.nombre || "POS SaaS"}
              </p>
              <p className="text-xs text-stone-500">{data.sucursal?.nombre}</p>
              <h1 className="mt-3 text-3xl font-black text-stone-900">
                {data.numero_orden}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    STATE_BADGE[data.estado] || "bg-stone-100 text-stone-700"
                  }`}
                >
                  {String(data.estado).replace(/_/g, " ")}
                </span>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                  {data.modulo}
                </span>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Vehiculo
              </p>
              <p className="mt-2 text-lg font-bold text-stone-900">
                {data.vehiculo?.placa || "Sin placa"}
              </p>
              <p className="text-sm text-stone-500">
                {[
                  data.vehiculo?.marca,
                  data.vehiculo?.modelo,
                  data.vehiculo?.color,
                ]
                  .filter(Boolean)
                  .join(" - ") || data.vehiculo?.tipo || "-"}
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Servicio
              </p>
              <p className="mt-2 text-lg font-bold text-stone-900">
                {data.servicio?.nombre}
              </p>
              {data.servicio?.duracion_minutos ? (
                <p className="text-sm text-stone-500">
                  Duracion estimada: {data.servicio.duracion_minutos} min
                </p>
              ) : null}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Progreso
              </p>
              <ol className="mt-3 space-y-3">
                {(data.timeline || []).map((step, idx) => (
                  <li
                    key={step.etapa}
                    className={`flex items-start gap-3 ${
                      step.alcanzado ? "" : "opacity-40"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${
                        step.alcanzado ? "bg-emerald-600" : "bg-stone-300"
                      }`}
                    >
                      {step.alcanzado ? "✓" : idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">{step.etapa}</p>
                      {step.fecha ? (
                        <p className="text-xs text-stone-500">
                          {new Date(step.fecha).toLocaleString("es-GT")}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <p className="text-center text-xs text-stone-400">
              Esta pagina se actualiza automaticamente cada 30 segundos.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default PublicOrderStatusPage;
