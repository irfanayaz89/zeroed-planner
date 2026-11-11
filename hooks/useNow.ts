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

// Read once at startup so the pin survives in-app navigation (which drops the query).
let pinned: number | null | undefined;

function pinnedMinutes(): number | null {
  if (pinned !== undefined) return pinned;
  pinned = null;
  if (typeof window !== "undefined" && window.location?.search) {
    const t = new URLSearchParams(window.location.search).get("t");
    if (t) {
      const [h, m] = t.split(":").map(Number);
      if (Number.isFinite(h)) pinned = h * 60 + (m || 0);
    }
  }
  return pinned;
}
