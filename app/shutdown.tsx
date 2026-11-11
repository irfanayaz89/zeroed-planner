/** Evening shutdown: see what you kept, decide on what's open, note how it felt, close the day. */
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "@/constants/theme";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/store";
import { useNow } from "@/hooks/useNow";
import { dayBlocks, isPromise } from "@/lib/schedule";
import { addDays, fmtClock } from "@/lib/time";
import type { Mood } from "@/lib/types";

type Decision = "tomorrow" | "inbox" | "let_go";

const MOODS: { v: Mood; icon: string; label: string }[] = [
  { v: "great", icon: "😊", label: "Great" },
  { v: "okay", icon: "🙂", label: "Okay" },
  { v: "rough", icon: "😮‍💨", label: "Rough" },
];

export default function Shutdown() {
  const router = useRouter();
  const toast = useToast();
  const { state, moveToTomorrow, sendToInbox, letGo, patchDay } = useStore();
  const { date } = useNow();
  const today = dayBlocks(state.blocks, date);
  const promises = today.filter(isPromise);
  const kept = promises.filter((b) => b.status === "done");
  const open = promises.filter((b) => b.status !== "done");
  const big = today.find((b) => b.isBig);

  const [decisions, setDecisions] = useState<Record<string, Decision>>(() =>
    Object.fromEntries(open.map((b) => [b.id, "tomorrow" as Decision])),
  );
  const [mood, setMood] = useState<Mood | null>(state.dayLogs[date]?.mood ?? null);
  const [note, setNote] = useState(state.dayLogs[date]?.note ?? "");

  const tomorrow = dayBlocks(state.blocks, addDays(date, 1)).filter((b) => b.kind !== "buffer");
  const movingTomorrow = open.filter((b) => decisions[b.id] === "tomorrow");
  const firstTomorrow = [...tomorrow, ...movingTomorrow].sort((a, b) => a.startMin - b.startMin).slice(0, 2);

  const close = () => {
    for (const b of open) {
      const d = decisions[b.id];
      if (d === "tomorrow") moveToTomorrow(b.id);
      else if (d === "inbox") sendToInbox(b.id);
      else letGo(b.id);
    }
    patchDay(date, { closed: true, mood: mood ?? undefined, note: note.trim() || undefined });
    toast("Day closed. Rest well");
    router.canGoBack() ? router.back() : router.replace("/");
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text variant="eyebrow">Evening shutdown</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </Pressable>
      </View>

      <Text variant="title">You kept {kept.length} of {promises.length} promises</Text>
      {big ? (
        <Text variant="body" color={colors.soft} style={{ marginTop: 6 }}>
          {big.status === "done" ? `${big.title} is done. That makes it a good day.` : `${big.title} didn't happen. Tomorrow it goes first.`}
        </Text>
      ) : null}

      {open.length ? (
        <>
          <Text variant="eyebrow" style={{ marginTop: 24, marginBottom: 8 }}>Still open</Text>
          <View style={{ gap: 8 }}>
            {open.map((b) => (
              <Card key={b.id} style={{ gap: 10, padding: 14 }}>
                <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <Text style={{ fontSize: 18 }}>{b.icon ?? "✳️"}</Text>
                  <Text variant="bodyBold" style={{ flex: 1 }}>{b.title}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["tomorrow", "inbox", "let_go"] as Decision[]).map((d) => (
                    <Chip
                      key={d}
                      label={d === "tomorrow" ? "Tomorrow" : d === "inbox" ? "Inbox" : "Let go"}
                      selected={decisions[b.id] === d}
                      onPress={() => setDecisions({ ...decisions, [b.id]: d })}
                    />
                  ))}
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : (
        <Text variant="label" style={{ marginTop: 20 }}>Nothing left open.</Text>
      )}

      <Text variant="eyebrow" style={{ marginTop: 24, marginBottom: 8 }}>How did today feel?</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {MOODS.map((m) => (
          <Pressable
            key={m.v}
            accessibilityRole="radio"
            accessibilityState={{ selected: mood === m.v }}
            onPress={() => setMood(m.v)}
            style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 2, borderColor: mood === m.v ? colors.accent : "transparent" }}
          >
            <Text style={{ fontSize: 26 }}>{m.icon}</Text>
            <Text variant="label" color={colors.ink}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="One line for future you (optional)"
        placeholderTextColor={colors.faint}
        accessibilityLabel="Note for future you"
        maxLength={140}
        style={{ marginTop: 10, backgroundColor: colors.card, color: colors.ink, fontFamily: fonts.body, fontSize: 15, borderRadius: radius.small, padding: 14 }}
      />

      <Card style={{ marginTop: 24 }}>
        <Text variant="eyebrow" style={{ marginBottom: 6 }}>Tomorrow starts with</Text>
        <Text variant="body">
          {firstTomorrow.length
            ? firstTomorrow.map((b, i) => `${i ? "then " : ""}${b.title} ${fmtClock(b.startMin)}`).join(", ")
            : "A clean slate. Plan it in the morning."}
        </Text>
      </Card>

      <Button label="Close the day" onPress={close} style={{ marginTop: 20 }} />
    </Screen>
  );
}
