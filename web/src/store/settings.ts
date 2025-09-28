import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OddsFormat = "american" | "decimal";
type LimitMode = "pct" | "usd";

type SettingsState = {
  oddsFormat: OddsFormat;

  bankroll: number;      // $
  kelly: number;         // 0..1 (e.g., 0.25)

  // Per-bet cap
  maxPerBetMode: LimitMode;
  maxPerBetPct: number;  // 0..1
  maxPerBetUsd: number;  // dollars

  // Daily cap (display)
  dailyMaxMode: LimitMode;
  dailyMaxPct: number;   // 0..1
  dailyMaxUsd: number;   // dollars

  setOddsFormat: (f: OddsFormat) => void;
  toggleOddsFormat: () => void;

  setBankroll: (v: number) => void;
  setKelly: (v: number) => void;

  setMaxPerBetMode: (m: LimitMode) => void;
  setMaxPerBetPct: (v: number) => void;
  setMaxPerBetUsd: (v: number) => void;

  setDailyMaxMode: (m: LimitMode) => void;
  setDailyMaxPct: (v: number) => void;
  setDailyMaxUsd: (v: number) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      oddsFormat: "american",

      bankroll: 1000,
      kelly: 0.25, // Quarter Kelly default

      maxPerBetMode: "pct",
      maxPerBetPct: 0.02,
      maxPerBetUsd: 50,

      dailyMaxMode: "pct",
      dailyMaxPct: 0.05,
      dailyMaxUsd: 200,

      setOddsFormat: (f) => set({ oddsFormat: f }),
      toggleOddsFormat: () =>
        set({ oddsFormat: get().oddsFormat === "american" ? "decimal" : "american" }),

      setBankroll: (v) => set({ bankroll: Math.max(50, Math.round(v)) }),
      setKelly: (v) => set({ kelly: Math.max(0, Math.min(1, v)) }),

      setMaxPerBetMode: (m) => set({ maxPerBetMode: m }),
      setMaxPerBetPct: (v) => set({ maxPerBetPct: Math.max(0, Math.min(1, v)) }),
      setMaxPerBetUsd: (v) => set({ maxPerBetUsd: Math.max(0, Math.round(v)) }),

      setDailyMaxMode: (m) => set({ dailyMaxMode: m }),
      setDailyMaxPct: (v) => set({ dailyMaxPct: Math.max(0, Math.min(1, v)) }),
      setDailyMaxUsd: (v) => set({ dailyMaxUsd: Math.max(0, Math.round(v)) }),
    }),
    {
      name: "settings-v1",
      storage: createJSONStorage(() => localStorage),
      version: 4, // bump for new fields
      partialize: (s) => ({
        oddsFormat: s.oddsFormat,
        bankroll: s.bankroll,
        kelly: s.kelly,

        maxPerBetMode: s.maxPerBetMode,
        maxPerBetPct: s.maxPerBetPct,
        maxPerBetUsd: s.maxPerBetUsd,

        dailyMaxMode: s.dailyMaxMode,
        dailyMaxPct: s.dailyMaxPct,
        dailyMaxUsd: s.dailyMaxUsd,
      }),
    }
  )
);
