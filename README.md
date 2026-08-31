# Keeper Ledger

A keeper-cost lookup and draft-board browser for a 12-team, 15-round ESPN keeper
league. Built for phones — one shared link, no login, no app install.

`index.html` is the whole app. No build step, no dependencies, no server. Open
the file or serve the directory and it works.

## What it does

A slide-out menu holds three standalone sections, over one shared year selector.

**Keeper Calculator** — everything keeper-related in one place. Search a drafted
player and get the round it would cost to keep them, the player's own **keeper
history**, and the league rules, without leaving the section.

The history is what makes the cost trustworthy: it lists every board the player
appears on, whether each pick was a draft or a keeper, and what that makes their
roster-season count. A pick ESPN flagged `K` is traced back to the season the
player was actually drafted, so the app works out whether next year is their 1st
or 2nd (and final) keeper season instead of asking. That stays overridable.

Toggle to **Waiver wire** to price a pickup off ADP under the OBJ rule, or
*price a pickup by hand* to enter an original round directly for someone who
isn't on a loaded board.

**Draft History** — a whole year's board, round by round, with the franchise on
every pick. Search a player instead and you get their history across every
loaded board: who took them, where, and whether it was a keeper.

**Team Rosters** — one franchise's board for one year.

The **Roster clock** on each cost lookup lays out all three seasons and the year
the player returns to the pool, so the term limit is visible rather than
something you have to work out.

## Design

Off-black ground, silver structure, gold reserved for the one thing that costs
you something — the keeper round. Nothing else on the page is gold.

Draft years are keyed to metals, oldest to newest: **2024 bronze, 2025 silver,
2026 gold**. Each year keeps its metal everywhere it appears — the year
selector, search results, board headers, roster counts, history rows — and holds
it while idle, so the boards stay distinguishable at rest rather than only on
tap. Position pills are deliberately desaturated so they sit under the metals
instead of fighting them.

The drawer parks offscreen via `transform` rather than `visibility`, because a
transitioned `visibility` stays computed-hidden long enough to swallow the
`focus()` call that moves keyboard focus into the menu. `inert` is what keeps the
closed drawer out of the tab order and the accessibility tree.

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

**Live at https://jodez30.github.io/Claude/**

GitHub Pages serves this repo with **Source: *Deploy from a branch*** pointed at
`claude/fantasy-keeper-league-app-cy241r` and `/ (root)`. Every push to that
branch triggers GitHub's own `pages-build-deployment` run and republishes the
site — there is nothing to build and no workflow to invoke.

`.nojekyll` keeps Pages from running the files through Jekyll. The app is plain
HTML that Jekyll would only copy anyway, but skipping it removes any chance of
Liquid syntax (`{{`, `{%`) inside the JavaScript being mangled, and makes the
build faster.

`.github/workflows/pages.yml` is unused in this setup. It exists only for the
alternative *GitHub Actions* Pages source, and is manual-trigger-only so it
never runs or fails on its own. If you switch the source, run it from the
Actions tab.

Note that Pages serves the whole branch root, so anything else committed
alongside `index.html` is reachable on the site too.

**Anywhere else** — `netlify deploy --prod`, drag the folder onto Netlify, or
`python3 -m http.server` locally. It's one static file.

## Development

```
node build-artifact.js   # regenerates artifact.html (a head/body-less copy for
                         # publishing the same page as a Claude Artifact)
```

Edit `index.html` only; `artifact.html` is generated from it.
