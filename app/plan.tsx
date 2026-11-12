/**
 * Morning plan (about 2 minutes): energy check-in, what's fixed, what matters
 * (with Sort it for me), then a preview to lock in.
 */
import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "@/constants/theme";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ToastHost, useToast } from "@/components/ui/Toast";
import { newId, useStore } from "@/lib/store";
import { useNow } from "@/hooks/useNow";
import { parseBrainDump } from "@/lib/brainDump";
import { autoPlace, byStart, capacity, dayBlocks, endMin, freeMinutes, isFlexible, isPromise } from "@/lib/schedule";
import { pillarWeekProgress, targetFor } from "@/lib/progress";
import { fmtClock, fmtDuration, weekStart } from "@/lib/time";
import type { Block, Energy } from "@/lib/types";

interface Candidate {
  key: string;
  title: string;
  icon?: string;
  durationMin: number;
  pillarId?: string;
  kind: Block["kind"];
  reason?: string;
  /** Where it came from, so we can clean up after locking in. */
  from: { type: "block"; id: string } | { type: "inbox"; id: string } | { type: "dump" };
}

const ENERGY: { v: Energy; icon: string; label: string; hint: string }[] = [
  { v: "low", icon: "🪫", label: "Low", hint: "Plan lighter. Capacity drops to 70%." },
  { v: "steady", icon: "🔋", label: "Steady", hint: "A normal day." },
  { v: "high", icon: "⚡", label: "High", hint: "Put the hard thing first." },
];

const STEPS = ["Energy", "Fixed", "Matters", "Your day"];

