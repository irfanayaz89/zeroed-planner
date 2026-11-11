import { useState } from "react";
import { TextInput, View } from "react-native";
import { colors, fonts, radius } from "@/constants/theme";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { newId, useStore } from "@/lib/store";
import { parseLine } from "@/lib/brainDump";
import { dayBlocks, findSlot } from "@/lib/schedule";
import { fmtClock, fmtDuration } from "@/lib/time";
import type { Block, InboxItem } from "@/lib/types";

const TWO_WEEKS = 14 * 24 * 3600 * 1000;

export function InboxSheet({
  visible,
  onClose,
  date,
  nowMin,
  gap,
}: {
  visible: boolean;
  onClose: () => void;
  date: string;
  nowMin: number;
  /** When opened from a free gap, scheduling tries that gap first. */
  gap?: { start: number; end: number } | null;
}) {
  const { state, addInbox, removeInbox, upsertBlocks } = useStore();
  const toast = useToast();
  const [text, setText] = useState("");

  const add = () => {
    const parsed = parseLine(text, state.pillars);
    if (!parsed) return;
    addInbox({ title: parsed.title, icon: parsed.icon, durationMin: parsed.durationMin, pillarId: parsed.pillarId });
    setText("");
  };

  const schedule = (item: InboxItem) => {
    const today = dayBlocks(state.blocks, date);
    const settings = state.settings;
    let start: number | null = null;
    if (gap) start = findSlot(today, item.durationMin, gap.start, { ...settings, windDownMin: gap.end });
    if (start === null) start = findSlot(today, item.durationMin, nowMin, settings);
    if (start === null) {
      toast("No gap left today. Try tomorrow");
      return;
    }
    const block: Block = {
      id: newId(),
      date,
      title: item.title,
      icon: item.icon,
      startMin: start,
      durationMin: item.durationMin,
      kind: "task",
      pillarId: item.pillarId,
      isBig: false,
      isFixed: false,
      source: "manual",
      status: "planned",
      rolloverCount: 0,
    };
    upsertBlocks([block]);
    removeInbox(item.id);
    toast(`${item.title} at ${fmtClock(start)}`);
  };

  const now = Date.now();
  return (
    <Sheet visible={visible} onClose={onClose} title={gap ? `Fill ${fmtDuration(gap.end - gap.start)} free` : "Inbox"}>
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={add}
        blurOnSubmit={false}
        returnKeyType="done"
        placeholder="Dump it here. Try “email tutor 15m #study”"
        placeholderTextColor={colors.faint}
        accessibilityLabel="Add to inbox"
        style={{
          backgroundColor: colors.bg,
          color: colors.ink,
          fontFamily: fonts.body,
          fontSize: 15,
          borderRadius: radius.small,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 14,
        }}
      />
      {state.inbox.length === 0 ? (
        <Text variant="label" style={{ textAlign: "center", paddingVertical: 20 }}>Inbox zero. Nice.</Text>
      ) : null}
      {state.inbox.map((item) => {
        const pillar = state.pillars.find((p) => p.id === item.pillarId);
        const stale = now - item.createdAt > TWO_WEEKS;
        return (
          <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bar }}>
            <Text style={{ fontSize: 20 }}>{item.icon ?? "✳️"}</Text>
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">{item.title}</Text>
              <Text variant="caption">
                {stale ? "Been here 2 weeks. Still want it?" : [fmtDuration(item.durationMin), pillar?.name].filter(Boolean).join(" · ")}
              </Text>
            </View>
            {stale ? <Button small tone="ghost" label="Let go" onPress={() => removeInbox(item.id)} /> : null}
            <Button small tone="secondary" label="Schedule" onPress={() => schedule(item)} />
          </View>
        );
      })}
    </Sheet>
  );
}
