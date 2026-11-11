/**
 * Pure scheduling logic. No React, no storage: everything here takes blocks
 * and returns new values, so it can be unit tested directly.
 */
import type { Block, Settings } from "./types";
import { addDays, roundUpTo } from "./time";

export const endMin = (b: Pick<Block, "startMin" | "durationMin">) => b.startMin + b.durationMin;

export const byStart = (a: Block, b: Block) => a.startMin - b.startMin || a.durationMin - b.durationMin;

/** Blocks that occupy time on the day (moved / let-go blocks have left it). */
export const isOnDay = (b: Block) => b.status !== "moved" && b.status !== "let_go";

/** A promise is something you chose to do: anchors, buffers and fixed blocks don't count. */
export const isPromise = (b: Block) =>
  (b.kind === "focus" || b.kind === "task" || b.kind === "routine") && !b.isFixed;

/** Fixed blocks can't be moved by running late or rescheduling. */
export const isFlexible = (b: Block) => !b.isFixed && b.kind !== "anchor";

export function dayBlocks(blocks: Block[], date: string): Block[] {
  return blocks.filter((b) => b.date === date && isOnDay(b)).sort(byStart);
}

export interface Gap {
  start: number;
  end: number;
}

/** Free gaps between occupied blocks inside [from, to). */
export function findGaps(blocks: Block[], from: number, to: number): Gap[] {
  const gaps: Gap[] = [];
  let cursor = from;
  for (const b of [...blocks].filter(isOnDay).sort(byStart)) {
    const s = Math.max(b.startMin, from);
    const e = Math.min(endMin(b), to);
    if (e <= from || s >= to) continue;
    if (s > cursor) gaps.push({ start: cursor, end: s });
    cursor = Math.max(cursor, e);
  }
  if (cursor < to) gaps.push({ start: cursor, end: to });
  return gaps;
}

export const freeMinutes = (blocks: Block[], from: number, to: number) =>
  findGaps(blocks, from, to).reduce((sum, g) => sum + (g.end - g.start), 0);

export const SLOT_MARGIN = 5;

/**
 * The start of the first free gap after `afterMin` that fits `durationMin`
 * with a 5-minute margin on each side, rounded up to 5 minutes. Null if
 * nothing fits before wind-down.
 */
export function findSlot(
  blocks: Block[],
  durationMin: number,
  afterMin: number,
  settings: Pick<Settings, "dayStartMin" | "windDownMin">,
): number | null {
  const from = Math.max(afterMin, settings.dayStartMin);
  for (const gap of findGaps(blocks, from, settings.windDownMin)) {
    // Leave a margin after the previous block; "now" itself needs none.
    const start = roundUpTo(gap.start === from ? from : gap.start + SLOT_MARGIN);
    const needEnd = start + durationMin + (gap.end < settings.windDownMin ? SLOT_MARGIN : 0);
    if (needEnd <= gap.end) return start;
  }
  return null;
}

export interface LateChange {
  id: string;
  title: string;
  from: number;
  to: number;
  tomorrow: boolean;
}

export interface LateResult {
  blocks: Block[];
  changes: LateChange[];
}

/**
 * Running late (spec 4.6). Walks flexible, unfinished blocks that haven't
 * ended yet, in time order:
 * 1. buffers absorb the delay first (they shrink),
 * 2. each block shifts by the remaining delay and never starts before the previous one ends,
 * 3. a block that would overlap a fixed block moves to after it,
 * 4. a block that would end after wind-down moves to tomorrow. Nothing is deleted.
 */
