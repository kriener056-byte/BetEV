const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// health check
app.get("/health", (_req, res) => res.send("ok"));

// mock odds
app.get("/api/odds", (req, res) => {
  const league = String(req.query.league || "nfl");
  const now = Date.now();
  const games = [
    { id: `${league}_001`, home: "Chiefs",  away: "Ravens",   startsAt: new Date(now + 1*60*60*1000).toISOString() },
    { id: `${league}_002`, home: "Bills",   away: "Dolphins", startsAt: new Date(now + 3*60*60*1000).toISOString() },
    { id: `${league}_003`, home: "49ers",   away: "Cowboys",  startsAt: new Date(now + 6*60*60*1000).toISOString() },
  ];
  res.json(games);
});

const PORT = process.env.PORT || 8787;
const HOST = "0.0.0.0"; // important for Codespaces
app.listen(PORT, HOST, () => {
  console.log(`✅ API listening on http://${HOST}:${PORT}`);
});
