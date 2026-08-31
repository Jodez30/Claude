# Keeper Ledger

A keeper-cost lookup and draft-board browser for a 12-team, 15-round ESPN keeper
league. Built for phones — one shared link, no login, no app install.

`index.html` is the whole app. No build step, no dependencies, no server. Open
the file or serve the directory and it works.

## What it does

Three tabs, one shared year selector. Every year carries its own colour — 2024
blue, 2025 amber, 2026 teal — through the selector, result rows, board headers
and history cards, so which board you're looking at reads at a glance.

**Keeper Cost** — search a drafted player and get the round it would cost to
keep them. Where the boards can prove it, the keeper season is worked out
automatically: a pick ESPN flagged `K` is traced back to the season the player
was actually drafted, so the app knows whether next year is their 1st or 2nd
(and final) keeper season. Toggle to **Waiver wire** to price a pickup off ADP
under the OBJ rule, or *price a pickup by hand* to enter an original round
directly for someone who isn't on a loaded board.

**Draft History** — with a year selected, the whole board round by round, with
the franchise on every pick. Search a player instead and you get their history
across every loaded board: who took them, where, and whether it was a keeper.

**Rosters** — one franchise's board for one year.

The **Roster clock** on each cost lookup lays out all three seasons and the year
the player returns to the pool, so the term limit is visible rather than
something you have to work out. Keeper Cost and Draft History cross-link, so you
can jump from a price to a player's history and back.

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

The app is a single static file, so any static host works. There is nothing to
build.

**GitHub Pages requires a public repository** on a free plan. `Jodez30/Claude`
is currently private, so Pages is unavailable on it until either the repo is
made public or the account is on GitHub Pro. Pages also cannot be switched on
through the API from this setup — the Pages REST endpoint is unreachable and the
Actions `GITHUB_TOKEN` is not granted the Pages permission — so the switch has
to be flipped in the web UI once.

Once the repo is public:

**Settings → Pages → Source: *Deploy from a branch* → branch → `/ (root)` → Save.**

That serves `index.html` at the site root and republishes on every push. Nothing
else is needed; `.github/workflows/pages.yml` is only for the *GitHub Actions*
Pages source and is manual-trigger-only so it doesn't fail red while Pages is
off.

**Anything else** — `netlify deploy --prod`, drag the folder onto Netlify, or
`python3 -m http.server` locally.

## Development

```
node build-artifact.js   # regenerates artifact.html (a head/body-less copy for
                         # publishing the same page as a Claude Artifact)
```

Edit `index.html` only; `artifact.html` is generated from it.
