import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchGame, type GameDetails } from "../services/odds/draftkings";
import { useParlay } from "../store/parlay";

type ML = { type: "moneyline"; homeOdds: number; awayOdds: number };
type Spread = { type: "spread"; home: number; away: number; homeOdds: number; awayOdds: number };
type Total = { type: "total"; line: number; overOdds: number; underOdds: number };

export default function Game() {
  const { gameId } = useParams();
  const addLeg = useParlay((s) => s.addLeg);

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
                      `${data.away} ${(m as ML).awayOdds} / ${data.home} ${(m as ML).homeOdds}`}
                    {t === "spread" &&
                      `${data.away} ${(m as Spread).away} (${(m as Spread).awayOdds}) · ${data.home} ${(m as Spread).home} (${(m as Spread).homeOdds})`}
                    {t === "total" &&
                      `Over ${(m as Total).line} (${(m as Total).overOdds}) · Under ${(m as Total).line} (${(m as Total).underOdds})`}
                  </td>
                  <td className="px-3 py-2">
                    {t === "moneyline" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            addLeg({
                              id: `${data.id}:ML:HOME`,
                              label: `${data.home} ML ${(m as ML).homeOdds}`,
                              odds: (m as ML).homeOdds,
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
                              label: `${data.away} ML ${(m as ML).awayOdds}`,
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
                              label: `${data.home} Spread ${(m as Spread).home} (${(m as Spread).homeOdds})`,
                              odds: (m as Spread).homeOdds,
                            })
                          }
                          className="rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                        >
                          Add {data.home} {signed((m as Spread).home)}
                        </button>
                        <button
                          onClick={() =>
                            addLeg({
                              id: `${data.id}:SPREAD:AWAY:${(m as Spread).away}`,
                              label: `${data.away} Spread ${(m as Spread).away} (${(m as Spread).awayOdds})`,
                              odds: (m as Spread).awayOdds,
                            })
                          }
                          className="rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                        >
                          Add {data.away} {signed((m as Spread).away)}
                        </button>
                      </div>
                    )}

                    {t === "total" && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            addLeg({
                              id: `${data.id}:TOTAL:OVER:${(m as Total).line}`,
                              label: `Over ${(m as Total).line} (${(m as Total).overOdds})`,
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
                              label: `Under ${(m as Total).line} (${(m as Total).underOdds})`,
                              odds: (m as Total).underOdds,
                            })
                          }
                          className="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                        >
                          Add Under {(m as Total).line}
                        </button>
                      </div>
                    )}

                    {t !== "moneyline" && t !== "spread" && t !== "total" && (
                      <span className="text-slate-400">—</span>
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
                Over ({p.overOdds}) · Under ({p.underOdds})
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function signed(n: number) {
  return `${n >= 0 ? "+" : ""}${n}`;
}
