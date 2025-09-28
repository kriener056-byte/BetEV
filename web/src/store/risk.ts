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
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
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
  periodKey: string;  // key for tracked period (e.g., 2025-09-28 / 2025-W39 / 2025-09)
  consumed: number;   // dollars consumed in that key

  getConsumed: (period: RiskPeriod) => number;
  tryConsume: (amount: number, period: RiskPeriod, limit: number) => { ok: boolean; remaining: number; key: string };
  refund: (amount: number, period: RiskPeriod, key?: string) => void;
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

      refund: (amount, period, key) => {
        const currentKey = keyFor(period);
        // only refund into the same active period key to avoid cross-period anomalies
        if (key && key !== currentKey) return;
        set((s) => {
          if (s.periodKey !== currentKey) return s;
          const consumed = Math.max(0, Math.round(s.consumed - Math.max(0, Math.round(amount))));
          return { ...s, consumed };
        });
      },

      reset: (period) => set({ periodKey: keyFor(period), consumed: 0 }),
    }),
    {
      name: "risk-v1",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      partialize: (s) => ({ periodKey: s.periodKey, consumed: s.consumed }),
    }
  )
);
