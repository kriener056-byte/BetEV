import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OddsFormat = "american" | "decimal";

type SettingsState = {
  oddsFormat: OddsFormat;
  setOddsFormat: (f: OddsFormat) => void;
  toggleOddsFormat: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      oddsFormat: "american",
      setOddsFormat: (f) => set({ oddsFormat: f }),
      toggleOddsFormat: () =>
        set({ oddsFormat: get().oddsFormat === "american" ? "decimal" : "american" }),
    }),
    {
      name: "settings-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ oddsFormat: s.oddsFormat }),
      version: 1,
    }
  )
);
