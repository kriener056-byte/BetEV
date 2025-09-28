import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import GameCard from "../components/GameCard";
import { fetchGames } from "../services/odds/draftkings";

export default function League() {
  const { leagueId } = useParams();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["games", leagueId],
    queryFn: () => fetchGames((leagueId as "nfl" | "ncaaf") ?? "nfl"),
    enabled: !!leagueId,
  });

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold uppercase">{leagueId}</h2>
        <button
          onClick={() => refetch()}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          disabled={isFetching}
        >
          {isFetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {isLoading && (
        <div className="mt-6 grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-6 text-red-600">Couldn’t load games. Try refresh.</p>
      )}

      {data && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {data.map((g) => (
            <GameCard key={g.id} {...g} />
          ))}
        </div>
      )}
    </section>
  );
}
