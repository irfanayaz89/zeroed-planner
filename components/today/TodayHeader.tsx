import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { fmtLongDate } from "@/lib/time";
import type { PromiseSummary } from "@/lib/schedule";
import { PromiseDots } from "./PromiseDots";

export function TodayHeader({ date, summary }: { date: string; summary: PromiseSummary }) {
  const parts = [`${summary.kept} kept`];
  if (summary.missed) parts.push(`${summary.missed} missed`);
  parts.push(`${summary.open} to go`);
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
      <View style={{ flexShrink: 1 }}>
        <Text variant="label">{fmtLongDate(date)}</Text>
        <Text variant="title" accessibilityRole="header">Today</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6, maxWidth: "50%" }}>
        <Text variant="eyebrow">Promises kept</Text>
        <PromiseDots states={summary.states.map((s) => s.state)} />
        <Text variant="caption">{parts.join(" · ")}</Text>
      </View>
    </View>
  );
}
