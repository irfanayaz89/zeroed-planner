import { View, type ViewProps } from "react-native";
import { colors, radius } from "@/constants/theme";

export function Card({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[{ backgroundColor: colors.card, borderRadius: radius.card, padding: 16 }, style]} />;
}
