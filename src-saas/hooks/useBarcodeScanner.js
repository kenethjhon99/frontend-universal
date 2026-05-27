import { useEffect, useRef } from "react";

/**
 * Hook que escucha entradas de un escaner USB de codigo de barras.
 *
 * Heuristica:
 *  - Los escaneres USB se comportan como teclados que disparan secuencias
 *    rapidas (gap entre teclas <= ~30ms) terminadas en Enter.
 *  - Se distingue de tipeo humano por velocidad: si el promedio entre
 *    keypresses es <= maxAvgIntervalMs, lo tratamos como scan.
 *  - Se ignora si el foco esta en un input/textarea/contenteditable
 *    (porque ahi el usuario podria estar tipeando).
 *
 * Uso:
 *   useBarcodeScanner((codigo) => {
 *     addProductoByBarcode(codigo);
 *   });
 *
 * Opciones avanzadas:
 *   useBarcodeScanner(onScan, {
 *     minLength: 6,
 *     maxAvgIntervalMs: 35,
 *     captureInInputs: false,   // poner true para escanear en cualquier momento
 *     prefix: null,             // "P" si tu escaner agrega prefijo configurable
 *   });
 */
export const useBarcodeScanner = (onScan, options = {}) => {
  const {
    minLength = 4,
    maxAvgIntervalMs = 35,
    captureInInputs = false,
    prefix = null,
  } = options;

  const bufferRef = useRef([]);
  const timestampsRef = useRef([]);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const reset = () => {
      bufferRef.current = [];
      timestampsRef.current = [];
    };

    const handler = (event) => {
      // Si el foco esta en un input editable y captureInInputs=false, ignorar
      if (!captureInInputs) {
        const target = event.target;
        if (target) {
          const tag = (target.tagName || "").toLowerCase();
          if (
            tag === "input" ||
            tag === "textarea" ||
            tag === "select" ||
            target.isContentEditable
          ) {
            return;
          }
        }
      }

      const now = performance.now();

      if (event.key === "Enter") {
        const buf = bufferRef.current.join("");
        const timestamps = timestampsRef.current;

        if (buf.length < minLength) {
          reset();
          return;
        }

        // Calcular promedio entre teclas
        let avgInterval = 0;
        if (timestamps.length >= 2) {
          let total = 0;
          for (let i = 1; i < timestamps.length; i += 1) {
            total += timestamps[i] - timestamps[i - 1];
          }
          avgInterval = total / (timestamps.length - 1);
        }

        // Solo dispara si parece scan (rapido)
        if (avgInterval <= maxAvgIntervalMs) {
          let code = buf;
          if (prefix && code.startsWith(prefix)) {
            code = code.slice(prefix.length);
          }
          event.preventDefault();
          try {
            onScanRef.current?.(code);
          } catch {
            /* noop */
          }
        }

        reset();
        return;
      }

      // Solo capturamos chars imprimibles de longitud 1
      if (event.key && event.key.length === 1) {
        // Limpiar si han pasado >300ms desde el ultimo char (nuevo intento)
        const last = timestampsRef.current[timestampsRef.current.length - 1];
        if (last && now - last > 300) {
          reset();
        }
        bufferRef.current.push(event.key);
        timestampsRef.current.push(now);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [minLength, maxAvgIntervalMs, captureInInputs, prefix]);
};

export default useBarcodeScanner;
