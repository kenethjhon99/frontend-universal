import { alpha } from "@mui/material/styles";

export const getFilterPanelSx = (theme, options = {}) => {
  const { mb = 0, compact = false } = options;
  const isLight = theme.palette.mode === "light";
  const borderColor = alpha(
    isLight ? "#0f172a" : "#e2e8f0",
    isLight ? 0.08 : 0.1
  );
  const inputBorderColor = alpha(
    isLight ? "#0f172a" : "#cbd5e1",
    isLight ? 0.14 : 0.16
  );
  const hoverBorderColor = alpha(
    theme.palette.primary.main,
    isLight ? 0.34 : 0.42
  );
  const focusedGlow = alpha(
    theme.palette.primary.main,
    isLight ? 0.18 : 0.22
  );

  return {
    p: compact ? { xs: 2, md: 2.15 } : { xs: 2.1, md: 2.35 },
    mb,
    borderRadius: compact ? 3.5 : 4,
    position: "relative",
    overflow: "hidden",
    border: `1px solid ${borderColor}`,
    background: isLight
      ? `
          linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 52%, rgba(241,245,249,0.98) 100%),
          radial-gradient(circle at top right, rgba(59,130,246,0.12), transparent 34%),
          radial-gradient(circle at bottom left, rgba(14,165,233,0.08), transparent 32%),
          repeating-linear-gradient(
            135deg,
            rgba(255,255,255,0.12) 0px,
            rgba(255,255,255,0.12) 1px,
            transparent 1px,
            transparent 18px
          )
        `
      : `
          linear-gradient(135deg, rgba(16,23,37,0.96) 0%, rgba(11,18,31,0.98) 55%, rgba(8,14,24,0.98) 100%),
          radial-gradient(circle at top right, rgba(37,99,235,0.18), transparent 34%),
          radial-gradient(circle at bottom left, rgba(14,165,233,0.10), transparent 32%),
          repeating-linear-gradient(
            135deg,
            rgba(255,255,255,0.018) 0px,
            rgba(255,255,255,0.018) 1px,
            transparent 1px,
            transparent 18px
          )
        `,
    boxShadow: isLight
      ? `0 18px 40px ${alpha("#0f172a", 0.08)}, inset 0 1px 0 rgba(255,255,255,0.74)`
      : "0 24px 56px rgba(2, 6, 23, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)",
    backdropFilter: "blur(18px)",
    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background: isLight
        ? "linear-gradient(180deg, rgba(255,255,255,0.34), transparent 34%)"
        : "linear-gradient(180deg, rgba(255,255,255,0.04), transparent 38%)",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      left: 24,
      right: 24,
      top: 0,
      height: "1px",
      pointerEvents: "none",
      background: isLight
        ? "linear-gradient(90deg, transparent, rgba(59,130,246,0.38), transparent)"
        : "linear-gradient(90deg, transparent, rgba(56,189,248,0.34), transparent)",
    },
    "&:hover": {
      boxShadow: isLight
        ? `0 22px 44px ${alpha("#0f172a", 0.1)}, inset 0 1px 0 rgba(255,255,255,0.78)`
        : "0 28px 58px rgba(2, 6, 23, 0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
    },
    "& > *": {
      position: "relative",
      zIndex: 1,
    },
    "& .MuiOutlinedInput-root": {
      borderRadius: 2.75,
      backgroundColor: isLight
        ? "rgba(255,255,255,0.84)"
        : "rgba(7, 16, 31, 0.72)",
      boxShadow: isLight
        ? "inset 0 1px 0 rgba(255,255,255,0.84)"
        : "inset 0 1px 0 rgba(255,255,255,0.03)",
      transition:
        "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease",
      "& fieldset": {
        borderColor: inputBorderColor,
      },
      "&:hover": {
        transform: "translateY(-1px)",
        backgroundColor: isLight
          ? "rgba(255,255,255,0.96)"
          : "rgba(10, 21, 39, 0.86)",
        boxShadow: isLight
          ? `0 10px 22px ${alpha("#0f172a", 0.08)}`
          : "0 12px 24px rgba(2, 6, 23, 0.2)",
      },
      "&:hover fieldset": {
        borderColor: hoverBorderColor,
      },
      "&.Mui-focused": {
        transform: "translateY(-1px)",
        backgroundColor: isLight
          ? "rgba(255,255,255,0.98)"
          : "rgba(11, 22, 40, 0.92)",
        boxShadow: `0 0 0 1px ${focusedGlow}, 0 14px 30px ${alpha(
          "#0f172a",
          isLight ? 0.1 : 0.24
        )}`,
      },
      "&.Mui-focused fieldset": {
        borderColor: hoverBorderColor,
      },
    },
    "& .MuiInputLabel-root": {
      fontWeight: 700,
      color: isLight
        ? alpha("#334155", 0.9)
        : alpha("#cbd5e1", 0.82),
    },
    "& .MuiInputBase-input::placeholder": {
      opacity: 1,
      color: isLight
        ? alpha("#64748b", 0.82)
        : alpha("#94a3b8", 0.72),
    },
    "& .MuiSelect-select": {
      fontWeight: 600,
    },
    "& .MuiButton-text": {
      fontWeight: 700,
      letterSpacing: "0.02em",
      borderRadius: 999,
      alignSelf: "center",
    },
    "& .MuiButton-outlined": {
      borderRadius: 999,
    },
  };
};
