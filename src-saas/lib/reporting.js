export const formatCurrency = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

export const formatInteger = (value) =>
  new Intl.NumberFormat("es-GT", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatDateTime = (value) => {
  if (!value) return "Sin dato";

  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const normalizeApiError = (error, fallback) =>
  error.response?.data?.error || fallback;

export const buildDefaultDateRange = (days = 7) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - Math.max(0, Number(days || 0) - 1));

  return {
    desde: start.toISOString().slice(0, 10),
    hasta: end.toISOString().slice(0, 10),
  };
};

export const downloadCsvFile = (filename, lines) => {
  const csv = lines
    .map((line) =>
      line
        .map((value) =>
          `"${String(value ?? "").replaceAll('"', '""')}"`
        )
        .join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
