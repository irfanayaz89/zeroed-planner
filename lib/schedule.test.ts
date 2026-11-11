import { describe, expect, it } from "vitest";
import type { Block } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import {
  applyRunningLate,
  autoPlace,
  capacity,
  findGaps,
  findSlot,
  foldDay,
  inWrapUp,
  promiseSummary,
} from "./schedule";

const D = "2026-11-11";
let n = 0;
function blk(start: string, dur: number, over: Partial<Block> = {}): Block {
  const [h, m] = start.split(":").map(Number);
  return {
    id: over.id ?? `b${++n}`,
    date: D,
    title: over.title ?? `Block ${n}`,
    startMin: h * 60 + m,
    durationMin: dur,
    kind: "task",
    isBig: false,
    isFixed: false,
    source: "manual",
    status: "planned",
    rolloverCount: 0,
    ...over,
  };
}
const t = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

describe("findGaps", () => {
  it("finds gaps between overlapping and adjacent blocks", () => {
    const gaps = findGaps([blk("09:00", 60), blk("09:30", 60), blk("11:00", 30)], t("08:00"), t("12:00"));
    expect(gaps).toEqual([
      { start: t("08:00"), end: t("09:00") },
      { start: t("10:30"), end: t("11:00") },
      { start: t("11:30"), end: t("12:00") },
    ]);
  });

  it("ignores moved blocks", () => {
    expect(findGaps([blk("09:00", 60, { status: "moved" })], t("09:00"), t("10:00"))).toHaveLength(1);
  });
});

describe("findSlot", () => {
  const s = DEFAULT_SETTINGS;
  it("places after now when free", () => {
    expect(findSlot([], 30, t("10:02"), s)).toBe(t("10:05"));
  });
  it("leaves a 5 minute margin after the previous block", () => {
    expect(findSlot([blk("10:00", 60)], 30, t("10:10"), s)).toBe(t("11:05"));
  });
  it("skips gaps that are too small", () => {
    const blocks = [blk("10:00", 60), blk("11:30", 60)];
    // 11:00-11:30 can't fit 30m plus margins, so it goes after 12:30.
    expect(findSlot(blocks, 30, t("10:10"), s)).toBe(t("12:35"));
  });
  it("returns null when nothing fits before wind-down", () => {
    expect(findSlot([], 90, t("21:00"), s)).toBeNull();
  });
});

describe("applyRunningLate", () => {
  const s = DEFAULT_SETTINGS;

  it("lets buffers absorb the delay first", () => {
    const a = blk("10:00", 60, { id: "a" });
    const buf = blk("11:00", 15, { id: "buf", kind: "buffer" });
    const b = blk("11:15", 30, { id: "b" });
    const { blocks, changes } = applyRunningLate([a, buf, b], D, t("10:00"), 15, s);
    const get = (id: string) => blocks.find((x) => x.id === id);
    expect(get("a")!.startMin).toBe(t("10:15"));
    expect(get("buf")).toBeUndefined(); // fully absorbed
    expect(get("b")!.startMin).toBe(t("11:15")); // unchanged
    expect(changes.map((c) => c.id)).toEqual(["a"]);
  });

  it("moves blocks past fixed blocks", () => {
    const a = blk("12:00", 30, { id: "a" });
    const lunch = blk("12:45", 45, { id: "lunch", kind: "anchor", isFixed: true });
    const { blocks } = applyRunningLate([a, lunch], D, t("12:00"), 30, s);
    expect(blocks.find((x) => x.id === "a")!.startMin).toBe(t("13:30"));
    expect(blocks.find((x) => x.id === "lunch")!.startMin).toBe(t("12:45"));
  });

  it("never stacks blocks on top of each other", () => {
    const a = blk("10:00", 60, { id: "a" });
    const b = blk("11:00", 60, { id: "b" });
    const { blocks } = applyRunningLate([a, b], D, t("10:00"), 30, s);
    expect(blocks.find((x) => x.id === "b")!.startMin).toBe(t("11:30"));
  });

  it("moves blocks that would end after wind-down to tomorrow, deleting nothing", () => {
    const a = blk("21:00", 45, { id: "a" });
    const { blocks, changes } = applyRunningLate([a], D, t("21:00"), 30, s);
    expect(changes).toEqual([{ id: "a", title: a.title, from: t("21:00"), to: t("21:00"), tomorrow: true }]);
    expect(blocks.find((x) => x.id === "a")!.status).toBe("moved");
    const copy = blocks.find((x) => x.date === "2026-11-12")!;
    expect(copy.status).toBe("planned");
    expect(copy.rolloverCount).toBe(1);
  });

  it("leaves done and fixed blocks alone", () => {
    const done = blk("10:00", 60, { id: "done", status: "done" });
    const { changes } = applyRunningLate([done], D, t("10:00"), 30, s);
    expect(changes).toEqual([]);
  });
});

