import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { fetchFeatured, type FeaturedPick } from "../services/ev/featured";
import { useParlay } from "../store/parlay";
import { useSettings } from "../store/settings";
import { americanToDecimal, formatEV, kellyFraction } from "../services/ev/math";

type LeagueFilter = "all" | "nfl" | "ncaaf";
type KindFilter = "all" | "ml" | "spread" | "total" | "prop";
type Position = "all" | "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
type SortKey = "ev" | "kelly" | "odds";
type SortDir = "asc" | "desc";

function fmtOdds(odds: number, format: "american" | "decimal") {
  return format === "american" ? (odds > 0 ? `+${odds}` : `${odds}`) : americanToDecimal(odds).toFixed(2);
}

export default function Home() {
  const addLeg = useParlay((s) => s.addLeg);
  const {
    oddsFormat,
    bankroll, kelly,
    setBankroll, setKelly,

    maxPerBetMode, maxPerBetPct, maxPerBetUsd,
    setMaxPerBetMode, setMaxPerBetPct, setMaxPerBetUsd,

    dailyMaxMode, dailyMaxPct, dailyMaxUsd,
    setDailyMaxMode, setDailyMaxPct, setDailyMaxUsd,
  } = useSettings();

  const { data, isLoading, isError, isFetching, dataUpdatedAt, refetch } = useQuery<FeaturedPick[]>({
    queryKey: ["featured-ev"],
    queryFn: () => fetchFeatured(25),
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const secondsAgo = data ? Math.max(0, Math.floor((now - dataUpdatedAt) / 1000)) : null;

  // Filters
  const [league, setLeague] = useState<LeagueFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [position, setPosition] = useState<Position>("all");
  const [propQuery, setPropQuery] = useState("");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("ev");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const toggleSort = (k: SortKey) => {
    setSortKey((prevKey) => {
      setSortDir((prevDir) => (prevKey === k ? (prevDir === "asc" ? "desc" : "asc") : "desc"));
      return k;
    });
  };

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (league !== "all") rows = rows.filter((r) => r.league === league);
    if (kind !== "all") rows = rows.filter((r) => r.kind === kind);
    if (kind === "prop") {
      const q = propQuery.trim().toLowerCase();
      if (position !== "all") rows = rows.filter((r) => r.kind !== "prop" ? true : (r.propName ?? "").toLowerCase().includes(position.toLowerCase()));
      if (q) rows = rows.filter((r) => (r.propName ?? r.label).toLowerCase().includes(q));
    }
    return rows;
  }, [data, league, kind, position, propQuery]);

  // Resolve caps from mode
  const capDollar = Math.round(
    maxPerBetMode === "pct" ? bankroll * maxPerBetPct : maxPerBetUsd
  );
  const dailyCapDollar = Math.round(
    dailyMaxMode === "pct" ? bankroll * dailyMaxPct : dailyMaxUsd
  );
  const capPctDisplay = bankroll > 0 ? ((capDollar / bankroll) * 100).toFixed(2) : "0.00";
  const dailyPctDisplay = bankroll > 0 ? ((dailyCapDollar / bankroll) * 100).toFixed(2) : "0.00";

  const rows = useMemo(() => {
    const mapped = (filtered ?? []).map((p) => {
      const f = kellyFraction(p.odds, p.fairProb);
      const kAdj = Math.max(0, f * kelly);
      const stake = Math.round(bankroll * kAdj);
      const stakeCapped = Math.min(stake, capDollar);
      return { ...p, kellyFull: f, kellyAdj: kAdj, stake, stakeCapped };
    });
    const cmp = (a: number, b: number) => (sortDir === "asc" ? a - b : b - a);
    if (sortKey === "ev") mapped.sort((a, b) => cmp(a.ev, b.ev));
    else if (sortKey === "kelly") mapped.sort((a, b) => cmp(a.kellyAdj, b.kellyAdj));
    else if (sortKey === "odds") mapped.sort((a, b) => cmp(a.odds, b.odds));
    return mapped;
  }, [filtered, bankroll, kelly, capDollar, sortKey, sortDir]);

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
          <button onClick={() => refetch()} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
            Refresh
          </button>
        </div>
      </div>

      {/* Row 1: Filters + Bankroll + Kelly */}
      <div className="mt-4 grid gap-3 sm:grid-cols-6">
        <div>
          <label className="text-xs text-slate-500">League</label>
          <select value={league} onChange={(e) => setLeague(e.target.value as LeagueFilter)} className="mt-1 w-full rounded-md border px-2 py-1 text-sm">
            <option value="all">All</option>
            <option value="nfl">NFL</option>
            <option value="ncaaf">NCAA Football</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500">Type</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as KindFilter)} className="mt-1 w-full rounded-md border px-2 py-1 text-sm">
            <option value="all">All</option>
            <option value="ml">Moneyline</option>
            <option value="spread">Spread</option>
            <option value="total">Total</option>
            <option value="prop">Props</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500">Position (props)</label>
          <select value={position} onChange={(e) => setPosition(e.target.value as Position)} disabled={kind !== "prop"} className="mt-1 w-full rounded-md border px-2 py-1 text-sm disabled:opacity-50">
            <option value="all">All</option><option value="QB">QB</option><option value="RB">RB</option><option value="WR">WR</option><option value="TE">TE</option><option value="K">K</option><option value="DEF">DEF</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500">Prop search</label>
          <input value={propQuery} onChange={(e) => setPropQuery(e.target.value)} disabled={kind !== "prop"} placeholder="Player / prop text" className="mt-1 w-full rounded-md border px-2 py-1 text-sm disabled:opacity-50"/>
        </div>

        <div>
          <label className="text-xs text-slate-500">Bankroll ($)</label>
          <input type="number" min={50} step={50} value={bankroll} onChange={(e) => setBankroll(Number(e.target.value || 0))} className="mt-1 w-full rounded-md border px-2 py-1 text-sm"/>
        </div>

        <div>
          <label className="text-xs text-slate-500">Kelly</label>
          <select value={String(kelly)} onChange={(e) => setKelly(Number(e.target.value))} className="mt-1 w-full rounded-md border px-2 py-1 text-sm">
            <option value="1">1.0</option><option value="0.5">0.5</option><option value="0.25">0.25</option><option value="0.125">0.125</option><option value="0">0</option>
          </select>
        </div>
      </div>

      {/* Row 2: Limits with % / $ toggles */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {/* Max per bet */}
        <div>
          <label className="text-xs text-slate-500">Max per bet</label>
          <div className="mt-1 flex items-center gap-2">
            <select
              value={maxPerBetMode}
              onChange={(e) => setMaxPerBetMode(e.target.value as "pct" | "usd")}
              className="rounded-md border px-2 py-1 text-sm"
              aria-label="Max per bet units"
            >
              <option value="pct">%</option>
              <option value="usd">$</option>
            </select>

            {maxPerBetMode === "pct" ? (
              <input
                type="number" min={0} max={100} step={0.25}
                value={maxPerBetPct * 100}
                onChange={(e) => setMaxPerBetPct(Number(e.target.value) / 100)}
                className="w-full rounded-md border px-2 py-1 text-sm"
              />
            ) : (
              <input
                type="number" min={0} step={10}
                value={maxPerBetUsd}
                onChange={(e) => setMaxPerBetUsd(Number(e.target.value || 0))}
                className="w-full rounded-md border px-2 py-1 text-sm"
              />
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Cap ≈ ${capDollar} ({capPctDisplay}% of bankroll)
          </div>
        </div>

        {/* Daily risk limit (display) */}
        <div>
          <label className="text-xs text-slate-500">Daily risk limit (display)</label>
          <div className="mt-1 flex items-center gap-2">
            <select
              value={dailyMaxMode}
              onChange={(e) => setDailyMaxMode(e.target.value as "pct" | "usd")}
              className="rounded-md border px-2 py-1 text-sm"
              aria-label="Daily risk units"
            >
              <option value="pct">%</option>
              <option value="usd">$</option>
            </select>

            {dailyMaxMode === "pct" ? (
              <input
                type="number" min={0} max={100} step={0.5}
                value={dailyMaxPct * 100}
                onChange={(e) => setDailyMaxPct(Number(e.target.value) / 100)}
                className="w-full rounded-md border px-2 py-1 text-sm"
              />
            ) : (
              <input
                type="number" min={0} step={10}
                value={dailyMaxUsd}
                onChange={(e) => setDailyMaxUsd(Number(e.target.value || 0))}
                className="w-full rounded-md border px-2 py-1 text-sm"
              />
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Daily limit ≈ ${dailyCapDollar} ({dailyPctDisplay}% of bankroll)
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2">
                <button onClick={() => toggleSort("ev")} className="underline-offset-2 hover:underline">
                  EV (per $100){sortKey === "ev" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </button>
              </th>
              <th className="px-3 py-2">
                <button onClick={() => toggleSort("odds")} className="underline-offset-2 hover:underline">
                  Odds{sortKey === "odds" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </button>
              </th>
              <th className="px-3 py-2">
                <button onClick={() => toggleSort("kelly")} className="underline-offset-2 hover:underline">
                  Kelly %{sortKey === "kelly" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </button>
              </th>
              <th className="px-3 py-2">Stake</th>
              <th className="px-3 py-2">Pick</th>
              <th className="px-3 py-2">Matchup</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Parlay</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-t">
                {Array.from({ length: 8 }).map((__, j) => (
                  <td key={j} className="px-3 py-2"><div className="h-5 w-20 bg-slate-100 animate-pulse rounded" /></td>
                ))}
              </tr>
            ))}

            {!isLoading && isError && (
              <tr className="border-t"><td colSpan={8} className="px-3 py-6 text-red-600">Couldn’t load featured bets.</td></tr>
            )}

            {!isLoading && !isError && rows.length === 0 && (
              <tr className="border-t"><td colSpan={8} className="px-3 py-6 text-slate-500">No bets match your filters.</td></tr>
            )}

            {!isLoading && !isError && rows.map((p) => {
              const kindLabel = p.kind === "ml" ? "ML" : p.kind === "spread" ? "Spread" : p.kind === "total" ? "Total" : "Prop";
              const positive = p.ev >= 0;
              const kPct = p.kellyAdj > 0 ? `${(p.kellyAdj * 100).toFixed(1)}%` : "—";
              const stakeTxt = p.kellyAdj > 0 ? `$${p.stakeCapped}` : "—";
              const capped = p.kellyAdj > 0 && p.stakeCapped < p.stake;
              return (
                <tr key={p.id} className="border-t">
                  <td className={"px-3 py-2 font-semibold " + (positive ? "text-green-700" : "text-red-700")}>{formatEV(p.ev)}</td>
                  <td className="px-3 py-2">{fmtOdds(p.odds, oddsFormat)}</td>
                  <td className="px-3 py-2">{kPct}</td>
                  <td className="px-3 py-2">
                    {stakeTxt} {capped && <span className="ml-1 text-[10px] rounded bg-amber-100 px-1 py-0.5 text-amber-800">capped</span>}
                  </td>
                  <td className="px-3 py-2">{p.label}</td>
                  <td className="px-3 py-2">{p.matchup}</td>
                  <td className="px-3 py-2">{kindLabel}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => addLeg({ id: p.parlayId, label: p.parlayLabel, odds: p.odds })} className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Add</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Kelly % uses a no-vig fair probability. Stake suggestion is capped by your per-bet limit. Daily limit is informational for now.
      </div>
    </section>
  );
}
