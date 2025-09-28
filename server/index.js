const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// helper to make mock games per league
function makeGames(league) {
  const now = Date.now();
  return [
    { id: `${league}_001`, home: "Chiefs",  away: "Ravens",   startsAt: new Date(now + 1*60*60*1000).toISOString() },
    { id: `${league}_002`, home: "Bills",   away: "Dolphins", startsAt: new Date(now + 3*60*60*1000).toISOString() },
    { id: `${league}_003`, home: "49ers",   away: "Cowboys",  startsAt: new Date(now + 6*60*60*1000).toISOString() },
  ];
}

// health check
app.get("/health", (_req, res) => res.send("ok"));

// list games
app.get("/api/odds", (req, res) => {
  const league = String(req.query.league || "nfl");
  res.json(makeGames(league));
});

// game details
app.get("/api/games/:id", (req, res) => {
  const id = String(req.params.id);
  const all = [...makeGames("nfl"), ...makeGames("ncaaf")];
  const base = all.find((g) => g.id === id);
  if (!base) return res.status(404).json({ error: "Game not found" });

  const markets = [
    { type: "moneyline", homeOdds: -150, awayOdds: +130 },
    { type: "spread",    home: -3.5, away: +3.5, homeOdds: -110, awayOdds: -110 },
    { type: "total",     line: 47.5, overOdds: -105, underOdds: -115 },
  ];

  const props = [
    { name: "QB Passing Yds", line: 275.5, overOdds: -115, underOdds: -105 },
    { name: "RB Rush Yds",    line: 69.5,  overOdds: -110, underOdds: -110 },
  ];

  res.json({ ...base, markets, props });
});

const PORT = process.env.PORT || 8787;
const HOST = "0.0.0.0"; // for Codespaces
app.listen(PORT, HOST, () => {
  console.log(`✅ API listening on http://${HOST}:${PORT}`);
});
