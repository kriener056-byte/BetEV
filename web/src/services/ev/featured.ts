import { fetchGames, fetchGame, type LeagueId, type GameDetails } from "../odds/draftkings";
import { americanToImpliedProb, evSingle } from "./math";

export type FeaturedKind = "ml" | "spread" | "total" | "prop";

export type FeaturedPick = {
  id: string;
  gameId: string;
  league: LeagueId;
  matchup: string;
  label: string;
  odds: number;          // American odds
  ev: number;            // EV for $100
  fairProb: number;      // no-vig baseline probability (for Kelly)
  parlayId: string;
  parlayLabel: string;
  kind: FeaturedKind;
  propName?: string;
};

function pushMoneyline(picks: FeaturedPick[], game: GameDetails, league: LeagueId) {
  const ml = game.markets.find((m) => m.type === "moneyline") as
    | { type: "moneyline"; homeOdds: number; awayOdds: number }
    | undefined;
  if (!ml) return;

  const impH = americanToImpliedProb(ml.homeOdds);
  const impA = americanToImpliedProb(ml.awayOdds);
  const sum = Math.max(impH + impA, 1e-9);
  const nvH = impH / sum;
  const nvA = impA / sum;

  picks.push({
    id: `${game.id}:ML:HOME`,
    gameId: game.id,
    league,
    matchup: `${game.away} @ ${game.home}`,
    label: `${game.home} ML`,
    odds: ml.homeOdds,
    ev: evSingle(ml.homeOdds, nvH, 100),
    fairProb: nvH,
    parlayId: `${game.id}:ML:HOME`,
    parlayLabel: `${game.home} ML ${ml.homeOdds}`,
    kind: "ml",
  });

  picks.push({
    id: `${game.id}:ML:AWAY`,
    gameId: game.id,
    league,
    matchup: `${game.away} @ ${game.home}`,
    label: `${game.away} ML`,
    odds: ml.awayOdds,
    ev: evSingle(ml.awayOdds, nvA, 100),
    fairProb: nvA,
    parlayId: `${game.id}:ML:AWAY`,
    parlayLabel: `${game.away} ML ${ml.awayOdds}`,
    kind: "ml",
  });
}

function pushSpread(picks: FeaturedPick[], game: GameDetails, league: LeagueId) {
  const sp = game.markets.find((m) => m.type === "spread") as
    | { type: "spread"; home: number; away: number; homeOdds: number; awayOdds: number }
    | undefined;
  if (!sp) return;

  const impH = americanToImpliedProb(sp.homeOdds);
  const impA = americanToImpliedProb(sp.awayOdds);
  const sum = Math.max(impH + impA, 1e-9);
  const nvH = impH / sum;
  const nvA = impA / sum;

  picks.push({
    id: `${game.id}:SPREAD:HOME:${sp.home}`,
    gameId: game.id,
    league,
    matchup: `${game.away} @ ${game.home}`,
    label: `${game.home} ${sp.home >= 0 ? "+" : ""}${sp.home}`,
    odds: sp.homeOdds,
    ev: evSingle(sp.homeOdds, nvH, 100),
    fairProb: nvH,
    parlayId: `${game.id}:SPREAD:HOME:${sp.home}`,
    parlayLabel: `${game.home} ${sp.home >= 0 ? "+" : ""}${sp.home} (${sp.homeOdds})`,
    kind: "spread",
  });

  picks.push({
    id: `${game.id}:SPREAD:AWAY:${sp.away}`,
    gameId: game.id,
    league,
    matchup: `${game.away} @ ${game.home}`,
    label: `${game.away} ${sp.away >= 0 ? "+" : ""}${sp.away}`,
    odds: sp.awayOdds,
    ev: evSingle(sp.awayOdds, nvA, 100),
    fairProb: nvA,
    parlayId: `${game.id}:SPREAD:AWAY:${sp.away}`,
    parlayLabel: `${game.away} ${sp.away >= 0 ? "+" : ""}${sp.away} (${sp.awayOdds})`,
    kind: "spread",
  });
}

