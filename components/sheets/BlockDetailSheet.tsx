import { View } from "react-native";
import { colors } from "@/constants/theme";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/store";
import { endMin } from "@/lib/schedule";
import { fmtClock, fmtDuration } from "@/lib/time";
import type { Block } from "@/lib/types";
import { blockColor, KIND_LABEL } from "@/components/blockStyle";

export function BlockDetailSheet({
  block,
  onClose,
  onStartFocus,
  onRunRoutine,
}: {
  block: Block | null;
  onClose: () => void;
  onStartFocus: (b: Block) => void;
  onRunRoutine: (b: Block) => void;
}) {
  const { state, markDone, patchBlock, moveToTomorrow, sendToInbox } = useStore();
  const toast = useToast();
  // Read the live copy so the sheet reflects changes made while it's open.
  const b = block ? state.blocks.find((x) => x.id === block.id) ?? block : null;
  const pillar = b ? state.pillars.find((p) => p.id === b.pillarId) : undefined;
  const fixed = !!b && (b.isFixed || b.kind === "anchor");
  const done = b?.status === "done";

  return (
    <Sheet visible={!!b} onClose={onClose}>
      {b ? (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: blockColor(b, pillar), alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 26 }}>{b.icon ?? "✳️"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="heading">{b.title}</Text>
              <Text variant="label">{fmtClock(b.startMin)} to {fmtClock(endMin(b))} · {fmtDuration(b.durationMin)}</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Chip label={KIND_LABEL[b.kind]} />
            {pillar ? <Chip label={pillar.name} color={pillar.color} /> : null}
            {b.isBig ? <Chip label="One big thing" /> : null}
            {done ? <Chip label="Kept" /> : null}
          </View>

          {pillar ? <Text variant="label">Feeds: {pillar.goal}</Text> : null}
          {b.note ? <Text variant="body">{b.note}</Text> : null}

          {b.steps?.length ? (
            <View style={{ backgroundColor: colors.bg, borderRadius: 14, padding: 12, gap: 8 }}>
              {b.steps.map((s, i) => (
                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text variant="body">{i + 1}. {s.title}</Text>
                  <Text variant="label">{s.minutes}m</Text>
                </View>
              ))}
            </View>
          ) : null}

          {fixed && b.kind !== "routine" ? (
            <Text variant="label">It's fixed (from your calendar), so it can't be edited here.</Text>
          ) : (
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {done ? (
                <Button small tone="secondary" label="Not done yet" onPress={() => patchBlock(b.id, { status: "planned", doneAt: undefined })} />
              ) : b.kind === "focus" ? (
                <Button small label="Focus" onPress={() => { onClose(); onStartFocus(b); }} />
              ) : b.kind === "routine" ? (
                <Button small label="Run routine" onPress={() => { onClose(); onRunRoutine(b); }} />
              ) : null}
              {!done ? <Button small tone={b.kind === "task" ? "primary" : "secondary"} label="Done" onPress={() => { markDone(b.id); onClose(); }} /> : null}
              {!done && !b.isFixed ? (
                <>
                  <Button
                    small
                    tone="secondary"
                    label="Tomorrow"
                    onPress={() => {
                      const where = moveToTomorrow(b.id);
                      toast(where === "inbox" ? "Rolled over 3 times, so it's in the inbox now" : "Moved to tomorrow");
                      onClose();
                    }}
                  />
                  <Button small tone="secondary" label="Inbox" onPress={() => { sendToInbox(b.id); toast("Back in the inbox"); onClose(); }} />
                </>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}
