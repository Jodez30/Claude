# Keeper Ledger

A keeper-cost lookup and draft-board browser for a 12-team, 15-round ESPN keeper
league. Built for phones — one shared link, no login, no app install.

`index.html` is the whole app. No build step, no dependencies, no server. Open
the file or serve the directory and it works.

## What it does

**Player Lookup** — search every drafted player across all loaded years and get
the round it would cost to keep them. Where the boards can prove it, the keeper
season is worked out automatically: a pick ESPN flagged `K` is traced back to the
season the player was actually drafted, so the app knows whether next year is
their 1st or 2nd (and final) keeper season. Toggle to **Waiver wire** to price a
pickup off ADP under the OBJ rule instead.

**Team Rosters** — pick a franchise and a year, get their full draft board.

The **Roster clock** on each player lays out all three seasons and the year they
return to the pool, so the term limit is visible rather than something you have
to work out.

## The rules, as implemented

| Situation | Cost |
| --- | --- |
| Originally drafted Round 1–2 | A 1st-round pick, every season |
| 1st keeper season | `original round − 1` |
| 2nd keeper season | `previous keeper cost − 2` |
| 3rd keeper season | Not eligible — back to the draft pool |
| Waiver pickup (OBJ rule) | `ADP round + 1` |
| Waiver pickup, ADP Round 10+ | The final round (15) |

Costs floor at Round 1 — a Round 3 player kept twice would compute to Round 0,
so it lands on a 1st.

Two rules can't be derived from a draft board and are surfaced as reminders on
every player rather than being calculated: waiver keepers must have been rostered
**3 consecutive active weeks**, and a season where an injured player scored in
**3 games or fewer** doesn't count toward the three-season limit (keep in IR).

The OBJ rule follows the direction set by the rulebook's own example — *"2nd
Round ADP = 3rd-Round pick cost"* — so a waiver keeper costs one round *later*
than their ADP, which is the discount that makes the Round 10+ floor mean
something.

## Draft data

Boards live in the `LEAGUE` object at the top of the `<script>` in `index.html`.
Each pick is a tuple:

```js
[round, pick, player, position, nflTeam, fantasyTeam, keptFlag]
```

`keptFlag` is `1` when ESPN marked the pick with a `K` (kept, not drafted) — that
flag is what lets the app trace a keeper back to their original draft round.

2024 and 2025 are loaded. **To add 2026**, fill in `years["2026"].picks` with the
same tuples and change its `status` from `"upcoming"` to `"complete"`. Nothing
else needs to change — the year selector, team dropdown, and search all read from
that object. Adding a year does not break the keeper tracing; it extends it.

The 2024 and 2025 boards were transcribed from ESPN screenshots. As a check on
both the transcription and the cost rules, all 16 traceable 2025 keepers land on
exactly the round the rules predict from their 2024 draft slot.

## Deploying

The app is a single static file, so any static host works.

**GitHub Pages** — Settings → Pages → Source: *Deploy from a branch* → pick the
branch and `/ (root)`. The app is served at the site root.

**Anything else** — `netlify deploy --prod`, drag the folder onto Netlify, or
`python3 -m http.server` locally. There is nothing to build.

## Development

```
node build-artifact.js   # regenerates artifact.html (a head/body-less copy for
                         # publishing the same page as a Claude Artifact)
```

Edit `index.html` only; `artifact.html` is generated from it.
