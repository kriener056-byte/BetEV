import { useParlay, parlayReturn, parlayProfit, combinedAmerican } from "../store/parlay";

export default function ParlayWidget() {
  const { legs, stake, setStake, removeLeg, clear } = useParlay();

  const canCalc = legs.length > 0;
  const combOdds = canCalc ? combinedAmerican(legs) : 0;
  const ret = canCalc ? parlayReturn(legs, stake) : 0;
  const prof = canCalc ? parlayProfit(legs, stake) : 0;

  async function copySlip() {
    if (!canCalc) return;
    const header = `Bet EV — Parlay (${legs.length} ${legs.length === 1 ? "leg" : "legs"})`;
    const lines = legs.map((l, i) => `${i + 1}. ${l.label}`);
    const oddsStr = combOdds > 0 ? `+${combOdds}` : `${combOdds}`;
    const footer = [
      `Combined odds: ${oddsStr}`,
      `Stake: $${stake.toFixed(2)}`,
      `Potential return: $${ret.toFixed(2)}`,
      `Profit: $${prof.toFixed(2)}`
    ];
    const text = [header, ...lines, "", ...footer].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      alert("Parlay copied to clipboard ✅");
    } catch {
      alert("Could not copy. Select and copy manually.");
      console.log(text);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 rounded-2xl border bg-white shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="font-semibold">Parlay ({legs.length} {legs.length === 1 ? "leg" : "legs"})</div>
        <div className="flex items-center gap-2">
          <button
            onClick={copySlip}
            className="text-xs rounded-md px-2 py-1 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            disabled={!canCalc}
            title="Copy slip"
          >
            Copy
          </button>
          <button
            onClick={clear}
            className="text-xs rounded-md px-2 py-1 text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-50"
            disabled={!canCalc}
            title="Clear parlay"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="max-h-56 overflow-auto px-4 py-2 space-y-2">
        {legs.length === 0 && (
          <div className="text-sm text-slate-500">Add legs from game pages.</div>
        )}
        {legs.map((l) => (
          <div key={l.id} className="flex items-start justify-between gap-2 rounded-lg border p-2">
            <div className="text-sm">
              <div className="font-medium">{l.label}</div>
            </div>
            <button
              onClick={() => removeLeg(l.id)}
              className="rounded-md px-2 py-1 text-xs text-white bg-slate-700 hover:bg-slate-800"
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4 pt-2 border-t">
        <label className="text-xs text-slate-500">Stake ($)</label>
        <input
          type="number"
          className="mt-1 w-full rounded-md border px-2 py-1"
          value={stake}
          min={1}
          step={1}
          onChange={(e) => setStake(Number(e.target.value || 0))}
        />

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="text-xs text-slate-500">Combined odds</div>
            <div className="font-semibold">{canCalc ? (combOdds > 0 ? `+${combOdds}` : `${combOdds}`) : "—"}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="text-xs text-slate-500">Potential return</div>
            <div className="font-semibold">${ret.toFixed(2)}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 col-span-2">
            <div className="text-xs text-slate-500">Profit</div>
            <div className={"font-semibold " + (prof >= 0 ? "text-green-700" : "text-red-700")}>
              ${prof.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
