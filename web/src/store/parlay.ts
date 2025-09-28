import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { americanToDecimal } from "../services/ev/math";
import { useRisk } from "./risk";
import { useSettings } from "./settings";

export type ParlayLeg = {
  id: string;
  label: string;
  odds: number;
  fairProb?: number;
  /** reserved budget when added (already consumed) */
  riskConsumed?: number;
  /** risk period key when reserved, used to refund safely */
  riskKey?: string;
};

type ParlayState = {
  legs: ParlayLeg[];
  addLeg: (leg: ParlayLeg) => void;
  removeLeg: (id: string) => void;
  clear: () => void;
};

export const useParlay = create<ParlayState>()(
  persist(
    (set, get) => ({
      legs: [],

      addLeg: (leg) => {
        const exists = get().legs.some((l) => l.id === leg.id);
        if (exists) return;
        set({ legs: [...get().legs, leg] });
      },

      removeLeg: (id) => {
        const legs = get().legs.slice();
        const idx = legs.findIndex((l) => l.id === id);
        if (idx === -1) return;
        const [leg] = legs.splice(idx, 1);
        set({ legs });

        // refund any reserved budget for this leg (if period has not rolled)
        const period = useSettings.getState().riskPeriod;
        if (leg?.riskConsumed && leg.riskConsumed > 0) {
          useRisk.getState().refund(leg.riskConsumed, period, leg.riskKey);
        }
      },

      clear: () => {
        const { legs } = get();
        const period = useSettings.getState().riskPeriod;
        const risk = useRisk.getState();
        for (const l of legs) {
          if (l?.riskConsumed && l.riskConsumed > 0) {
            risk.refund(l.riskConsumed, period, l.riskKey);
          }
        }
        set({ legs: [] });
      },
    }),
    {
      name: "parlay-v1",
      storage: createJSONStorage(() => localStorage),
      version: 2,
    }
  )
);

// helpers others may use
export function parlayDecimalOdds(legs: ParlayLeg[]): number {
  if (!legs.length) return 1;
  return legs.reduce((acc, l) => acc * americanToDecimal(l.odds), 1);
}
