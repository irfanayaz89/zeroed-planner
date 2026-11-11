import { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { colors, fonts, radius } from "@/constants/theme";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { newId, useStore } from "@/lib/store";
import { dayBlocks, findSlot } from "@/lib/schedule";
import { ICON_CHOICES, guessIcon } from "@/lib/icons";
import { fmtClock, fmtDuration } from "@/lib/time";
import type { Block, BlockKind } from "@/lib/types";

const KINDS: { kind: BlockKind; label: string }[] = [
  { kind: "focus", label: "Focus" },
  { kind: "task", label: "Task" },
  { kind: "routine", label: "Routine" },
];
const DURATIONS = [15, 25, 30, 45, 60, 90];

export function AddBlockSheet({ visible, onClose, date, nowMin }: { visible: boolean; onClose: () => void; date: string; nowMin: number }) {
  const { state, upsertBlocks, addInbox } = useStore();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<BlockKind>("task");
  const [pillarId, setPillarId] = useState<string | undefined>();
  const [duration, setDuration] = useState(30);
  const [icon, setIcon] = useState<string | null>(null);
  const [pickIcon, setPickIcon] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle("");
      setKind("task");
      setPillarId(undefined);
      setDuration(30);
      setIcon(null);
      setPickIcon(false);
    }
  }, [visible]);

  const shownIcon = icon ?? guessIcon(title);
  const valid = title.trim().length > 0;

  const findTime = () => {
    const start = findSlot(dayBlocks(state.blocks, date), duration, nowMin, state.settings);
    if (start === null) {
      toast("No gap left today. Try tomorrow");
      return;
    }
    const block: Block = {
      id: newId(),
      date,
      title: title.trim(),
      icon: shownIcon,
      startMin: start,
      durationMin: duration,
      kind,
      pillarId,
      isBig: false,
      isFixed: false,
      source: "manual",
      status: "planned",
      rolloverCount: 0,
      steps: kind === "routine" ? [{ title: title.trim(), minutes: duration }] : undefined,
    };
    upsertBlocks([block]);
    toast(`Placed at ${fmtClock(start)}`);
    onClose();
  };

  const toInbox = () => {
    addInbox({ title: title.trim(), icon: shownIcon, durationMin: duration, pillarId });
    toast("Saved to inbox");
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Add block">
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Icon ${shownIcon}. Change icon`}
          onPress={() => setPickIcon((p) => !p)}
          style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24 }}>{shownIcon}</Text>
        </Pressable>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What is it?"
          placeholderTextColor={colors.faint}
          accessibilityLabel="Title"
          autoFocus
          style={{ flex: 1, backgroundColor: colors.bg, color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16, borderRadius: radius.small, paddingHorizontal: 14, paddingVertical: 13 }}
        />
      </View>
      {pickIcon ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {ICON_CHOICES.map((i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Use ${i}`}
              onPress={() => {
                setIcon(i);
                setPickIcon(false);
              }}
              style={{ width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: i === shownIcon ? colors.accent : colors.bg }}
            >
              <Text style={{ fontSize: 20 }}>{i}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Section label="Kind">
        {KINDS.map((k) => <Chip key={k.kind} label={k.label} selected={kind === k.kind} onPress={() => setKind(k.kind)} />)}
      </Section>
      <Section label="Pillar">
        <Chip label="None" selected={!pillarId} onPress={() => setPillarId(undefined)} />
        {state.pillars.map((p) => <Chip key={p.id} label={p.name} color={p.color} selected={pillarId === p.id} onPress={() => setPillarId(p.id)} />)}
      </Section>
      <Section label="How long">
        {DURATIONS.map((d) => <Chip key={d} label={fmtDuration(d)} selected={duration === d} onPress={() => setDuration(d)} />)}
      </Section>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
        <Button label="Find a time" onPress={findTime} disabled={!valid} style={{ flex: 1 }} />
        <Button label="Put in inbox" tone="secondary" onPress={toInbox} disabled={!valid} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text variant="eyebrow" style={{ marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>
    </View>
  );
}
