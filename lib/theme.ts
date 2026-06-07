export type ColorScheme = typeof darkColors;

export const darkColors = {
  bg: "#0f0f0f",
  surface: "#1a1a1a",
  card: "#1e1e1e",
  cardHover: "#242424",
  overlay: "#2a2a2a",
  border: "#2e2e2e",
  borderStrong: "#3d3d3d",
  text: "#ededed",
  textMuted: "#878787",
  textSubtle: "#545454",
  primary: "#e8419a",
  primaryDark: "#c73585",
  primaryLight: "#f06ab8",
  primaryGlow: "rgba(232, 65, 154, 0.15)",
  danger: "#f04040",
  dangerGlow: "rgba(240, 64, 64, 0.12)",
  success: "#3ecf8e",
  successGlow: "rgba(62, 207, 142, 0.12)",
  badgeBg: "#2a1a24",
  badgeText: "#f06ab8",
};

export const lightColors: ColorScheme = {
  bg: "#f8f8f8",
  surface: "#ffffff",
  card: "#ffffff",
  cardHover: "#f0f0f0",
  overlay: "#ebebeb",
  border: "#e0e0e0",
  borderStrong: "#cccccc",
  text: "#111111",
  textMuted: "#555555",
  textSubtle: "#999999",
  primary: "#d4348a",
  primaryDark: "#b02070",
  primaryLight: "#e8419a",
  primaryGlow: "rgba(212, 52, 138, 0.10)",
  danger: "#e03030",
  dangerGlow: "rgba(224, 48, 48, 0.10)",
  success: "#2aac6e",
  successGlow: "rgba(42, 172, 110, 0.10)",
  badgeBg: "#fce8f3",
  badgeText: "#d4348a",
};

// Legacy export for static use (dark by default — replaced by context at runtime)
export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
};

export const fontFamily = {
  display: "DMSerifDisplay",
};

export const shadow = {
  sm: {
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
};
