import { colors as brand, radius as brandRadius, spacing as brandSpacing } from "@smartpay/design-tokens";

export const colors = {
  navy: brand.navy,
  orange: brand.orange,
  green: brand.green,
  gray: brand.gray,
  white: brand.white,
  text: brand.text,
  muted: brand.muted,
  danger: brand.danger,
  success: brand.success,
  warning: brand.warning,
  border: "#EAECF0",
  card: brand.white,
  overlay: "rgba(16, 24, 40, 0.72)",
  peach: "#FFF6EB",
  mint: "#ECFDF3",
  amberBg: "#FEF6EE",
} as const;

export const spacing = brandSpacing;
export const radius = {
  ...brandRadius,
  xl: 28,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: "#101828",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  fab: {
    shadowColor: "#F7931A",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;
