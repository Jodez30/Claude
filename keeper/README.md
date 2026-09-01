# Keeper Hub

Mobile-first hub for our 12-team fantasy football keeper league. Static HTML/CSS/JS —
no build step, no dependencies, no login. Share the link, open it on a phone.

**Tabs:** Keeper Calculator · Draft History, with a global 2024 / 2025 / 2026 season selector.
Team roster / live roster view is a later phase and isn't built yet.

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
- **Injury exception:** a season where a rostered player scored in ≤3 games due to
  injury doesn't count toward the cap, and must be kept in the IR slot. The app
  only ever *flags* this — it is never applied automatically, because stats can
  tell you a player didn't score but not whether the cause was injury, a bench, or
  a waiver.

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
