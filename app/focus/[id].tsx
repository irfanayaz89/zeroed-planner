/** Full-screen focus. No character, no extra UI: only the timer (spec rule 6). */
import { Pressable, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { CometArc, arcPhase } from "@/components/focus/CometArc";
import { RollingDigits } from "@/components/focus/RollingDigits";
import { StarDust } from "@/components/focus/StarDust";
import { useStore } from "@/lib/store";
import { useNow } from "@/hooks/useNow";
import { blockProgress, endMin, nextBlock } from "@/lib/schedule";
import { fmtClock } from "@/lib/time";

export default function FocusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { state, patchBlock, markDone } = useStore();
  const { nowMin } = useNow(1000);
  const b = state.blocks.find((x) => x.id === id);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (!b) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Text variant="heading">That block isn't here any more.</Text>
        <Button label="Back to Today" tone="secondary" onPress={close} />
      </View>
    );
  }

  const progress = blockProgress(b, nowMin);
  const phase = arcPhase(progress);
  const secondsLeft = Math.max(0, (endMin(b) - nowMin) * 60);
  const arcWidth = Math.min(width - 32, 380);

  const plusFive = () => {
    const nxt = nextBlock(state.blocks, b.date, b.startMin);
    if (nxt && nxt.startMin - endMin(b) < 5) {
      toast(`${nxt.title} starts at ${fmtClock(nxt.startMin)}. No room for 5 more`);
      return;
    }
    patchBlock(b.id, { durationMin: b.durationMin + 5 });
    toast("+5 minutes");
  };

  const done = () => {
    markDone(b.id);
    toast("Promise kept");
    close();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#141518", paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <StarDust />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20 }}>
        <Text variant="eyebrow" color={colors.soft}>Focus mode</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave focus mode"
          onPress={close}
          hitSlop={12}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="close" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <View style={{ alignItems: "center", marginTop: 36 }}>
        <View>
          <CometArc width={arcWidth} progress={progress} color={phase.color} />
          <View style={{ position: "absolute", left: 0, right: 0, top: arcWidth * 0.2, alignItems: "center", paddingHorizontal: 60 }}>
            <View style={{ backgroundColor: phase.color, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 10, letterSpacing: 1.2, color: "#fff" }}>NOW</Text>
            </View>
            <Text numberOfLines={2} style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink, textAlign: "center", marginTop: 8 }}>
              {b.title}
            </Text>
            <Text variant="label" color={phase.color === "#8A8B91" ? colors.soft : phase.color} style={{ marginTop: 4 }} accessibilityLiveRegion="polite">
              {progress >= 1 ? "Time's up" : phase.label}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", width: arcWidth * 0.9 }}>
          <Text variant="caption">{fmtClock(b.startMin)}</Text>
          <Text variant="caption">{fmtClock(endMin(b))}</Text>
        </View>

        <View style={{ marginTop: 32 }}>
          <RollingDigits seconds={secondsLeft} title={b.title} />
        </View>
      </View>

      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20 }}>
        <Button label="+5 min" tone="secondary" onPress={plusFive} style={{ flex: 1 }} />
        <Button label="Done" onPress={done} style={{ flex: 2 }} />
      </View>
    </View>
  );
}
