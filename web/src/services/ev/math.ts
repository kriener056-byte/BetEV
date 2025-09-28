/** Odds + EV utilities */
export function americanToDecimal(odds: number): number {
  if (odds === 0) throw new Error("odds cannot be 0");
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}
export function americanToImpliedProb(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}
export function evSingle(odds: number, fairProb: number, stake: number): number {
  const dec = americanToDecimal(odds);
  const win = stake * (dec - 1);
  const lose = stake;
  return fairProb * win - (1 - fairProb) * lose;
}
export function formatEV(v: number): string {
  const s = Math.round(v);
  return (s >= 0 ? "+" : "") + "$" + Math.abs(s);
}

/** Kelly fraction (full Kelly). Returns a fraction of bankroll (can be negative). */
export function kellyFraction(odds: number, fairProb: number): number {
  const b = americanToDecimal(odds) - 1; // net payout multiple
  const p = Math.max(0, Math.min(1, fairProb));
  const q = 1 - p;
  const f = (b * p - q) / b;
  return Number.isFinite(f) ? f : 0;
}
