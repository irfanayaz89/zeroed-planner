/** Sunday review (about 10 minutes): wins, what slipped (with one fix), next week's targets. */
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ToastHost, useToast } from "@/components/ui/Toast";
import { Stepper } from "@/components/ui/Stepper";
import { useStore } from "@/lib/store";
import { useNow } from "@/hooks/useNow";
import { bigThingDays, pillarWeekProgress, slipInsight, weekRate } from "@/lib/progress";
import { addDays, fmtClock } from "@/lib/time";

const FIX_TIME = 17 * 60 + 15;

export default function Review() {
  const router = useRouter();
  const toast = useToast();
  const { state, setPillars, upsertBlocks } = useStore();
  const { date } = useNow();

  // The last 7 days, compared with the 7 before.
  const from = addDays(date, -6);
  const rate = weekRate(state.blocks, from);
  const prev = weekRate(state.blocks, addDays(from, -7));
  const big = bigThingDays(state.blocks, state.dayLogs, from);
  const slip = slipInsight(state.blocks, from, date);
  const progress = state.pillars.map((p) => ({ p, done: pillarWeekProgress(state.blocks, p, from) }));
  const best = [...progress].sort((a, b) => b.done / b.p.weeklyTarget - a.done / a.p.weeklyTarget)[0];

  const [targets, setTargets] = useState<Record<string, number>>(() => Object.fromEntries(state.pillars.map((p) => [p.id, p.weeklyTarget])));
  const [fix, setFix] = useState<"none" | "moved" | "kept">("none");

  const applyFix = () => {
    if (!slip.worst) return;
    const future = state.blocks.filter((b) => b.title === slip.worst!.title && b.date >= date && b.status === "planned");
    upsertBlocks(future.map((b) => ({ ...b, startMin: FIX_TIME })));
    setFix("moved");
    toast(`${slip.worst.title} moves to ${fmtClock(FIX_TIME)}`);
  };

  const save = () => {
    setPillars(state.pillars.map((p) => ({ ...p, weeklyTarget: targets[p.id] ?? p.weeklyTarget })));
    toast("Next week is set");
    router.canGoBack() ? router.back() : router.replace("/week");
  };

  const pct = (r: number | null) => (r === null ? "–" : `${Math.round(r * 100)}%`);
  const delta = rate !== null && prev !== null ? Math.round((rate - prev) * 100) : null;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text variant="eyebrow">Sunday review</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.ink} />
          </Pressable>
        </View>

        <Text variant="title" style={{ marginBottom: 12 }}>Wins</Text>
        <Card style={{ gap: 10 }}>
          <Text variant="body">
            Promise rate <Text variant="bodyBold">{pct(rate)}</Text>
            {delta !== null ? ` (${delta >= 0 ? "+" : ""}${delta} pts on the week before)` : ""}
          </Text>
          <Text variant="body">
            Big thing done <Text variant="bodyBold">{big.done} of {big.had}</Text> days
          </Text>
          {best ? (
            <Text variant="body">
              {best.p.icon} {best.p.name} led the way: {best.done} of {best.p.weeklyTarget}
              {best.p.unit === "h" ? "h" : ` ${best.p.unit}`}
            </Text>
          ) : null}
        </Card>

        <Text variant="title" style={{ marginTop: 24, marginBottom: 12 }}>What slipped</Text>
        <Card style={{ gap: 12 }}>
          {slip.worst ? (
            <>
              <Text variant="body">
                <Text variant="bodyBold">{slip.worst.title}</Text> slipped {slip.worst.count} times, usually from {fmtClock(slip.worst.earliest)}.
                {slip.dayRate !== null && slip.eveningRate !== null
                  ? ` You keep daytime blocks ${pct(slip.dayRate)} of the time but evening blocks only ${pct(slip.eveningRate)}.`
                  : ""}
              </Text>
              {fix === "none" ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button small label={`Move it to ${fmtClock(FIX_TIME)}`} onPress={applyFix} />
                  <Button small tone="secondary" label="Keep it" onPress={() => setFix("kept")} />
                </View>
              ) : (
                <Text variant="label">{fix === "moved" ? "Moved. Let's see how next week goes." : "Keeping it as it is."}</Text>
              )}
            </>
          ) : (
            <Text variant="body">Nothing slipped more than once. Steady week.</Text>
          )}
        </Card>

        <Text variant="title" style={{ marginTop: 24, marginBottom: 12 }}>Next week's targets</Text>
        <Card style={{ gap: 14 }}>
          {progress.map(({ p, done }) => {
            const under = done / p.weeklyTarget < 0.6;
            const t = targets[p.id];
            return (
              <View key={p.id} style={{ gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text variant="bodyBold" style={{ flex: 1 }}>{p.icon} {p.name}</Text>
                  <Stepper value={t} onChange={(v) => setTargets({ ...targets, [p.id]: v })} label={`${p.name} target`} />
                  <Text variant="label" style={{ width: 64 }}>{p.unit === "h" ? "hours" : p.unit}</Text>
                </View>
                {under && t > p.weeklyTarget ? (
                  <Text variant="caption" color={colors.warn}>{p.name} was under 60% this week. Keep the target the same, don't raise it.</Text>
                ) : null}
              </View>
            );
          })}
        </Card>

        <Button label="Set next week" onPress={save} style={{ marginTop: 20 }} />
      </Screen>
      {/* This route is a native full-screen modal, which hides the root toast on iOS. */}
      <ToastHost />
    </View>
  );
}
