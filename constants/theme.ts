/** Default theme: dark gray with blue (spec section 6). */
export const colors = {
  bg: "#1C1D20",
  card: "#2A2B2F",
  bar: "#37383D",
  ink: "#F2F2F3",
  soft: "#A3A4AA",
  faint: "#6E6F75",
  accent: "#4C7FE8",
  accent2: "#2B52B8",
  sub: "#9DBBF5",
  nowFrom: "#4C7FE8",
  nowTo: "#24479F",
  good: "#4CC38A",
  warn: "#E0A84A",
  over: "#D9824B",
  fixed: "#55565C",
  routine: "#9B6B7A",
  overlay: "rgba(0,0,0,0.55)",
} as const;

export const fonts = {
  display: "Sora_600SemiBold",
  displayLight: "Sora_300Light",
  body: "Manrope_400Regular",
  bodyMedium: "Manrope_600SemiBold",
  bodyBold: "Manrope_700Bold",
  bodyHeavy: "Manrope_800ExtraBold",
} as const;

export const radius = { card: 22, sheet: 28, pill: 999, small: 12 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
