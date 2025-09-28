import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchGame, type GameDetails } from "../services/odds/draftkings";
import { useParlay } from "../store/parlay";
import { useSettings } from "../store/settings";
import { useRisk } from "../store/risk";
import { americanToImpliedProb, evSingle, formatEV, americanToDecimal, kellyFraction } from "../services/ev/math";

type Props = { id: string; home: string; away: string; startsAt: string; };

function signed(n: number) { return `${n >= 0 ? "+" : ""}${n}`; }
function fmtOdds(odds: number, format: "american" | "decimal") {
  return format === "american" ? (odds > 0 ? `+${odds}` : `${odds}`) : americanToDecimal(odds).toFixed(2);
}

export default function GameCard({ id, home, away, startsAt }: Props) {
  const addLeg = useParlay((s) => s.addLeg);
  const { oddsFormat, bankroll, kelly, maxPerBetMode, maxPerBetPct, maxPerBetUsd, riskPeriod, periodMode, periodLimitPct, periodLimitUsd } = useSettings();
  const tryConsume = useRisk((s) => s.tryConsume);

  const { data, isLoading, isError, isFetching, dataUpdatedAt } = useQuery<GameDetails>({
    queryKey: ["card", id],
    queryFn: () => fetchGame(id),
    refetchInterval: 15000,
    refetchOnWindowFocus: false,
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const secondsAgo = data ? Math.max(0, Math.floor((now - dataUpdatedAt) / 1000)) : null;

  const dt = new Date(startsAt);
  const when = dt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const ml = data?.markets.find((m) => m.type === "moneyline") as
    | { type: "moneyline"; homeOdds: number; awayOdds: number } | undefined;
  const sp = data?.markets.find((m) => m.type === "spread") as
    | { type: "spread"; home: number; away: number; homeOdds: number; awayOdds: number } | undefined;
  const tot = data?.markets.find((m) => m.type === "total") as
    | { type: "total"; line: number; overOdds: number; underOdds: number } | undefined;

  // EV pill from ML
  let evPill: string | null = null;
  let evClass = "bg-slate-100 text-slate-800";
  if (ml) {
    const impH = americanToImpliedProb(ml.homeOdds), impA = americanToImpliedProb(ml.awayOdds);
    const sum = impH + impA; const nvH = impH / sum, nvA = impA / sum;
    const best = Math.max(evSingle(ml.homeOdds, nvH, 100), evSingle(ml.awayOdds, nvA, 100));
    evPill = `EV ${formatEV(best)}`; if (best > 0) evClass = "bg-green-100 text-green-800"; else if (best < 0) evClass = "bg-red-100 text-red-800";
  }

  const perBetCapDollar = Math.round(maxPerBetMode === "pct" ? bankroll * maxPerBetPct : maxPerBetUsd);
  const periodCapDollar  = Math.round(periodMode === "pct" ? bankroll * periodLimitPct : periodLimitUsd);
  const capStake = (stake: number) => Math.min(stake, perBetCapDollar);
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

  // Kelly numbers + fair probs
  let kH = 0, kA = 0, sH = 0, sA = 0, nvH = 0, nvA = 0;
  if (ml) {
    const impH = americanToImpliedProb(ml.homeOdds), impA = americanToImpliedProb(ml.awayOdds);
    const sum = Math.max(impH + impA, 1e-9); nvH = impH / sum; nvA = impA / sum;
    const fH = kellyFraction(ml.homeOdds, nvH), fA = kellyFraction(ml.awayOdds, nvA);
    kH = Math.max(0, fH * kelly); kA = Math.max(0, fA * kelly);
    sH = capStake(Math.round(bankroll * kH)); sA = capStake(Math.round(bankroll * kA));
  }

  let kSpH = 0, kSpA = 0, sSpH = 0, sSpA = 0, nvSpH = 0, nvSpA = 0;
  if (sp) {
    const impH = americanToImpliedProb(sp.homeOdds), impA = americanToImpliedProb(sp.awayOdds);
    const sum = Math.max(impH + impA, 1e-9); nvSpH = impH / sum; nvSpA = impA / sum;
    const fH = kellyFraction(sp.homeOdds, nvSpH), fA = kellyFraction(sp.awayOdds, nvSpA);
    kSpH = Math.max(0, fH * kelly); kSpA = Math.max(0, fA * kelly);
    sSpH = capStake(Math.round(bankroll * kSpH)); sSpA = capStake(Math.round(bankroll * kSpA));
  }

  let kTO = 0, kTU = 0, sTO = 0, sTU = 0, nvO = 0, nvU = 0;
  if (tot) {
    const impO = americanToImpliedProb(tot.overOdds), impU = americanToImpliedProb(tot.underOdds);
    const sum = Math.max(impO + impU, 1e-9); nvO = impO / sum; nvU = impU / sum;
    const fO = kellyFraction(tot.overOdds, nvO), fU = kellyFraction(tot.underOdds, nvU);
    kTO = Math.max(0, fO * kelly); kTU = Math.max(0, fU * kelly);
    sTO = capStake(Math.round(bankroll * kTO)); sTU = capStake(Math.round(bankroll * kTU));
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm text-slate-500">{when}</div>
          <div className="mt-1 text-lg font-semibold">{away} @ {home}</div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? <span className="h-6 w-16 rounded bg-slate-100 animate-pulse" /> : (evPill && <span className={`rounded-md px-2 py-1 text-xs font-medium ${evClass}`}>{evPill}</span>)}
          {secondsAgo !== null && (<span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">{isFetching ? "Refreshing…" : `Updated ${secondsAgo}s ago`}</span>)}
          <Link to={`/game/${id}`} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">View</Link>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {/* Moneyline */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-xs font-semibold text-slate-500">ML</div>
          {isLoading && <div className="h-8 flex-1 rounded bg-slate-100 animate-pulse" />}
          {isError && <div className="text-xs text-red-600">lines unavailable</div>}
          {ml && !isLoading && !isError && (
            <>
              <button
                onClick={() => {
                  const res = tryConsume(sA, riskPeriod, periodCapDollar);
                  if (!res.ok) { alert(`Budget reached. Remaining $${res.remaining}`); return; }
                  addLeg({ id: `${id}:ML:AWAY`, label: `${away} ML ${fmtOdds(ml.awayOdds, oddsFormat)}`, odds: ml.awayOdds, fairProb: nvA, riskConsumed: sA, riskKey: res.key });
                }}
                className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                {away} {fmtOdds(ml.awayOdds, oddsFormat)}
              </button>
              <span className="text-[11px] text-slate-600">Kelly {kA>0?`${pct(kA)} · $${sA}`:"—"}</span>

              <button
                onClick={() => {
                  const res = tryConsume(sH, riskPeriod, periodCapDollar);
                  if (!res.ok) { alert(`Budget reached. Remaining $${res.remaining}`); return; }
                  addLeg({ id: `${id}:ML:HOME`, label: `${home} ML ${fmtOdds(ml.homeOdds, oddsFormat)}`, odds: ml.homeOdds, fairProb: nvH, riskConsumed: sH, riskKey: res.key });
                }}
                className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                {home} {fmtOdds(ml.homeOdds, oddsFormat)}
              </button>
              <span className="text-[11px] text-slate-600">Kelly {kH>0?`${pct(kH)} · $${sH}`:"—"}</span>
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
                onClick={() => {
                  const res = tryConsume(sSpA, riskPeriod, periodCapDollar);
                  if (!res.ok) { alert(`Budget reached. Remaining $${res.remaining}`); return; }
                  addLeg({ id: `${id}:SPREAD:AWAY:${sp.away}`, label: `${away} ${signed(sp.away)} (${fmtOdds(sp.awayOdds, oddsFormat)})`, odds: sp.awayOdds, fairProb: nvSpA, riskConsumed: sSpA, riskKey: res.key });
                }}
                className="rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
              >
                {away} {signed(sp.away)} ({fmtOdds(sp.awayOdds, oddsFormat)})
              </button>
              <span className="text-[11px] text-slate-600">Kelly {kSpA>0?`${pct(kSpA)} · $${sSpA}`:"—"}</span>

              <button
                onClick={() => {
                  const res = tryConsume(sSpH, riskPeriod, periodCapDollar);
                  if (!res.ok) { alert(`Budget reached. Remaining $${res.remaining}`); return; }
                  addLeg({ id: `${id}:SPREAD:HOME:${sp.home}`, label: `${home} ${signed(sp.home)} (${fmtOdds(sp.homeOdds, oddsFormat)})`, odds: sp.homeOdds, fairProb: nvSpH, riskConsumed: sSpH, riskKey: res.key });
                }}
                className="rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
              >
                {home} {signed(sp.home)} ({fmtOdds(sp.homeOdds, oddsFormat)})
              </button>
              <span className="text-[11px] text-slate-600">Kelly {kSpH>0?`${pct(kSpH)} · $${sSpH}`:"—"}</span>
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
                onClick={() => {
                  const res = tryConsume(sTO, riskPeriod, periodCapDollar);
                  if (!res.ok) { alert(`Budget reached. Remaining $${res.remaining}`); return; }
                  addLeg({ id: `${id}:TOTAL:OVER:${tot.line}`, label: `Over ${tot.line} (${fmtOdds(tot.overOdds, oddsFormat)})`, odds: tot.overOdds, fairProb: nvO, riskConsumed: sTO, riskKey: res.key });
                }}
                className="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
              >
                Over {tot.line} ({fmtOdds(tot.overOdds, oddsFormat)})
              </button>
              <span className="text-[11px] text-slate-600">Kelly {kTO>0?`${(kTO*100).toFixed(1)}% · $${sTO}`:"—"}</span>

              <button
                onClick={() => {
                  const res = tryConsume(sTU, riskPeriod, periodCapDollar);
                  if (!res.ok) { alert(`Budget reached. Remaining $${res.remaining}`); return; }
                  addLeg({ id: `${id}:TOTAL:UNDER:${tot.line}`, label: `Under ${tot.line} (${fmtOdds(tot.underOdds, oddsFormat)})`, odds: tot.underOdds, fairProb: nvU, riskConsumed: sTU, riskKey: res.key });
                }}
                className="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
              >
                Under {tot.line} ({fmtOdds(tot.underOdds, oddsFormat)})
              </button>
              <span className="text-[11px] text-slate-600">Kelly {kTU>0?`${(kTU*100).toFixed(1)}% · $${sTU}`:"—"}</span>
            </>
          )}
          {!isLoading && !tot && <div className="text-xs text-slate-400">—</div>}
        </div>
      </div>
    </div>
  );
}
