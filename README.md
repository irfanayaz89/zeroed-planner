# Zeroed Planner

A full-day planner built around long-term discipline. It works like a calendar but feels like a focus app: one thing at a time, with the rest of the day folded away.

> Every block in your day is a promise to yourself. Discipline is the share of promises you keep.

See [docs/FEATURES.md](docs/FEATURES.md) for the feature set and the order it's being built in.

## Run it

```bash
npm install
npm run web      # or: npm start, then open in Expo Go
npm test         # scheduling logic tests
npm run typecheck
```

On web you can pin the clock to demo a time of day: `http://localhost:8081/?t=13:30`.

## Stack

Expo (SDK 54) with Expo Router, React Native, Reanimated and SVG, the same stack as Zeroed V1. State is local-first (a reducer persisted to AsyncStorage); a Supabase sync layer can replace persistence later without touching screens.

| Folder | What's in it |
|---|---|
| `app/` | Screens (Expo Router). Tabs: Today, Week, Pillars, Me |
| `components/` | UI. `ui/` holds primitives (Text, Button, Sheet, Chip, Toast) |
| `lib/schedule.ts` | Pure scheduling logic: gaps, find a time, running late, capacity, promises, folding |
| `lib/store.tsx` | App state and actions |
| `lib/types.ts` | Data model and default settings |
| `constants/theme.ts` | Design tokens (dark gray with blue) |
