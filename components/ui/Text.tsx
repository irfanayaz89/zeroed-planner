import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { colors, fonts } from "@/constants/theme";

type Variant = "title" | "heading" | "body" | "bodyBold" | "label" | "caption" | "eyebrow";

const variants: Record<Variant, TextStyle> = {
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, lineHeight: 21 },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.soft },
  caption: { fontFamily: fonts.body, fontSize: 12, color: colors.soft },
  eyebrow: { fontFamily: fonts.bodyHeavy, fontSize: 11, color: colors.sub, letterSpacing: 1.4, textTransform: "uppercase" },
};

export function Text({ variant = "body", color, style, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  return <RNText {...rest} style={[variants[variant], color ? { color } : null, style]} />;
}
