export const colors = {
  /** Charte SmartPay Africa (Stitch / P03) */
  navy: "#101828",
  orange: "#F7931A",
  green: "#12B76A",
  gray: "#F4F6F8",
  white: "#FFFFFF",
  /** Alias Stitch */
  background: "#F4F6F8",
  surface: "#FFFFFF",
  accent: "#F7931A",
  accentMuted: "#D97706",
  text: "#101828",
  muted: "#667085",
  danger: "#D92D20",
  success: "#12B76A",
  warning: "#F79009",
  /** Conservés pour l'admin-web P01 (thème sombre) */
  backgroundDark: "#0B1F17",
  surfaceDark: "#12352A",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
} as const;

export const typography = {
  fontFamily: "Inter, system-ui, sans-serif",
  title: 28,
  body: 16,
  caption: 13,
} as const;
