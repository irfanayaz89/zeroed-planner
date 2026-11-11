import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";
import { Text } from "./Text";

export function Stepper({
  value,
  onChange,
  label,
  step = 1,
  min = 1,
  max = 99,
  format = String,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
}) {
  const btn = (d: number, icon: "remove" | "add") => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${d > 0 ? "Increase" : "Decrease"} ${label}`}
      onPress={() => onChange(Math.min(max, Math.max(min, value + d)))}
      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bar, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={16} color={colors.ink} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {btn(-step, "remove")}
      <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink, minWidth: 22, textAlign: "center" }}>{format(value)}</Text>
      {btn(step, "add")}
    </View>
  );
}
