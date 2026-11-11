/** Roll-ups above the day: pillar progress, promise rates and Never miss twice. */
import type { Block, DayLog, Pillar } from "./types";
import { isOnDay, isPromise } from "./schedule";
import { addDays } from "./time";

export const isKept = (b: Block) => b.status === "done";

/** Progress toward a pillar's weekly target for the 7 days from `weekStartKey`. */
export function pillarWeekProgress(blocks: Block[], pillar: Pillar, weekStartKey: string): number {
  const end = addDays(weekStartKey, 7);
  const done = blocks.filter((b) => b.pillarId === pillar.id && isKept(b) && b.date >= weekStartKey && b.date < end);
  switch (pillar.unit) {
    case "h":
      return Math.round((done.reduce((s, b) => s + b.durationMin, 0) / 60) * 10) / 10;
    case "sessions":
      return done.length;
    case "days":
      return new Set(done.map((b) => b.date)).size;
  }
}

export interface DayRate {
  date: string;
  kept: number;
  total: number;
  rate: number | null;
}

/** Kept ÷ promises for one finished (or running) day. Moved/let-go blocks are excluded. */
export function dayRate(blocks: Block[], date: string): DayRate {
  const ps = blocks.filter((b) => b.date === date && isOnDay(b) && isPromise(b));
  const kept = ps.filter(isKept).length;
  return { date, kept, total: ps.length, rate: ps.length ? kept / ps.length : null };
}

export function weekRates(blocks: Block[], weekStartKey: string): DayRate[] {
  return Array.from({ length: 7 }, (_, i) => dayRate(blocks, addDays(weekStartKey, i)));
}

export function weekRate(blocks: Block[], weekStartKey: string, uptoDate?: string): number | null {
  const days = weekRates(blocks, weekStartKey).filter((d) => !uptoDate || d.date <= uptoDate);
  const kept = days.reduce((s, d) => s + d.kept, 0);
  const total = days.reduce((s, d) => s + d.total, 0);
  return total ? kept / total : null;
}

export type ChainDay = "kept" | "miss" | "rest" | "future";

/**
 * Never miss twice: a day is a miss when under half its promises were kept;
 * a day without promises is a rest day and doesn't count either way. The
 * streak only breaks on two misses in a row.
 */
export function chainDay(blocks: Block[], date: string, today: string): ChainDay {
  if (date > today) return "future";
  const r = dayRate(blocks, date);
  if (r.rate === null) return "rest";
  if (date === today && r.rate < 0.5) return "future"; // today isn't over yet
  return r.rate >= 0.5 ? "kept" : "miss";
}

export function neverMissTwice(blocks: Block[], today: string, lookback = 60): { streak: number; chain: ChainDay[] } {
  const chain: ChainDay[] = [];
  for (let i = lookback - 1; i >= 0; i--) chain.push(chainDay(blocks, addDays(today, -i), today));

  // Walk back from today, counting days until two counted days in a row were misses.
  let streak = 0;
  let prevMiss = false;
  for (let i = chain.length - 1; i >= 0; i--) {
    const d = chain[i];
    if (d === "rest" || d === "future") {
      if (d === "rest") streak++;
      continue;
    }
    if (d === "miss" && prevMiss) {
      streak--; // the first miss of the pair belongs to the broken chain
      break;
    }
    prevMiss = d === "miss";
    streak++;
  }
  return { streak: Math.max(0, streak), chain: chain.slice(-28) };
}

/** Days in the last 12 weeks with at least one kept block for the pillar. */
export function pillarHeatmap(blocks: Block[], pillarId: string, today: string): boolean[] {
  const days = new Set(blocks.filter((b) => b.pillarId === pillarId && isKept(b)).map((b) => b.date));
  return Array.from({ length: 84 }, (_, i) => days.has(addDays(today, i - 83)));
}

/** Evening blocks (from 20:30) vs daytime, to spot what keeps slipping. */
export function slipInsight(blocks: Block[], fromDate: string, toDate: string) {
  const past = blocks.filter((b) => b.date >= fromDate && b.date <= toDate && isPromise(b) && b.status !== "let_go");
  const rateOf = (xs: Block[]) => (xs.length ? xs.filter(isKept).length / xs.length : null);
  const evening = past.filter((b) => b.startMin >= 20 * 60 + 30);
  const day = past.filter((b) => b.startMin < 20 * 60 + 30);

  // The title that slipped the most (missed or moved).
  const slips = new Map<string, { count: number; times: number[] }>();
  for (const b of past) {
    if (isKept(b)) continue;
    const s = slips.get(b.title) ?? { count: 0, times: [] };
    s.count++;
    s.times.push(b.startMin);
    slips.set(b.title, s);
  }
  const worst = [...slips.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  return {
    eveningRate: rateOf(evening),
    dayRate: rateOf(day),
    worst: worst && worst[1].count >= 2 ? { title: worst[0], count: worst[1].count, earliest: Math.min(...worst[1].times) } : null,
  };
}

export function bigThingDays(blocks: Block[], logs: Record<string, DayLog>, weekStartKey: string) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartKey, i));
  let had = 0;
  let done = 0;
  for (const d of days) {
    const big = blocks.find((b) => b.date === d && b.isBig && isOnDay(b));
    if (!big) continue;
    had++;
    if (isKept(big)) done++;
  }
  return { had, done, logs: days.map((d) => logs[d]).filter(Boolean) };
}
