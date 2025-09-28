import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { fetchFeatured, type FeaturedPick } from "../services/ev/featured";
import { useParlay } from "../store/parlay";
import { useSettings } from "../store/settings";
import { americanToDecimal, formatEV } from "../services/ev/math";

type LeagueFilter = "all" | "nfl" | "ncaaf";
type KindFilter = "all" | "ml" | "spread" | "total" | "prop";
type Position = "all" | "QB" | "RB" | "WR" | "TE" | "K" | "DEF";

function fmtOdds(odds: number, format: "american" | "decimal") {
  return format === "american" ? (odds > 0 ? `+${odds}` : `${odds}`) : americanToDecimal(odds).toFixed(2);
}

export default function Home() {
  const addLeg = useParlay((s) => s.addLeg);
  const { oddsFormat } = useSettings();

  const { data, isLoading, isError, isFetching, dataUpdatedAt, refetch } = useQuery<FeaturedPick[]>({
    queryKey: ["featured-ev"],
    queryFn: () => fetchFeatured(25),
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  // seconds since last update
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secondsAgo = data ? Math.max(0, Math.floor((now - dataUpdatedAt) / 1000)) : null;

  // --- Filters ---
  const [league, setLeague] = useState<LeagueFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [position, setPosition] = useState<Position>("all"); // only for props
  const [propQuery, setPropQuery] = useState("");

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (league !== "all") rows = rows.filter((r) => r.league === league);
    if (kind !== "all") rows = rows.filter((r) => r.kind === kind);
    if (kind === "prop") {
      const q = propQuery.trim().toLowerCase();
      if (position !== "all") {
        rows = rows.filter((r) => r.kind !== "prop" ? true : (r.propName ?? "").toLowerCase().includes(position.toLowerCase()));
      }
      if (q) {
        rows = rows.filter((r) => (r.propName ?? r.label).toLowerCase().includes(q));
      }
    }
    return rows;
  }, [data, league, kind, position, propQuery]);

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Featured EV Bets</h2>
          <p className="mt-1 text-slate-600">Top 25 by EV (no-vig baseline, $100 stake).</p>
        </div>
        <div className="flex items-center gap-2">
          {secondsAgo !== null && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">
              {isFetching ? "Refreshing…" : `Updated ${secondsAgo}s ago`}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div>
          <label className="text-xs text-slate-500">League</label>
          <select
            value={league}
            onChange={(e) => setLeague(e.target.value as LeagueFilter)}
            className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="nfl">NFL</option>
            <option value="ncaaf">NCAA Football</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500">Type</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as KindFilter)}
            className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="ml">Moneyline</option>
            <option value="spread">Spread</option>
            <option value="total">Total</option>
            <option value="prop">Props</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500">Position (props)</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
            disabled={kind !== "prop"}
            className="mt-1 w-full rounded-md border px-2 py-1 text-sm disabled:opacity-50"
          >
            <option value="all">All</option>
            <option value="QB">QB</option>
            <option value="RB">RB</option>
            <option value="WR">WR</option>
            <option value="TE">TE</option>
            <option value="K">K</option>
            <option value="DEF">DEF</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500">Prop search</label>
          <input
            value={propQuery}
            onChange={(e) => setPropQuery(e.target.value)}
            disabled={kind !== "prop"}
            placeholder="Player / prop text"
            className="mt-1 w-full rounded-md border px-2 py-1 text-sm disabled:opacity-50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2">EV (per $100)</th>
              <th className="px-3 py-2">Odds</th>
              <th className="px-3 py-2">Pick</th>
              <th className="px-3 py-2">Matchup</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Parlay</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2"><div className="h-5 w-20 bg-slate-100 animate-pulse rounded" /></td>
                    <td className="px-3 py-2"><div className="h-5 w-16 bg-slate-100 animate-pulse rounded" /></td>
                    <td className="px-3 py-2"><div className="h-5 w-40 bg-slate-100 animate-pulse rounded" /></td>
                    <td className="px-3 py-2"><div className="h-5 w-48 bg-slate-100 animate-pulse rounded" /></td>
                    <td className="px-3 py-2"><div className="h-5 w-16 bg-slate-100 animate-pulse rounded" /></td>
                    <td className="px-3 py-2"><div className="h-8 w-20 bg-slate-100 animate-pulse rounded" /></td>
                  </tr>
                ))}
              </>
            )}

            {!isLoading && isError && (
              <tr className="border-t">
                <td colSpan={6} className="px-3 py-6 text-red-600">Couldn’t load featured bets.</td>
              </tr>
            )}

            {!isLoading && !isError && filtered.length === 0 && (
              <tr className="border-t">
                <td colSpan={6} className="px-3 py-6 text-slate-500">No bets match your filters.</td>
              </tr>
            )}

            {!isLoading && !isError && filtered.map((p) => {
              const positive = p.ev >= 0;
              const kindLabel =
                p.kind === "ml" ? "ML" :
                p.kind === "spread" ? "Spread" :
                p.kind === "total" ? "Total" : "Prop";

              return (
                <tr key={p.id} className="border-t">
                  <td className={"px-3 py-2 font-semibold " + (positive ? "text-green-700" : "text-red-700")}>
                    {formatEV(p.ev)}
                  </td>
                  <td className="px-3 py-2">{fmtOdds(p.odds, oddsFormat)}</td>
                  <td className="px-3 py-2">{p.label}</td>
                  <td className="px-3 py-2">{p.matchup}</td>
                  <td className="px-3 py-2">{kindLabel}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => addLeg({ id: p.parlayId, label: p.parlayLabel, odds: p.odds })}
                      className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        EV uses a simple no-vig baseline from each market’s two sides. For real edges, plug in your model’s fair probabilities.
      </div>
    </section>
  );
}
