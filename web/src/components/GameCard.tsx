import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchGame, type GameDetails } from "../services/odds/draftkings";
import { useParlay } from "../store/parlay";
import { useSettings } from "../store/settings";
import { americanToImpliedProb, evSingle, formatEV, americanToDecimal } from "../services/ev/math";

type Props = {
  id: string;
  home: string;
  away: string;
  startsAt: string; // ISO
};

function signed(n: number) {
  return `${n >= 0 ? "+" : ""}${n}`;
}
function fmtOdds(odds: number, format: "american" | "decimal") {
  return format === "american" ? (odds > 0 ? `+${odds}` : `${odds}`) : americanToDecimal(odds).toFixed(2);
}

export default function GameCard({ id, home, away, startsAt }: Props) {
  const addLeg = useParlay((s) => s.addLeg);
  const { oddsFormat } = useSettings();

  // Pull the lines for this game card, auto-refresh every 15s
  const { data, isLoading, isError, isFetching, dataUpdatedAt } = useQuery<GameDetails>({
    queryKey: ["card", id],
    queryFn: () => fetchGame(id),
    refetchInterval: 15000,
    refetchOnWindowFocus: false,
  });

  // Tick every second so "Updated Xs ago" counts up live
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secondsAgo =
    data ? Math.max(0, Math.floor((now - dataUpdatedAt) / 1000)) : null;

  const dt = new Date(startsAt);
  const when = dt.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const ml = data?.markets.find((m) => m.type === "moneyline") as
    | { type: "moneyline"; homeOdds: number; awayOdds: number }
    | undefined;

  const sp = data?.markets.find((m) => m.type === "spread") as
    | { type: "spread"; home: number; away: number; homeOdds: number; awayOdds: number }
    | undefined;

  const tot = data?.markets.find((m) => m.type === "total") as
    | { type: "total"; line: number; overOdds: number; underOdds: number }
    | undefined;

  // --- Quick EV pill (no-vig baseline, $100 stake) ---
  let evPill: string | null = null;
  let evClass = "bg-slate-100 text-slate-800";
  if (ml) {
    const impH = americanToImpliedProb(ml.homeOdds);
    const impA = americanToImpliedProb(ml.awayOdds);
    const sum = impH + impA;
    const nvH = impH / sum;
    const nvA = impA / sum;
    const evHome = evSingle(ml.homeOdds, nvH, 100);
    const evAway = evSingle(ml.awayOdds, nvA, 100);
    const best = Math.max(evHome, evAway);
    evPill = `EV ${formatEV(best)}`;
    if (best > 0) evClass = "bg-green-100 text-green-800";
    else if (best < 0) evClass = "bg-red-100 text-red-800";
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm text-slate-500">{when}</div>
          <div className="mt-1 text-lg font-semibold">
            {away} @ {home}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="h-6 w-16 rounded bg-slate-100 animate-pulse" />
          ) : (
            evPill && (
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${evClass}`}>
                {evPill}
              </span>
            )
          )}
          {secondsAgo !== null && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">
              {isFetching ? "Refreshing…" : `Updated ${secondsAgo}s ago`}
            </span>
          )}
          <Link
            to={`/game/${id}`}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            View
          </Link>
        </div>
      </div>

      {/* Lines */}
      <div className="mt-3 space-y-2">
        {/* Moneyline */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs font-semibold text-slate-500">ML</div>
          {isLoading && <div className="h-8 flex-1 rounded bg-slate-100 animate-pulse" />}
          {isError && <div className="text-xs text-red-600">lines unavailable</div>}
          {ml && !isLoading && !isError && (
            <>
              <button
                onClick={() =>
                  addLeg({
                    id: `${id}:ML:AWAY`,
                    label: `${away} ML ${fmtOdds(ml.awayOdds, oddsFormat)}`,
                    odds: ml.awayOdds,
                  })
                }
                className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                {away} {fmtOdds(ml.awayOdds, oddsFormat)}
              </button>
              <button
                onClick={() =>
                  addLeg({
                    id: `${id}:ML:HOME`,
                    label: `${home} ML ${fmtOdds(ml.homeOdds, oddsFormat)}`,
                    odds: ml.homeOdds,
                  })
                }
                className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                {home} {fmtOdds(ml.homeOdds, oddsFormat)}
              </button>
            </>
          )}
        </div>

        {/* Spread */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs font-semibold text-slate-500">Spread</div>
          {isLoading && <div className="h-8 flex-1 rounded bg-slate-100 animate-pulse" />}
          {!isLoading && sp && (
            <>
              <button
                onClick={() =>
                  addLeg({
                    id: `${id}:SPREAD:AWAY:${sp.away}`,
                    label: `${away} ${signed(sp.away)} (${fmtOdds(sp.awayOdds, oddsFormat)})`,
                    odds: sp.awayOdds,
                  })
                }
                className="rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
              >
                {away} {signed(sp.away)} ({fmtOdds(sp.awayOdds, oddsFormat)})
              </button>
              <button
                onClick={() =>
                  addLeg({
                    id: `${id}:SPREAD:HOME:${sp.home}`,
                    label: `${home} ${signed(sp.home)} (${fmtOdds(sp.homeOdds, oddsFormat)})`,
                    odds: sp.homeOdds,
                  })
                }
                className="rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
              >
                {home} {signed(sp.home)} ({fmtOdds(sp.homeOdds, oddsFormat)})
              </button>
            </>
          )}
          {!isLoading && !sp && <div className="text-xs text-slate-400">—</div>}
        </div>

        {/* Total */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs font-semibold text-slate-500">Total</div>
          {isLoading && <div className="h-8 flex-1 rounded bg-slate-100 animate-pulse" />}
          {!isLoading && tot && (
            <>
              <button
                onClick={() =>
                  addLeg({
                    id: `${id}:TOTAL:OVER:${tot.line}`,
                    label: `Over ${tot.line} (${fmtOdds(tot.overOdds, oddsFormat)})`,
                    odds: tot.overOdds,
                  })
                }
                className="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
              >
                Over {tot.line} ({fmtOdds(tot.overOdds, oddsFormat)})
              </button>
              <button
                onClick={() =>
                  addLeg({
                    id: `${id}:TOTAL:UNDER:${tot.line}`,
                    label: `Under ${tot.line} (${fmtOdds(tot.underOdds, oddsFormat)})`,
                    odds: tot.underOdds,
                  })
                }
                className="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
              >
                Under {tot.line} ({fmtOdds(tot.underOdds, oddsFormat)})
              </button>
            </>
          )}
          {!isLoading && !tot && <div className="text-xs text-slate-400">—</div>}
        </div>
      </div>
    </div>
  );
}
