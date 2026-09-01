/* ──────────────────────────────────────────────────────────────
   Manually entered draft results for seasons that predate the move
   to Sleeper (2024 and 2025 — the league was on ESPN then, and
   Sleeper has no history before 2026).

   NOTHING IN HERE IS INVENTED. Each season stays `picks: []` with
   `complete: false` until the real board is entered, and the app
   shows a "data not loaded yet" state for that year instead of
   guessing at picks.

   ── Pick shape ──────────────────────────────────────────────
   {
     round:       5,                  // 1-based draft round
     pick:        7,                  // pick within the round (1..12)
     overall:     55,                 // optional; computed if omitted
     player:      'Player Name',
     position:    'RB',               // QB | RB | WR | TE | K | DEF
     nflTeam:     'DET',              // NFL team abbreviation
     fantasyTeam: 'Manager or team name'
   }

   ── Adding a year ───────────────────────────────────────────
   Paste the rows into `picks` and flip `complete` to true. Snake vs.
   linear draft order doesn't matter — the board is rendered from the
   round/pick numbers as entered. `rounds` is the number of rounds that
   draft had; leave it null and it's inferred from the highest round.
   ────────────────────────────────────────────────────────────── */
window.KEEPER_DATA = {
  seasons: {
    2024: {
      source: 'manual',
      complete: false,
      rounds: null,
      picks: []
    },
    2025: {
      source: 'manual',
      complete: false,
      rounds: null,
      picks: []
    }
    /* 2026 is not listed here — it is fetched live from Sleeper. */
  }
};
