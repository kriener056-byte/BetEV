/**
 * Convert American odds to decimal odds.
 * +130 -> 2.30,  -150 -> 1.6667
 */
export function americanToDecimal(odds: number): number {
  if (odds === 0) throw new Error("odds cannot be 0");
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

/**
 * Implied probability from American odds.
 * +130 -> 0.4348,  -150 -> 0.6000
 */
export function americanToImpliedProb(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

/**
 * Expected value for a single bet.
 * stake: your wager size (default $100).
 * fairProb: your estimated true probability of the outcome.
 * Returns EV in dollars.
 */
export function evSingle(odds: number, fairProb: number, stake = 100): number {
  const dec = americanToDecimal(odds);
  const winProfit = (dec - 1) * stake;
  const loseAmount = stake;
  return fairProb * winProfit - (1 - fairProb) * loseAmount;
}

/**
 * Quick helper to format as a signed currency string.
 * ex: 12.345 -> "+$12.35", -3.2 -> "-$3.20"
 */
export function formatEV(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  const abs = Math.abs(value).toFixed(2);
  return `${sign}$${abs}`;
}
