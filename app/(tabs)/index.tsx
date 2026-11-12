import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "@/constants/theme";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { TodayHeader } from "@/components/today/TodayHeader";
import { NowCard } from "@/components/today/NowCard";
import { FoldedRibbon, FullDayRibbon } from "@/components/today/DayRibbon";
import { InboxSheet } from "@/components/sheets/InboxSheet";
import { AddBlockSheet } from "@/components/sheets/AddBlockSheet";
import { BlockDetailSheet } from "@/components/sheets/BlockDetailSheet";
import { RunningLateSheet } from "@/components/sheets/RunningLateSheet";
import { useStore } from "@/lib/store";
import { useNow } from "@/hooks/useNow";
import { currentBlock, nextBlock, promiseSummary } from "@/lib/schedule";
import type { Block } from "@/lib/types";

type View_ = "folded" | "full";

export default function TodayScreen() {
  const router = useRouter();
  const toast = useToast();
  const { state, markDone, patchBlock, startBlock } = useStore();
  const { date, nowMin, dayStartEpoch } = useNow();
  const { settings } = state;

  const [view, setView] = useState<View_>("folded");
  const [inbox, setInbox] = useState<{ open: boolean; gap: { start: number; end: number } | null }>({ open: false, gap: null });
  const [adding, setAdding] = useState(false);
  const [late, setLate] = useState(false);
  const [detail, setDetail] = useState<Block | null>(null);
  const [keptFreeUntil, setKeptFreeUntil] = useState<number | null>(null);

  const summary = promiseSummary(state.blocks, date, nowMin, settings.keptGraceMin, dayStartEpoch);
  const current = currentBlock(state.blocks, date, nowMin);
  const next = nextBlock(state.blocks, date, nowMin);
  const pillar = state.pillars.find((p) => p.id === current?.pillarId);
  const log = state.dayLogs[date];

  const onStartFocus = (b: Block) => {
    if (!b.startedAt) startBlock(b.id);
    router.push({ pathname: "/focus/[id]", params: { id: b.id } });
  };
  const onRunRoutine = (b: Block) => {
    if (!b.startedAt) startBlock(b.id);
    router.push({ pathname: "/routine/[id]", params: { id: b.id } });
  };
  const onToggleDone = (b: Block) => {
    if (b.status === "done") patchBlock(b.id, { status: "planned", doneAt: undefined });
    else {
      markDone(b.id);
      toast("Kept. Nice.");
    }
  };

  const ctx = {
    pillars: state.pillars,
    nowMin,
    graceMin: settings.keptGraceMin,
    dayStartEpoch,
    onOpen: setDetail,
    onToggleDone,
    onFillGap: (start: number, end: number) => setInbox({ open: true, gap: { start, end } }),
  };

  // Contextual ritual buttons: plan before the day starts, close from 21:00.
  const showPlan = !log?.planned && nowMin < 12 * 60;
  const showClose = !log?.closed && nowMin >= 21 * 60 && nowMin < settings.bedtimeMin;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        <TodayHeader date={date} summary={summary} />

        {showPlan ? (
          <Button label="Plan today (2 min)" onPress={() => router.push("/plan")} style={{ marginBottom: 14 }} />
        ) : null}

        <NowCard
          current={current}
          next={next}
          pillar={pillar}
          nowMin={nowMin}
          windDownMin={settings.windDownMin}
          wrapUpCueMin={settings.wrapUpCueMin}
          onStartFocus={onStartFocus}
          onRunRoutine={onRunRoutine}
          onDone={(b) => {
            markDone(b.id);
            toast("Kept. Nice.");
          }}
          onLate={() => setLate(true)}
          onFillFromInbox={() => setInbox({ open: true, gap: { start: Math.ceil(nowMin), end: next?.startMin ?? settings.windDownMin } })}
          onOpen={setDetail}
          free={{ keptFree: keptFreeUntil !== null && nowMin < keptFreeUntil, onKeepFree: () => setKeptFreeUntil(next?.startMin ?? settings.windDownMin) }}
        />

        <Segmented value={view} onChange={setView} />

        {view === "folded" ? (
          <FoldedRibbon {...ctx} blocks={state.blocks} date={date} windDownMin={settings.windDownMin} onShowFullDay={() => setView("full")} />
        ) : (
          <FullDayRibbon {...ctx} blocks={state.blocks} date={date} />
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => setInbox({ open: true, gap: null })}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: radius.card, padding: 14, marginTop: 16 }}
        >
          <Ionicons name="file-tray-outline" size={20} color={colors.sub} />
          <Text variant="bodyBold" style={{ flex: 1 }}>
            {state.inbox.length} in your inbox <Text variant="label">· not scheduled yet</Text>
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.soft} />
        </Pressable>

        {showClose ? (
          <Button label="Close the day" tone="secondary" onPress={() => router.push("/shutdown")} style={{ marginTop: 14 }} />
        ) : null}
      </Screen>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add block"
        onPress={() => setAdding(true)}
        style={({ pressed }) => ({
          position: "absolute",
          right: 20,
          bottom: 24,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        })}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      <InboxSheet visible={inbox.open} gap={inbox.gap} onClose={() => setInbox({ open: false, gap: null })} date={date} nowMin={nowMin} />
      <AddBlockSheet visible={adding} onClose={() => setAdding(false)} date={date} nowMin={nowMin} />
      <RunningLateSheet visible={late} onClose={() => setLate(false)} date={date} nowMin={nowMin} />
      <BlockDetailSheet block={detail} onClose={() => setDetail(null)} onStartFocus={onStartFocus} onRunRoutine={onRunRoutine} />
    </View>
  );
}

function Segmented({ value, onChange }: { value: View_; onChange: (v: View_) => void }) {
  const opts: { v: View_; label: string }[] = [
    { v: "folded", label: "Folded" },
    { v: "full", label: "Full day" },
  ];
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: colors.card, borderRadius: 14, padding: 4, marginBottom: 12 }}>
      {opts.map((o) => {
        const on = o.v === value;
        return (
          <Pressable
            key={o.v}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.v)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center", backgroundColor: on ? colors.bar : "transparent" }}
          >
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: on ? colors.ink : colors.soft }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
