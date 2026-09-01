/* ──────────────────────────────────────────────────────────────
   League configuration.
   This is the only file you should need to touch to point the hub at
   your league. Nothing here is guessed — anything still `null` makes
   the app show an honest "not configured yet" state rather than
   inventing numbers.
   ────────────────────────────────────────────────────────────── */
window.LEAGUE_CONFIG = {
  leagueName: 'Keeper League',

  /* Sleeper league ID for the 2026 season, as a string.
     Find it in the Sleeper app URL: sleeper.com/leagues/<THIS NUMBER>/team
     If this is ever null, the 2026 tab explains what's missing instead of
     showing placeholder picks. */
  sleeperLeagueId: '1399177243342667776',

  /* Optional: prior-season Sleeper league IDs, if the league ever existed
     there. The league moved from ESPN for 2026, so these are expected to
     stay null — 2024 and 2025 come from the manual data file. */
  priorSleeperLeagueIds: {
    2024: null,
    2025: null
  },

  /* Seasons the hub knows about, newest first. */
  seasons: [2026, 2025, 2024],
  defaultSeason: 2026,

  /* Total rounds in each season's draft. Used by the OBJ Rule's final-round
     cap and to bound the cost ladder. The 2026 value is read from Sleeper
     automatically once the league ID is set; these are the fallbacks. */
  draftRounds: {
    2024: null,
    2025: null,
    2026: null
  },

  /* How long a successful Sleeper fetch stays cached in the browser, in
     minutes. Draft results don't change once the draft is done, but during
     a live draft you want this short. */
  sleeperCacheMinutes: 15
};
