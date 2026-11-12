import type { Block, InboxItem, Pillar } from "./types";

export const SEED_PILLARS: Pillar[] = [
  {
    id: "study",
    name: "Study",
    color: "#C2476A",
    icon: "📚",
    goal: "Get an A in A-level Chemistry",
    milestones: [
      { title: "Finish organic chemistry notes", done: true },
      { title: "Two past papers a week", done: false },
      { title: "Mock exam above 75%", done: false },
    ],
    weeklyTarget: 8,
    unit: "h",
  },
  {
    id: "body",
    name: "Body",
    color: "#D9824B",
    icon: "💪",
    goal: "Run a 10k under 55 minutes",
    milestones: [
      { title: "Run 5k without stopping", done: true },
      { title: "8k long run", done: false },
    ],
    weeklyTarget: 4,
    unit: "sessions",
  },
  {
    id: "craft",
    name: "Craft",
    color: "#9B7BD8",
    icon: "🎸",
    goal: "Play a full song on guitar",
    milestones: [
      { title: "All open chords clean", done: true },
      { title: "Barre chords", done: false },
    ],
    weeklyTarget: 3,
    unit: "h",
  },
  {
    id: "mind",
    name: "Mind",
    color: "#3E9B7A",
    icon: "🌿",
    goal: "Read 12 books this year",
    milestones: [{ title: "Book 9 of 12", done: false }],
    weeklyTarget: 5,
    unit: "days",
  },
];

type Draft = Omit<Block, "id" | "date" | "isBig" | "isFixed" | "source" | "status" | "rolloverCount"> &
  Partial<Pick<Block, "isBig" | "isFixed" | "status">>;

const h = (s: string) => {
  const [hh, mm] = s.split(":").map(Number);
  return hh * 60 + mm;
};

/** A sample day so the app has something to show on first run. */
export function seedDay(date: string): Block[] {
  const drafts: Draft[] = [
    {
      title: "Morning routine",
      icon: "🌅",
      kind: "routine",
      startMin: h("07:00"),
      durationMin: 30,
      steps: [
        { title: "Glass of water", minutes: 2 },
        { title: "Stretch", minutes: 8 },
        { title: "Shower", minutes: 10 },
        { title: "Breakfast", minutes: 10 },
      ],
    },
    { title: "Classes", icon: "🏫", kind: "anchor", isFixed: true, startMin: h("08:15"), durationMin: 270 },
    { title: "Lunch", icon: "🥪", kind: "anchor", isFixed: true, startMin: h("12:45"), durationMin: 30 },
    {
      title: "Chemistry: equilibrium",
      icon: "🧪",
      kind: "focus",
      pillarId: "study",
      isBig: true,
      startMin: h("13:20"),
      durationMin: 60,
      note: "Past paper Q4 to Q7",
    },
    { title: "Breathing room", kind: "buffer", startMin: h("14:20"), durationMin: 15 },
    { title: "Admin: forms and emails", icon: "📮", kind: "task", startMin: h("14:35"), durationMin: 25 },
    { title: "Gym: legs", icon: "🏋️", kind: "task", pillarId: "body", startMin: h("15:30"), durationMin: 60 },
    { title: "Guitar practice", icon: "🎸", kind: "focus", pillarId: "craft", startMin: h("17:00"), durationMin: 30 },
    { title: "Dinner", icon: "🍲", kind: "anchor", isFixed: true, startMin: h("19:00"), durationMin: 45 },
    { title: "Read 20 pages", icon: "📖", kind: "task", pillarId: "mind", startMin: h("20:30"), durationMin: 30 },
    {
      title: "Wind-down",
      icon: "🌙",
      kind: "routine",
      startMin: h("22:00"),
      durationMin: 30,
      isFixed: true,
      steps: [
        { title: "Phone on charge, outside the room", minutes: 2 },
        { title: "Lay out tomorrow's things", minutes: 8 },
        { title: "Read or journal", minutes: 20 },
      ],
    },
  ];
  return drafts.map((d, i) => ({
    id: `${date}-seed-${i}`,
    date,
    isBig: false,
    isFixed: false,
    source: d.kind === "anchor" ? "calendar" : d.kind === "routine" ? "routine" : "manual",
    status: "planned",
    rolloverCount: 0,
    ...d,
  }));
}

export function seedInbox(now: number): InboxItem[] {
  return [
    { id: "in-1", title: "Book dentist", icon: "🦷", durationMin: 15, createdAt: now },
    { id: "in-2", title: "Chemistry flashcards", icon: "🗂️", durationMin: 25, pillarId: "study", createdAt: now },
    { id: "in-3", title: "Fix bike tyre", icon: "🚲", durationMin: 30, createdAt: now },
  ];
}

/**
 * Two weeks of made-up history so Week, Pillars and the Sunday review have
 * something to show on first run. Deterministic, so screenshots are stable.
 * Evening reading slips more often, which the Sunday review picks up.
 */
export function seedHistory(today: string, days = 13): Block[] {
  const out: Block[] = [];
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = days; i >= 1; i--) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const rest = d.getDay() === 0; // Sundays are rest days
    for (const b of seedDay(date)) {
      if (rest && b.kind !== "anchor") continue;
      const promise = (b.kind === "focus" || b.kind === "task" || b.kind === "routine") && !b.isFixed;
      if (!promise) {
        out.push({ ...b, id: b.id.replace("seed", "hist") });
        continue;
      }
      const evening = b.startMin >= 20 * 60 + 30;
      const kept = rand() < (evening ? 0.45 : 0.85);
      out.push({ ...b, id: b.id.replace("seed", "hist"), status: kept ? "done" : "missed" });
    }
  }
  return out;
}
