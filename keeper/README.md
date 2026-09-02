# No Fun Allowed

Mobile-first hub for our 12-team fantasy football keeper league. Static HTML/CSS/JS —
no build step, no dependencies, no login. Share the link, open it on a phone.

**Tabs:** Keeper Calculator · Draft History. The 2024 / 2025 / 2026 season plates belong
to Draft History only — the calculator prices a player for the upcoming draft and is
single-year. Team roster / live roster view is a later phase and isn't built yet.

## Data status

| Season | Source | State |
| --- | --- | --- |
| 2026 | Sleeper API, league `1399177243342667776` | Live |
| 2025 | ESPN recap, hand-entered | 180 picks, 15 rounds × 12 teams |
| 2024 | ESPN recap, hand-entered | 180 picks, 15 rounds × 12 teams |

No draft data is invented anywhere. A season with nothing loaded renders a panel
saying what's missing, and a failed Sleeper fetch shows the error with a retry
rather than falling back to placeholders.

The 2024 and 2025 NFL club abbreviations are recorded as ESPN displayed them on
its recap page, which shows each player's *current* club rather than the one they
were on that season — so a few look wrong for the year (Aaron Rodgers as `FA` on
the 2024 board). Round, pick and fantasy team are what keeper math runs on; the
club is only there to tell players apart.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Markup and all styling |
| `app.js` | UI wiring: tabs, search, draft board, empty states |
| `rules.js` | The keeper rules engine — pure functions, no DOM |
| `sleeper.js` | Sleeper API client for the live 2026 draft |
| `teams.js` | Franchise name history and NFL club colours |
| `admin.html` | Unlisted commissioner console — Sleeper check, board validation, cache |
| `config.js` | League ID, seasons, draft-round counts |
| `data/drafts.js` | Hand-entered 2024 / 2025 boards (pre-Sleeper) |
| `tests/rules.test.js` | Rules-engine checks — `node keeper/tests/rules.test.js` |

## Adding a past season

Sleeper has no history before 2026 (the league moved from ESPN), so 2024 and 2025
are entered by hand. Paste rows into `data/drafts.js` and flip `complete` to `true`:

```js
2024: {
  source: 'manual', complete: true, rounds: 15,
  picks: [
    { round: 1, pick: 1, overall: 1, player: 'Player Name',
      position: 'RB', nflTeam: 'SF', fantasyTeam: 'Manager name' },
    …
  ]
}
```

`overall` is optional — it's derived from the round and pick numbers, so rows can
be pasted in any order.

Player names are matched across sources on a stripped-down form (case, periods,
apostrophes and generational suffixes removed), because ESPN and Sleeper don't
agree on spelling: `James Cook` in 2024 became `James Cook III` in 2025, and
`Deebo Samuel` became `Deebo Samuel Sr.` Without that, a kept player would split
into two entries and the calculator would lose their draft history — exactly the
thing it needs. The most recent season's spelling is the one displayed.

## Team names

Managers rename their team most years, so one franchise reads as three different
names across the three boards. **Every board shows the current (2026) name**, so a
team is recognisable at a glance and can be followed across seasons.

`data/drafts.js` is left alone — it stays the record of what a team was actually
called that year. The swap happens at load, and the historical name is kept on each
pick as `fantasyTeamHistorical`. Matching ignores case, spacing, punctuation and
emoji, because the boards were transcribed from screenshots where emoji didn't
always survive (`Da Bears💅` and `Da Bears` are the same franchise). A name with no
mapping is left as-is and logged with `console.warn` rather than silently showing
something stale.

The table lives in `teams.js`. When someone renames again, add the new name there.

## NFL club colours

Draft picks carry the club's primary colour from the official palettes, keyed off
the `NFL` column. Text on each chip is white or near-black, chosen by WCAG relative
luminance, so the light primaries (Steelers gold, Saints gold) stay readable
alongside the near-black ones (Raiders, Jaguars, Bears, Browns). Every chip carries
a faint outline, since several primaries are darker than the page itself.

