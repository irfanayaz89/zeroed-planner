import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from "react-native";
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
  let base = variants[variant];
  // A variant's lineHeight is sized for its own fontSize. If the caller makes the text bigger
  // without a lineHeight of its own, drop it, or iOS clips the top of the glyphs.
  const flat = StyleSheet.flatten(style);
  if (base.lineHeight && base.fontSize && (flat?.fontSize ?? 0) > base.fontSize && flat?.lineHeight === undefined) {
    const { lineHeight: _drop, ...rest_ } = base;
    base = rest_;
  }
  return <RNText {...rest} style={[base, color ? { color } : null, style]} />;
}
