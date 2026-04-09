const BUSINESS_INFO = {
  name: "POS System",
  subtitle: "Punto de venta, carwash y mecanica",
  footer: "Documento generado desde el sistema administrativo.",
  addressLines: ["Guatemala"],
  nit: "CF",
};

export const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const formatPrintCurrency = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

export const formatPrintDateTime = (value) => {
  if (!value) return "Sin fecha";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const buildMetaHtml = (metaRows = []) =>
  metaRows
    .filter((row) => row?.value !== undefined && row?.value !== null && String(row.value) !== "")
    .map(
      (row) => `
        <div class="meta-row">
          <div class="meta-label">${escapeHtml(row.label)}</div>
          <div class="meta-value">${escapeHtml(row.value)}</div>
        </div>
      `
    )
    .join("");

const buildCardsHtml = (cards = []) =>
  cards
    .filter((card) => card?.value !== undefined && card?.value !== null && String(card.value) !== "")
    .map(
      (card) => `
        <div class="summary-card">
          <div class="summary-label">${escapeHtml(card.label)}</div>
          <div class="summary-value">${escapeHtml(card.value)}</div>
        </div>
      `
    )
    .join("");

const normalizeCell = (cell) => {
  if (cell && typeof cell === "object" && "value" in cell) {
    return {
      value: cell.value,
      align: cell.align || "left",
      muted: Boolean(cell.muted),
    };
  }

  return {
    value: cell,
    align: "left",
    muted: false,
  };
};

const buildTableHtml = ({ headers = [], rows = [] }) => {
  if (!rows.length) {
    return '<div class="empty-state">No hay informacion disponible para este documento.</div>';
  }

  const thead = headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("");

  const tbody = rows
    .map((row) => {
      const cells = row
        .map((cell) => normalizeCell(cell))
        .map(
          (cell) => `
            <td class="${cell.align === "right" ? "align-right" : ""} ${cell.muted ? "muted-cell" : ""}">
              ${escapeHtml(cell.value)}
            </td>
          `
        )
        .join("");

      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `
    <table class="detail-table">
      <thead>
        <tr>${thead}</tr>
      </thead>
      <tbody>
        ${tbody}
      </tbody>
    </table>
  `;
};

const buildSectionHtml = (title, content) => `
  <section class="section">
    <h2>${escapeHtml(title)}</h2>
    ${content}
  </section>
`;

const buildFormalDocument = ({
  title,
  subtitle,
  accent = "#0f172a",
  badge = "",
  metaRows = [],
  summaryCards = [],
  sections = [],
  footerNote = BUSINESS_INFO.footer,
}) => {
  const summaryHtml = buildCardsHtml(summaryCards);

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          :root {
            color-scheme: light;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 24px;
            background: #f5f7fb;
            color: #111827;
            font-family: "Segoe UI", Arial, sans-serif;
          }
          .document {
            max-width: 900px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
          }
          .hero {
            padding: 28px 30px 24px;
            color: #ffffff;
            background: linear-gradient(135deg, ${accent}, #111827);
          }
          .hero-top {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-start;
          }
          .brand-kicker {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            opacity: 0.8;
            margin-bottom: 10px;
          }
          .hero h1 {
            margin: 0 0 8px;
            font-size: 32px;
            line-height: 1.1;
          }
          .hero p {
            margin: 0;
            color: rgba(255,255,255,0.84);
            font-size: 14px;
          }
          .badge {
            border: 1px solid rgba(255,255,255,0.24);
            background: rgba(255,255,255,0.12);
            color: #ffffff;
            padding: 8px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
          }
          .content {
            padding: 28px 30px 30px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 22px;
          }
          .meta-row {
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 12px 14px;
            background: #fbfdff;
          }
          .meta-label {
            color: #6b7280;
            font-size: 12px;
            margin-bottom: 6px;
          }
          .meta-value {
            font-size: 15px;
            font-weight: 700;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 22px;
          }
          .summary-card {
            border: 1px solid #dbe4ff;
            background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
            border-radius: 18px;
            padding: 14px 16px;
          }
          .summary-label {
            color: #64748b;
            font-size: 12px;
            margin-bottom: 8px;
          }
          .summary-value {
            font-size: 20px;
            font-weight: 800;
          }
          .section {
            margin-bottom: 22px;
          }
          .section h2 {
            margin: 0 0 12px;
            font-size: 16px;
          }
          .detail-table {
            width: 100%;
            border-collapse: collapse;
            overflow: hidden;
            border-radius: 16px;
            border: 1px solid #e5e7eb;
          }
          .detail-table th,
          .detail-table td {
            padding: 11px 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
            vertical-align: top;
          }
          .detail-table th {
            text-align: left;
            background: #f8fafc;
            color: #475569;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .detail-table tr:last-child td {
            border-bottom: none;
          }
          .align-right {
            text-align: right;
          }
          .muted-cell {
            color: #64748b;
          }
          .notes-box {
            border: 1px solid #e5e7eb;
            background: #fbfdff;
            border-radius: 18px;
            padding: 14px 16px;
            line-height: 1.65;
            color: #374151;
            font-size: 13px;
          }
          .empty-state {
            border: 1px dashed #cbd5e1;
            border-radius: 18px;
            padding: 18px;
            color: #64748b;
            font-style: italic;
          }
          .signatures {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 24px;
            margin-top: 28px;
          }
          .sign-line {
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            text-align: center;
            color: #64748b;
            font-size: 12px;
          }
          .footer {
            margin-top: 28px;
            padding-top: 16px;
            border-top: 1px dashed #cbd5e1;
            display: flex;
            justify-content: space-between;
            gap: 16px;
            color: #64748b;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 0;
              background: #ffffff;
            }
            .document {
              box-shadow: none;
              border: none;
              border-radius: 0;
              max-width: none;
            }
          }
        </style>
      </head>
      <body>
        <article class="document">
          <header class="hero">
            <div class="hero-top">
              <div>
                <div class="brand-kicker">${escapeHtml(BUSINESS_INFO.name)}</div>
                <h1>${escapeHtml(title)}</h1>
                <p>${escapeHtml(subtitle || BUSINESS_INFO.subtitle)}</p>
              </div>
              ${badge ? `<div class="badge">${escapeHtml(badge)}</div>` : ""}
            </div>
          </header>

          <div class="content">
            ${metaRows.length ? `<div class="meta-grid">${buildMetaHtml(metaRows)}</div>` : ""}
            ${summaryHtml ? `<div class="summary-grid">${summaryHtml}</div>` : ""}
            ${sections.join("")}

            <div class="signatures">
              <div class="sign-line">Entrega / emite</div>
              <div class="sign-line">Recibe / cliente</div>
            </div>

            <footer class="footer">
              <div>${escapeHtml(footerNote)}</div>
              <div>Generado: ${escapeHtml(formatPrintDateTime(new Date()))}</div>
            </footer>
          </div>
        </article>
      </body>
    </html>
  `;
};

export const openPrintWindow = ({ title, width = 1024, height = 900 }) => {
  const printWindow = window.open(
    "",
    "_blank",
    `width=${width},height=${height}`
  );

  if (!printWindow) {
    throw new Error("Tu navegador bloqueo la ventana emergente para imprimir.");
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #f8fafc;
            color: #0f172a;
            font-family: "Segoe UI", Arial, sans-serif;
          }
          .loading-box {
            padding: 24px 28px;
            border-radius: 20px;
            border: 1px solid #dbe4ff;
            background: #ffffff;
            box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
            text-align: center;
          }
          .loading-box h1 {
            margin: 0 0 8px;
            font-size: 20px;
          }
          .loading-box p {
            margin: 0;
            color: #475569;
          }
        </style>
      </head>
      <body>
        <div class="loading-box">
          <h1>Preparando impresion</h1>
          <p>Generando ${escapeHtml(title)}...</p>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.document.title = title;
  return printWindow;
};

export const openPrintDocument = ({
  title,
  html,
  width = 1024,
  height = 900,
  printWindow = null,
}) => {
  const targetWindow = printWindow || openPrintWindow({ title, width, height });

  if (!targetWindow) {
    throw new Error("Tu navegador bloqueo la ventana emergente para imprimir.");
  }

  targetWindow.document.open();
  targetWindow.document.write(html);
  targetWindow.document.close();
  targetWindow.document.title = title;
  targetWindow.focus();
  targetWindow.print();
};

export const buildVentaTicketHtml = (ventaData) => {
  const venta = ventaData?.venta || {};
  const detalles = Array.isArray(ventaData?.detalles) ? ventaData.detalles : [];
  const tipoComprobante = String(
    venta.comprobante_nombre || venta.tipo_comprobante || "TICKET"
  ).trim();
  const tipoNormalizado = String(venta.tipo_comprobante || "TICKET")
    .trim()
    .toUpperCase();
  const tituloFiscal =
    tipoNormalizado === "FACTURA"
      ? "FACTURA ELECTRONICA"
      : tipoNormalizado === "CCF"
        ? "CREDITO FISCAL ELECTRONICO"
        : "COMPROBANTE DE VENTA";
  const encabezadoFiscal =
    tipoNormalizado === "TICKET"
      ? "COMPROBANTE INTERNO"
      : "DOCUMENTO TRIBUTARIO ELECTRONICO";
  const clienteNombre = venta.cliente_nombre || "CONSUMIDOR FINAL";
  const clienteNit = venta.cliente_nit || "CF";
  const montoRecibido = Number(venta.monto_recibido || 0);
  const cambioEntregado = Number(venta.cambio_entregado || 0);
  const total = Number(venta.total || 0);
  const numeroComprobante = venta.numero_comprobante || `#${venta.id_venta || "-"}`;
  const businessLines = [
    encabezadoFiscal,
    tituloFiscal,
    BUSINESS_INFO.name,
    BUSINESS_INFO.subtitle,
    ...(Array.isArray(BUSINESS_INFO.addressLines) ? BUSINESS_INFO.addressLines : []),
    BUSINESS_INFO.nit ? `NIT ${BUSINESS_INFO.nit}` : "",
  ].filter(Boolean);

  const itemRows = detalles
    .map((detalle) => {
      const cantidad = Number(detalle.cantidad || 0) - Number(detalle.cantidad_anulada || 0);
      if (cantidad <= 0) return "";

      const descripcion = `${cantidad}.0 ${detalle.producto_nombre || "Producto"}`;
      const subtotal = formatPrintCurrency(cantidad * Number(detalle.precio_unitario || 0));

      return `
        <div class="item-row">
          <div class="item-name">${escapeHtml(descripcion)}</div>
          <div class="item-total">${escapeHtml(subtotal)}</div>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  const notas = [
    venta.motivo_anulacion ? `Motivo anulacion: ${venta.motivo_anulacion}` : "",
    venta.usuario_nombre || venta.usuario_username
      ? `Atendido por: ${venta.usuario_nombre || venta.usuario_username}`
      : "",
  ]
    .filter(Boolean)
    .join("<br />");

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(numeroComprobante)}</title>
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #ffffff; color: #111111; }
          body {
            font-family: "Courier New", Courier, monospace;
            font-size: 12px;
            line-height: 1.35;
          }
          .ticket {
            width: 80mm;
            margin: 0 auto;
            padding: 10px 8px 16px;
          }
          .center { text-align: center; }
          .header-line {
            white-space: pre-wrap;
            word-break: break-word;
          }
          .spacer { height: 10px; }
          .rule {
            border-top: 1px dashed #111111;
            margin: 10px 0;
          }
          .item-row,
          .summary-row,
          .meta-line {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
          }
          .item-row + .item-row { margin-top: 4px; }
          .item-name {
            flex: 1;
            min-width: 0;
            padding-right: 8px;
            word-break: break-word;
          }
          .item-total,
          .summary-value {
            white-space: nowrap;
            text-align: right;
          }
          .summary-row {
            font-size: 13px;
            margin-top: 2px;
          }
          .summary-row.total {
            font-size: 14px;
            font-weight: 700;
          }
          .meta-block {
            margin-top: 10px;
          }
          .meta-line { margin-top: 2px; }
          .muted { color: #222222; }
          .footer-note {
            text-align: center;
            margin-top: 12px;
            white-space: pre-wrap;
          }
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .ticket { width: 72mm; padding: 8px 6px 10px; }
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="center">
            ${businessLines
              .map(
                (line) => `<div class="header-line">${escapeHtml(String(line).toUpperCase())}</div>`
              )
              .join("")}
          </div>

          <div class="spacer"></div>

          ${itemRows || '<div class="center">SIN PRODUCTOS</div>'}

          <div class="rule"></div>

          <div class="summary-row total">
            <div>Total</div>
            <div class="summary-value">${escapeHtml(formatPrintCurrency(total))}</div>
          </div>
          ${
            montoRecibido > 0
              ? `
                <div class="summary-row">
                  <div>Pago</div>
                  <div class="summary-value">${escapeHtml(formatPrintCurrency(montoRecibido))}</div>
                </div>
                <div class="summary-row">
                  <div>Cambio</div>
                  <div class="summary-value">${escapeHtml(formatPrintCurrency(cambioEntregado))}</div>
                </div>
              `
              : ""
          }

          <div class="rule"></div>

          <div class="meta-block">
            <div>Nombre: ${escapeHtml(clienteNombre.toUpperCase())}</div>
            <div>Nit: ${escapeHtml(String(clienteNit).toUpperCase())}</div>
          </div>

          <div class="spacer"></div>

          <div class="center muted">
            <div>Fecha ${escapeHtml(formatPrintDateTime(venta.fecha))}</div>
            <div>Serie ${escapeHtml(venta.serie_comprobante || "-")}</div>
            <div>${escapeHtml(tipoComprobante)} No. ${escapeHtml(numeroComprobante)}</div>
          </div>

          ${
            notas
              ? `
                <div class="rule"></div>
                <div class="footer-note">${notas}</div>
              `
              : ""
          }

          <div class="footer-note">
            ${escapeHtml(BUSINESS_INFO.footer)}
          </div>
        </div>
      </body>
    </html>
  `;
};

export const buildCompraTicketHtml = (compraData) => {
  const compra = compraData?.compra || {};
  const detalles = Array.isArray(compraData?.detalles) ? compraData.detalles : [];
  const resumen = compraData?.resumen || {};
  const estado = String(compra.estado_real || compra.estado || "COMPLETADA").replaceAll("_", " ");

  return buildFormalDocument({
    title: "Comprobante de compra",
    subtitle: "Ingreso formal de inventario y documento de compra.",
    accent: "#7c3aed",
    badge: `Compra #${compra.id_compra || "-"}`,
    metaRows: [
      { label: "Proveedor", value: compra.proveedor_nombre || "-" },
      { label: "Documento", value: compra.no_documento || "Sin documento" },
      { label: "Metodo de pago", value: compra.metodo_pago || "-" },
      { label: "Fecha", value: formatPrintDateTime(compra.fecha || compra.fecha_compra) },
      {
        label: "Usuario",
        value: compra.usuario_nombre || compra.usuario_username || "Usuario",
      },
      { label: "Estado", value: estado },
    ],
    summaryCards: [
      { label: "Total original", value: formatPrintCurrency(resumen.total_original ?? compra.total) },
      { label: "Total actual", value: formatPrintCurrency(resumen.total_actual ?? compra.total) },
      {
        label: "Unidades activas",
        value: String(resumen.items_actual ?? detalles.reduce((acc, item) => acc + Number(item.cantidad || 0), 0)),
      },
    ],
    sections: [
      buildSectionHtml(
        "Detalle de productos",
        buildTableHtml({
          headers: ["Producto", "Cantidad", "Costo", "Subtotal", "Estado"],
          rows: detalles.map((detalle) => {
            const cantidad = Number(detalle.cantidad || 0) - Number(detalle.cantidad_anulada || 0);
            const subtotal = cantidad * Number(detalle.precio_compra || 0);

            return [
              `${detalle.producto_nombre || "Producto"} (${detalle.codigo_barras || "Sin codigo"})`,
              { value: cantidad, align: "right" },
              {
                value: formatPrintCurrency(detalle.precio_compra),
                align: "right",
              },
              { value: formatPrintCurrency(subtotal), align: "right" },
              detalle.estado || "ACTIVO",
            ];
          }),
        })
      ),
      compra.observaciones
        ? buildSectionHtml(
            "Observaciones",
            `<div class="notes-box">${escapeHtml(compra.observaciones)}</div>`
          )
        : "",
      compra.motivo_anulacion
        ? buildSectionHtml(
            "Motivo de anulacion",
            `<div class="notes-box">${escapeHtml(compra.motivo_anulacion)}</div>`
          )
        : "",
    ],
    footerNote: "Comprobante generado desde el modulo de compras.",
  });
};

export const buildAutolavadoTicketHtml = (orden) =>
  buildFormalDocument({
    title: "Orden de autolavado",
    subtitle: "Ticket formal de recepcion y servicio de lavado.",
    accent: "#1d4ed8",
    badge: `Orden #${orden?.id_autolavado_orden || "-"}`,
    metaRows: [
      { label: "Vehiculo", value: orden?.tipo_vehiculo_nombre || "-" },
      { label: "Servicio", value: orden?.servicio_nombre || "-" },
      { label: "Cliente", value: orden?.nombre_cliente || "Consumidor final" },
      { label: "Placa", value: orden?.placa || "Sin placa" },
      { label: "Color", value: orden?.color || "Sin color" },
      { label: "Metodo de pago", value: orden?.metodo_pago || "-" },
      { label: "Estado", value: String(orden?.estado_trabajo || "RECIBIDO").replaceAll("_", " ") },
      { label: "Tecnico asignado", value: orden?.tecnico_nombre || orden?.tecnico_username || "Sin asignar" },
      { label: "Fecha", value: formatPrintDateTime(orden?.fecha) },
    ],
    summaryCards: [
      { label: "Monto cobrado", value: formatPrintCurrency(orden?.monto_cobrado) },
      { label: "Duracion estimada", value: `${Number(orden?.duracion_minutos || 0)} min` },
      { label: "Recibido por", value: orden?.usuario_nombre || orden?.username || "Usuario" },
    ],
    sections: [
      buildSectionHtml(
        "Datos del servicio",
        `<div class="notes-box">
          <div><strong>Observaciones:</strong> ${escapeHtml(orden?.observaciones || "Sin observaciones")}</div>
        </div>`
      ),
    ],
    footerNote: "Ticket generado desde el modulo de autolavado.",
  });

export const buildReparacionTicketHtml = (orden) =>
  buildFormalDocument({
    title: "Orden de reparacion",
    subtitle: "Ticket formal de recepcion y control de trabajo mecanico.",
    accent: "#b45309",
    badge: `Orden #${orden?.id_reparacion_orden || "-"}`,
    metaRows: [
      { label: "Vehiculo", value: orden?.tipo_vehiculo_nombre || "-" },
      { label: "Servicio", value: orden?.servicio_nombre || "-" },
      { label: "Cliente", value: orden?.nombre_cliente || "Consumidor final" },
      { label: "Placa", value: orden?.placa || "Sin placa" },
      { label: "Color", value: orden?.color || "Sin color" },
      { label: "Kilometraje", value: orden?.kilometraje || "No registrado" },
      { label: "Estado trabajo", value: String(orden?.estado_trabajo || "RECIBIDO").replaceAll("_", " ") },
      { label: "Estado cobro", value: orden?.estado || "PENDIENTE" },
      { label: "Tecnico asignado", value: orden?.tecnico_nombre || orden?.tecnico_username || "Sin asignar" },
      { label: "Metodo de pago", value: orden?.metodo_pago || "Pendiente" },
      { label: "Fecha", value: formatPrintDateTime(orden?.fecha) },
    ],
    summaryCards: [
      { label: "Mano de obra", value: formatPrintCurrency(orden?.precio_base || orden?.servicio_precio_base) },
      { label: "Repuestos cobrados", value: formatPrintCurrency(orden?.productos_total_cobrado || 0) },
      { label: "Total orden", value: formatPrintCurrency(orden?.monto_cobrado || 0) },
    ],
    sections: [
      buildSectionHtml(
        "Diagnostico y observaciones",
        `<div class="notes-box">
          <div><strong>Diagnostico inicial:</strong> ${escapeHtml(orden?.diagnostico_inicial || "Sin diagnostico")}</div>
          <div style="margin-top:10px;"><strong>Observaciones:</strong> ${escapeHtml(orden?.observaciones || "Sin observaciones")}</div>
        </div>`
      ),
      buildSectionHtml(
        "Productos usados",
        buildTableHtml({
          headers: ["Producto", "Cantidad", "Precio", "Cobro", "Subtotal"],
          rows: (orden?.productos_usados || []).map((producto) => [
            `${producto.producto_nombre || "Producto"} (${producto.codigo_barras || "Sin codigo"})`,
            { value: producto.cantidad || 0, align: "right" },
            {
              value: formatPrintCurrency(producto.precio_unitario),
              align: "right",
            },
            producto.cobra_al_cliente ? "Cobrado" : "Uso interno",
            {
              value: formatPrintCurrency(
                producto.cobra_al_cliente ? producto.subtotal_cobrado : 0
              ),
              align: "right",
            },
          ]),
        })
      ),
    ],
    footerNote: "Ticket generado desde el modulo de reparacion.",
  });

export const buildCajaCorteHtml = ({ sesion, resumen, movimientos = [] }) =>
    buildFormalDocument({
    title: "Corte de caja",
    subtitle: "Resumen formal de apertura, movimientos y cierre de caja.",
    accent: "#0f172a",
    badge: `Sesion #${sesion?.id_caja_sesion || "-"}`,
    metaRows: [
      { label: "Usuario", value: sesion?.nombre || sesion?.username || "Usuario" },
      { label: "Estado", value: sesion?.estado || "-" },
      { label: "Fecha apertura", value: formatPrintDateTime(sesion?.fecha_apertura) },
      {
        label: "Fecha cierre",
        value: sesion?.fecha_cierre ? formatPrintDateTime(sesion.fecha_cierre) : "Pendiente",
      },
      {
        label: "Observaciones apertura",
        value: sesion?.observaciones_apertura || "Sin observaciones",
      },
      {
        label: "Observaciones cierre",
        value: sesion?.observaciones_cierre || "Sin observaciones",
      },
    ],
    summaryCards: [
      { label: "Apertura", value: formatPrintCurrency(resumen?.monto_apertura) },
      { label: "Ventas efectivo", value: formatPrintCurrency(resumen?.total_efectivo) },
      {
        label: "Servicios efectivo",
        value: formatPrintCurrency(resumen?.total_servicios_efectivo || 0),
      },
      {
        label: "Reparaciones efectivo",
        value: formatPrintCurrency(resumen?.total_reparaciones_efectivo || 0),
      },
      { label: "Ingresos manuales", value: formatPrintCurrency(resumen?.ingresos_manuales) },
      { label: "Egresos manuales", value: formatPrintCurrency(resumen?.egresos_manuales) },
      { label: "Cierre calculado", value: formatPrintCurrency(resumen?.cierre_calculado) },
      {
        label: "Cierre reportado",
        value: formatPrintCurrency(resumen?.monto_cierre_reportado || 0),
      },
      { label: "Diferencia", value: formatPrintCurrency(resumen?.diferencia || 0) },
      {
        label: "No cobrados",
        value: String(
          Number(resumen?.ventas_no_cobradas || 0) +
            Number(resumen?.servicios_no_cobrados || 0) +
            Number(resumen?.reparaciones_no_cobradas || 0)
        ),
      },
      {
        label: "Admins validaron",
        value:
          (resumen?.no_cobrados_validados_admins || [])
            .map((item) => item.nombre || item.username)
            .filter(Boolean)
            .join(", ") || "Sin validaciones",
      },
    ],
      sections: [
        buildSectionHtml(
          "Registros no cobrados",
          buildTableHtml({
            headers: ["Modulo", "Cantidad"],
            rows: [
              ["Ventas", { value: Number(resumen?.ventas_no_cobradas || 0), align: "right" }],
              ["Autolavado", { value: Number(resumen?.servicios_no_cobrados || 0), align: "right" }],
              ["Reparacion", { value: Number(resumen?.reparaciones_no_cobradas || 0), align: "right" }],
              [
                "Pendientes al generar el reporte",
                { value: Number(resumen?.no_cobrados_pendientes_count || 0), align: "right" },
              ],
            ],
          }) +
            (Number(resumen?.no_cobrados_pendientes_count || 0) === 0 &&
            Number(
              Number(resumen?.ventas_no_cobradas || 0) +
                Number(resumen?.servicios_no_cobrados || 0) +
                Number(resumen?.reparaciones_no_cobradas || 0)
            ) > 0
              ? `<div class="notes-box">Los registros no cobrados de esta sesion ya fueron validados con autorizacion administrativa para permitir el cierre.</div>`
              : "")
        ),
        buildSectionHtml(
          "Validacion administrativa de no cobrados",
          (resumen?.no_cobrados_validados_count || 0) > 0
            ? buildTableHtml({
                headers: ["Modulo", "Referencia", "Admin", "Fecha", "Nota"],
                rows: (resumen?.no_cobrados_validados || []).map((item) => [
                  item.modulo || "-",
                  item.documento || item.referencia || "-",
                  item.admin_nombre || item.admin_username || "Sin dato",
                  formatPrintDateTime(item.fecha_validacion),
                  item.nota_validacion || "Sin nota",
                ]),
              })
            : '<div class="notes-box">No hubo validaciones administrativas de no cobro en esta sesion.</div>'
        ),
        buildSectionHtml(
          "Conciliacion por metodo de pago",
          buildTableHtml({
            headers: ["Concepto", "Monto"],
            rows: [
              ["Efectivo segun sistema", { value: formatPrintCurrency(resumen?.conciliacion?.efectivo_sistema), align: "right" }],
              ["Tarjeta", { value: formatPrintCurrency(resumen?.conciliacion?.total_tarjeta), align: "right" }],
              ["Transferencia", { value: formatPrintCurrency(resumen?.conciliacion?.total_transferencia), align: "right" }],
              ["Credito", { value: formatPrintCurrency(resumen?.conciliacion?.total_credito), align: "right" }],
              ["Total no efectivo", { value: formatPrintCurrency(resumen?.conciliacion?.total_no_efectivo), align: "right" }],
              ["Efectivo reportado", { value: formatPrintCurrency(resumen?.conciliacion?.efectivo_reportado || 0), align: "right" }],
              ["Diferencia", { value: formatPrintCurrency(resumen?.conciliacion?.diferencia_efectivo || 0), align: "right" }],
            ],
          })
        ),
        buildSectionHtml(
          "Gastos por categoria",
          buildTableHtml({
            headers: ["Categoria", "Movimientos", "Total"],
            rows: (resumen?.gastos_por_categoria || []).map((gasto) => [
              gasto.categoria || "SIN_CATEGORIA",
              { value: gasto.cantidad || 0, align: "right" },
              { value: formatPrintCurrency(gasto.total), align: "right" },
            ]),
          })
        ),
        buildSectionHtml(
          "Movimientos manuales",
          buildTableHtml({
          headers: ["Fecha", "Tipo", "Categoria", "Descripcion", "Usuario", "Monto"],
          rows: movimientos.map((movimiento) => [
            formatPrintDateTime(movimiento.fecha),
            movimiento.tipo || "-",
            movimiento.categoria || "Sin categoria",
            movimiento.descripcion || "Sin descripcion",
            movimiento.nombre || movimiento.username || "Usuario",
            { value: formatPrintCurrency(movimiento.monto), align: "right" },
          ]),
        })
      ),
    ],
    footerNote: "Corte generado desde el modulo de caja.",
  });

export const buildCajaNoCobrosValidadosHtml = ({ sesion, resumen }) =>
  buildFormalDocument({
    title: "Validaciones administrativas de no cobro",
    subtitle: "Detalle de autorizaciones aplicadas durante la sesion de caja.",
    accent: "#15803d",
    badge: `Sesion #${sesion?.id_caja_sesion || "-"}`,
    metaRows: [
      { label: "Usuario de caja", value: sesion?.nombre || sesion?.username || "Usuario" },
      { label: "Fecha apertura", value: formatPrintDateTime(sesion?.fecha_apertura) },
      {
        label: "Fecha cierre",
        value: sesion?.fecha_cierre ? formatPrintDateTime(sesion.fecha_cierre) : "Pendiente",
      },
      {
        label: "Admins validadores",
        value:
          (resumen?.no_cobrados_validados_admins || [])
            .map((item) => item.nombre || item.username)
            .filter(Boolean)
            .join(", ") || "Sin validaciones",
      },
    ],
    summaryCards: [
      {
        label: "Registros validados",
        value: String(Number(resumen?.no_cobrados_validados_count || 0)),
      },
      {
        label: "Pendientes actuales",
        value: String(Number(resumen?.no_cobrados_pendientes_count || 0)),
      },
    ],
    sections: [
      buildSectionHtml(
        "Detalle de validaciones",
        (resumen?.no_cobrados_validados_count || 0) > 0
          ? buildTableHtml({
              headers: ["Modulo", "Referencia", "Admin", "Fecha", "Nota"],
              rows: (resumen?.no_cobrados_validados || []).map((item) => [
                item.modulo || "-",
                item.documento || item.referencia || "-",
                item.admin_nombre || item.admin_username || "Sin dato",
                formatPrintDateTime(item.fecha_validacion),
                item.nota_validacion || "Sin nota",
              ]),
            })
          : '<div class="notes-box">No existen validaciones administrativas registradas para esta sesion.</div>'
      ),
    ],
    footerNote: "Documento generado desde el cierre y validacion administrativa de caja.",
  });

export const buildKardexHtml = ({
  producto = null,
  movimientos = [],
  filtros = {},
  resumen = {},
}) =>
  (() => {
    const ultimoMovimiento = movimientos[0] || null;
    const valorInventario = producto
      ? Number(producto.existencia || 0) * Number(producto.precio_compra || 0)
      : 0;

    return buildFormalDocument({
    title: "Kardex de inventario",
    subtitle: "Trazabilidad formal de entradas, salidas y ajustes de stock.",
    accent: "#1f2937",
    badge: producto
      ? `Producto #${producto.id_producto || "-"}`
      : "Kardex general",
    metaRows: [
      { label: "Producto", value: producto?.nombre || "Todos los productos" },
      { label: "Codigo", value: producto?.codigo_barras || "Todos" },
      { label: "Desde", value: filtros?.desde || "Sin filtro" },
      { label: "Hasta", value: filtros?.hasta || "Sin filtro" },
      { label: "Tipo", value: filtros?.tipo || "Todos" },
      { label: "Busqueda", value: filtros?.q || "Sin filtro" },
    ],
    summaryCards: [
      {
        label: "Stock actual",
        value: producto
          ? String(Number(producto.existencia || 0))
          : `${movimientos.length} movimiento(s)`,
      },
      {
        label: "Entradas visibles",
        value: String(Number(resumen?.entradas || 0)),
      },
      {
        label: "Salidas visibles",
        value: String(Number(resumen?.salidas || 0)),
      },
      {
        label: "Ajustes visibles",
        value: String(Number(resumen?.ajustes || 0)),
      },
      producto
        ? {
            label: "Valor estimado stock",
            value: formatPrintCurrency(valorInventario),
          }
        : null,
      ultimoMovimiento
        ? {
            label: "Ultimo movimiento",
            value: `${ultimoMovimiento.tipo} | ${formatPrintDateTime(ultimoMovimiento.fecha)}`,
          }
        : null,
      producto
        ? {
            label: "Stock minimo",
            value: String(Number(producto.stock_minimo || 0)),
          }
        : null,
      producto?.ubicacion
        ? {
            label: "Ubicacion",
            value: producto.ubicacion,
          }
        : null,
    ],
    sections: [
      buildSectionHtml(
        "Movimientos de stock",
        buildTableHtml({
          headers: [
            "Fecha",
            "Producto",
            "Tipo",
            "Cantidad",
            "Antes",
            "Despues",
            "Motivo",
            "Usuario",
          ],
          rows: movimientos.map((movimiento) => [
            formatPrintDateTime(movimiento.fecha),
            `${movimiento.producto_nombre || "Producto"} (${movimiento.producto_codigo_barras || "Sin codigo"})`,
            movimiento.tipo || "-",
            { value: Number(movimiento.cantidad || 0), align: "right" },
            { value: Number(movimiento.existencia_antes || 0), align: "right" },
            { value: Number(movimiento.existencia_despues || 0), align: "right" },
            movimiento.motivo || "Sin detalle",
            movimiento.usuario_nombre || movimiento.usuario_username || "Sistema",
          ]),
        })
      ),
    ],
    footerNote: "Kardex generado desde el modulo de inventario.",
    });
  })();
