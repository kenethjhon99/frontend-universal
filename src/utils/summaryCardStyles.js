import { alpha } from "@mui/material/styles";

const getToneColor = (theme, tone) => {
  switch (tone) {
    case "success":
      return theme.palette.success.main;
    case "warning":
      return theme.palette.warning.main;
    case "error":
      return theme.palette.error.main;
    case "info":
      return theme.palette.info.main;
    case "secondary":
      return theme.palette.secondary.main;
    case "neutral":
      return theme.palette.mode === "light" ? "#475569" : "#cbd5e1";
    default:
      return theme.palette.primary.main;
  }
};

export const getSectionPanelSx = (theme, options = {}) => {
  const { p = 3, radius = 4, accent = "primary" } = options;
  const isLight = theme.palette.mode === "light";
  const accentColor = getToneColor(theme, accent);

  return {
    p,
    borderRadius: radius,
    position: "relative",
    overflow: "hidden",
    border: `1px solid ${alpha(
      isLight ? "#0f172a" : "#e2e8f0",
      isLight ? 0.08 : 0.1
    )}`,
    background: isLight
      ? `
          linear-gradient(140deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 54%, rgba(241,245,249,0.98) 100%),
          radial-gradient(circle at top right, ${alpha(accentColor, 0.14)}, transparent 32%),
          radial-gradient(circle at bottom left, ${alpha(theme.palette.info.main, 0.07)}, transparent 30%)
        `
      : `
          linear-gradient(140deg, rgba(16,23,37,0.96) 0%, rgba(11,18,31,0.98) 52%, rgba(8,14,24,0.98) 100%),
          radial-gradient(circle at top right, ${alpha(accentColor, 0.16)}, transparent 32%),
          radial-gradient(circle at bottom left, ${alpha(theme.palette.info.main, 0.08)}, transparent 30%)
        `,
    boxShadow: isLight
      ? `0 20px 44px ${alpha("#0f172a", 0.08)}, inset 0 1px 0 rgba(255,255,255,0.7)`
      : "0 24px 48px rgba(2, 6, 23, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)",
    backdropFilter: "blur(18px)",
    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background: isLight
        ? "linear-gradient(180deg, rgba(255,255,255,0.34), transparent 32%)"
        : "linear-gradient(180deg, rgba(255,255,255,0.04), transparent 34%)",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      left: 28,
      right: 28,
      top: 0,
      height: "1px",
      pointerEvents: "none",
      background: `linear-gradient(90deg, transparent, ${alpha(accentColor, 0.5)}, transparent)`,
    },
    "&:hover": {
      boxShadow: isLight
        ? `0 24px 52px ${alpha("#0f172a", 0.1)}, inset 0 1px 0 rgba(255,255,255,0.76)`
        : "0 28px 56px rgba(2, 6, 23, 0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
    },
    "& > *": {
      position: "relative",
      zIndex: 1,
    },
  };
};

export const getSummaryCardSx = (theme, tone = "primary", options = {}) => {
  const { compact = false, minHeight = compact ? 148 : 166, interactive = false } = options;
  const isLight = theme.palette.mode === "light";
  const accentColor = getToneColor(theme, tone);

  return {
    ...getSectionPanelSx(theme, {
      p: compact ? 2.35 : 2.75,
      radius: compact ? 3.5 : 4,
      accent: tone,
    }),
    minHeight,
    height: "100%",
    borderColor: alpha(accentColor, isLight ? 0.18 : 0.24),
    background: isLight
      ? `
          linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(247,250,252,0.98) 56%, rgba(241,245,249,0.98) 100%),
          radial-gradient(circle at top right, ${alpha(accentColor, 0.18)}, transparent 34%),
          radial-gradient(circle at bottom left, ${alpha(accentColor, 0.08)}, transparent 28%)
        `
      : `
          linear-gradient(145deg, rgba(18,27,43,0.96) 0%, rgba(11,18,31,0.98) 56%, rgba(7,12,22,0.98) 100%),
          radial-gradient(circle at top right, ${alpha(accentColor, 0.22)}, transparent 34%),
          radial-gradient(circle at bottom left, ${alpha(accentColor, 0.09)}, transparent 28%)
        `,
    boxShadow: isLight
      ? `0 24px 46px ${alpha("#0f172a", 0.08)}, inset 0 1px 0 rgba(255,255,255,0.82)`
      : "0 26px 50px rgba(2, 6, 23, 0.34), inset 0 1px 0 rgba(255,255,255,0.04)",
    ...(interactive
      ? {
          cursor: "pointer",
          transition:
            "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
          "&:hover": {
            transform: "translateY(-3px)",
            borderColor: alpha(accentColor, isLight ? 0.28 : 0.38),
            boxShadow: isLight
              ? `0 26px 54px ${alpha("#0f172a", 0.1)}, 0 0 0 1px ${alpha(accentColor, 0.14)}`
              : `0 30px 58px rgba(2, 6, 23, 0.4), 0 0 0 1px ${alpha(accentColor, 0.18)}`,
          },
          "&:hover::before": {
            animation: "glow-pulse 2.6s ease-in-out infinite",
          },
        }
      : {}),
  };
};

export const getSummaryIconWrapSx = (theme, tone = "primary") => {
  const isLight = theme.palette.mode === "light";
  const accentColor = getToneColor(theme, tone);

  return {
    width: 52,
    height: 52,
    borderRadius: 3,
    display: "grid",
    placeItems: "center",
    color: accentColor,
    backgroundColor: alpha(accentColor, isLight ? 0.14 : 0.18),
    border: `1px solid ${alpha(accentColor, isLight ? 0.18 : 0.24)}`,
    boxShadow: `inset 0 1px 0 ${alpha("#ffffff", isLight ? 0.7 : 0.04)}`,
    position: "relative",
    overflow: "hidden",
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      background: `linear-gradient(135deg, ${alpha("#ffffff", isLight ? 0.26 : 0.06)}, transparent 58%)`,
      pointerEvents: "none",
    },
  };
};

export const getSummaryValueSx = (theme, tone = "primary") => ({
  color: getToneColor(theme, tone),
  textShadow:
    theme.palette.mode === "light"
      ? "none"
      : `0 0 20px ${alpha(getToneColor(theme, tone), 0.18)}`,
});
