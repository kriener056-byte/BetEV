import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { americanToDecimal } from "../services/ev/math";
import { useRisk } from "./risk";
import { useSettings } from "./settings";
import { useHistory } from "./history";

export type ParlayLeg = {
  id: string;
  label: string;
  odds: number;
  fairProb?: number;
  riskConsumed?: number;
  riskKey?: string;
};

type ParlayState = {
  legs: ParlayLeg[];
  addLeg: (leg: ParlayLeg) => void;
  removeLeg: (id: string) => void;
  clear: (refund?: boolean) => void;
  placeParlay: (stake: number, americanOdds: number) => { ok: boolean; reason?: string };
};

export const useParlay = create<ParlayState>()(
  persist(
    (set, get) => ({
      legs: [],

      addLeg: (leg) => {
        const exists = get().legs.some((l) => l.id === leg.id);
        if (exists) return;
        set({ legs: [...get().legs, leg] });
        // history
        useHistory.getState().log({
          type: "add",
          ts: Date.now(),
          id: leg.id,
          label: leg.label,
          reserved: leg.riskConsumed ?? 0,
          odds: leg.odds,
          periodKey: leg.riskKey,
        });
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
        // history
        useHistory.getState().log({
          type: "remove",
          ts: Date.now(),
          id,
          label: leg?.label ?? id,
          refund: leg?.riskConsumed ?? 0,
          odds: leg?.odds ?? 0,
          periodKey: leg?.riskKey,
        });
      },

      clear: (refund = true) => {
        const { legs } = get();
        const period = useSettings.getState().riskPeriod;
        const risk = useRisk.getState();
        let refunded = 0;
        if (refund) {
          for (const l of legs) {
            if (l?.riskConsumed && l.riskConsumed > 0) {
              refunded += l.riskConsumed;
              risk.refund(l.riskConsumed, period, l.riskKey);
            }
          }
        }
        set({ legs: [] });
        useHistory.getState().log({
          type: "clear",
          ts: Date.now(),
          count: legs.length,
          refund: refund ? refunded : 0,
          periodKey: undefined,
        });
      },

      placeParlay: (stake: number, americanOdds: number) => {
        const legs = get().legs;
        if (!legs.length) return { ok: false, reason: "No legs" };
        if (stake <= 0) return { ok: false, reason: "Stake must be > 0" };

        const settings = useSettings.getState();
        const period = settings.riskPeriod;
        const risk = useRisk.getState();

        // release all per-leg reservations first
        let reserved = 0;
        for (const l of legs) {
          if (l.riskConsumed && l.riskConsumed > 0) {
            reserved += l.riskConsumed;
            risk.refund(l.riskConsumed, period, l.riskKey);
          }
        }

        // now realize the actual parlay stake (counts against budget)
        risk.realize(stake, period);

        // clear parlay WITHOUT refund
        set({ legs: [] });

        // history: placed
        useHistory.getState().log({
          type: "place",
          ts: Date.now(),
          stake,
          legs: legs.length,
          american: americanOdds,
          labels: legs.map((l) => l.label),
          periodKey: undefined,
        });

        return { ok: true };
      },
    }),
    {
      name: "parlay-v1",
      storage: createJSONStorage(() => localStorage),
      version: 3,
    }
  )
);

export function parlayDecimalOdds(legs: ParlayLeg[]): number {
  if (!legs.length) return 1;
  return legs.reduce((acc, l) => acc * americanToDecimal(l.odds), 1);
}
