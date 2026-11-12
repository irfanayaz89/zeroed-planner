import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, radius } from "@/constants/theme";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { Block, Pillar } from "@/lib/types";
import { blockProgress, endMin, inWrapUp } from "@/lib/schedule";
import { fmtClock, fmtDuration } from "@/lib/time";

export interface NowCardHandlers {
  onStartFocus: (b: Block) => void;
  onRunRoutine: (b: Block) => void;
  onDone: (b: Block) => void;
  onLate: () => void;
  onFillFromInbox: () => void;
  onOpen: (b: Block) => void;
}

const KIND_NOW: Record<Block["kind"], string> = {
  focus: "Focus now",
  task: "Now",
  routine: "Routine now",
  anchor: "Fixed now",
  buffer: "Breathing room",
};

export function NowCard({
  current,
  next,
  pillar,
  nowMin,
  windDownMin,
  wrapUpCueMin,
  free,
  ...h
}: NowCardHandlers & {
  current?: Block;
  next?: Block;
  pillar?: Pillar;
  nowMin: number;
  windDownMin: number;
  wrapUpCueMin: number;
  free?: { keptFree: boolean; onKeepFree: () => void };
}) {
  const dayClosed = !current && !next && nowMin >= windDownMin;

  let eyebrow: string;
  let title: string;
  let meta: string;
  let progress = 0;
  let actions: React.ReactNode = null;
  let icon: string | undefined;

  if (current) {
    const left = Math.max(0, Math.ceil(endMin(current) - nowMin));
    const wrapping = inWrapUp(current, nowMin, wrapUpCueMin);
    eyebrow = wrapping
      ? `Wrap up · ${left}m left`
      : [KIND_NOW[current.kind], current.isBig ? "One big thing" : null].filter(Boolean).join(" · ");
    title = current.title;
    icon = current.icon;
    meta = `${fmtClock(current.startMin)} to ${fmtClock(endMin(current))}${current.note ? ` · ${current.note}` : ""}`;
    progress = blockProgress(current, nowMin);

    if (current.status === "done") {
      eyebrow = "Kept";
      actions = <Text variant="bodyBold" color="#fff">Done. That's one promise kept.</Text>;
    } else if (current.kind === "focus") {
      actions = (
        <>
          <Button small tone="light" label={current.startedAt ? "Back to focus" : "Start focus"} onPress={() => h.onStartFocus(current)} />
          <Button small tone="secondary" label="Running late" onPress={h.onLate} style={ghostOnBlue} />
        </>
      );
    } else if (current.kind === "routine") {
      actions = (
        <>
          <Button small tone="light" label="Run routine" onPress={() => h.onRunRoutine(current)} />
          <Button small tone="secondary" label="Mark done" onPress={() => h.onDone(current)} style={ghostOnBlue} />
        </>
      );
    } else if (current.kind === "task") {
      actions = (
        <>
          <Button small tone="light" label="Mark done" onPress={() => h.onDone(current)} />
          <Button small tone="secondary" label="Running late" onPress={h.onLate} style={ghostOnBlue} />
        </>
      );
    }
  } else if (dayClosed) {
    eyebrow = "Day closed";
    title = "Rest well";
    meta = "Tomorrow is already sorted.";
    icon = "🌙";
  } else {
    const until = next ? next.startMin : windDownMin;
    eyebrow = "Free time";
    const left = until - nowMin;
    // Round up so the last minute never reads "0m until".
    title = left < 1 ? `${next ? next.title : "Wind-down"} starts now` : `${fmtDuration(Math.ceil(left))} until ${next ? next.title : "wind-down"}`;
    meta = `Now to ${fmtClock(until)}`;
    icon = "🫧";
    actions = free?.keptFree ? (
      <Text variant="bodyBold" color="#fff">Keeping it free. Enjoy it.</Text>
    ) : (
      <>
        <Button small tone="light" label="Fill from inbox" onPress={h.onFillFromInbox} />
        <Button small tone="secondary" label="Keep it free" onPress={() => free?.onKeepFree()} style={ghostOnBlue} />
      </>
    );
  }

  return (
    <LinearGradient
      colors={[colors.nowFrom, colors.nowTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: radius.card, padding: 18, marginBottom: 16 }}
    >
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" color="#DCE6FF">{eyebrow}</Text>
          <Text
            accessibilityRole={current ? "button" : "header"}
            accessibilityHint={current ? "Opens block details" : undefined}
            onPress={current ? () => h.onOpen(current) : undefined}
            style={{ fontFamily: fonts.display, fontSize: 24, color: "#fff", marginTop: 6, lineHeight: 30 }}
          >
            {title}
          </Text>
          <Text variant="label" color="#DCE6FF" style={{ marginTop: 4 }}>{meta}</Text>
          {pillar ? (
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: pillar.color }} />
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: "#fff" }}>{pillar.name}</Text>
              </View>
            </View>
          ) : null}
        </View>
        <ProgressRing size={68} progress={current ? progress : 0}>
          <Text style={{ fontSize: 26 }}>{icon ?? "✳️"}</Text>
        </ProgressRing>
      </View>

      {actions ? <View style={{ flexDirection: "row", gap: 10, marginTop: 16, alignItems: "center" }}>{actions}</View> : null}

      {next && current ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.18)" }}>
          <Text variant="label" color="#DCE6FF" numberOfLines={1} style={{ flex: 1 }}>Then · {next.title}</Text>
          <Text variant="label" color="#DCE6FF">{fmtClock(next.startMin)}</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const ghostOnBlue = { backgroundColor: "rgba(255,255,255,0.18)" };
