export type LeagueId = "nfl" | "ncaaf";

export type GameSummary = {
  id: string;
  home: string;
  away: string;
  startsAt: string; // ISO
};

export async function fetchGames(league: LeagueId): Promise<GameSummary[]> {
  const res = await fetch(`/api/odds?league=${league}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch odds: ${res.status}`);
  }
  const data = (await res.json()) as GameSummary[];
  return data;
}
