/* ──────────────────────────────────────────────────────────────
   Keeper rules engine
   Pure functions, no DOM. Loaded as a plain <script> in the browser
   (attaches to window.KeeperRules) and require()-able from Node for tests.

   Rules implemented (from the league rules doc):
   • Max 2 keepers per team.
   • A player may be rostered a max of 3 total seasons, counting the season
     they were acquired as season 1. So a player can be KEPT at most twice.
   • Players originally drafted in round 1 or 2 always cost a 1st to keep.
   • Everyone else:  1st keeper season = original round − 1
                     2nd keeper season = previous keeper cost − 2
     (worked example: R5 → 4th → 2nd → back to the pool)
   • Waiver pickups ("OBJ Rule"): cost is one round higher (later) than the
     player's ADP round in the upcoming draft.
   ────────────────────────────────────────────────────────────── */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KeeperRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Max total seasons a player may sit on one roster, acquisition year included. */
  var MAX_SEASONS_ON_ROSTER = 3;
  /* Rounds 1–2 originals are locked to this cost forever. */
  var PREMIUM_ROUND_CUTOFF = 2;
  /* The OBJ Rule's "deep ADP" threshold, past which cost drops to the last round. */
  var OBJ_DEEP_ADP_ROUND = 10;

  var ORDINAL_SUFFIX = ['th', 'st', 'nd', 'rd'];

  /* 1 → "1st", 12 → "12th" */
  function ordinal(n) {
    if (n == null || isNaN(n)) return '—';
    var v = Math.abs(n) % 100;
    var suffix = ORDINAL_SUFFIX[(v - 20) % 10] || ORDINAL_SUFFIX[v] || ORDINAL_SUFFIX[0];
    return n + suffix;
  }

  function clampRound(round, draftRounds) {
    if (round < 1) return 1;
    if (draftRounds && round > draftRounds) return draftRounds;
    return round;
  }

  /* Cost ladder for a player who entered the roster through the draft. */
  function draftKeeperCost(originalRound, keeperSeason, draftRounds) {
    if (originalRound <= PREMIUM_ROUND_CUTOFF) return 1;
    /* season 1: R−1.  season 2: (R−1)−2 = R−3. */
    var cost = originalRound - 1 - (keeperSeason - 1) * 2;
    return clampRound(cost, draftRounds);
  }

  /* OBJ Rule: one round later than ADP, with the deep-ADP floor. */
  function waiverKeeperCost(adpRound, keeperSeason, draftRounds) {
    var first = adpRound >= OBJ_DEEP_ADP_ROUND ? draftRounds : adpRound + 1;
    var cost = first - (keeperSeason - 1) * 2;
    return clampRound(cost, draftRounds);
  }

  /**
   * Compute what a player costs to keep, and whether they're even allowed to be kept.
   *
   * @param {Object} input
   * @param {'draft'|'waiver'} input.acquisition how the player joined the roster
   * @param {number}  input.originalRound   round drafted in (acquisition === 'draft')
   * @param {number}  input.adpRound        ADP round in the upcoming draft (acquisition === 'waiver')
   * @param {number}  input.keeperSeason    1 = first year being kept, 2 = second
   * @param {number}  input.draftRounds     total rounds in the upcoming draft
   * @param {number} [input.injuryExemptSeasons] seasons excused under the injury
   *        exception — must be confirmed by a human, never auto-applied
   * @param {boolean|null} [input.waiverWeeksRosteredMet] whether the 3-consecutive-week
   *        waiver eligibility bar was cleared; null = unknown
   * @returns {{eligible:boolean, cost:number|null, costLabel:string, seasonsUsed:number,
   *            isFinalSeason:boolean, reason:string|null, notes:string[]}}
   */
  function computeKeeperCost(input) {
    var acquisition = input.acquisition || 'draft';
    var keeperSeason = Number(input.keeperSeason) || 1;
    var draftRounds = Number(input.draftRounds) || null;
    var exempt = Number(input.injuryExemptSeasons) || 0;
    var notes = [];

    /* A confirmed injury season is treated as if it never happened — it neither
       burns a season against the cap nor advances the cost ladder. */
    var effectiveSeason = Math.max(1, keeperSeason - exempt);
    if (exempt > 0) {
      notes.push(
        exempt + ' season' + (exempt === 1 ? '' : 's') +
        ' excused under the injury exception — counted as keeper season ' +
        effectiveSeason + '. Player must be kept in the IR slot.'
      );
    }

    /* Acquisition season + every keeper season that actually counts. */
    var seasonsUsed = 1 + effectiveSeason;
    var isFinalSeason = seasonsUsed === MAX_SEASONS_ON_ROSTER;

    if (seasonsUsed > MAX_SEASONS_ON_ROSTER) {
      return {
        eligible: false,
        cost: null,
        costLabel: '—',
        seasonsUsed: seasonsUsed,
        isFinalSeason: false,
        reason: 'Term limit reached. This would be season ' + seasonsUsed +
          ' on the roster and the cap is ' + MAX_SEASONS_ON_ROSTER +
          '. The player returns to the general draft pool.',
        notes: notes
      };
    }

    var cost;
    if (acquisition === 'waiver') {
      var adpRound = Number(input.adpRound);
      if (!adpRound || adpRound < 1) {
        return invalid('Enter the player\'s ADP round in the upcoming draft.', seasonsUsed, notes);
      }
      if (!draftRounds) {
        return invalid('Set the number of rounds in the upcoming draft to apply the OBJ Rule.', seasonsUsed, notes);
      }
      cost = waiverKeeperCost(adpRound, effectiveSeason, draftRounds);
      if (effectiveSeason === 1) {
        notes.push(
          adpRound >= OBJ_DEEP_ADP_ROUND
            ? 'OBJ Rule: ADP of ' + ordinal(adpRound) + ' or later is capped at the final round (' + ordinal(draftRounds) + ').'
            : 'OBJ Rule: one round later than an ADP of ' + ordinal(adpRound) + '.'
        );
      } else {
        notes.push('Second keeper season: prior keeper cost − 2.');
      }
      if (input.waiverWeeksRosteredMet === false) {
        return {
          eligible: false, cost: null, costLabel: '—', seasonsUsed: seasonsUsed, isFinalSeason: false,
          reason: 'Not keeper-eligible: waiver pickups must be rostered at least 3 consecutive active weeks.',
          notes: notes
        };
      }
      if (input.waiverWeeksRosteredMet == null) {
        notes.push('Confirm the player was rostered 3+ consecutive active weeks — required for waiver keeper eligibility.');
      }
    } else {
      var originalRound = Number(input.originalRound);
      if (!originalRound || originalRound < 1) {
        return invalid('Enter the round the player was originally drafted in.', seasonsUsed, notes);
      }
      cost = draftKeeperCost(originalRound, effectiveSeason, draftRounds);
      if (originalRound <= PREMIUM_ROUND_CUTOFF) {
        notes.push(ordinal(originalRound) + '-round original: always costs a 1st, every season, no exceptions.');
      } else if (effectiveSeason === 1) {
        notes.push('First keeper season: original round − 1.');
      } else {
        notes.push('Second keeper season: prior keeper cost (' +
          ordinal(draftKeeperCost(originalRound, 1, draftRounds)) + ') − 2.');
      }
      if (originalRound > PREMIUM_ROUND_CUTOFF && originalRound - 1 - (effectiveSeason - 1) * 2 < 1) {
        notes.push('Ladder ran past the 1st round, so the cost floors at a 1st.');
      }
    }

    return {
      eligible: true,
      cost: cost,
      costLabel: ordinal(cost),
      seasonsUsed: seasonsUsed,
      isFinalSeason: isFinalSeason,
      reason: null,
      notes: notes
    };
  }

  function invalid(reason, seasonsUsed, notes) {
    return {
      eligible: false, cost: null, costLabel: '—', seasonsUsed: seasonsUsed,
      isFinalSeason: false, reason: reason, notes: notes, incomplete: true
    };
  }

  /**
   * Full cost ladder for a player, for showing "here's what the next few years look like".
   * Returns one row per keeper season the player could still have.
   */
  function costLadder(input) {
    var rows = [];
    for (var season = 1; season <= MAX_SEASONS_ON_ROSTER; season++) {
      var result = computeKeeperCost(Object.assign({}, input, { keeperSeason: season }));
      rows.push({ keeperSeason: season, result: result });
      if (!result.eligible && !result.incomplete) break;
    }
    return rows;
  }

  /**
   * The injury exception can never be auto-applied — this only nominates candidates.
   * A season is a candidate when the player was rostered all year but scored in
   * 3 or fewer games. Why (injury vs. bench vs. waived) is not knowable from stats.
   */
  function isInjuryExceptionCandidate(gamesScored, rosteredAllSeason) {
    return rosteredAllSeason === true && gamesScored != null && gamesScored <= 3;
  }

  return {
    MAX_SEASONS_ON_ROSTER: MAX_SEASONS_ON_ROSTER,
    MAX_KEEPERS_PER_TEAM: 2,
    PREMIUM_ROUND_CUTOFF: PREMIUM_ROUND_CUTOFF,
    OBJ_DEEP_ADP_ROUND: OBJ_DEEP_ADP_ROUND,
    ordinal: ordinal,
    computeKeeperCost: computeKeeperCost,
    costLadder: costLadder,
    isInjuryExceptionCandidate: isInjuryExceptionCandidate
  };
});