export default function MorningPlan() {
  const router = useRouter();
  const toast = useToast();
  const { state, upsertBlocks, removeInbox, addInbox, patchDay } = useStore();
  const { date, nowMin } = useNow();
  const { settings } = state;

  const [step, setStep] = useState(0);
  const [energy, setEnergy] = useState<Energy>("steady");
  const [dump, setDump] = useState("");
  const [dumped, setDumped] = useState<Candidate[]>([]);
  const [big, setBig] = useState<string | null>(null);
  const [more, setMore] = useState<string[]>([]);

  const today = dayBlocks(state.blocks, date);
  const from = Math.max(nowMin, settings.dayStartMin);
  const fixed = today.filter((b) => !isFlexible(b) || (b.kind === "routine" && b.isFixed));
  const free = freeMinutes(fixed, from, settings.windDownMin);
  const firstFree = useMemo(() => {
    let cursor = from;
    for (const f of [...fixed].sort(byStart)) {
      if (f.startMin > cursor) break;
      cursor = Math.max(cursor, endMin(f));
    }
    return cursor;
  }, [fixed, from]);

  // Candidates: what's already on today, the inbox, and the brain dump.
  const week = weekStart(date);
  const behind = state.pillars
    .map((p) => ({ p, done: pillarWeekProgress(state.blocks, p, week), target: targetFor(p, week) }))
    .filter((x) => x.done < x.target * 0.75);

  const candidates: Candidate[] = useMemo(() => {
    const reasonFor = (pillarId?: string) => {
      const b = behind.find((x) => x.p.id === pillarId);
      return b ? `${b.p.name} is behind: ${b.done} of ${b.target}${b.p.unit === "h" ? "h" : ` ${b.p.unit}`}` : undefined;
    };
    const fromDay: Candidate[] = today
      .filter((b) => isPromise(b) && b.status === "planned" && b.kind !== "routine" && endMin(b) > nowMin)
      .map((b) => ({ key: `b:${b.id}`, title: b.title, icon: b.icon, durationMin: b.durationMin, pillarId: b.pillarId, kind: b.kind, reason: b.isBig ? "Was today's big thing" : reasonFor(b.pillarId), from: { type: "block", id: b.id } }));
    const fromInbox: Candidate[] = state.inbox.map((i) => ({
      key: `i:${i.id}`, title: i.title, icon: i.icon, durationMin: i.durationMin, pillarId: i.pillarId, kind: "task", reason: reasonFor(i.pillarId) ?? "From your inbox", from: { type: "inbox", id: i.id },
    }));
    // Fresh brain-dump items stay on top; the rest put behind-pillar work first.
    const behindFirst = (a: Candidate, b: Candidate) => Number(!!b.reason?.includes("behind")) - Number(!!a.reason?.includes("behind"));
    const dumpedWithReasons = dumped.map((c) => ({ ...c, reason: reasonFor(c.pillarId) ?? c.reason }));
    return [...dumpedWithReasons, ...[...fromDay, ...fromInbox].sort(behindFirst)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.blocks, state.inbox, dumped, date]);

  const chosen = candidates.filter((c) => c.key === big || more.includes(c.key));
  const plannedMin = chosen.reduce((s, c) => s + c.durationMin, 0);
  const cap = capacity(plannedMin, free, settings.bufferPct, energy);

  const sortIt = () => {
    const items = parseBrainDump(dump, state.pillars);
    if (!items.length) return;
    setDumped((d) => [
      ...items.map((i) => ({ key: `d:${newId()}`, title: i.title, icon: i.icon, durationMin: i.durationMin, pillarId: i.pillarId, kind: (i.durationMin >= 45 ? "focus" : "task") as Block["kind"], reason: i.guessedDuration ? `Guessed ${fmtDuration(i.durationMin)}` : "From your brain dump", from: { type: "dump" as const } })),
      ...d,
    ]);
    setDump("");
    toast(`Sorted ${items.length} item${items.length === 1 ? "" : "s"}`);
  };

  const toggleMore = (key: string) => {
    if (key === big) return;
    if (more.includes(key)) return setMore(more.filter((k) => k !== key));
    if (more.length >= 3) return toast("3 is the max. Fewer is better");
    setMore([...more, key]);
  };

  // Build the preview: chosen items placed big-first with breathing room.
  const preview = useMemo(() => {
    const keepIds = new Set(chosen.flatMap((c) => (c.from.type === "block" ? [c.from.id] : [])));
    const unchosenDay = today.filter((b) => isPromise(b) && b.status === "planned" && b.kind !== "routine" && endMin(b) > nowMin && !keepIds.has(b.id));
    const replanned = new Set([...keepIds, ...unchosenDay.map((b) => b.id)]);
    // Earlier flexible buffers are dropped; fresh ones come with the new plan.
    const base = today.filter((b) => !replanned.has(b.id) && !(b.kind === "buffer" && b.startMin >= nowMin));
    const toPlace: Block[] = chosen.map((c) => ({
      id: c.from.type === "block" ? c.from.id : newId(),
      date,
      title: c.title,
      icon: c.icon,
      startMin: 0,
      durationMin: c.durationMin,
      kind: c.kind,
      pillarId: c.pillarId,
      isBig: c.key === big,
      isFixed: false,
      source: "plan",
      status: "planned",
      rolloverCount: 0,
    }));
    const placed = autoPlace(base, toPlace, Math.ceil(from), settings);
    return { ...placed, base, unchosenDay, buffersToDrop: today.filter((b) => b.kind === "buffer" && b.startMin >= nowMin) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, big, more.join(","), energy]);

  const lockIn = () => {
    const { placed, buffers, unplaced, unchosenDay, buffersToDrop } = preview;
    const parked: Block[] = [...unchosenDay, ...buffersToDrop].map((b) => ({ ...b, status: "let_go" }));
    // One big thing per day: the one picked now replaces any earlier one.
    const bigId = placed.find((b) => b.isBig)?.id;
    const parkedIds = new Set(parked.map((b) => b.id));
    const demoted: Block[] = today.filter((b) => b.isBig && b.id !== bigId && !parkedIds.has(b.id)).map((b) => ({ ...b, isBig: false }));
    upsertBlocks([...parked, ...demoted, ...placed, ...buffers]);
    for (const b of [...unchosenDay, ...unplaced]) {
      if (b.kind !== "buffer") addInbox({ title: b.title, icon: b.icon, durationMin: b.durationMin, pillarId: b.pillarId });
    }
    for (const c of chosen) if (c.from.type === "inbox") removeInbox(c.from.id);
    patchDay(date, { planned: true, energy });
    toast("Day locked in");
    router.canGoBack() ? router.back() : router.replace("/");
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={{ flex: 1 }}>
      {/* Keyed by step so each step opens scrolled to the top. */}
      <Screen key={step}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text variant="eyebrow">Plan today · {step + 1} of {STEPS.length}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.ink} />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 20 }}>
          {STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.accent : colors.bar }} />)}
        </View>

        {step === 0 ? (
          <>
            <Text variant="title" style={{ marginBottom: 6 }}>How's your energy?</Text>
            <Text variant="label" style={{ marginBottom: 16 }}>Plan for the day you've got, not the ideal one.</Text>
            <View style={{ gap: 10 }}>
              {ENERGY.map((e) => (
                <Pressable
                  key={e.v}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: energy === e.v }}
                  onPress={() => setEnergy(e.v)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: 2, borderColor: energy === e.v ? colors.accent : "transparent" }}
                >
                  <Text style={{ fontSize: 28 }}>{e.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBold">{e.label}</Text>
                    <Text variant="caption">{e.hint}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text variant="title" style={{ marginBottom: 6 }}>What's fixed today</Text>
            <Text variant="label" style={{ marginBottom: 16 }}>
              {fmtDuration(free)} free between {fmtClock(firstFree)} and {fmtClock(settings.windDownMin)}
            </Text>
            <Card style={{ gap: 12 }}>
              {fixed.length === 0 ? <Text variant="label">Nothing fixed. The day is yours.</Text> : null}
              {fixed.map((b) => (
                <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 18 }}>{b.icon ?? "📌"}</Text>
                  <Text variant="bodyBold" style={{ flex: 1 }}>{b.title}</Text>
                  <Text variant="label">{fmtClock(b.startMin)} to {fmtClock(endMin(b))}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text variant="title" style={{ marginBottom: 6 }}>What matters today</Text>
            <Text variant="label" style={{ marginBottom: 14 }}>Pick one big thing, then up to 3 more.</Text>

            <Card style={{ marginBottom: 14 }}>
              <Text variant="eyebrow" style={{ marginBottom: 8 }}>Brain dump</Text>
              <TextInput
                value={dump}
                onChangeText={setDump}
                multiline
                placeholder={"Everything on your mind, one per line.\nchem past paper 1h, call gran, gym"}
                placeholderTextColor={colors.faint}
                accessibilityLabel="Brain dump"
                style={{ minHeight: 76, color: colors.ink, fontFamily: fonts.body, fontSize: 15, textAlignVertical: "top" }}
              />
              <Button small label="Sort it for me" onPress={sortIt} disabled={!dump.trim()} style={{ alignSelf: "flex-start", marginTop: 8 }} />
            </Card>

            <CapacityMeter ratio={cap.ratio} level={cap.level} plannedMin={cap.withBufferMin} freeMin={free} energy={energy} />

            <View style={{ gap: 8, marginTop: 14 }}>
              {candidates.map((c) => {
                const isBig = big === c.key;
                const isMore = more.includes(c.key);
                const pillar = state.pillars.find((p) => p.id === c.pillarId);
                return (
                  <View key={c.key} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: 16, padding: 12, borderWidth: 1.5, borderColor: isBig ? colors.accent : "transparent" }}>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isBig }}
                      accessibilityLabel={`Make ${c.title} the big thing`}
                      hitSlop={8}
                      onPress={() => {
                        setBig(c.key);
                        setMore(more.filter((k) => k !== c.key));
                      }}
                    >
                      <Ionicons name={isBig ? "radio-button-on" : "radio-button-off"} size={22} color={isBig ? colors.accent : colors.soft} />
                    </Pressable>
                    <Text style={{ fontSize: 20 }}>{c.icon ?? "✳️"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyBold">{c.title}</Text>
                      <Text variant="caption">{[fmtDuration(c.durationMin), pillar?.name, c.reason].filter(Boolean).join(" · ")}</Text>
                    </View>
                    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: isMore, disabled: isBig }} accessibilityLabel={`Add ${c.title}`} hitSlop={8} onPress={() => toggleMore(c.key)}>
                      <Ionicons name={isMore ? "checkbox" : "square-outline"} size={22} color={isBig ? colors.bar : isMore ? colors.accent : colors.soft} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text variant="title" style={{ marginBottom: 6 }}>Here's your day</Text>
            <Text variant="label" style={{ marginBottom: 16 }}>Big thing first, while energy is high, with breathing room between.</Text>
            <Card style={{ gap: 10 }}>
              {[...preview.base.filter((b) => endMin(b) > nowMin), ...preview.placed, ...preview.buffers].sort(byStart).map((b) => {
                const isNew = preview.placed.some((p) => p.id === b.id);
                return (
                  <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, opacity: b.kind === "anchor" ? 0.6 : 1 }}>
                    <Text variant="label" style={{ width: 44 }}>{fmtClock(b.startMin)}</Text>
                    {b.kind === "buffer" ? (
                      <Text variant="caption">Breathing room · {fmtDuration(b.durationMin)}</Text>
                    ) : (
                      <>
                        <Text style={{ fontSize: 16 }}>{b.icon ?? "✳️"}</Text>
                        <Text variant={isNew ? "bodyBold" : "body"} style={{ flex: 1 }}>{b.title}</Text>
                        {b.isBig ? <Text variant="eyebrow">Big</Text> : null}
                      </>
                    )}
                  </View>
                );
              })}
            </Card>
            {preview.unplaced.length ? (
              <Text variant="label" style={{ marginTop: 12 }}>
                Didn't fit, going to the inbox: {preview.unplaced.map((b) => b.title).join(", ")}
              </Text>
            ) : null}
            {preview.unchosenDay.length ? (
              <Text variant="label" style={{ marginTop: 8 }}>Not today, back to the inbox: {preview.unchosenDay.map((b) => b.title).join(", ")}</Text>
            ) : null}
          </>
        ) : null}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
          {step > 0 ? <Button label="Back" tone="secondary" onPress={() => setStep(step - 1)} style={{ flex: 1 }} /> : null}
          {step < 3 ? (
            <Button
              label={step === 2 && !big ? "Pick a big thing" : "Next"}
              disabled={step === 2 && !big}
              onPress={() => setStep(step + 1)}
              style={{ flex: 2 }}
            />
          ) : (
            <Button label="Lock in the day" onPress={lockIn} style={{ flex: 2 }} />
          )}
        </View>
      </Screen>
      {/* This route is a native full-screen modal, which hides the root toast on iOS. */}
      <ToastHost />
    </View>
  );
}

function CapacityMeter({ ratio, level, plannedMin, freeMin, energy }: { ratio: number; level: "ok" | "tight" | "over"; plannedMin: number; freeMin: number; energy: Energy }) {
  const color = level === "ok" ? colors.good : level === "tight" ? colors.warn : colors.over;
  const msg =
    level === "over" ? "That's more than your day holds. Move one to tomorrow?" : level === "tight" ? "Tight" : "Room to breathe";
  return (
    <Card accessible accessibilityLabel={`Capacity ${Math.round(ratio * 100)} percent. ${msg}`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Text variant="eyebrow">Capacity{energy === "low" ? " · low energy" : ""}</Text>
        <Text variant="caption">{fmtDuration(plannedMin)} of {fmtDuration(freeMin)} (with buffer)</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bar, overflow: "hidden" }}>
        <View style={{ width: `${Math.min(100, (Number.isFinite(ratio) ? ratio : 1) * 100)}%`, height: 8, backgroundColor: color }} />
      </View>
      <Text variant="label" color={level === "ok" ? colors.soft : color} style={{ marginTop: 8 }}>{msg}</Text>
    </Card>
  );
}
