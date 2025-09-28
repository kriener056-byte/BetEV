import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OddsFormat = "american" | "decimal";

type SettingsState = {
  oddsFormat: OddsFormat;
  bankroll: number;      // dollars
  kelly: number;         // 1 (full), 0.5, 0.25, etc.

  setOddsFormat: (f: OddsFormat) => void;
  toggleOddsFormat: () => void;
  setBankroll: (v: number) => void;
  setKelly: (v: number) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      oddsFormat: "american",
      bankroll: 1000,
      kelly: 0.25, // default Quarter-Kelly

      setOddsFormat: (f) => set({ oddsFormat: f }),
      toggleOddsFormat: () =>
        set({ oddsFormat: get().oddsFormat === "american" ? "decimal" : "american" }),

      setBankroll: (v) => set({ bankroll: Math.max(50, Math.round(v)) }),
      setKelly: (v) => set({ kelly: Math.max(0, Math.min(1, v)) }),
    }),
    {
      name: "settings-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ oddsFormat: s.oddsFormat, bankroll: s.bankroll, kelly: s.kelly }),
      version: 2,
    }
  )
);
