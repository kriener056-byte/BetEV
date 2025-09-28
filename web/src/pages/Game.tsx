import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchGame, type GameDetails } from "../services/odds/draftkings";
import { useParlay } from "../store/parlay";
import { useSettings } from "../store/settings";
import { americanToDecimal } from "../services/ev/math";

type ML = { type: "moneyline"; homeOdds: number; awayOdds: number };
type Spread = { type: "spread"; home: number; away: number; homeOdds: number; awayOdds: number };
type Total = { type: "total"; line: number; overOdds: number; underOdds: number };

function fmtOdds(odds: number, format: "american" | "decimal") {
  return format === "american" ? (odds > 0 ? `+${odds}` : `${odds}`) : americanToDecimal(odds).toFixed(2);
}

export default function Game() {
  const { gameId } = useParams();
  const addLeg = useParlay((s) => s.addLeg);
  const { oddsFormat } = useSettings();

  const { data, isLoading, isError } = useQuery<GameDetails>({
    queryKey: ["game", gameId],
    queryFn: () => fetchGame(gameId ?? ""),
    enabled: Boolean(gameId),
  });

  if (isLoading) return <section className="p-6">Loading…</section>;
  if (isError || !data) return <section className="p-6 text-red-600">Couldn’t load game.</section>;

  const when = new Date(data.startsAt).toLocaleString();

  return (
    <section className="mx-auto max-w-5xl">
      <h2 className="text-2xl font-semibold">
        {data.away} @ {data.home}
      </h2>
      <div className="text-slate-500 text-sm">{when}</div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Detail</th>
              <th className="px-3 py-2">Parlay</th>
            </tr>
          </thead>
          <tbody>
            {data.markets.map((m, i) => {
              const t = (m as any).type as ML["type"] | Spread["type"] | Total["type"];
              return (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 font-medium">{t}</td>
                  <td className="px-3 py-2">
                    {t === "moneyline" &&
                      `${data.away} ${fmtOdds((m as ML).awayOdds, oddsFormat)} / ${data.home} ${fmtOdds((m as ML).homeOdds, oddsFormat)}`}
                    {t === "spread" &&
                      `${data.away} ${(m as Spread).away} (${fmtOdds((m as Spread).awayOdds, oddsFormat)}) · ${data.home} ${(m as Spread).home} (${fmtOdds((m as Spread).homeOdds, oddsFormat)})`}
                    {t === "total" &&
                      `Over ${(m as Total).line} (${fmtOdds((m as Total).overOdds, oddsFormat)}) · Under ${(m as Total).line} (${fmtOdds((m as Total).underOdds, oddsFormat)})`}
                  </td>
                  <td className="px-3 py-2">
                    {t === "moneyline" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            addLeg({
                              id: `${data.id}:ML:HOME`,
                              label: `${data.home} ML ${fmtOdds((m as ML).homeOdds, oddsFormat)}`,
                              odds: (m as ML).homeOdds, // keep numeric American for math
                            })
                          }
                          className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Add {data.home} ML
                        </button>
                        <button
                          onClick={() =>
                            addLeg({
                              id: `${data.id}:ML:AWAY`,
                              label: `${data.away} ML ${fmtOdds((m as ML).awayOdds, oddsFormat)}`,
                              odds: (m as ML).awayOdds,
                            })
                          }
                          className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Add {data.away} ML
                        </button>
                      </div>
                    )}
                    {t === "spread" && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            addLeg({
                              id: `${data.id}:SPREAD:HOME:${(m as Spread).home}`,
                              label: `${data.home} ${((m as Spread).home >= 0 ? "+" : "") + (m as Spread).home} (${fmtOdds((m as Spread).homeOdds, oddsFormat)})`,
                              odds: (m as Spread).homeOdds,
                            })
                          }
                          className="rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                        >
                          Add {data.home} {((m as Spread).home >= 0 ? "+" : "") + (m as Spread).home}
                        </button>
                        <button
                          onClick={() =>
                            addLeg({
                              id: `${data.id}:SPREAD:AWAY:${(m as Spread).away}`,
                              label: `${data.away} ${((m as Spread).away >= 0 ? "+" : "") + (m as Spread).away} (${fmtOdds((m as Spread).awayOdds, oddsFormat)})`,
                              odds: (m as Spread).awayOdds,
                            })
                          }
                          className="rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                        >
                          Add {data.away} {((m as Spread).away >= 0 ? "+" : "") + (m as Spread).away}
                        </button>
                      </div>
                    )}
                    {t === "total" && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            addLeg({
                              id: `${data.id}:TOTAL:OVER:${(m as Total).line}`,
                              label: `Over ${(m as Total).line} (${fmtOdds((m as Total).overOdds, oddsFormat)})`,
                              odds: (m as Total).overOdds,
                            })
                          }
                          className="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                        >
                          Add Over {(m as Total).line}
                        </button>
                        <button
                          onClick={() =>
                            addLeg({
                              id: `${data.id}:TOTAL:UNDER:${(m as Total).line}`,
                              label: `Under ${(m as Total).line} (${fmtOdds((m as Total).underOdds, oddsFormat)})`,
                              odds: (m as Total).underOdds,
                            })
                          }
                          className="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                        >
                          Add Under {(m as Total).line}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold">Popular Props</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {data.props.map((p, i) => (
            <div key={i} className="rounded-xl border bg-white p-4">
              <div className="text-sm text-slate-500">{p.name}</div>
              <div className="mt-1 font-semibold">{p.line}</div>
              <div className="mt-1 text-sm">
                Over ({fmtOdds(p.overOdds, oddsFormat)}) · Under ({fmtOdds(p.underOdds, oddsFormat)})
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
