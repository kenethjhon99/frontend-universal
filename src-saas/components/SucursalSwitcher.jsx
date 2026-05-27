import { useState } from "react";
import apiClient from "../services/apiClient";
import { useAppSession } from "../hooks/useAppSession";

function SucursalSwitcher() {
  const { session, replaceSession } = useAppSession();
  const [loading, setLoading] = useState(false);

  const handleChange = async (event) => {
    const idSucursal = Number(event.target.value);

    if (!idSucursal || idSucursal === session?.sucursal_activa?.id_sucursal) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post("/auth/switch-sucursal", {
        id_sucursal: idSucursal,
      });

      replaceSession(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
        Sucursal activa
      </label>
      <select
        className="field"
        value={session?.sucursal_activa?.id_sucursal || ""}
        onChange={handleChange}
        disabled={loading}
      >
        {(session?.sucursales || []).map((branch) => (
          <option key={branch.id_sucursal} value={branch.id_sucursal}>
            {branch.codigo} - {branch.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SucursalSwitcher;

