import { View } from "react-native";
import { colors } from "@/constants/theme";
import type { PromiseState } from "@/lib/schedule";

/** Filled = kept, outlined = missed (never red, never a cross), faint = still to come. */
export function PromiseDots({ states, size = 8 }: { states: PromiseState[]; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap" }} accessible accessibilityLabel={describe(states)}>
      {states.map((s, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: s === "kept" ? colors.accent : s === "open" ? colors.bar : "transparent",
            borderWidth: s === "missed" ? 1.5 : 0,
            borderColor: colors.soft,
          }}
        />
      ))}
    </View>
  );
}

function describe(states: PromiseState[]) {
  const n = (s: PromiseState) => states.filter((x) => x === s).length;
  return `Promises: ${n("kept")} kept, ${n("missed")} missed, ${n("open")} to go`;
}
