import { Link } from "react-router-dom";

type Props = {
  id: string;
  home: string;
  away: string;
  startsAt: string; // ISO
};

export default function GameCard({ id, home, away, startsAt }: Props) {
  const dt = new Date(startsAt);
  const when = dt.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{when}</div>
      <div className="mt-1 text-lg font-semibold">
        {away} @ {home}
      </div>

      <div className="mt-3">
        <Link
          to={`/game/${id}`}
          className="inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          View markets
        </Link>
      </div>
    </div>
  );
}
