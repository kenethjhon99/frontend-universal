import { alpha } from "@mui/material/styles";

export const getTableContainerSx = (theme) => {
  const isLight = theme.palette.mode === "light";
  const borderColor = alpha(
    isLight ? theme.palette.common.black : theme.palette.common.white,
    isLight ? 0.08 : 0.1
  );

  return {
    borderRadius: 4,
    overflow: "hidden",
    border: `1px solid ${borderColor}`,
    background: isLight
      ? "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(246,249,255,0.92) 100%)"
      : "linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(11,18,31,0.92) 100%)",
    boxShadow: isLight
      ? `0 18px 36px ${alpha("#0f172a", 0.08)}`
      : "0 22px 42px rgba(2,6,23,0.28)",
    backdropFilter: "blur(14px)",
  };
};

export const getTableHeaderRowSx = (theme) => {
  const isLight = theme.palette.mode === "light";
  const baseBorder = alpha(
    isLight ? theme.palette.common.black : theme.palette.common.white,
    isLight ? 0.08 : 0.12
  );

  return {
    background: isLight
      ? `
          linear-gradient(135deg, rgba(226,236,248,0.98) 0%, rgba(217,230,246,0.98) 52%, rgba(208,224,244,0.98) 100%),
          radial-gradient(circle at top right, rgba(37,99,235,0.14), transparent 36%),
          radial-gradient(circle at bottom left, rgba(14,165,233,0.08), transparent 32%)
        `
      : `
          linear-gradient(135deg, rgba(21,31,50,0.98) 0%, rgba(11,18,32,0.98) 56%, rgba(8,13,23,0.98) 100%),
          radial-gradient(circle at top right, rgba(56,189,248,0.18), transparent 34%)
        `,
    boxShadow: isLight
      ? `inset 0 -1px 0 ${baseBorder}, 0 8px 18px ${alpha("#0f172a", 0.04)}`
      : `inset 0 -1px 0 ${baseBorder}, 0 8px 18px rgba(0, 0, 0, 0.18)`,
    "& .MuiTableCell-root": {
      borderBottom: `1px solid ${baseBorder}`,
    },
  };
};

export const getTableHeaderCellSx = (theme) => {
  const isLight = theme.palette.mode === "light";

  return {
    fontWeight: 800,
    color: isLight ? alpha("#10203a", 0.96) : "rgba(248,250,252,0.96)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    fontSize: "0.76rem",
    py: 2.1,
    backgroundColor: "transparent",
    whiteSpace: "nowrap",
    textShadow: isLight ? "none" : "0 1px 0 rgba(0,0,0,0.28)",
  };
};