function pushTotal(picks: FeaturedPick[], game: GameDetails, league: LeagueId) {
  const tot = game.markets.find((m) => m.type === "total") as
    | { type: "total"; line: number; overOdds: number; underOdds: number }
    | undefined;
  if (!tot) return;

  const impO = americanToImpliedProb(tot.overOdds);
  const impU = americanToImpliedProb(tot.underOdds);
  const sum = Math.max(impO + impU, 1e-9);
  const nvO = impO / sum;
  const nvU = impU / sum;

  picks.push({
    id: `${game.id}:TOTAL:OVER:${tot.line}`,
    gameId: game.id,
    league,
    matchup: `${game.away} @ ${game.home}`,
    label: `Over ${tot.line}`,
    odds: tot.overOdds,
    ev: evSingle(tot.overOdds, nvO, 100),
    fairProb: nvO,
    parlayId: `${game.id}:TOTAL:OVER:${tot.line}`,
    parlayLabel: `Over ${tot.line} (${tot.overOdds})`,
    kind: "total",
  });

  picks.push({
    id: `${game.id}:TOTAL:UNDER:${tot.line}`,
    gameId: game.id,
    league,
    matchup: `${game.away} @ ${game.home}`,
    label: `Under ${tot.line}`,
    odds: tot.underOdds,
    ev: evSingle(tot.underOdds, nvU, 100),
    fairProb: nvU,
    parlayId: `${game.id}:TOTAL:UNDER:${tot.line}`,
    parlayLabel: `Under ${tot.line} (${tot.underOdds})`,
    kind: "total",
  });
}

function pushProps(picks: FeaturedPick[], game: GameDetails, league: LeagueId) {
  for (const p of game.props ?? []) {
    const impO = americanToImpliedProb(p.overOdds);
    const impU = americanToImpliedProb(p.underOdds);
    const sum = Math.max(impO + impU, 1e-9);
    const nvO = impO / sum;
    const nvU = impU / sum;
    const key = p.name.replace(/\s+/g, "_");

    picks.push({
      id: `${game.id}:PROP:${key}:OVER:${p.line}`,
      gameId: game.id,
      league,
      matchup: `${game.away} @ ${game.home}`,
      label: `${p.name} Over ${p.line}`,
      odds: p.overOdds,
      ev: evSingle(p.overOdds, nvO, 100),
      fairProb: nvO,
      parlayId: `${game.id}:PROP:${key}:OVER:${p.line}`,
      parlayLabel: `${p.name} Over ${p.line} (${p.overOdds})`,
      kind: "prop",
      propName: p.name,
    });

    picks.push({
      id: `${game.id}:PROP:${key}:UNDER:${p.line}`,
      gameId: game.id,
      league,
      matchup: `${game.away} @ ${game.home}`,
      label: `${p.name} Under ${p.line}`,
      odds: p.underOdds,
      ev: evSingle(p.underOdds, nvU, 100),
      fairProb: nvU,
      parlayId: `${game.id}:PROP:${key}:UNDER:${p.line}`,
      parlayLabel: `${p.name} Under ${p.line} (${p.underOdds})`,
      kind: "prop",
      propName: p.name,
    });
  }
}

export async function fetchFeatured(limit = 25): Promise<FeaturedPick[]> {
  const leagues: LeagueId[] = ["nfl", "ncaaf"];
  const leagueByGame = new Map<string, LeagueId>();
  const lists = await Promise.all(leagues.map((lg) => fetchGames(lg)));
  lists.forEach((games, i) => {
    const lg = leagues[i];
    games.forEach((g) => leagueByGame.set(g.id, lg));
  });

  const allGames = lists.flat();
  const details = await Promise.all(allGames.map((g) => fetchGame(g.id)));

  const picks: FeaturedPick[] = [];
  for (const gd of details) {
    const lg = leagueByGame.get(gd.id) ?? "nfl";
    pushMoneyline(picks, gd, lg);
    pushSpread(picks, gd, lg);
    pushTotal(picks, gd, lg);
    pushProps(picks, gd, lg);
  }

  picks.sort((a, b) => b.ev - a.ev);
  return picks.slice(0, limit);
}
