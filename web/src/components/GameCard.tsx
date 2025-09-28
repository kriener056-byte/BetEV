import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchGame, type GameDetails } from "../services/odds/draftkings";
import { useParlay } from "../store/parlay";

type Props = {
  id: string;
  home: string;
  away: string;
  startsAt: string; // ISO
};

function signed(n: number) {
  return `${n >= 0 ? "+" : ""}${n}`;
}

export default function GameCard({ id, home, away, startsAt }: Props) {
  const addLeg = useParlay((s) => s.addLeg);

  // Pull the lines for this game card
  const { data, isLoading, isError } = useQuery<GameDetails>({
    queryKey: ["card", id],
    queryFn: () => fetchGame(id),
  });

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

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm text-slate-500">{when}</div>
          <div className="mt-1 text-lg font-semibold">
            {away} @ {home}
          </div>
        </div>
        <Link
          to={`/game/${id}`}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
        >
          View
        </Link>
      </div>

      {/* Lines */}
      <div className="mt-3 space-y-2">
        {/* Moneyline */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs font-semibold text-slate-500">ML</div>
          {isLoading && <div className="h-8 flex-1 rounded bg-slate-100 animate-pulse" />}
          {isError && <div className="text-xs text-red-600">lines unavailable</div>}
          {ml && (
            <>
              <button
                onClick={() =>
                  addLeg({
                    id: `${id}:ML:AWAY`,
                    label: `${away} ML ${ml.awayOdds}`,
                    odds: ml.awayOdds,
                  })
                }
                className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                {away} {ml.awayOdds}
              </button>
              <button
                onClick={() =>
                  addLeg({
                    id: `${id}:ML:HOME`,
                    label: `${home} ML ${ml.homeOdds}`,
                    odds: ml.homeOdds,
                  })
                }
                className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                {home} {ml.homeOdds}
              </button>
            </>
          )}
        </div>

        {/* Spread */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs font-semibold text-slate-500">Spread</div>
          {sp ? (
            <>
              <button
                onClick={() =>
                  addLeg({
                    id: `${id}:SPREAD:AWAY:${sp.away}`,
                    label: `${away} ${signed(sp.away)} (${sp.awayOdds})`,
                    odds: sp.awayOdds,
                  })
                }
                className="rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
              >
                {away} {signed(sp.away)} ({sp.awayOdds})
              </button>
              <button
                onClick={() =>
                  addLeg({
                    id: `${id}:SPREAD:HOME:${sp.home}`,
                    label: `${home} ${signed(sp.home)} (${sp.homeOdds})`,
                    odds: sp.homeOdds,
                  })
                }
                className="rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
              >
                {home} {signed(sp.home)} ({sp.homeOdds})
              </button>
            </>
          ) : (
            <div className="text-xs text-slate-400">—</div>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs font-semibold text-slate-500">Total</div>
          {tot ? (
            <>
              <button
                onClick={() =>
                  addLeg({
                    id: `${id}:TOTAL:OVER:${tot.line}`,
                    label: `Over ${tot.line} (${tot.overOdds})`,
                    odds: tot.overOdds,
                  })
                }
                className="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
              >
                Over {tot.line} ({tot.overOdds})
              </button>
              <button
                onClick={() =>
                  addLeg({
                    id: `${id}:TOTAL:UNDER:${tot.line}`,
                    label: `Under ${tot.line} (${tot.underOdds})`,
                    odds: tot.underOdds,
                  })
                }
                className="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
              >
                Under {tot.line} ({tot.underOdds})
              </button>
            </>
          ) : (
            <div className="text-xs text-slate-400">—</div>
          )}
        </div>
      </div>
    </div>
  );
}
