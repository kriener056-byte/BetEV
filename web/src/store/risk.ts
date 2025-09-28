import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { RiskPeriod } from "./settings";

// period keys
function dayKey(d = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function weekKey(d = new Date()): string {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dn);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
function monthKey(d = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function keyFor(period: RiskPeriod, d = new Date()): string {
  return period === "daily" ? dayKey(d) : period === "weekly" ? weekKey(d) : monthKey(d);
}

type RiskState = {
  periodKey: string;   // active key (e.g., 2025-09-28 / 2025-W39 / 2025-09)
  consumed: number;    // reserved + realized (display/enforcement total)
  realized: number;    // portion already placed

  getConsumed: (period: RiskPeriod) => number;
  getRealized: (period: RiskPeriod) => number;

  /** Reserve budget. */
  tryConsume: (amount: number, period: RiskPeriod, limit: number) =>
    { ok: boolean; remaining: number; key: string };

  /** Convert some reserved into realized (placed). Increments realized and consumed. */
  realize: (amount: number, period: RiskPeriod, key?: string) => void;

  /** Refund reservation. Never drops below realized total for the period. */
  refund: (amount: number, period: RiskPeriod, key?: string) => void;

  /** Reset counters for a period. */
  reset: (period: RiskPeriod) => void;
};

export const useRisk = create<RiskState>()(
  persist(
    (set, get) => ({
      periodKey: "",
      consumed: 0,
      realized: 0,

      getConsumed: (period) => {
        const key = keyFor(period);
        const s = get();
        return s.periodKey === key ? s.consumed : 0;
      },

      getRealized: (period) => {
        const key = keyFor(period);
        const s = get();
        return s.periodKey === key ? s.realized : 0;
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

      realize: (amount, period, key) => {
        const currentKey = keyFor(period);
        if (key && key !== currentKey) return;
        set((s) => {
          const same = s.periodKey === currentKey;
          const consumed = (same ? s.consumed : 0) + Math.max(0, Math.round(amount));
          const realized = (same ? s.realized : 0) + Math.max(0, Math.round(amount));
          return { periodKey: currentKey, consumed, realized };
        });
      },

      refund: (amount, period, key) => {
        const currentKey = keyFor(period);
        if (key && key !== currentKey) return;
        set((s) => {
          if (s.periodKey !== currentKey) return s;
          const dec = Math.max(0, Math.round(amount));
          const minConsumed = Math.max(0, s.realized); // cannot go below realized
          const consumed = Math.max(minConsumed, s.consumed - dec);
          return { ...s, consumed };
        });
      },

      reset: (period) => set({ periodKey: keyFor(period), consumed: 0, realized: 0 }),
    }),
    {
      name: "risk-v1",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      partialize: (s) => ({ periodKey: s.periodKey, consumed: s.consumed, realized: s.realized }),
    }
  )
);
