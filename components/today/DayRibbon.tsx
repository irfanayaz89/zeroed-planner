/**
 * The day ribbon: blocks drawn at a height that matches their length, each
 * with an icon and its pillar colour. The running block drains as time passes,
 * so time left is visible without reading numbers.
 */
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";
import { Text } from "@/components/ui/Text";
import type { Block, Pillar } from "@/lib/types";
import {
  blockProgress,
  endMin,
  findGaps,
  foldDay,
  isPromise,
  promiseState,
  type FoldItem,
  type PromiseState,
} from "@/lib/schedule";
import { fmtClock, fmtDuration } from "@/lib/time";
import { blockColor, blockSubtitle } from "@/components/blockStyle";

interface Ctx {
  pillars: Pillar[];
  nowMin: number;
  graceMin: number;
  dayStartEpoch: number;
  onOpen: (b: Block) => void;
  onToggleDone: (b: Block) => void;
  onFillGap: (start: number, end: number) => void;
}

const pillarOf = (ctx: Ctx, b: Block) => ctx.pillars.find((p) => p.id === b.pillarId);

/* ───────────── Folded view ───────────── */

export function FoldedRibbon({
  blocks,
  date,
  windDownMin,
  onShowFullDay,
  ...ctx
}: Ctx & { blocks: Block[]; date: string; windDownMin: number; onShowFullDay: () => void }) {
  const [showEarlier, setShowEarlier] = useState(false);
  const f = foldDay(blocks, date, ctx.nowMin);

  return (
    <View style={{ gap: 8 }}>
      {f.earlier.length > 0 ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showEarlier }}
            onPress={() => setShowEarlier((s) => !s)}
            style={rowStyle}
          >
            <Text variant="bodyBold">Earlier · {f.earlierDone} of {f.earlier.length} done</Text>
            <Text variant="label" color={colors.sub}>{showEarlier ? "Hide" : "Show"}</Text>
          </Pressable>
          {showEarlier ? f.earlier.map((b) => <RibbonBlock key={b.id} block={b} ctx={ctx} compact />) : null}
        </>
      ) : null}

      {f.upcoming.map((item) => (
        <FoldRow key={item.type === "block" ? item.block.id : `free-${item.start}`} item={item} ctx={ctx} />
      ))}

      {f.upcoming.length === 0 && !f.current ? (
        <Text variant="label" style={{ textAlign: "center", paddingVertical: 12 }}>Nothing else planned today.</Text>
      ) : null}

      {f.later.length > 0 ? (
        <Pressable accessibilityRole="button" onPress={onShowFullDay} style={rowStyle}>
          <Text variant="bodyBold">Later · {f.later.length} more until {fmtClock(Math.min(f.lastEnd, windDownMin))}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.soft} />
        </Pressable>
      ) : null}
    </View>
  );
}

