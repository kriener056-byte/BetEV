import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { RiskPeriod } from "./settings";

// period keys
function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function weekKey(d = new Date()): string {
  // ISO week number
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Thursday in current week decides the year
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const y = date.getUTCFullYear();
  return `${y}-W${String(weekNo).padStart(2, "0")}`;
}
function monthKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function keyFor(period: RiskPeriod, d = new Date()): string {
  if (period === "daily") return dayKey(d);
  if (period === "weekly") return weekKey(d);
  return monthKey(d);
}

type RiskState = {
  periodKey: string;  // last period key used
  consumed: number;   // dollars consumed within that key

  /** Return consumed for the given period, switching periods resets to 0 (virtual). */
  getConsumed: (period: RiskPeriod) => number;

  /** Try to consume `amount` within `period` against `limit`. Returns {ok, remaining}. */
  tryConsume: (amount: number, period: RiskPeriod, limit: number) => { ok: boolean; remaining: number; key: string };

  /** Reset the tracked consumption for current period type. */
  reset: (period: RiskPeriod) => void;
};

export const useRisk = create<RiskState>()(
  persist(
    (set, get) => ({
      periodKey: "",
      consumed: 0,

      getConsumed: (period) => {
        const key = keyFor(period);
        const s = get();
        return s.periodKey === key ? s.consumed : 0;
      },

      tryConsume: (amount, period, limit) => {
        const key = keyFor(period);
        const s = get();
        let consumed = s.periodKey === key ? s.consumed : 0;
        const remaining = Math.max(0, Math.round(limit - consumed));
        if (amount <= remaining) {
          consumed += amount;
          set({ periodKey: key, consumed });
          return { ok: true, remaining: Math.max(0, Math.round(limit - consumed)), key };
        }
        return { ok: false, remaining, key };
      },

      reset: (period) => set({ periodKey: keyFor(period), consumed: 0 }),
    }),
    {
      name: "risk-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => ({ periodKey: s.periodKey, consumed: s.consumed }),
    }
  )
);
