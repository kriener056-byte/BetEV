import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { fetchFeatured, type FeaturedPick } from "../services/ev/featured";
import { useParlay } from "../store/parlay";
import { useSettings } from "../store/settings";
import { useRisk } from "../store/risk";
import { useHistory } from "../store/history";
import { americanToDecimal, decimalToAmerican, formatEV, kellyFraction } from "../services/ev/math";

type LeagueFilter = "all" | "nfl" | "ncaaf";
type KindFilter = "all" | "ml" | "spread" | "total" | "prop";
type Position = "all" | "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
type SortKey = "ev" | "kelly" | "odds";
type SortDir = "asc" | "desc";

function fmtOdds(odds: number, format: "american" | "decimal") {
  return format === "american" ? (odds > 0 ? `+${odds}` : `${odds}`) : americanToDecimal(odds).toFixed(2);
}
function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.setAttribute("download", filename);
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Home() {
  const legs = useParlay((s) => s.legs);
  const addLeg = useParlay((s) => s.addLeg);
  const clearParlay = useParlay((s) => s.clear);
  const placeParlay = useParlay((s) => s.placeParlay);

  const events = useHistory((s) => s.events);

  const {
    oddsFormat,
    bankroll, kelly,
    setBankroll, setKelly,

    maxPerBetMode, maxPerBetPct, maxPerBetUsd,
    setMaxPerBetMode, setMaxPerBetPct, setMaxPerBetUsd,

    riskPeriod, setRiskPeriod,
    periodMode, periodLimitPct, periodLimitUsd,
    setPeriodMode, setPeriodLimitPct, setPeriodLimitUsd,
  } = useSettings();

  const getConsumed = useRisk((s) => s.getConsumed);
  const getRealized = useRisk((s) => s.getRealized);
  const tryConsume = useRisk((s) => s.tryConsume);
  const resetRisk = useRisk((s) => s.reset);

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

  // Caps & period
  const perBetCapDollar = Math.round(maxPerBetMode === "pct" ? bankroll * maxPerBetPct : maxPerBetUsd);
  const periodCapDollar  = Math.round(periodMode === "pct" ? bankroll * periodLimitPct : periodLimitUsd);
  const periodConsumed = getConsumed(riskPeriod);
  const periodRealized = getRealized(riskPeriod);
  const periodRemaining = Math.max(0, Math.round(periodCapDollar - periodConsumed));
  const capPctDisplay = bankroll > 0 ? ((perBetCapDollar / bankroll) * 100).toFixed(2) : "0.00";
  const periodPctDisplay = bankroll > 0 ? ((periodCapDollar / bankroll) * 100).toFixed(2) : "0.00";
  const periodUsedPct = periodCapDollar > 0 ? Math.min(100, Math.round((periodConsumed / periodCapDollar) * 100)) : 0;
  const lowBudget = periodCapDollar > 0 && (periodCapDollar - periodConsumed) / periodCapDollar < 0.1;

  // Build rows with Kelly + stake + per-bet cap
  const rows = useMemo(() => {
    const mapped = (filtered ?? []).map((p) => {
      const f = kellyFraction(p.odds, p.fairProb);
      const kAdj = Math.max(0, f * kelly);
      const stake = Math.round(bankroll * kAdj);
      const stakeCapped = Math.min(stake, perBetCapDollar);
      return { ...p, kellyFull: f, kellyAdj: kAdj, stake, stakeCapped };
    });
    const cmp = (a: number, b: number) => (sortDir === "asc" ? a - b : b - a);
    if (sortKey === "ev") mapped.sort((a, b) => cmp(a.ev, b.ev));
    else if (sortKey === "kelly") mapped.sort((a, b) => cmp(a.kellyAdj, b.kellyAdj));
    else if (sortKey === "odds") mapped.sort((a, b) => cmp(a.odds, b.odds));
    return mapped;
  }, [filtered, bankroll, kelly, perBetCapDollar, sortKey, sortDir]);

  // Parlay summary (combined odds + Kelly suggestion)
  const parlay = useMemo(() => {
    const dec = legs.reduce((acc, l) => acc * americanToDecimal(l.odds), 1);
    const american = dec > 1 ? decimalToAmerican(dec) : 0;
    const allFair = legs.length > 0 && legs.every((l) => typeof l.fairProb === "number");
    const fairProb = allFair ? legs.reduce((acc, l) => acc * (l.fairProb as number), 1) : undefined;
    const f = fairProb != null ? kellyFraction(american, fairProb) : 0;
    const kAdj = Math.max(0, f * kelly);
    const stake = Math.round(bankroll * kAdj);
    const stakeCapped = Math.min(stake, perBetCapDollar, periodRemaining);
    return { dec, american, fairProb, f, kAdj, stake, stakeCapped, count: legs.length };
  }, [legs, bankroll, kelly, perBetCapDollar, periodRemaining]);

  // CSV exports
  const exportFeaturedCsv = () => {
    const header = ["ev_$", "odds", "kelly_pct", "stake_$", "label", "matchup", "type"].join(",");
    const lines = rows.map((p) =>
      [
        Math.round(p.ev),
        p.odds,
        (p.kellyAdj * 100).toFixed(2),
        p.stakeCapped,
        `"${(p.label ?? "").replace(/"/g, '""')}"`,
        `"${(p.matchup ?? "").replace(/"/g, '""')}"`,
        p.kind
      ].join(",")
    );
    download(`featured_${Date.now()}.csv`, [header, ...lines].join("\n"));
  };

  const exportHistoryCsv = () => {
    const header = ["ts", "type", "label", "amount", "odds", "legs"].join(",");
    const lines = events.map((e) => {
      if (e.type === "add") return [e.ts, e.type, `"${e.label.replace(/"/g,'""')}"`, e.reserved, e.odds, ""].join(",");
      if (e.type === "remove") return [e.ts, e.type, `"${e.label.replace(/"/g,'""')}"`, e.refund, e.odds, ""].join(",");
      if (e.type === "clear") return [e.ts, e.type, `""`, e.refund, "", e.count].join(",");
      return [e.ts, e.type, `"${e.labels.join(" / ").replace(/"/g,'""')}"`, e.stake, e.american, e.legs].join(",");
    });
    download(`history_${Date.now()}.csv`, [header, ...lines].join("\n"));
  };

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Featured EV Bets</h2>
          <p className="mt-1 text-slate-600">Top 25 by EV (no-vig baseline, $100 stake).</p>
        </div>
        <div className="flex items-center gap-2">
          {secondsAgo !== null && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700" title="Auto-refresh every 60s">
              {isFetching ? "Refreshing…" : `Updated ${secondsAgo}s ago`}
            </span>
          )}
          <button onClick={() => refetch()} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
            Refresh
          </button>
          <button onClick={exportFeaturedCsv} className="rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50">Export CSV</button>
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

      {/* Row 2: Per-bet cap + Period budget (enforced) with progress */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {/* Max per bet */}
        <div>
          <label className="text-xs text-slate-500">Max per bet</label>
          <div className="mt-1 flex items-center gap-2">
            <select value={maxPerBetMode} onChange={(e) => setMaxPerBetMode(e.target.value as "pct" | "usd")} className="rounded-md border px-2 py-1 text-sm" aria-label="Max per bet units">
              <option value="pct">%</option><option value="usd">$</option>
            </select>
            {maxPerBetMode === "pct" ? (
              <input type="number" min={0} max={100} step={0.25} value={maxPerBetPct * 100} onChange={(e) => setMaxPerBetPct(Number(e.target.value) / 100)} className="w-full rounded-md border px-2 py-1 text-sm"/>
            ) : (
              <input type="number" min={0} step={10} value={maxPerBetUsd} onChange={(e) => setMaxPerBetUsd(Number(e.target.value || 0))} className="w-full rounded-md border px-2 py-1 text-sm"/>
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-500" title="We cap suggested stakes by this amount">
            Per-bet cap ≈ ${perBetCapDollar} ({capPctDisplay}% of bankroll)
          </div>
        </div>

        {/* Period budget */}
        <div>
          <label className="text-xs text-slate-500">Risk budget (enforced)</label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            <select value={riskPeriod} onChange={(e) => setRiskPeriod(e.target.value as "daily" | "weekly" | "monthly")} className="rounded-md border px-2 py-1 text-sm" aria-label="Risk period">
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
            <select value={periodMode} onChange={(e) => setPeriodMode(e.target.value as "pct" | "usd")} className="rounded-md border px-2 py-1 text-sm" aria-label="Budget units">
              <option value="pct">%</option><option value="usd">$</option>
            </select>
            {periodMode === "pct" ? (
              <input type="number" min={0} max={100} step={0.5} value={periodLimitPct * 100} onChange={(e) => setPeriodLimitPct(Number(e.target.value) / 100)} className="rounded-md border px-2 py-1 text-sm"/>
            ) : (
              <input type="number" min={0} step={10} value={periodLimitUsd} onChange={(e) => setPeriodLimitUsd(Number(e.target.value || 0))} className="rounded-md border px-2 py-1 text-sm"/>
            )}
          </div>

          {/* Progress */}
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded bg-slate-100" title={`${periodUsedPct}% used`}>
              <div className="h-full bg-blue-600" style={{ width: `${periodUsedPct}%` }} />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
              <span>Limit ≈ ${periodCapDollar} ({periodPctDisplay}% of bankroll)</span>
              <button onClick={() => resetRisk(riskPeriod)} className="rounded-md border px-2 py-0.5 text-[11px] hover:bg-slate-50">Reset period</button>
            </div>
            <div className="mt-1 text-[11px] text-slate-600">Used ${periodConsumed} · Placed ${periodRealized} · Remaining ${periodRemaining}</div>
            {lowBudget && (
              <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-900 border border-amber-200" title="You’re close to your budget">
                Heads up: <strong>{riskPeriod}</strong> budget is under 10% remaining.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Parlay summary (Kelly for combined odds) */}
      <div className="mt-4 rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Parlay</div>
            <div className="text-lg font-semibold">{legs.length} leg{legs.length === 1 ? "" : "s"}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => clearParlay(true)} className="rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50" title="Refunds reserved budget for this period">
              Clear
            </button>
            <button
              onClick={() => {
                if (!legs.length) { alert("Add legs first"); return; }
                if (parlay.stakeCapped <= 0) { alert("No budget or Kelly suggests $0"); return; }
                const res = placeParlay(parlay.stakeCapped, parlay.american);
                if (!res.ok) alert(res.reason || "Could not place parlay");
              }}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              title="Converts reservations to a single placed stake; does NOT refund"
            >
              Place (${parlay.stakeCapped})
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">Combined odds</div>
            <div className="mt-1 text-sm">
              {legs.length ? `${parlay.american > 0 ? `+${parlay.american}` : parlay.american} (dec ${parlay.dec.toFixed(2)})` : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Fair probability</div>
            <div className="mt-1 text-sm">{parlay.fairProb != null ? `${(parlay.fairProb * 100).toFixed(2)}%` : "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500" title="Full Kelly × your Kelly multiplier; limited by per-bet cap and remaining budget">Kelly suggestion</div>
            <div className="mt-1 text-sm">
              {parlay.kAdj > 0 ? `${(parlay.kAdj * 100).toFixed(1)}% · $${parlay.stakeCapped}` : "—"}
            </div>
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

              const handleAdd = () => {
                const res = tryConsume(p.stakeCapped, riskPeriod, periodCapDollar);
                if (!res.ok) {
                  alert(`Risk budget reached for ${riskPeriod}. Remaining: $${res.remaining}. Adjust the limit or reset the period.`);
                  return;
                }
                addLeg({
                  id: p.parlayId,
                  label: p.parlayLabel,
                  odds: p.odds,
                  fairProb: p.fairProb,
                  riskConsumed: p.stakeCapped,
                  riskKey: res.key,
                });
              };

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
                    <button onClick={handleAdd} className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Add</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* History (recent) */}
      <div className="mt-4 rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Activity</div>
            <div className="text-lg font-semibold">Recent (last 20)</div>
          </div>
          <button onClick={exportHistoryCsv} className="rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50">Export History CSV</button>
        </div>
        <ul className="mt-2 space-y-1 text-sm">
          {events.slice(0, 20).map((e, i) => (
            <li key={i} className="text-slate-700">
              {new Date(e.ts).toLocaleString()} —{" "}
              {e.type === "add" && <>Added <span className="font-medium">{e.label}</span> (reserved ${e.reserved})</>}
              {e.type === "remove" && <>Removed <span className="font-medium">{e.label}</span> (refund ${e.refund})</>}
              {e.type === "clear" && <>Cleared parlay (legs {e.count}, refund ${e.refund})</>}
              {e.type === "place" && <>Placed parlay ${e.stake} @ {e.american > 0 ? `+${e.american}` : e.american} ({e.legs} legs)</>}
            </li>
          ))}
          {events.length === 0 && <li className="text-slate-500">No activity yet.</li>}
        </ul>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Adds are blocked once your {riskPeriod} budget is exhausted. Removing legs or clearing the parlay releases reserved budget for the current period. “Place” converts reservations into a single realized stake and keeps the budget enforced.
      </div>
    </section>
  );
}
