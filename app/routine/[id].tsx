/** Routine runner: one step at a time. Skipping still keeps the routine, because showing up is the habit. */
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "@/constants/theme";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/store";
import type { RoutineStep } from "@/lib/types";

export default function RoutineRunner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { state, patchBlock } = useStore();
  const b = state.blocks.find((x) => x.id === id);

  const [steps, setSteps] = useState<RoutineStep[]>(() => (b?.steps ?? []).map((s) => ({ ...s, done: false, skipped: false })));
  const [index, setIndex] = useState(0);
  const [stepStarted, setStepStarted] = useState(() => Date.now());
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (!b || steps.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Text variant="heading">This routine has no steps yet.</Text>
        <Button label="Back to Today" tone="secondary" onPress={close} />
      </View>
    );
  }

  const finished = index >= steps.length;
  const step = steps[Math.min(index, steps.length - 1)];
  const elapsed = (tick - stepStarted) / 1000;
  const total = step.minutes * 60;
  const left = Math.max(0, total - elapsed);

  const advance = (how: "done" | "skipped") => {
    const next = steps.map((s, i) => (i === index ? { ...s, done: how === "done", skipped: how === "skipped" } : s));
    setSteps(next);
    setIndex(index + 1);
    setStepStarted(Date.now());
    if (index + 1 >= steps.length) {
      patchBlock(b.id, { status: "done", doneAt: Date.now(), steps: next });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="eyebrow">{b.icon} {b.title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Leave routine" onPress={close} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </Pressable>
      </View>

      {finished ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Text style={{ fontSize: 56 }}>🌱</Text>
          <Text variant="title">Routine kept</Text>
          <Text variant="label">
            {steps.filter((s) => s.done).length} of {steps.length} steps done. Showing up is the habit.
          </Text>
          <Button label="Back to Today" onPress={() => { toast("Promise kept"); close(); }} style={{ marginTop: 12, alignSelf: "stretch" }} />
        </View>
      ) : (
        <>
          <View style={{ backgroundColor: colors.card, borderRadius: radius.card, padding: 24, marginTop: 24, alignItems: "center", gap: 10 }}>
            <Text variant="eyebrow">Step {index + 1} of {steps.length}</Text>
            <ProgressRing size={150} stroke={10} progress={total ? elapsed / total : 1} color={colors.accent} track={colors.bar}>
              <Text style={{ fontFamily: fonts.displayLight, fontSize: 34, color: colors.ink }}>
                {Math.floor(left / 60)}:{String(Math.floor(left % 60)).padStart(2, "0")}
              </Text>
            </ProgressRing>
            <Text variant="title" style={{ textAlign: "center", fontSize: 24 }}>{step.title}</Text>
            <Text variant="label">{step.minutes} min{left === 0 ? " · time's up, move on when ready" : ""}</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
            <Button label="Skip" tone="secondary" onPress={() => advance("skipped")} style={{ flex: 1 }} />
            <Button label="Done, next" onPress={() => advance("done")} style={{ flex: 2 }} />
          </View>

          <View style={{ marginTop: 24, gap: 10 }}>
            {steps.map((s, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, opacity: i < index ? 0.55 : 1 }}>
                <Ionicons
                  name={s.done ? "checkmark-circle" : s.skipped ? "remove-circle-outline" : i === index ? "radio-button-on" : "ellipse-outline"}
                  size={20}
                  color={s.done || i === index ? colors.accent : colors.soft}
                />
                <Text variant={i === index ? "bodyBold" : "body"} style={{ flex: 1 }}>{s.title}</Text>
                <Text variant="caption">{s.minutes}m</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
