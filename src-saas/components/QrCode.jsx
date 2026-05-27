import { useEffect, useRef } from "react";

/**
 * Componente QR sin dependencias.
 * Usa la API publica de Google Charts (QR) como image source. Si tu app no
 * puede llamar APIs externas, reemplaza por una libreria como `qrcode` o
 * por generacion server-side.
 *
 * Tamaño en pixeles por lado (default 200).
 */
function QrCode({ value, size = 200, alt = "QR" }) {
  const imgRef = useRef(null);

  // Construir URL del QR con el valor codificado
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(
    value || ""
  )}`;

  // Si quieres generar QR localmente sin dep externa, reemplaza la <img> por
  // <canvas> y usa un encoder. La opcion mas liviana es la libreria `qrcode`
  // (3KB gzip) instalada como dep opcional.

  useEffect(() => {
    // No-op por ahora; placeholder por si futuro: render local
  }, [value, size]);

  return (
    <img
      ref={imgRef}
      src={url}
      width={size}
      height={size}
      alt={alt}
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    />
  );
}

export default QrCode;
