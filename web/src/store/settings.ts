import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OddsFormat = "american" | "decimal";
export type LimitMode = "pct" | "usd";
export type RiskPeriod = "daily" | "weekly" | "monthly";

type SettingsState = {
  // odds
  oddsFormat: OddsFormat;

  // staking
  bankroll: number;       // $
  kelly: number;          // 0..1

  // per-bet cap
  maxPerBetMode: LimitMode;
  maxPerBetPct: number;   // 0..1
  maxPerBetUsd: number;   // $

  // risk budget (enforced)
  riskPeriod: RiskPeriod; // daily/weekly/monthly
  periodMode: LimitMode;  // % or $
  periodLimitPct: number; // 0..1
  periodLimitUsd: number; // $

  // setters
  setOddsFormat: (f: OddsFormat) => void;
  toggleOddsFormat: () => void;

  setBankroll: (v: number) => void;
  setKelly: (v: number) => void;

  setMaxPerBetMode: (m: LimitMode) => void;
  setMaxPerBetPct: (v: number) => void;
  setMaxPerBetUsd: (v: number) => void;

  setRiskPeriod: (p: RiskPeriod) => void;
  setPeriodMode: (m: LimitMode) => void;
  setPeriodLimitPct: (v: number) => void;
  setPeriodLimitUsd: (v: number) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      oddsFormat: "american",

      bankroll: 1000,
      kelly: 0.25,

      maxPerBetMode: "pct",
      maxPerBetPct: 0.02,
      maxPerBetUsd: 50,

      riskPeriod: "daily",
      periodMode: "pct",
      periodLimitPct: 0.05,
      periodLimitUsd: 200,

      setOddsFormat: (f) => set({ oddsFormat: f }),
      toggleOddsFormat: () => set({ oddsFormat: get().oddsFormat === "american" ? "decimal" : "american" }),

      setBankroll: (v) => set({ bankroll: Math.max(50, Math.round(v)) }),
      setKelly: (v) => set({ kelly: Math.max(0, Math.min(1, v)) }),

      setMaxPerBetMode: (m) => set({ maxPerBetMode: m }),
      setMaxPerBetPct: (v) => set({ maxPerBetPct: Math.max(0, Math.min(1, v)) }),
      setMaxPerBetUsd: (v) => set({ maxPerBetUsd: Math.max(0, Math.round(v)) }),

      setRiskPeriod: (p) => set({ riskPeriod: p }),
      setPeriodMode: (m) => set({ periodMode: m }),
      setPeriodLimitPct: (v) => set({ periodLimitPct: Math.max(0, Math.min(1, v)) }),
      setPeriodLimitUsd: (v) => set({ periodLimitUsd: Math.max(0, Math.round(v)) }),
    }),
    {
      name: "settings-v1",
      storage: createJSONStorage(() => localStorage),
      version: 5,
      partialize: (s) => ({
        oddsFormat: s.oddsFormat,
        bankroll: s.bankroll,
        kelly: s.kelly,

        maxPerBetMode: s.maxPerBetMode,
        maxPerBetPct: s.maxPerBetPct,
        maxPerBetUsd: s.maxPerBetUsd,

        riskPeriod: s.riskPeriod,
        periodMode: s.periodMode,
        periodLimitPct: s.periodLimitPct,
        periodLimitUsd: s.periodLimitUsd,
      }),
    }
  )
);
