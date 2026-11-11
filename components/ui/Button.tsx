import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts, radius } from "@/constants/theme";
import { Text } from "./Text";

type Tone = "primary" | "secondary" | "ghost" | "light";

const tones: Record<Tone, { bg: string; fg: string }> = {
  primary: { bg: colors.accent, fg: "#FFFFFF" },
  secondary: { bg: colors.bar, fg: colors.ink },
  ghost: { bg: "transparent", fg: colors.sub },
  light: { bg: "#FFFFFF", fg: colors.accent2 },
};

export function Button({
  label,
  onPress,
  tone = "primary",
  disabled,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
}) {
  const t = tones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        { backgroundColor: t.bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: small ? 13 : 15, color: t.fg }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  small: { paddingVertical: 8, paddingHorizontal: 14 },
});
