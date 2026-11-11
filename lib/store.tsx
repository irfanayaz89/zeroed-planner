/**
 * Local-first app state: one reducer, persisted to AsyncStorage. A backend
 * (Supabase, like Zeroed V1) can replace the persistence layer later without
 * changing the screens.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { Block, DayLog, InboxItem, Pillar, Settings } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { SEED_PILLARS, seedDay, seedHistory, seedInbox } from "./seed";
import { copyToTomorrow } from "./schedule";
import { toDateKey } from "./time";

const STORAGE_KEY = "zeroed-planner/v1";

export interface AppState {
  hydrated: boolean;
  blocks: Block[];
  inbox: InboxItem[];
  pillars: Pillar[];
  dayLogs: Record<string, DayLog>;
  settings: Settings;
}

type Action =
  | { type: "hydrate"; state: Partial<AppState> }
  | { type: "blocks/upsert"; blocks: Block[] }
  | { type: "blocks/replace"; blocks: Block[] }
  | { type: "blocks/patch"; id: string; patch: Partial<Block> }
  | { type: "inbox/add"; item: InboxItem }
  | { type: "inbox/remove"; id: string }
  | { type: "pillars/set"; pillars: Pillar[] }
  | { type: "day/patch"; date: string; patch: Partial<DayLog> }
  | { type: "settings/patch"; patch: Partial<Settings> }
  | { type: "reset"; state: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.state, hydrated: true };
    case "blocks/upsert": {
      const ids = new Set(action.blocks.map((b) => b.id));
      return { ...state, blocks: [...state.blocks.filter((b) => !ids.has(b.id)), ...action.blocks] };
    }
    case "blocks/replace":
      return { ...state, blocks: action.blocks };
    case "blocks/patch":
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b)),
      };
    case "inbox/add":
      return { ...state, inbox: [action.item, ...state.inbox] };
    case "inbox/remove":
      return { ...state, inbox: state.inbox.filter((i) => i.id !== action.id) };
    case "pillars/set":
      return { ...state, pillars: action.pillars };
    case "day/patch": {
      const prev = state.dayLogs[action.date] ?? { date: action.date, planned: false, closed: false };
      return { ...state, dayLogs: { ...state.dayLogs, [action.date]: { ...prev, ...action.patch } } };
    }
    case "settings/patch":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "reset":
      return action.state;
  }
}

export function freshState(): AppState {
  const today = toDateKey(new Date());
  return {
    hydrated: true,
    blocks: [...seedHistory(today), ...seedDay(today)],
    inbox: seedInbox(Date.now()),
    pillars: SEED_PILLARS,
    dayLogs: {},
    settings: DEFAULT_SETTINGS,
  };
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function useStoreValue() {
  const [state, dispatch] = useReducer(reducer, {
    hydrated: false,
    blocks: [],
    inbox: [],
    pillars: [],
    dayLogs: {},
    settings: DEFAULT_SETTINGS,
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return dispatch({ type: "reset", state: freshState() });
        const saved = JSON.parse(raw) as Partial<AppState>;
        dispatch({ type: "hydrate", state: { ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings } } });
      })
      .catch(() => dispatch({ type: "reset", state: freshState() }));
  }, []);

  // Persist after hydration, debounced so rapid edits write once.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const { hydrated: _h, ...rest } = state;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rest)).catch(() => {});
    }, 300);
  }, [state]);

  const byId = useCallback((id: string) => state.blocks.find((b) => b.id === id), [state.blocks]);

  const actions = useMemo(
    () => ({
      upsertBlocks: (blocks: Block[]) => dispatch({ type: "blocks/upsert", blocks }),
      replaceBlocks: (blocks: Block[]) => dispatch({ type: "blocks/replace", blocks }),
      patchBlock: (id: string, patch: Partial<Block>) => dispatch({ type: "blocks/patch", id, patch }),
      startBlock: (id: string) => dispatch({ type: "blocks/patch", id, patch: { startedAt: Date.now() } }),
      markDone: (id: string) => dispatch({ type: "blocks/patch", id, patch: { status: "done", doneAt: Date.now() } }),
      letGo: (id: string) => dispatch({ type: "blocks/patch", id, patch: { status: "let_go" } }),
      addInbox: (item: Omit<InboxItem, "id" | "createdAt">) =>
        dispatch({ type: "inbox/add", item: { ...item, id: newId(), createdAt: Date.now() } }),
      removeInbox: (id: string) => dispatch({ type: "inbox/remove", id }),
      setPillars: (pillars: Pillar[]) => dispatch({ type: "pillars/set", pillars }),
      patchDay: (date: string, patch: Partial<DayLog>) => dispatch({ type: "day/patch", date, patch }),
      patchSettings: (patch: Partial<Settings>) => dispatch({ type: "settings/patch", patch }),
      resetDemo: () => dispatch({ type: "reset", state: freshState() }),
    }),
    [],
  );

  /** Move to tomorrow. After `rolloverToInbox` rollovers it goes to the inbox instead. */
  const moveToTomorrow = useCallback(
    (id: string) => {
      const b = byId(id);
      if (!b) return;
      const rolled = { ...b, status: "moved" as const, rolloverCount: b.rolloverCount + 1 };
      if (rolled.rolloverCount >= state.settings.rolloverToInbox) {
        dispatch({ type: "blocks/upsert", blocks: [rolled] });
        dispatch({
          type: "inbox/add",
          item: { id: newId(), title: b.title, icon: b.icon, durationMin: b.durationMin, pillarId: b.pillarId, createdAt: Date.now() },
        });
        return "inbox" as const;
      }
      dispatch({ type: "blocks/upsert", blocks: [rolled, copyToTomorrow(rolled, state.settings.dayStartMin)] });
      return "tomorrow" as const;
    },
    [byId, state.settings],
  );

  const sendToInbox = useCallback(
    (id: string) => {
      const b = byId(id);
      if (!b) return;
      dispatch({ type: "blocks/patch", id, patch: { status: "let_go" } });
      dispatch({
        type: "inbox/add",
        item: { id: newId(), title: b.title, icon: b.icon, durationMin: b.durationMin, pillarId: b.pillarId, createdAt: Date.now() },
      });
    },
    [byId],
  );

  return { state, ...actions, moveToTomorrow, sendToInbox, byId };
}

type Store = ReturnType<typeof useStoreValue>;
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export function usePillar(id?: string): Pillar | undefined {
  const { state } = useStore();
  return id ? state.pillars.find((p) => p.id === id) : undefined;
}