export function applyRunningLate(
  blocks: Block[],
  date: string,
  nowMin: number,
  delayMin: number,
  settings: Pick<Settings, "windDownMin" | "dayStartMin">,
): LateResult {
  const today = dayBlocks(blocks, date);
  const fixed = today.filter((b) => !isFlexible(b));
  const walk = today.filter((b) => isFlexible(b) && b.status === "planned" && endMin(b) > nowMin);

  const updated = new Map<string, Block>();
  const changes: LateChange[] = [];
  let remaining = delayMin;
  let prevEnd = nowMin;

  for (const b of walk) {
    if (b.kind === "buffer") {
      const shrink = Math.min(remaining, b.durationMin);
      const start = Math.max(b.startMin + remaining, prevEnd);
      const duration = Math.max(0, endMin(b) - start);
      remaining -= shrink;
      updated.set(b.id, { ...b, startMin: start, durationMin: duration });
      prevEnd = Math.max(prevEnd, start + duration);
      continue;
    }

    let start = Math.max(b.startMin + remaining, prevEnd);
    // Hop over fixed blocks until there's no overlap.
    let moved = true;
    while (moved) {
      moved = false;
      for (const f of fixed) {
        if (start < endMin(f) && start + b.durationMin > f.startMin) {
          start = endMin(f);
          moved = true;
        }
      }
    }

    if (start + b.durationMin > settings.windDownMin) {
      updated.set(b.id, { ...b, status: "moved", rolloverCount: b.rolloverCount + 1 });
      changes.push({ id: b.id, title: b.title, from: b.startMin, to: b.startMin, tomorrow: true });
      continue;
    }

    if (start !== b.startMin) {
      changes.push({ id: b.id, title: b.title, from: b.startMin, to: start, tomorrow: false });
    }
    updated.set(b.id, { ...b, startMin: start });
    prevEnd = start + b.durationMin;
  }

  const next: Block[] = [];
  for (const b of blocks) {
    const u = updated.get(b.id);
    if (!u) {
      next.push(b);
    } else if (u.status === "moved") {
      // Keep the original as "moved" on today and add a fresh copy tomorrow.
      next.push(u);
      next.push(copyToTomorrow(u, settings.dayStartMin));
    } else if (!(u.kind === "buffer" && u.durationMin === 0)) {
      next.push(u);
    }
  }
  return { blocks: next, changes };
}

/** A planned copy of `b` on the next day, at the same time if it fits the day. */
export function copyToTomorrow(b: Block, dayStartMin: number): Block {
  return {
    ...b,
    id: `${b.id}~${b.rolloverCount}`,
    date: addDays(b.date, 1),
    startMin: Math.max(b.startMin, dayStartMin),
    status: "planned",
    startedAt: undefined,
    doneAt: undefined,
  };
}

export type CapacityLevel = "ok" | "tight" | "over";

export interface Capacity {
  plannedMin: number;
  withBufferMin: number;
  freeMin: number;
  ratio: number;
  level: CapacityLevel;
}

/** Energy check-in scales how much of the free time you're allowed to fill. */
export const ENERGY_FACTOR = { low: 0.7, steady: 1, high: 1 } as const;

/**
 * Planned time plus a buffer, against the free time. Green up to 80%,
 * amber 80–100% ("Tight"), over 100% ("That's more than your day holds").
 */
export function capacity(
  plannedMin: number,
  freeMin: number,
  bufferPct: number,
  energy: keyof typeof ENERGY_FACTOR = "steady",
): Capacity {
  const withBufferMin = Math.round(plannedMin * (1 + bufferPct / 100));
  const usable = freeMin * ENERGY_FACTOR[energy];
  const ratio = usable <= 0 ? (withBufferMin > 0 ? Infinity : 0) : withBufferMin / usable;
  const level: CapacityLevel = ratio > 1 ? "over" : ratio >= 0.8 ? "tight" : "ok";
  return { plannedMin, withBufferMin, freeMin, ratio, level };
}

export type PromiseState = "kept" | "missed" | "open";

/**
 * Kept: marked done, or started within the grace window. Missed: its time has
 * passed without either. Open: still to come (or running now). Moved and
 * let-go blocks aren't promises for this day any more.
 */
export function promiseState(b: Block, nowMin: number, graceMin: number, dayStartEpoch?: number): PromiseState {
  if (b.status === "done") return "kept";
  if (b.startedAt !== undefined && dayStartEpoch !== undefined) {
    const startedMin = (b.startedAt - dayStartEpoch) / 60000;
    if (startedMin <= b.startMin + graceMin) return "kept";
  }
  if (b.status === "missed") return "missed";
  return endMin(b) <= nowMin ? "missed" : "open";
}

export interface PromiseSummary {
  states: { id: string; state: PromiseState }[];
  kept: number;
  missed: number;
  open: number;
  total: number;
}

export function promiseSummary(
  blocks: Block[],
  date: string,
  nowMin: number,
  graceMin: number,
  dayStartEpoch?: number,
): PromiseSummary {
  const states = dayBlocks(blocks, date)
    .filter(isPromise)
    .map((b) => ({ id: b.id, state: promiseState(b, nowMin, graceMin, dayStartEpoch) }));
  const count = (s: PromiseState) => states.filter((x) => x.state === s).length;
  return { states, kept: count("kept"), missed: count("missed"), open: count("open"), total: states.length };
}

