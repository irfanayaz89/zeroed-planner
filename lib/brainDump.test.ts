import { describe, expect, it } from "vitest";
import { parseBrainDump, parseLine } from "./brainDump";

const pillars = [
  { id: "study", name: "Study" },
  { id: "body", name: "Body" },
  { id: "craft", name: "Craft" },
  { id: "mind", name: "Mind" },
];

describe("parseLine", () => {
  it("reads typed durations", () => {
    expect(parseLine("Chemistry past paper 1h 30m", pillars)).toMatchObject({
      title: "Chemistry past paper",
      durationMin: 90,
      pillarId: "study",
      guessedDuration: false,
    });
    expect(parseLine("guitar 45 min", pillars)!.durationMin).toBe(45);
    expect(parseLine("essay 1.5h", pillars)!.durationMin).toBe(90);
  });

  it("guesses a size when none is typed", () => {
    expect(parseLine("call the dentist")).toMatchObject({ durationMin: 15, guessedDuration: true });
    expect(parseLine("revise organic chemistry")!.durationMin).toBe(60);
    expect(parseLine("something vague")!.durationMin).toBe(30);
  });

  it("honours #pillar tags over keyword guesses", () => {
    expect(parseLine("read about training plans #body", pillars)).toMatchObject({ pillarId: "body", title: "Read about training plans" });
  });

  it("strips list markers and skips blanks", () => {
    expect(parseLine("- buy milk")!.title).toBe("Buy milk");
    expect(parseLine("   ")).toBeNull();
  });
});

describe("parseBrainDump", () => {
  it("splits on lines, commas and semicolons", () => {
    const items = parseBrainDump("gym 1h, read 20 pages\nemail tutor; fix bike", pillars);
    expect(items.map((i) => i.title)).toEqual(["Gym", "Read 20 pages", "Email tutor", "Fix bike"]);
    expect(items[0].pillarId).toBe("body");
    expect(items[1].pillarId).toBe("mind");
  });
});
