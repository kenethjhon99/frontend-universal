import { useEffect, useState } from "react";
import { isOnline } from "../lib/pwa";
import { listPending } from "../lib/offline-queue";

/**
 * Banner global que muestra:
 *  - "Sin conexion" cuando offline
 *  - Numero de ventas en cola pendiente de sincronizar (siempre que > 0)
 *
 * Se monta una sola vez en el layout raiz.
 */
function ConnectivityBanner() {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = async () => {
    try {
      const items = await listPending();
      setPendingCount(items.length);
    } catch {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    const onConn = (event) => setOnline(event.detail.online);
    const onDrained = () => refreshPending();

    window.addEventListener("saas:connectivity", onConn);
    window.addEventListener("saas:queue-drained", onDrained);

    refreshPending();
    const interval = setInterval(refreshPending, 10_000);

    return () => {
      window.removeEventListener("saas:connectivity", onConn);
      window.removeEventListener("saas:queue-drained", onDrained);
      clearInterval(interval);
    };
  }, []);

  if (online && pendingCount === 0) return null;

  return (
    <div
      className={`fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-3 px-4 py-2 text-sm font-semibold ${
        online
          ? "bg-amber-100 text-amber-800"
          : "bg-rose-600 text-white"
      }`}
    >
      {!online ? <span>Sin conexion - operando en modo offline</span> : null}
      {pendingCount > 0 ? (
        <span>
          {pendingCount} venta{pendingCount === 1 ? "" : "s"} pendiente
          {pendingCount === 1 ? "" : "s"} de sincronizar
        </span>
      ) : null}
    </div>
  );
}

export default ConnectivityBanner;
