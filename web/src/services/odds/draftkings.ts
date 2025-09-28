export type LeagueId = "nfl" | "ncaaf";

export type GameSummary = {
  id: string;
  home: string;
  away: string;
  startsAt: string; // ISO
};

export type Market =
  | { type: "moneyline"; homeOdds: number; awayOdds: number }
  | { type: "spread"; home: number; away: number; homeOdds: number; awayOdds: number }
  | { type: "total"; line: number; overOdds: number; underOdds: number };

export type Prop = { name: string; line: number; overOdds: number; underOdds: number };

export type GameDetails = GameSummary & {
  markets: Market[];
  props: Prop[];
};

export async function fetchGames(league: LeagueId): Promise<GameSummary[]> {
  const res = await fetch(`/api/odds?league=${league}`);
  if (!res.ok) throw new Error(`Failed to fetch odds: ${res.status}`);
  return (await res.json()) as GameSummary[];
}

export async function fetchGame(id: string): Promise<GameDetails> {
  const res = await fetch(`/api/games/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch game ${id}: ${res.status}`);
  return (await res.json()) as GameDetails;
}
