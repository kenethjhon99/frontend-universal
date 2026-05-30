/**
 * Impresion de tickets desde POS SaaS.
 *
 * Soporta dos modos:
 *
 *  A) BROWSER PRINT (default, sin instalacion adicional):
 *     Genera HTML optimizado para impresoras termicas 58/80mm con CSS @page,
 *     abre una ventana invisible, llama window.print(). Funciona en cualquier
 *     navegador moderno; el sistema operativo se encarga del driver.
 *
 *  B) AGENT PRINT (opcional, latencia menor y sin dialogo del navegador):
 *     Si hay un agente local escuchando en http://localhost:9100/print
 *     (ej. qz-tray, escpos-bridge, o un microservicio propio), envia el ticket
 *     como comandos ESC/POS via POST. Habilitado con env VITE_PRINTER_AGENT_URL.
 *
 * Uso:
 *   import { printVentaTicket } from "../lib/ticket-printer";
 *   await printVentaTicket(venta, { empresa, sucursal });
 */

const AGENT_URL = String(import.meta.env?.VITE_PRINTER_AGENT_URL || "").trim();

const formatCurrency = (n) => `Q ${Number(n || 0).toFixed(2)}`;
const formatInt = (n) => String(Number(n || 0));
const padCenter = (text, width) => {
  const s = String(text || "");
  if (s.length >= width) return s.slice(0, width);
  const pad = Math.floor((width - s.length) / 2);
  return " ".repeat(pad) + s + " ".repeat(width - s.length - pad);
};
const line = (char = "-", width = 32) => char.repeat(width);

/**
 * Construye el HTML del ticket en formato termico (58mm = ~32 chars,
 * 80mm = ~48 chars).
 */
const buildTicketHtml = (venta, ctx, opts = {}) => {
  const width = opts.width || 32;
  const empresa = ctx.empresa || {};
  const sucursal = ctx.sucursal || {};
  const detalles = venta.detalles || [];
  const v = venta.venta || venta;

  const itemRows = detalles
    .map((d) => {
      const nombre = String(d.producto_nombre || d.nombre || "").slice(0, width);
      const cant = formatInt(d.cantidad);
      const precio = Number(d.precio_unitario || 0).toFixed(2);
      const subtotal = (Number(d.cantidad || 0) * Number(d.precio_unitario || 0)).toFixed(2);
      // Linea 1: nombre completo
      // Linea 2: cantidad x precio = subtotal (alineado a la derecha)
      const detalle = `${cant} x ${precio}`;
      const padding = width - detalle.length - subtotal.length;
      return `${nombre}\n${detalle}${" ".repeat(Math.max(1, padding))}${subtotal}`;
    })
    .join("\n");

  const totalLine = (label, value) => {
    const v = formatCurrency(value);
    const padding = width - label.length - v.length;
    return `${label}${" ".repeat(Math.max(1, padding))}${v}`;
  };

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Ticket ${v.numero_comprobante || ""}</title>
<style>
  @page {
    size: ${opts.paperSize || "58mm auto"};
    margin: 2mm;
  }
  body {
    font-family: "Courier New", "Lucida Console", monospace;
    font-size: 11px;
    line-height: 1.3;
    margin: 0;
    padding: 0;
    color: #000;
  }
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  hr {
    border: none;
    border-top: 1px dashed #000;
    margin: 4px 0;
  }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
<pre>${padCenter(empresa.nombre_legal || "TradeNova", width)}
${padCenter(sucursal.nombre || "", width)}
${empresa.nit ? padCenter("NIT: " + empresa.nit, width) + "\n" : ""}${line("=", width)}
Comp: ${v.numero_comprobante || "-"}
Fecha: ${new Date(v.fecha_venta || Date.now()).toLocaleString("es-GT")}
Cajero: ${v.usuario_username || "-"}
${v.cliente_nombre ? "Cliente: " + v.cliente_nombre + "\n" : ""}${line("-", width)}
${itemRows}
${line("-", width)}
${totalLine("SUBTOTAL", v.subtotal)}
${totalLine("TOTAL", v.total)}
${v.monto_recibido != null ? totalLine("RECIBIDO", v.monto_recibido) + "\n" + totalLine("CAMBIO", v.cambio) + "\n" : ""}${line("=", width)}
${padCenter("GRACIAS POR SU COMPRA", width)}
${padCenter(v.tipo_comprobante || "TICKET", width)}</pre>
<script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close();},500);},100);}</script>
</body>
</html>`;
};

/**
 * Imprime usando window.open + print(). Funciona en cualquier navegador.
 */
export const printViaBrowser = (venta, ctx, opts) => {
  const html = buildTicketHtml(venta, ctx, opts);
  const w = window.open("", "_blank", "width=300,height=600");
  if (!w) {
    throw new Error(
      "El navegador bloqueo la ventana de impresion. Permite popups para este sitio."
    );
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
};

/**
 * Imprime via agente local. El agente recibe { ticket: htmlPlano, copies }
 * y se encarga de hablar ESC/POS con la impresora termica.
 */
export const printViaAgent = async (venta, ctx, opts = {}) => {
  if (!AGENT_URL) {
    throw new Error(
      "VITE_PRINTER_AGENT_URL no configurado. Usa printViaBrowser() en su lugar."
    );
  }
  const text = buildTicketHtml(venta, ctx, opts)
    .replace(/<[^>]*>/g, "") // strip tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

  const response = await fetch(`${AGENT_URL}/print`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ticket: text,
      copies: opts.copies || 1,
      cut: opts.cut !== false,
      open_drawer: opts.openDrawer === true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Agente imprimio con error: HTTP ${response.status}`);
  }
};

/**
 * Ruteo automatico: agent si esta configurado, browser si no.
 */
export const printVentaTicket = async (venta, ctx, opts = {}) => {
  if (AGENT_URL && opts.preferAgent !== false) {
    try {
      await printViaAgent(venta, ctx, opts);
      return { method: "agent" };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[printer] agente fallo, cae a browser:", error.message);
    }
  }
  printViaBrowser(venta, ctx, opts);
  return { method: "browser" };
};
