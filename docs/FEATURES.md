# Feature set

The full product spec lives in the project files (`zeroed-planner-spec.md`). This page is the build plan.

## Plan section: ideas borrowed from visual day planners

The Plan (Today) section takes *concepts* from visual, ADHD-friendly planners such as Tiimo. The design, names and visuals are our own.

| Concept | How it shows up here |
|---|---|
| A visual timeline you read at a glance | **Day ribbon:** each block's height matches its length, with an icon, pillar colour and kind. The current block drains as time passes, so you can *see* time left without reading numbers. |
| Turn a messy head into a plan | **Sort it for me:** a brain dump where each line becomes an item. It guesses a duration ("30m", "1h", or a sensible default) and a pillar from keywords, then fits items into free gaps with breathing room. Local rules first; an AI co-planner can slot in later behind the same interface. |
| Plan to your energy, not your ideal | **Energy check-in** in the morning plan (Low / Steady / High). A low day caps capacity at 70% of free time. |
| Gentle transitions between activities | **Wrap-up cue:** in the last 5 minutes of a block the Now card shows "Wrap up · 4m left" and what's next. It's in-app only, so the two-nudges-a-day rule holds. |
| Routines as visual checklists | **Routine runner:** one step at a time with its own countdown. Skipping a step still keeps the promise. |
| Visual timers | Focus mode's comet arc and rolling digits (carried over from Zeroed V1) and a progress ring on the Now card. |
| Icons on everything | Every block and inbox item can carry an emoji icon, picked automatically from the title and changeable. |

## Build order

1. **Foundation:** app shell and tabs, theme tokens, fonts, data model, local storage, scheduling logic with tests.
2. **Plan (Today):** header with promise dots, Now card, day ribbon (folded and full-day), inbox, add block, block detail, running late, wrap-up cue.
3. **Morning plan and focus:** morning plan with energy check-in and Sort it for me, Focus mode, routine runner.
4. **Close the loop:** evening shutdown, Week, Sunday review, Pillars (with Never miss twice), Me (settings).

## Rules that keep it uncluttered

1. Today shows Now plus at most 4 upcoming blocks. Everything else is folded away.
2. One big thing plus at most 3 more chosen promises a day.
3. At most 4 pillars.
4. Two nudges a day (plan and shutdown), plus focus starts. Nothing else.
5. No red. A miss is an outline, never a cross. Running late and moving to tomorrow are never misses.
6. Full-screen focus has no character and no extra UI, only the timer.

## Defaults chosen for now (open questions in the spec)

- **Dot:** not included yet.
- **Calendar import:** fixed blocks are added by hand; import comes later.
- **Kept:** started within 10 minutes, or marked done.
- **Platform:** Expo / React Native, same as Zeroed V1.
