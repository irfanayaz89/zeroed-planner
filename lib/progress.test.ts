import { describe, expect, it } from "vitest";
import type { Block, Pillar } from "./types";
import { dayRate, neverMissTwice, pillarWeekProgress, slipInsight, targetFor } from "./progress";

let n = 0;
const blk = (date: string, over: Partial<Block> = {}): Block => ({
  id: `b${++n}`,
  date,
  title: "x",
  startMin: 600,
  durationMin: 60,
  kind: "task",
  isBig: false,
  isFixed: false,
  source: "manual",
  status: "planned",
  rolloverCount: 0,
  ...over,
});

const study: Pillar = { id: "study", name: "Study", color: "", icon: "", goal: "", milestones: [], weeklyTarget: 8, unit: "h" };

describe("pillarWeekProgress", () => {
  it("sums done hours inside the week only", () => {
    const blocks = [
      blk("2026-11-09", { pillarId: "study", status: "done", durationMin: 90 }),
      blk("2026-11-10", { pillarId: "study", status: "done", durationMin: 60 }),
      blk("2026-11-10", { pillarId: "study", status: "planned" }),
      blk("2026-11-16", { pillarId: "study", status: "done" }),
    ];
    expect(pillarWeekProgress(blocks, study, "2026-11-09")).toBe(2.5);
    expect(pillarWeekProgress(blocks, { ...study, unit: "days" }, "2026-11-09")).toBe(2);
  });
});

describe("dayRate", () => {
  it("ignores anchors and moved blocks", () => {
    const blocks = [
      blk("2026-11-10", { status: "done" }),
      blk("2026-11-10"),
      blk("2026-11-10", { kind: "anchor", isFixed: true }),
      blk("2026-11-10", { status: "moved" }),
    ];
    expect(dayRate(blocks, "2026-11-10")).toMatchObject({ kept: 1, total: 2, rate: 0.5 });
  });
});

describe("neverMissTwice", () => {
  const good = (d: string) => blk(d, { status: "done" });
  const bad = (d: string) => blk(d);

  it("survives a single miss and skips rest days", () => {
    const blocks = [good("2026-11-07"), bad("2026-11-08"), good("2026-11-10"), good("2026-11-11")];
    // 11-09 is a rest day (no promises), so it doesn't count. The single miss on 11-08 doesn't break it.
    expect(neverMissTwice(blocks, "2026-11-11", 5).streak).toBe(4);
  });

  it("breaks on two misses in a row", () => {
    const blocks = [bad("2026-11-07"), bad("2026-11-08"), good("2026-11-09"), good("2026-11-10")];
    // The chain broke on 11-08, so only 11-09 and 11-10 count.
    expect(neverMissTwice(blocks, "2026-11-10", 4).streak).toBe(2);
  });
});

describe("slipInsight", () => {
  it("finds the block that slipped most and compares evening with daytime", () => {
    const blocks = [
      blk("2026-11-09", { title: "Read", startMin: 1230 }),
      blk("2026-11-10", { title: "Read", startMin: 1230 }),
      blk("2026-11-10", { title: "Gym", startMin: 600, status: "done" }),
    ];
    const s = slipInsight(blocks, "2026-11-09", "2026-11-11");
    expect(s.worst).toMatchObject({ title: "Read", count: 2 });
    expect(s.eveningRate).toBe(0);
    expect(s.dayRate).toBe(1);
  });
});

describe("targetFor", () => {
  it("uses the latest target set for that week or earlier", () => {
    const p = { ...study, weeklyTarget: 8, targetsByWeek: { "2026-11-16": 10, "2026-11-30": 6 } };
    expect(targetFor(p, "2026-11-09")).toBe(8);
    expect(targetFor(p, "2026-11-16")).toBe(10);
    expect(targetFor(p, "2026-11-23")).toBe(10);
    expect(targetFor(p, "2026-11-30")).toBe(6);
  });
});
