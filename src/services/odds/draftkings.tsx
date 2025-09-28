export type LeagueId = "nfl" | "ncaaf";

export type GameSummary = {
  id: string;
  home: string;
  away: string;
  startsAt: string; // ISO
};

export async function fetchGames(league: LeagueId): Promise<GameSummary[]> {
  // TODO: replace with backend call; placeholder for now
  await new Promise((r) => setTimeout(r, 150));
  return [
    { id: "game_1", home: "Team A", away: "Team B", startsAt: "2025-10-01T00:00:00Z" },
  ];
}
