import { colors } from "@/constants/theme";
import type { Block, Pillar } from "@/lib/types";

export function blockColor(b: Block, pillar?: Pillar): string {
  if (pillar) return pillar.color;
  switch (b.kind) {
    case "focus":
      return colors.accent;
    case "routine":
      return colors.routine;
    case "anchor":
      return colors.fixed;
    case "buffer":
      return colors.bar;
    default:
      return colors.sub;
  }
}

export const KIND_LABEL: Record<Block["kind"], string> = {
  focus: "Focus",
  task: "Task",
  routine: "Routine",
  anchor: "Fixed",
  buffer: "Buffer",
};

export function blockSubtitle(b: Block, pillar?: Pillar): string {
  const kind = b.isFixed && b.kind === "routine" ? "Routine · fixed" : KIND_LABEL[b.kind];
  return pillar ? `${pillar.name} · ${kind}` : kind;
}
