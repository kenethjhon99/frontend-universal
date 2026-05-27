import { useEffect, useState } from "react";
import {
  formatCurrency,
  formatInteger,
  normalizeApiError,
  downloadCsvFile,
} from "../../lib/reporting";
import { getCorteVentas } from "../../services/reportesService";

function StatRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </p>
      <p
        className={`text-lg font-black ${
          accent ? "text-amber-700" : "text-stone-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Panel del corte simple. Muestra:
 *   - Resumen consolidado (totales por método de pago, tipo de venta, utilidad)
 *   - Tabla de ventas por usuario
 */
function CortePanel({ filters, branchId, isVisible }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isVisible) return;
    let ignore = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getCorteVentas(
          {
            desde: filters.desde,
            hasta: filters.hasta,
            vista: filters.vista,
            ...(filters.vista === "SUCURSAL" && filters.id_sucursal
              ? { id_sucursal: Number(filters.id_sucursal) }
              : {}),
          },
          { branchId }
        );

        if (!ignore) setData(result);
      } catch (requestError) {
        if (!ignore) {
          setError(
            normalizeApiError(requestError, "No se pudo cargar el corte")
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [filters, branchId, isVisible]);

  if (!isVisible) return null;

  const exportCsv = () => {
    if (!data) return;
    const r = data.resumen || {};
    downloadCsvFile(`corte-${data.rango?.desde}-a-${data.rango?.hasta}.csv`, [
      ["CORTE DE VENTAS"],
      ["Empresa", data.empresa?.nombre_legal || ""],
      ["Vista", data.alcance?.vista_resuelta || ""],
      ["Desde", data.rango?.desde || ""],
      ["Hasta", data.rango?.hasta || ""],
      [""],
      ["RESUMEN"],
      ["Ventas", r.ventas_cantidad ?? 0],
      ["Ventas anuladas (TOTAL)", r.ventas_anuladas ?? 0],
      ["Reversiones parciales", r.ventas_con_reversion_parcial ?? 0],
      ["Total neto", r.total_neto ?? 0],
      ["Total original", r.total_original ?? 0],
      ["Total revertido", r.total_anulado ?? 0],
      ["Efectivo", r.total_efectivo ?? 0],
      ["Tarjeta", r.total_tarjeta ?? 0],
      ["Transferencia", r.total_transferencia ?? 0],
      ["Contado", r.total_contado ?? 0],
      ["Credito", r.total_credito ?? 0],
      ["Utilidad estimada", r.utilidad_estimada ?? 0],
      [""],
      ["VENTAS POR USUARIO"],
      ["Usuario", "Ventas", "Total neto"],
      ...(data.por_usuario || []).map((u) => [
        u.username || u.nombre,
        u.ventas,
        u.total_neto,
      ]),
    ]);
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-500">
        Calculando corte...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-500">
        Aplica filtros para ver el corte.
      </div>
    );
  }

  const r = data.resumen || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn-secondary" type="button" onClick={exportCsv}>
          Exportar CSV
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <StatRow label="Ventas" value={formatInteger(r.ventas_cantidad)} />
        <StatRow
          label="Anuladas (TOTAL)"
          value={formatInteger(r.ventas_anuladas)}
          accent={Number(r.ventas_anuladas || 0) > 0}
        />
        <StatRow
          label="Reversion parcial"
          value={formatInteger(r.ventas_con_reversion_parcial)}
          accent={Number(r.ventas_con_reversion_parcial || 0) > 0}
        />
        <StatRow label="Total neto" value={formatCurrency(r.total_neto)} />
        <StatRow
          label="Total original"
          value={formatCurrency(r.total_original)}
        />
        <StatRow
          label="Total revertido"
          value={formatCurrency(r.total_anulado)}
          accent={Number(r.total_anulado || 0) > 0}
        />
      </div>

      <article className="panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
          Por metodo de pago
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <StatRow label="Efectivo" value={formatCurrency(r.total_efectivo)} />
          <StatRow label="Tarjeta" value={formatCurrency(r.total_tarjeta)} />
          <StatRow
            label="Transferencia"
            value={formatCurrency(r.total_transferencia)}
          />
        </div>
      </article>

      <article className="panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
          Por tipo de venta
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <StatRow label="Contado" value={formatCurrency(r.total_contado)} />
          <StatRow label="Credito" value={formatCurrency(r.total_credito)} />
          <StatRow
            label="Utilidad estimada"
            value={formatCurrency(r.utilidad_estimada)}
          />
        </div>
      </article>

      <article className="panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
          Ventas por usuario
        </p>
        <div className="table-shell mt-4 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Ventas</th>
                <th>Total neto</th>
              </tr>
            </thead>
            <tbody>
              {(data.por_usuario || []).length === 0 ? (
                <tr>
                  <td colSpan={3}>Sin ventas en el rango.</td>
                </tr>
              ) : (
                (data.por_usuario || []).map((u) => (
                  <tr key={u.id_usuario}>
                    <td>
                      <div className="font-semibold text-stone-900">
                        {u.username}
                      </div>
                      <div className="text-xs text-stone-500">{u.nombre}</div>
                    </td>
                    <td>{formatInteger(u.ventas)}</td>
                    <td>{formatCurrency(u.total_neto)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

export default CortePanel;
