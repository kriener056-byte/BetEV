import { useQuery } from "@tanstack/react-query";

export default function Home() {
  // Simple health check by hitting odds endpoint
  const { data, isError, isLoading } = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const res = await fetch("/api/odds?league=nfl");
      if (!res.ok) throw new Error("API not OK");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const badge = isLoading
    ? "bg-yellow-100 text-yellow-800"
    : isError
    ? "bg-red-100 text-red-800"
    : "bg-green-100 text-green-800";

  const text = isLoading ? "Checking…" : isError ? "API Offline" : "API Online";

  return (
    <section className="mx-auto max-w-4xl">
      <div className={`inline-flex items-center rounded-md px-2 py-1 text-sm font-medium ${badge}`}>
        {text}
      </div>

      <h2 className="mt-4 text-2xl font-semibold">Welcome to Bet EV</h2>
      <p className="mt-2 text-slate-600">
        Pick a league on the left to view live & upcoming games.
      </p>

      {!isLoading && !isError && Array.isArray(data) && data.length > 0 && (
        <p className="mt-3 text-slate-500 text-sm">
          Sample games loaded: {data.length}
        </p>
      )}
    </section>
  );
}
