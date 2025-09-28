import { NavLink, Outlet } from "react-router-dom";
import ParlayWidget from "./components/ParlayWidget";
import { useSettings } from "./store/settings";

const leagues = [
  { id: "nfl", label: "NFL" },
  { id: "ncaaf", label: "NCAA Football" },
];

export default function App() {
  const { oddsFormat, toggleOddsFormat } = useSettings();

  const linkBase =
    "block rounded-md px-3 py-2 text-sm font-medium hover:bg-blue-50";
  const linkActive = "bg-blue-100 text-blue-900";

  return (
    <div className="min-h-screen grid md:grid-cols-[220px_1fr]">
      <aside className="border-r bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold">Bet EV</h1>
        </div>

        {/* Odds format toggle */}
        <div className="mt-3">
          <button
            onClick={toggleOddsFormat}
            className="w-full rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            title="Toggle odds format"
          >
            Odds: {oddsFormat === "american" ? "American" : "Decimal"}
          </button>
        </div>

        <nav className="mt-4 space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : "text-slate-700"}`
            }
          >
            Home
          </NavLink>

          <div className="mt-3 text-xs font-semibold text-slate-500 px-1">
            Leagues
          </div>

          {leagues.map((l) => (
            <NavLink
              key={l.id}
              to={`/league/${l.id}`}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : "text-slate-700"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="relative p-6 bg-slate-50">
        <Outlet />
        <ParlayWidget />
      </main>
    </div>
  );
}
