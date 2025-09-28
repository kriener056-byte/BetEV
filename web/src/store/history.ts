import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type HistoryEvent =
  | { type: "add"; ts: number; label: string; reserved: number; odds: number; id: string; periodKey?: string }
  | { type: "remove"; ts: number; label: string; refund: number; odds: number; id: string; periodKey?: string }
  | { type: "clear"; ts: number; count: number; refund: number; periodKey?: string }
  | { type: "place"; ts: number; stake: number; legs: number; american: number; labels: string[]; periodKey?: string };

type HistoryState = {
  events: HistoryEvent[];
  log: (e: HistoryEvent) => void;
  clearAll: () => void;
};

export const useHistory = create<HistoryState>()(
  persist(
    (set, get) => ({
      events: [],
      log: (e) => set({ events: [e, ...get().events].slice(0, 500) }),
      clearAll: () => set({ events: [] }),
    }),
    {
      name: "history-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
