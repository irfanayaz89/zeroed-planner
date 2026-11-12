import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useStore } from "@/lib/store";
import { useNow } from "@/hooks/useNow";
import { neverMissTwice, pillarHeatmap, pillarWeekProgress, targetFor, type ChainDay } from "@/lib/progress";
import { weekStart } from "@/lib/time";
import type { Pillar } from "@/lib/types";

const unitLabel = (p: Pillar) => (p.unit === "h" ? "h" : ` ${p.unit}`);

export default function PillarsScreen() {
  const { state, setPillars } = useStore();
  const { date } = useNow();
  const ws = weekStart(date);
  const nmt = neverMissTwice(state.blocks, date);
  const [open, setOpen] = useState<Pillar | null>(null);
  const live = open ? state.pillars.find((p) => p.id === open.id) ?? null : null;

  const toggleMilestone = (p: Pillar, i: number) =>
    setPillars(state.pillars.map((x) => (x.id === p.id ? { ...x, milestones: x.milestones.map((m, j) => (j === i ? { ...m, done: !m.done } : m)) } : x)));

  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">Pillars</Text>

      <Card style={{ marginTop: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text variant="eyebrow">Never miss twice</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 36, lineHeight: 46, color: colors.ink, marginTop: 4 }}>{nmt.streak} {nmt.streak === 1 ? "day" : "days"}</Text>
          </View>
          <Text variant="caption" style={{ maxWidth: 150, textAlign: "right" }}>One miss is fine. Only two in a row breaks it.</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 14 }} accessible accessibilityLabel={`Last 4 weeks: ${nmt.chain.filter((c) => c === "kept").length} kept days`}>
          {nmt.chain.map((c, i) => <ChainSquare key={i} day={c} />)}
        </View>
        <View style={{ flexDirection: "row", gap: 14, marginTop: 10 }}>
          <Legend day="kept" label="Kept" />
          <Legend day="miss" label="Missed" />
          <Legend day="rest" label="Rest" />
        </View>
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        {state.pillars.map((p) => {
          const done = pillarWeekProgress(state.blocks, p, ws);
          const target = targetFor(p, ws);
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}: ${done} of ${target}${unitLabel(p)} this week. ${p.goal}`}
              onPress={() => setOpen(p)}
              style={{ width: "48%", flexGrow: 1, backgroundColor: colors.card, borderRadius: 22, padding: 16, gap: 10 }}
            >
              <ProgressRing size={58} progress={done / target} color={p.color} track={colors.bar}>
                <Text style={{ fontSize: 22 }}>{p.icon}</Text>
              </ProgressRing>
              <Text variant="heading">{p.name}</Text>
              <Text variant="caption" numberOfLines={2}>{p.goal}</Text>
              <Text variant="label" color={colors.ink}>{done} of {target}{unitLabel(p)} this week</Text>
            </Pressable>
          );
        })}
      </View>
      {state.pillars.length >= 4 ? <Text variant="caption" style={{ marginTop: 12, textAlign: "center" }}>4 pillars at most. Fewer is better.</Text> : null}

      <Sheet visible={!!live} onClose={() => setOpen(null)} title={live ? `${live.icon} ${live.name}` : undefined}>
        {live ? (
          <View style={{ gap: 16 }}>
            <Text variant="body">{live.goal}</Text>
            <View>
              <Text variant="eyebrow" style={{ marginBottom: 8 }}>Milestones</Text>
              {live.milestones.map((m, i) => (
                <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: m.done }} onPress={() => toggleMilestone(live, i)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
                  <Ionicons name={m.done ? "checkmark-circle" : "ellipse-outline"} size={22} color={m.done ? live.color : colors.soft} />
                  <Text variant="body" color={m.done ? colors.soft : colors.ink}>{m.title}</Text>
                </Pressable>
              ))}
            </View>
            <View>
              <Text variant="eyebrow" style={{ marginBottom: 8 }}>This week</Text>
              {(() => {
                const done = pillarWeekProgress(state.blocks, live, ws);
                const target = targetFor(live, ws);
                return (
                  <>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bar, overflow: "hidden" }}>
                      <View style={{ height: 8, width: `${Math.min(100, (done / target) * 100)}%`, backgroundColor: live.color }} />
                    </View>
                    <Text variant="label" style={{ marginTop: 6 }}>{done} of {target}{unitLabel(live)}</Text>
                  </>
                );
              })()}
            </View>
            <View>
              <Text variant="eyebrow" style={{ marginBottom: 8 }}>Last 12 weeks</Text>
              <Heatmap days={pillarHeatmap(state.blocks, live.id, date)} color={live.color} />
            </View>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function ChainSquare({ day, size = 16 }: { day: ChainDay; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        backgroundColor: day === "kept" ? colors.accent : day === "rest" ? colors.bar : "transparent",
        borderWidth: day === "miss" || day === "future" ? 1.5 : 0,
        borderColor: day === "miss" ? colors.soft : colors.bar,
        borderStyle: day === "future" ? "dashed" : "solid",
      }}
    />
  );
}

function Legend({ day, label }: { day: ChainDay; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <ChainSquare day={day} size={10} />
      <Text variant="caption">{label}</Text>
    </View>
  );
}

/** 12 columns (weeks) × 7 rows (days), oldest on the left. */
function Heatmap({ days, color }: { days: boolean[]; color: string }) {
  const weeks = Array.from({ length: 12 }, (_, w) => days.slice(w * 7, w * 7 + 7));
  return (
    <View style={{ flexDirection: "row", gap: 4 }} accessible accessibilityLabel={`Showed up ${days.filter(Boolean).length} of the last 84 days`}>
      {weeks.map((w, i) => (
        <View key={i} style={{ gap: 4 }}>
          {w.map((on, j) => <View key={j} style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: on ? color : colors.bar }} />)}
        </View>
      ))}
    </View>
  );
}
