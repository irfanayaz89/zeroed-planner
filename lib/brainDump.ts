/**
 * "Sort it for me": turn a messy brain dump into plannable items. Local rules
 * for now; an AI co-planner can replace `parseLine` behind the same shape.
 */
import type { Pillar } from "./types";
import { guessIcon } from "./icons";

export interface ParsedItem {
  title: string;
  icon: string;
  durationMin: number;
  pillarId?: string;
  /** True when the duration was guessed, not typed. */
  guessedDuration: boolean;
}

const DURATION_RE = /(?:^|\s)(?:(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b)?\s*(?:(\d+)\s*(m|min|mins|minutes)\b)?/i;

/** Rough sizes when nothing is typed: small admin is short, deep work is long. */
const SIZE_HINTS: [RegExp, number][] = [
  [/\b(call|email|text|book|pay|reply|order|send|buy)\b/i, 15],
  [/\b(study|revise|essay|write|code|practice|project|paper|draft|chapter)\b/i, 60],
  [/\b(gym|run|workout|swim|clean|cook|groceries)\b/i, 45],
];

const PILLAR_HINTS: Record<string, RegExp> = {
  study: /\b(study|revise|revision|homework|exam|paper|chem|physics|math|maths|biology|notes|flashcards?|lecture)\b/i,
  body: /\b(gym|run|jog|walk|workout|swim|yoga|stretch|lift|legs|cardio|bike|cycle)\b/i,
  craft: /\b(guitar|piano|music|draw|paint|sketch|code|coding|design|write|writing|song)\b/i,
  mind: /\b(read|reading|book|meditat|journal|breath|mindful)\b/i,
};

export function parseLine(raw: string, pillars: Pick<Pillar, "id" | "name">[] = []): ParsedItem | null {
  let text = raw.replace(/^\s*[-*•\d.)]+\s*/, "").trim();
  if (!text) return null;

  // Explicit pillar tag: "#study"
  let pillarId: string | undefined;
  const tag = text.match(/#(\w+)/);
  if (tag) {
    const p = pillars.find((x) => x.name.toLowerCase() === tag[1].toLowerCase() || x.id === tag[1].toLowerCase());
    if (p) pillarId = p.id;
    text = text.replace(tag[0], "").trim();
  }

  // Explicit duration anywhere: "1h", "1h 30m", "45 min", "1.5h"
  let durationMin: number | undefined;
  const all = [...text.matchAll(new RegExp(DURATION_RE.source, "gi"))].find((m) => m[1] || m[3]);
  if (all) {
    durationMin = Math.round(parseFloat(all[1] ?? "0") * 60 + parseInt(all[3] ?? "0", 10));
    text = text.replace(all[0], " ").replace(/\s{2,}/g, " ").trim();
  }

  if (!pillarId) {
    for (const p of pillars) {
      const re = PILLAR_HINTS[p.id] ?? new RegExp(`\\b${p.name}\\b`, "i");
      if (re.test(text)) {
        pillarId = p.id;
        break;
      }
    }
  }

  const guessed = durationMin === undefined;
  if (guessed) durationMin = SIZE_HINTS.find(([re]) => re.test(text))?.[1] ?? 30;

  const title = text.replace(/[,;:\s]+$/, "");
  if (!title) return null;
  return {
    title: title[0].toUpperCase() + title.slice(1),
    icon: guessIcon(title),
    durationMin: Math.min(240, Math.max(5, durationMin!)),
    pillarId,
    guessedDuration: guessed,
  };
}

/** Split on new lines, commas or semicolons, then parse each piece. */
export function parseBrainDump(text: string, pillars: Pick<Pillar, "id" | "name">[] = []): ParsedItem[] {
  return text
    .split(/\n|;|,(?![^(]*\))/)
    .map((l) => parseLine(l, pillars))
    .filter((x): x is ParsedItem => x !== null);
}
