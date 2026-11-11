import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { useNow } from "@/hooks/useNow";
import { dayBlocks } from "@/lib/schedule";
import { pillarWeekProgress, weekRate, weekRates } from "@/lib/progress";
import { addDays, shortDay, weekStart } from "@/lib/time";
import { blockColor } from "@/components/blockStyle";

const STRIP_FROM = 6 * 60;
const STRIP_TO = 23 * 60;
const STRIP_H = 220;

const pct = (r: number | null) => (r === null ? "–" : `${Math.round(r * 100)}%`);

export default function WeekScreen() {
  const router = useRouter();
  const { state } = useStore();
  const { date } = useNow();
  const ws = weekStart(date);
  const rates = weekRates(state.blocks, ws);
  // Today isn't over, so the headline rate covers finished days only.
  const thisWeek = weekRate(state.blocks, ws, addDays(date, -1));
  const lastWeek = weekRate(state.blocks, addDays(ws, -7));
  const delta = thisWeek !== null && lastWeek !== null ? Math.round((thisWeek - lastWeek) * 100) : null;

  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">Week</Text>

      <Card style={{ marginTop: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <View>
          <Text variant="eyebrow">Promise rate</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 44, lineHeight: 54, color: colors.ink, marginTop: 4 }}>{pct(thisWeek)}</Text>
        </View>
        <Text variant="label" style={{ marginBottom: 10 }}>
          {delta === null ? "No last week to compare" : delta === 0 ? "Same as last week" : `${delta > 0 ? "+" : ""}${delta} pts vs last week`}
        </Text>
      </Card>

      <Card style={{ marginTop: 12, flexDirection: "row", gap: 6 }}>
        {rates.map((r) => {
          const isToday = r.date === date;
          const blocks = dayBlocks(state.blocks, r.date).filter((b) => b.kind !== "buffer");
          return (
            <View key={r.date} style={{ flex: 1, alignItems: "center", gap: 6 }} accessible accessibilityLabel={isToday ? `Today: ${r.kept} of ${r.total} kept so far` : `${shortDay(r.date)}: ${pct(r.rate)} kept`}>
              <Text variant="caption" color={isToday ? colors.ink : colors.soft}>{shortDay(r.date)}</Text>
              <View
                style={{
                  width: "100%",
                  height: STRIP_H,
                  borderRadius: 10,
                  backgroundColor: colors.bg,
                  borderWidth: isToday ? 1.5 : 0,
                  borderColor: colors.accent,
                  overflow: "hidden",
                }}
              >
                {blocks.map((b) => {
                  const pillar = state.pillars.find((p) => p.id === b.pillarId);
                  const top = ((b.startMin - STRIP_FROM) / (STRIP_TO - STRIP_FROM)) * STRIP_H;
                  const h = Math.max(3, (b.durationMin / (STRIP_TO - STRIP_FROM)) * STRIP_H - 1);
                  const faded = b.kind === "anchor" || (b.status !== "done" && r.date < date);
                  return (
                    <View
                      key={b.id}
                      style={{ position: "absolute", top, height: h, left: 3, right: 3, borderRadius: 3, backgroundColor: blockColor(b, pillar), opacity: faded ? 0.3 : 0.95 }}
                    />
                  );
                })}
              </View>
              <Text variant="caption" color={colors.ink}>{isToday ? `${r.kept}/${r.total}` : pct(r.rate)}</Text>
            </View>
          );
        })}
      </Card>

      <Card style={{ marginTop: 12, gap: 14 }}>
        <Text variant="eyebrow">Pillar balance</Text>
        {state.pillars.map((p) => {
          const done = pillarWeekProgress(state.blocks, p, ws);
          const unit = p.unit === "h" ? "h" : ` ${p.unit}`;
          return (
            <View key={p.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="bodyBold">{p.icon} {p.name}</Text>
                <Text variant="label">{done} of {p.weeklyTarget}{unit}</Text>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bar, overflow: "hidden" }}>
                <View style={{ height: 8, width: `${Math.min(100, (done / p.weeklyTarget) * 100)}%`, backgroundColor: p.color }} />
              </View>
            </View>
          );
        })}
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/review")}
        style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 22, padding: 16 }}
      >
        <Text style={{ fontSize: 24 }}>🗓️</Text>
        <View style={{ flex: 1 }}>
          <Text variant="bodyBold">Sunday review</Text>
          <Text variant="caption">10 minutes: wins, what slipped, next week's targets</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.soft} />
      </Pressable>
    </Screen>
  );
}