Two pairs genuinely share a primary — Denver and Cincinnati on `#FB4F14`, Dallas and
the Rams on `#003594`. Those four carry a 3px stripe of their Color 2 along the
bottom so they stay tellable apart. ESPN and Sleeper spell some clubs differently
(`Wsh` vs `WAS`, `JAC` vs `JAX`), so abbreviations are normalised through an alias
table. Anything that isn't a club — `FA` for a free agent — gets a neutral outline
chip rather than a colour.

## Admin console

`admin.html` is the commissioner's page. It isn't linked from anywhere in the hub —
open it directly at `/keeper/admin.html`. It only reads and reports; nothing on it
changes the site.

- **Configuration** — league ID, seasons, cache window, as the app sees them.
- **Sleeper connection** — runs the same five calls the hub makes and names the
  cause when one fails. A blocked network, an ID from the wrong season, and a draft
  with no picks yet look identical from inside the app and need different fixes.
- **Draft board health** — re-runs the transcription checks in the browser: every
  round holds a full gapless set of picks, no player appears twice, every franchise
  owns one pick per round, every team name resolves to a current name, and every NFL
  code is one the colour table knows.
- **Cached data** — lists what's in `localStorage` with its age, and clears it.

**It is unlisted, not protected.** The site is static, so there is no server to check
a password against — anyone with the URL can open it. That's acceptable for what's
there: the league ID is already public in `config.js` and Sleeper's read API needs no
key. Don't put anything secret on that page. If it ever needs to be genuinely
private, it has to move somewhere with a backend.

The league-facing error state offers a retry and nothing else — diagnosing a Sleeper
failure is a commissioner job, not something to put in front of twelve people.

## Keeper rules as implemented

The rules document's prose ("one round *higher*") contradicts its own worked
example (Round 5 → kept for a 4th). **The worked example is implemented**, since it
is consistent across all three seasons.

- Max **2 keepers** per team, from last season's roster.
- Max **3 seasons** on a roster, acquisition season counted as season 1 — so a
  player can be kept twice, then returns to the pool.
- **Rounds 1–2 originals** cost a 1st every season, no exceptions.
- **Everyone else:** 1st keeper season = original round − 1; 2nd = that − 2.
  R5 → 4th → 2nd → pool. The ladder floors at a 1st rather than going below it.
- **Waiver pickups (OBJ Rule):** one round later than the player's ADP round;
  an ADP of the 10th or later is capped at the final round. Must have been
  rostered 3+ consecutive active weeks.

  The calculator shows this as static text rather than computing it. The boards
  only record drafted players, and nothing in them says how a player joined a
  roster — that needs the Sleeper feed, which isn't reporting yet. Once it is,
  this should switch to detecting the acquisition type and pricing it.
- **Injury exception:** a season where a rostered player scored in ≤3 games due to
  injury doesn't count toward the cap, and must be kept in the IR slot. The app
  only ever *flags* this — it is never applied automatically, because stats can
  tell you a player didn't score but not whether the cause was injury, a bench, or
  a waiver. `rules.js` supports it; the UI shows it as static guidance.

Nothing on a board records whether a player was **kept** — ESPN never captured it
and the Sleeper feed is down — so the calculator doesn't ask which keeper season a
player is in. It leads with the first-time cost and shows the whole ladder
underneath, which is the honest answer given what the data knows.

Three points the rules document leaves genuinely ambiguous, and the reading used here:

1. **Deep-ADP cap.** "ADP round 10 or later is capped at the final round" is read as
   *cost = the final round* for those players. The alternative reading (cost =
   min(ADP + 1, final round)) would make the "round 10" threshold pointless.
2. **Second keeper season for a waiver pickup.** The document only gives the OBJ
   Rule for the first year. The general ladder is applied afterward: prior cost − 2.
3. **What an injury-excused season does to the cost.** It is treated as if the
   season never happened — it neither burns a season against the cap nor advances
   the cost ladder.

Change any of these in `rules.js`; the tests in `tests/rules.test.js` pin the
current behaviour.
