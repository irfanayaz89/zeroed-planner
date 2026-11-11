/** Data model (spec section 8). Times are minutes from local midnight. */

export type BlockKind = "focus" | "task" | "routine" | "anchor" | "buffer";
export type BlockStatus = "planned" | "done" | "missed" | "moved" | "let_go";
export type BlockSource = "manual" | "calendar" | "routine" | "plan";

export interface RoutineStep {
  title: string;
  minutes: number;
  done?: boolean;
  skipped?: boolean;
}

export interface Block {
  id: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  title: string;
  /** A single emoji shown on the day ribbon. */
  icon?: string;
  startMin: number;
  durationMin: number;
  kind: BlockKind;
  pillarId?: string;
  note?: string;
  isBig: boolean;
  isFixed: boolean;
  source: BlockSource;
  status: BlockStatus;
  /** Epoch ms. */
  startedAt?: number;
  doneAt?: number;
  rolloverCount: number;
  steps?: RoutineStep[];
}

export type PillarUnit = "h" | "sessions" | "days";

export interface Pillar {
  id: string;
  name: string;
  color: string;
  icon: string;
  goal: string;
  milestones: { title: string; done: boolean }[];
  weeklyTarget: number;
  unit: PillarUnit;
}

export interface InboxItem {
  id: string;
  title: string;
  icon?: string;
  durationMin: number;
  pillarId?: string;
  /** Epoch ms. */
  createdAt: number;
}

export type Mood = "great" | "okay" | "rough";
export type Energy = "low" | "steady" | "high";

export interface DayLog {
  date: string;
  planned: boolean;
  closed: boolean;
  energy?: Energy;
  mood?: Mood;
  note?: string;
}

export interface Settings {
  dayStartMin: number;
  /** Wind-down: flexible blocks never run past this. */
  windDownMin: number;
  bedtimeMin: number;
  planRitualMin: number;
  shutdownMin: number;
  bufferPct: number;
  keptGraceMin: number;
  rolloverToInbox: number;
  /** In-app cue a few minutes before a block ends. */
  wrapUpCueMin: number;
}

export const DEFAULT_SETTINGS: Settings = {
  dayStartMin: 6 * 60,
  windDownMin: 22 * 60,
  bedtimeMin: 23 * 60 + 30,
  planRitualMin: 7 * 60 + 30,
  shutdownMin: 21 * 60 + 45,
  bufferPct: 20,
  keptGraceMin: 10,
  rolloverToInbox: 3,
  wrapUpCueMin: 5,
};