/** Promise rate: kept ÷ promises, null when there were no promises. */
export function promiseRate(kept: number, total: number): number | null {
  return total === 0 ? null : kept / total;
}

export function currentBlock(blocks: Block[], date: string, nowMin: number): Block | undefined {
  const onDay = dayBlocks(blocks, date).filter((b) => b.kind !== "buffer");
  return onDay.find((b) => b.startMin <= nowMin && endMin(b) > nowMin);
}

export function nextBlock(blocks: Block[], date: string, nowMin: number): Block | undefined {
  return dayBlocks(blocks, date).find((b) => b.kind !== "buffer" && b.startMin > nowMin);
}

export type FoldItem = { type: "block"; block: Block } | { type: "free"; start: number; end: number };

export interface FoldedDay {
  earlier: Block[];
  earlierDone: number;
  current?: Block;
  upcoming: FoldItem[];
  later: Block[];
  lastEnd: number;
}

/**
 * Folded Today view (spec 4.1): earlier blocks collapse, then the current
 * block and at most `maxUpcoming` upcoming blocks, with free gaps of
 * `freeThreshold`+ minutes shown between them. The rest folds into "Later".
 */
export function foldDay(
  blocks: Block[],
  date: string,
  nowMin: number,
  maxUpcoming = 4,
  freeThreshold = 45,
): FoldedDay {
  const all = dayBlocks(blocks, date);
  const current = currentBlock(blocks, date, nowMin);
  const earlier = all.filter((b) => endMin(b) <= nowMin && b !== current);
  const future = all.filter((b) => b.startMin > nowMin && b !== current);

  const shown = future.slice(0, maxUpcoming);
  const later = future.slice(maxUpcoming);

  const upcoming: FoldItem[] = [];
  let cursor = current ? endMin(current) : nowMin;
  for (const b of shown) {
    if (b.startMin - cursor >= freeThreshold) upcoming.push({ type: "free", start: cursor, end: b.startMin });
    upcoming.push({ type: "block", block: b });
    cursor = Math.max(cursor, endMin(b));
  }

  return {
    earlier,
    earlierDone: earlier.filter((b) => b.status === "done" || !isPromise(b)).length,
    current,
    upcoming,
    later,
    lastEnd: all.length ? Math.max(...all.map(endMin)) : nowMin,
  };
}

/** 0..1 through the block, for the draining fill on the ribbon. */
export function blockProgress(b: Block, nowMin: number): number {
  if (b.durationMin <= 0) return 1;
  return Math.min(1, Math.max(0, (nowMin - b.startMin) / b.durationMin));
}

/** True inside the last `cueMin` minutes of a running block. */
export function inWrapUp(b: Block, nowMin: number, cueMin: number): boolean {
  const left = endMin(b) - nowMin;
  return left > 0 && left <= cueMin && b.durationMin > cueMin * 2;
}

/**
 * Place blocks one after another into free time, big thing first, with a
 * buffer of `bufferPct` of each block's length (min 5m) after it. Returns
 * what fit and what didn't.
 */
export function autoPlace(
  existing: Block[],
  toPlace: Block[],
  afterMin: number,
  settings: Pick<Settings, "dayStartMin" | "windDownMin" | "bufferPct">,
): { placed: Block[]; buffers: Block[]; unplaced: Block[] } {
  const ordered = [...toPlace].sort((a, b) => Number(b.isBig) - Number(a.isBig));
  const working = [...existing];
  const placed: Block[] = [];
  const buffers: Block[] = [];
  const unplaced: Block[] = [];

  for (const b of ordered) {
    const bufferLen = Math.max(5, roundUpTo((b.durationMin * settings.bufferPct) / 100));
    const start = findSlot(working, b.durationMin, afterMin, settings);
    if (start === null) {
      unplaced.push(b);
      continue;
    }
    const block = { ...b, startMin: start };
    placed.push(block);
    working.push(block);
    const bufStart = endMin(block);
    if (bufStart + bufferLen <= settings.windDownMin) {
      const buf: Block = {
        id: `${b.id}-buf`,
        date: b.date,
        title: "Breathing room",
        startMin: bufStart,
        durationMin: bufferLen,
        kind: "buffer",
        isBig: false,
        isFixed: false,
        source: "plan",
        status: "planned",
        rolloverCount: 0,
      };
      buffers.push(buf);
      working.push(buf);
    }
  }
  return { placed, buffers, unplaced };
}
