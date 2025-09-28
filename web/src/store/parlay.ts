import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// --- Odds helpers ---
function americanToDecimal(odds: number): number {
  if (odds === 0) throw new Error("odds cannot be 0");
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}
function decimalToAmerican(decimal: number): number {
  const m = decimal - 1; // profit multiple over stake
  if (m <= 0) return 0;
  return m >= 1 ? Math.round(m * 100) : Math.round(-100 / m);
}

export type ParlayLeg = {
  id: string;    // unique per selection, e.g. "nfl_001:ML:HOME"
  label: string; // UI label, e.g. "Chiefs ML -150"
  odds: number;  // American odds (-150, +130)
};

type ParlayState = {
  legs: ParlayLeg[];
  stake: number;
  addLeg: (leg: ParlayLeg) => void;
  removeLeg: (id: string) => void;
  clear: () => void;
  setStake: (v: number) => void;
};

// Derived helpers (exported for UI)
export function combinedDecimal(legs: ParlayLeg[]): number {
  return legs.reduce((acc, l) => acc * americanToDecimal(l.odds), 1);
}
export function combinedAmerican(legs: ParlayLeg[]): number {
  return decimalToAmerican(combinedDecimal(legs));
}
export function parlayProfit(legs: ParlayLeg[], stake: number): number {
  const dec = combinedDecimal(legs);
  return stake * (dec - 1); // profit only
}
export function parlayReturn(legs: ParlayLeg[], stake: number): number {
  const dec = combinedDecimal(legs);
  return stake * dec; // stake + profit
}

export const useParlay = create<ParlayState>()(
  persist(
    (set, get) => ({
      legs: [],
      stake: 100,
      addLeg: (leg) => {
        const exists = get().legs.some((l) => l.id === leg.id);
        if (exists) return; // prevent duplicates
        set({ legs: [...get().legs, leg] });
      },
      removeLeg: (id) => set({ legs: get().legs.filter((l) => l.id !== id) }),
      clear: () => set({ legs: [] }),
      setStake: (v) => set({ stake: Math.max(1, Math.round(v)) }),
    }),
    {
      name: "parlay-v1",
      storage: createJSONStorage(() => localStorage),
      // Only persist what's needed
      partialize: (s) => ({ legs: s.legs, stake: s.stake }),
      version: 1,
      migrate: (persisted, _version) => persisted as any,
    }
  )
);
