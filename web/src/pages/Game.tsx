import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchGame, type GameDetails } from "../services/odds/draftkings";
import { useParlay } from "../store/parlay";
import { useSettings } from "../store/settings";
import { americanToDecimal, americanToImpliedProb, evSingle, formatEV, kellyFraction } from "../services/ev/math";

type ML = { type: "moneyline"; homeOdds: number; awayOdds: number };
type Spread = { type: "spread"; home: number; away: number; homeOdds: number; awayOdds: number };
type Total = { type: "total"; line: number; overOdds: number; underOdds: number };

function fmtOdds(odds: number, format: "american" | "decimal") { return format === "american" ? (odds > 0 ? `+${odds}` : `${odds}`) : americanToDecimal(odds).toFixed(2); }
function signed(n: number) { return `${n >= 0 ? "+" : ""}${n}`; }
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export default function Game() {
  const { gameId } = useParams();
  const addLeg = useParlay((s) => s.addLeg);
  const { oddsFormat, bankroll, kelly, maxPerBetMode, maxPerBetPct, maxPerBetUsd } = useSettings();

  const { data, isLoading, isError } = useQuery<GameDetails>({
    queryKey: ["game", gameId],
    queryFn: () => fetchGame(gameId ?? ""),
    enabled: Boolean(gameId),
  });

  if (isLoading) return <section className="p-6">Loading…</section>;
  if (isError || !data) return <section className="p-6 text-red-600">Couldn’t load game.</section>;

  const when = new Date(data.startsAt).toLocaleString();
  const capDollar = Math.round(maxPerBetMode === "pct" ? bankroll * maxPerBetPct : maxPerBetUsd);
  const capStake = (stake: number) => Math.min(stake, capDollar);

  return (
    <section className="mx-auto max-w-5xl">
      <h2 className="text-2xl font-semibold">{data.away} @ {data.home}</h2>
      <div className="text-slate-500 text-sm">{when}</div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Detail</th><th className="px-3 py-2">Parlay</th></tr>
          </thead>
          <tbody>
            {data.markets.map((m, i) => {
              const t = (m as any).type as ML["type"] | Spread["type"] | Total["type"];
              // Precompute Kelly where relevant
              let k1 = 0, k2 = 0, s1 = 0, s2 = 0;
              if (t === "moneyline") {
                const ml = m as ML;
                const impH = americanToImpliedProb(ml.homeOdds), impA = americanToImpliedProb(ml.awayOdds);
                const sum = Math.max(impH + impA, 1e-9), nvH = impH / sum, nvA = impA / sum;
                const f1 = kellyFraction(ml.awayOdds, nvA), f2 = kellyFraction(ml.homeOdds, nvH);
                k1 = Math.max(0, f1 * kelly); k2 = Math.max(0, f2 * kelly);
                s1 = capStake(Math.round(bankroll * k1)); s2 = capStake(Math.round(bankroll * k2));
              } else if (t === "spread") {
                const sp = m as Spread;
                const impH = americanToImpliedProb(sp.homeOdds), impA = americanToImpliedProb(sp.awayOdds);
                const sum = Math.max(impH + impA, 1e-9), nvH = impH / sum, nvA = impA / sum;
                const f1 = kellyFraction(sp.awayOdds, nvA), f2 = kellyFraction(sp.homeOdds, nvH);
                k1 = Math.max(0, f1 * kelly); k2 = Math.max(0, f2 * kelly);
                s1 = capStake(Math.round(bankroll * k1)); s2 = capStake(Math.round(bankroll * k2));
              } else if (t === "total") {
                const tot = m as Total;
                const impO = americanToImpliedProb(tot.overOdds), impU = americanToImpliedProb(tot.underOdds);
                const sum = Math.max(impO + impU, 1e-9), nvO = impO / sum, nvU = impU / sum;
                const f1 = kellyFraction(tot.overOdds, nvO), f2 = kellyFraction(tot.underOdds, nvU);
                k1 = Math.max(0, f1 * kelly); k2 = Math.max(0, f2 * kelly);
                s1 = capStake(Math.round(bankroll * k1)); s2 = capStake(Math.round(bankroll * k2));
              }

              return (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 font-medium">{t}</td>
                  <td className="px-3 py-2">
                    {t === "moneyline" && `${data.away} ${fmtOdds((m as ML).awayOdds, oddsFormat)} / ${data.home} ${fmtOdds((m as ML).homeOdds, oddsFormat)}`}
                    {t === "spread" && `${data.away} ${(m as Spread).away} (${fmtOdds((m as Spread).awayOdds, oddsFormat)}) · ${data.home} ${(m as Spread).home} (${fmtOdds((m as Spread).homeOdds, oddsFormat)})`}
                    {t === "total" && `Over ${(m as Total).line} (${fmtOdds((m as Total).overOdds, oddsFormat)}) · Under ${(m as Total).line} (${fmtOdds((m as Total).underOdds, oddsFormat)})`}
                  </td>
                  <td className="px-3 py-2">
                    {t === "moneyline" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => addLeg({ id: `${data.id}:ML:AWAY`, label: `${data.away} ML ${fmtOdds((m as ML).awayOdds, oddsFormat)}`, odds: (m as ML).awayOdds })} className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Add {data.away} ML</button>
                        <span className="text-[11px] text-slate-600">Kelly {k1>0?`${pct(k1)} · $${s1}`:"—"}</span>
                        <button onClick={() => addLeg({ id: `${data.id}:ML:HOME`, label: `${data.home} ML ${fmtOdds((m as ML).homeOdds, oddsFormat)}`, odds: (m as ML).homeOdds })} className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Add {data.home} ML</button>
                        <span className="text-[11px] text-slate-600">Kelly {k2>0?`${pct(k2)} · $${s2}`:"—"}</span>
                      </div>
                    )}
                    {t === "spread" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => addLeg({ id: `${data.id}:SPREAD:AWAY:${(m as Spread).away}`, label: `${data.away} ${signed((m as Spread).away)} (${fmtOdds((m as Spread).awayOdds, oddsFormat)})`, odds: (m as Spread).awayOdds })} className="rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700">Add {data.away} {signed((m as Spread).away)}</button>
                        <span className="text-[11px] text-slate-600">Kelly {k1>0?`${pct(k1)} · $${s1}`:"—"}</span>
                        <button onClick={() => addLeg({ id: `${data.id}:SPREAD:HOME:${(m as Spread).home}`, label: `${data.home} ${signed((m as Spread).home)} (${fmtOdds((m as Spread).homeOdds, oddsFormat)})`, odds: (m as Spread).homeOdds })} className="rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700">Add {data.home} {signed((m as Spread).home)}</button>
                        <span className="text-[11px] text-slate-600">Kelly {k2>0?`${pct(k2)} · $${s2}`:"—"}</span>
                      </div>
                    )}
                    {t === "total" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => addLeg({ id: `${data.id}:TOTAL:OVER:${(m as Total).line}`, label: `Over ${(m as Total).line} (${fmtOdds((m as Total).overOdds, oddsFormat)})`, odds: (m as Total).overOdds })} className="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700">Add Over {(m as Total).line}</button>
                        <span className="text-[11px] text-slate-600">Kelly {k1>0?`${pct(k1)} · $${s1}`:"—"}</span>
                        <button onClick={() => addLeg({ id: `${data.id}:TOTAL:UNDER:${(m as Total).line}`, label: `Under ${(m as Total).line} (${fmtOdds((m as Total).underOdds, oddsFormat)})`, odds: (m as Total).underOdds })} className="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700">Add Under {(m as Total).line}</button>
                        <span className="text-[11px] text-slate-600">Kelly {k2>0?`${pct(k2)} · $${s2}`:"—"}</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Props section with Kelly already below (unchanged) */}
    </section>
  );
}