describe("capacity", () => {
  it("is green under 80%", () => expect(capacity(100, 200, 20).level).toBe("ok"));
  it("is tight from 80 to 100%", () => expect(capacity(150, 200, 20).level).toBe("tight"));
  it("is over above 100%", () => expect(capacity(180, 200, 20).level).toBe("over"));
  it("plans less on a low-energy day", () => {
    expect(capacity(120, 200, 20, "steady").level).toBe("ok");
    expect(capacity(120, 200, 20, "low").level).toBe("over");
  });
});

describe("promiseSummary", () => {
  it("counts kept, missed and open, skipping anchors and buffers", () => {
    const blocks = [
      blk("08:00", 30, { status: "done" }),
      blk("09:00", 30),
      blk("12:00", 30),
      blk("10:00", 30, { kind: "anchor", isFixed: true }),
      blk("10:30", 10, { kind: "buffer" }),
    ];
    const s = promiseSummary(blocks, D, t("11:00"), 10);
    expect([s.kept, s.missed, s.open, s.total]).toEqual([1, 1, 1, 3]);
  });

  it("counts a block started within grace as kept", () => {
    const dayStart = new Date(2026, 10, 11).getTime();
    const b = blk("09:00", 60, { startedAt: dayStart + t("09:08") * 60000 });
    expect(promiseSummary([b], D, t("11:00"), 10, dayStart).kept).toBe(1);
  });
});

describe("foldDay", () => {
  it("shows the current block, 4 upcoming and folds the rest", () => {
    const blocks = [
      blk("08:00", 30),
      blk("10:00", 60, { id: "cur" }),
      blk("11:00", 30),
      blk("13:00", 30),
      blk("14:00", 30),
      blk("15:00", 30),
      blk("16:00", 30),
    ];
    const f = foldDay(blocks, D, t("10:30"));
    expect(f.current!.id).toBe("cur");
    expect(f.earlier).toHaveLength(1);
    expect(f.upcoming.filter((i) => i.type === "block")).toHaveLength(4);
    expect(f.upcoming.filter((i) => i.type === "free")).toHaveLength(1); // 11:30-13:00
    expect(f.later).toHaveLength(1);
  });
});

describe("autoPlace", () => {
  it("puts the big thing first and adds breathing room", () => {
    const small = blk("00:00", 30, { id: "small" });
    const big = blk("00:00", 60, { id: "big", isBig: true });
    const r = autoPlace([], [small, big], t("09:00"), DEFAULT_SETTINGS);
    expect(r.placed[0].id).toBe("big");
    expect(r.placed[0].startMin).toBe(t("09:00"));
    expect(r.buffers[0].startMin).toBe(t("10:00"));
    expect(r.placed[1].startMin).toBeGreaterThanOrEqual(t("10:15"));
  });
});

describe("inWrapUp", () => {
  it("cues only in the last few minutes", () => {
    const b = blk("10:00", 60);
    expect(inWrapUp(b, t("10:54"), 5)).toBe(false);
    expect(inWrapUp(b, t("10:56"), 5)).toBe(true);
  });
});
