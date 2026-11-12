import { useEffect, useState } from "react";
import { minutesOfDay, toDateKey } from "@/lib/time";

/**
 * The current time, refreshed every `everyMs`. In dev you can speed time up or
 * pin it with `?t=13:30` on web, which makes the planner easy to demo.
 */
export function useNow(everyMs = 15000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);

  const pinned = pinnedMinutes();
  const date = toDateKey(now);
  const nowMin = pinned ?? minutesOfDay(now);
  const dayStartEpoch = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return { now, date, nowMin, dayStartEpoch };
}

function pinnedMinutes(): number | null {
  if (typeof window === "undefined" || !window.location?.search) return null;
  const t = new URLSearchParams(window.location.search).get("t");
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
}
