const EAN13_LEFT_ODD = {
  0: "0001101",
  1: "0011001",
  2: "0010011",
  3: "0111101",
  4: "0100011",
  5: "0110001",
  6: "0101111",
  7: "0111011",
  8: "0110111",
  9: "0001011",
};

const EAN13_LEFT_EVEN = {
  0: "0100111",
  1: "0110011",
  2: "0011011",
  3: "0100001",
  4: "0011101",
  5: "0111001",
  6: "0000101",
  7: "0010001",
  8: "0001001",
  9: "0010111",
};

const EAN13_RIGHT = {
  0: "1110010",
  1: "1100110",
  2: "1101100",
  3: "1000010",
  4: "1011100",
  5: "1001110",
  6: "1010000",
  7: "1000100",
  8: "1001000",
  9: "1110100",
};

const EAN13_PARITY = {
  0: "OOOOOO",
  1: "OOEOEE",
  2: "OOEEOE",
  3: "OOEEEO",
  4: "OEOOEE",
  5: "OEEOOE",
  6: "OEEEOO",
  7: "OEOEOE",
  8: "OEOEEO",
  9: "OEEOEO",
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const calculateEan13CheckDigit = (baseValue) => {
  const digits = String(baseValue || "").replace(/\D/g, "");

  if (digits.length !== 12) {
    throw new Error("El codigo base debe tener 12 digitos.");
  }

  const total = digits.split("").reduce((acc, digit, index) => {
    const factor = index % 2 === 0 ? 1 : 3;
    return acc + Number(digit) * factor;
  }, 0);

  return (10 - (total % 10)) % 10;
};

export const isValidEan13 = (value) => {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length !== 13) {
    return false;
  }

  return calculateEan13CheckDigit(digits.slice(0, 12)) === Number(digits[12]);
};

export const buildEan13Svg = (
  value,
  {
    moduleWidth = 2,
    barHeight = 74,
    guardHeight = 88,
    fontSize = 14,
    marginX = 14,
    marginY = 12,
  } = {}
) => {
  const digits = String(value || "").replace(/\D/g, "");

  if (!isValidEan13(digits)) {
    return "";
  }

  const firstDigit = digits[0];
  const leftDigits = digits.slice(1, 7).split("");
  const rightDigits = digits.slice(7).split("");
  const parity = EAN13_PARITY[firstDigit];

  let pattern = "101";

  leftDigits.forEach((digit, index) => {
    pattern += parity[index] === "E" ? EAN13_LEFT_EVEN[digit] : EAN13_LEFT_ODD[digit];
  });

  pattern += "01010";

  rightDigits.forEach((digit) => {
    pattern += EAN13_RIGHT[digit];
  });

  pattern += "101";

  const totalModules = pattern.length;
  const width = totalModules * moduleWidth + marginX * 2;
  const height = guardHeight + fontSize + marginY * 2 + 6;
  const guardRanges = new Set([
    ...Array.from({ length: 3 }, (_, index) => index),
    ...Array.from({ length: 5 }, (_, index) => 45 + index),
    ...Array.from({ length: 3 }, (_, index) => 92 + index),
  ]);

  const bars = pattern
    .split("")
    .map((bit, index) => {
      if (bit !== "1") {
        return "";
      }

      const x = marginX + index * moduleWidth;
      const currentHeight = guardRanges.has(index) ? guardHeight : barHeight;

      return `<rect x="${x}" y="${marginY}" width="${moduleWidth}" height="${currentHeight}" rx="0.6" ry="0.6" fill="#111827" />`;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Codigo de barras ${escapeHtml(
      digits
    )}">
      <rect width="${width}" height="${height}" rx="16" ry="16" fill="#ffffff" />
      ${bars}
      <text
        x="${width / 2}"
        y="${guardHeight + marginY + fontSize + 2}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        letter-spacing="1.8"
        fill="#111827"
      >${escapeHtml(digits)}</text>
    </svg>
  `;
};

export const buildBarcodeLabelHtml = ({
  codigo,
  nombre = "Producto",
  descripcion = "",
  subtitle = "Codigo interno generado por el sistema",
}) => {
  const svg = buildEan13Svg(codigo);
  const productName = String(nombre || "").trim() || "Producto";

  if (!svg) {
    throw new Error("Solo se pueden imprimir etiquetas EAN-13 validas.");
  }

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(nombre)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            background: #f5f7fb;
            font-family: "Segoe UI", Arial, sans-serif;
            color: #111827;
          }
          .sheet {
            width: 72mm;
            margin: 0 auto;
            padding: 12px;
            border-radius: 18px;
            background: #ffffff;
            border: 1px solid #dbe4ff;
            box-shadow: 0 16px 30px rgba(15, 23, 42, 0.10);
          }
          .kicker {
            font-size: 10px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #2563eb;
            font-weight: 800;
            margin-bottom: 10px;
            text-align: center;
          }
          .eyebrow {
            font-size: 10px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #475569;
            font-weight: 800;
            margin-bottom: 6px;
            text-align: center;
          }
          h1 {
            margin: 0 0 6px;
            font-size: 17px;
            text-align: center;
            line-height: 1.25;
          }
          p {
            margin: 0;
            text-align: center;
            color: #64748b;
            font-size: 12px;
          }
          .svg-wrap {
            margin: 14px 0 10px;
            padding: 8px;
            border-radius: 16px;
            background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
            border: 1px solid #e5e7eb;
          }
          .code {
            margin-top: 8px;
            text-align: center;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 0.16em;
          }
          .meta {
            margin-top: 10px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 10px;
            color: #64748b;
          }
          .meta strong {
            display: block;
            margin-top: 2px;
            font-size: 11px;
            color: #0f172a;
          }
          .note {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px dashed #cbd5e1;
            font-size: 11px;
            color: #64748b;
            text-align: center;
          }
          @media print {
            @page {
              size: 72mm auto;
              margin: 0;
            }
            body {
              padding: 0;
              background: #ffffff;
            }
            .sheet {
              box-shadow: none;
              border: none;
              border-radius: 0;
              width: 72mm;
              padding: 8px;
            }
          }
        </style>
      </head>
      <body>
        <article class="sheet">
          <div class="eyebrow">Nombre del producto</div>
          <div class="kicker">${escapeHtml(subtitle)}</div>
          <h1>${escapeHtml(productName)}</h1>
          ${descripcion ? `<p>${escapeHtml(descripcion)}</p>` : ""}
          <div class="svg-wrap">${svg}</div>
          <div class="code">${escapeHtml(codigo)}</div>
          <div class="meta">
            <div>
              Tipo
              <strong>EAN-13</strong>
            </div>
            <div>
              Origen
              <strong>Interno</strong>
            </div>
          </div>
          <div class="note">Etiqueta generada desde el modulo de productos con el nombre del producto.</div>
        </article>
      </body>
    </html>
  `;
};