function FoldRow({ item, ctx }: { item: FoldItem; ctx: Ctx }) {
  if (item.type === "free") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Free for ${fmtDuration(item.end - item.start)}. Tap to fill from inbox`}
        onPress={() => ctx.onFillGap(item.start, item.end)}
        style={[rowStyle, { backgroundColor: "transparent", borderWidth: 1, borderStyle: "dashed", borderColor: colors.bar }]}
      >
        <Text variant="label">Free · {fmtDuration(item.end - item.start)}</Text>
        <Text variant="caption" color={colors.sub}>tap to fill</Text>
      </Pressable>
    );
  }
  return <RibbonBlock block={item.block} ctx={ctx} />;
}

/** Height grows with length so a 2h block *looks* twice as long as a 1h one. */
const ribbonHeight = (min: number) => Math.max(56, Math.min(150, 40 + min * 0.9));

function RibbonBlock({ block: b, ctx, compact }: { block: Block; ctx: Ctx; compact?: boolean }) {
  const pillar = pillarOf(ctx, b);
  const color = blockColor(b, pillar);

  if (b.kind === "buffer") {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
        <Text variant="caption" style={{ width: 44 }}>{fmtClock(b.startMin)}</Text>
        <Text variant="caption">Buffer · {fmtDuration(b.durationMin)} breathing room</Text>
      </View>
    );
  }

  const running = b.startMin <= ctx.nowMin && endMin(b) > ctx.nowMin;
  const progress = running ? blockProgress(b, ctx.nowMin) : 0;
  const state: PromiseState | null = isPromise(b) ? promiseState(b, ctx.nowMin, ctx.graceMin, ctx.dayStartEpoch) : null;
  const faded = b.kind === "anchor" || (b.isFixed && b.kind !== "routine");
  const height = compact ? 52 : ribbonHeight(b.durationMin);

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Text variant="label" style={{ width: 44, paddingTop: 14 }}>{fmtClock(b.startMin)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${b.title}, ${fmtClock(b.startMin)}, ${fmtDuration(b.durationMin)}${state ? `, ${state}` : ""}`}
        onPress={() => ctx.onOpen(b)}
        style={{
          flex: 1,
          height,
          borderRadius: 18,
          backgroundColor: colors.card,
          overflow: "hidden",
          flexDirection: "row",
          opacity: faded ? 0.6 : 1,
          borderWidth: running ? 1.5 : 0,
          borderColor: color,
        }}
      >
        {/* Drain: the coloured fill shrinks as the block runs. */}
        {running ? (
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${(1 - progress) * 100}%`, backgroundColor: color, opacity: 0.16 }}
          />
        ) : null}
        <View style={{ width: 6, backgroundColor: color }} />
        <View style={{ flex: 1, flexDirection: "row", alignItems: compact ? "center" : "flex-start", padding: 12, gap: 10 }}>
          <Text style={{ fontSize: compact ? 18 : 22 }}>{b.icon ?? "✳️"}</Text>
          <View style={{ flex: 1 }}>
            <Text variant="bodyBold" numberOfLines={compact ? 1 : 2}>{b.title}</Text>
            <Text variant="caption" style={{ marginTop: 2 }}>{blockSubtitle(b, pillar)}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 8 }}>
            <Text variant="caption">{fmtDuration(b.durationMin)}</Text>
            {state ? <CheckCircle state={state} done={b.status === "done"} onPress={() => ctx.onToggleDone(b)} /> : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function CheckCircle({ state, done, onPress }: { state: PromiseState; done: boolean; onPress: () => void }) {
  const kept = state === "kept";
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={done ? "Mark not done" : "Mark done"}
      hitSlop={10}
      onPress={onPress}
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: kept ? colors.accent : "transparent",
        borderWidth: kept ? 0 : 1.5,
        // Missed is a soft outline: never red, never a cross.
        borderColor: state === "missed" ? colors.soft : colors.bar,
      }}
    >
      {kept ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
    </Pressable>
  );
}

const rowStyle = {
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  alignItems: "center" as const,
  backgroundColor: colors.card,
  borderRadius: 16,
  paddingHorizontal: 14,
  paddingVertical: 12,
};

/* ───────────── Full-day view ───────────── */

const PX = 1.15; // pixels per minute
const GRID_START = 6 * 60;
const GRID_END = 23 * 60 + 30;

export function FullDayRibbon({ blocks, date, ...ctx }: Ctx & { blocks: Block[]; date: string }) {
  const onDay = blocks.filter((b) => b.date === date && b.status !== "moved" && b.status !== "let_go");
  const gaps = findGaps(onDay, Math.max(GRID_START, Math.ceil(ctx.nowMin)), 22 * 60).filter((g) => g.end - g.start >= 40);
  const hours: number[] = [];
  for (let m = GRID_START; m <= GRID_END; m += 60) hours.push(m);
  const y = (min: number) => (min - GRID_START) * PX;

  return (
    <View style={{ height: y(GRID_END) + 20, marginTop: 4 }}>
      {hours.map((m) => (
        <View key={m} style={{ position: "absolute", top: y(m), left: 0, right: 0, flexDirection: "row", alignItems: "center" }}>
          <Text variant="caption" style={{ width: 44 }}>{fmtClock(m)}</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.bar, opacity: 0.6 }} />
        </View>
      ))}

      {gaps.map((g) => (
        <Pressable
          key={`gap-${g.start}`}
          accessibilityRole="button"
          accessibilityLabel={`Free for ${fmtDuration(g.end - g.start)}. Tap to fill`}
          onPress={() => ctx.onFillGap(g.start, g.end)}
          style={{
            position: "absolute",
            top: y(g.start) + 2,
            height: (g.end - g.start) * PX - 4,
            left: 52,
            right: 0,
            borderRadius: 14,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: colors.bar,
            justifyContent: "center",
            paddingHorizontal: 12,
          }}
        >
          <Text variant="caption">Free · {fmtDuration(g.end - g.start)} · tap to fill</Text>
        </Pressable>
      ))}

      {onDay.map((b) => {
        const pillar = pillarOf(ctx, b);
        const color = blockColor(b, pillar);
        const h = Math.max(18, b.durationMin * PX - 3);
        const isBuffer = b.kind === "buffer";
        const running = b.startMin <= ctx.nowMin && endMin(b) > ctx.nowMin;
        return (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            accessibilityLabel={`${b.title}, ${fmtClock(b.startMin)} to ${fmtClock(endMin(b))}`}
            onPress={() => !isBuffer && ctx.onOpen(b)}
            style={{
              position: "absolute",
              top: y(b.startMin) + 1,
              height: h,
              left: 52,
              right: 0,
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: isBuffer ? "transparent" : colors.card,
              borderWidth: isBuffer ? 1 : 0,
              borderStyle: isBuffer ? "dashed" : "solid",
              borderColor: colors.faint,
              opacity: b.kind === "anchor" ? 0.55 : b.status === "done" ? 0.75 : 1,
              flexDirection: "row",
            }}
          >
            {running ? (
              <View
                pointerEvents="none"
                style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${(1 - blockProgress(b, ctx.nowMin)) * 100}%`, backgroundColor: color, opacity: 0.18 }}
              />
            ) : null}
            {!isBuffer ? <View style={{ width: 5, backgroundColor: color }} /> : null}
            <View style={{ flex: 1, flexDirection: "row", alignItems: h < 34 ? "center" : "flex-start", paddingHorizontal: 10, paddingVertical: h < 34 ? 0 : 6, gap: 6 }}>
              {!isBuffer ? <Text style={{ fontSize: 13 }}>{b.icon ?? "✳️"}</Text> : null}
              <Text
                numberOfLines={1}
                style={{ flex: 1, fontFamily: isBuffer ? fonts.body : fonts.bodyBold, fontSize: 12, color: isBuffer ? colors.soft : colors.ink }}
              >
                {isBuffer ? "Buffer" : b.title}
              </Text>
              {b.status === "done" ? <Ionicons name="checkmark-circle" size={14} color={colors.accent} /> : null}
            </View>
          </Pressable>
        );
      })}

      {ctx.nowMin >= GRID_START && ctx.nowMin <= GRID_END ? (
        <View pointerEvents="none" style={{ position: "absolute", top: y(ctx.nowMin), left: 40, right: 0, flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent }} />
          <View style={{ flex: 1, height: 2, backgroundColor: colors.accent }} />
        </View>
      ) : null}
    </View>
  );
}
