/* Rules-engine checks. Run: node keeper/tests/rules.test.js */
'use strict';

var Rules = require('../rules.js');

var passed = 0;
var failures = [];

function check(name, actual, expected) {
  var a = JSON.stringify(actual);
  var e = JSON.stringify(expected);
  if (a === e) passed++;
  else failures.push(name + '\n    expected ' + e + '\n    actual   ' + a);
}

function cost(input) {
  var r = Rules.computeKeeperCost(Object.assign({ draftRounds: 15 }, input));
  return r.eligible ? r.cost : null;
}

/* ── The worked example from the rules doc: R5 → 4th → 2nd → pool ── */
check('R5, 1st keeper season → 4th', cost({ originalRound: 5, keeperSeason: 1 }), 4);
check('R5, 2nd keeper season → 2nd', cost({ originalRound: 5, keeperSeason: 2 }), 2);
check('R5, 3rd keeper season → ineligible', cost({ originalRound: 5, keeperSeason: 3 }), null);

/* ── Round 1/2 originals always cost a 1st ── */
check('R1, 1st keeper season → 1st', cost({ originalRound: 1, keeperSeason: 1 }), 1);
check('R1, 2nd keeper season → 1st', cost({ originalRound: 1, keeperSeason: 2 }), 1);
check('R2, 2nd keeper season → 1st', cost({ originalRound: 2, keeperSeason: 2 }), 1);

/* ── Ladder floors at the 1st round rather than going to zero ── */
check('R3, 1st keeper season → 2nd', cost({ originalRound: 3, keeperSeason: 1 }), 2);
check('R3, 2nd keeper season floors at 1st', cost({ originalRound: 3, keeperSeason: 2 }), 1);
check('R4, 2nd keeper season → 1st', cost({ originalRound: 4, keeperSeason: 2 }), 1);

/* ── Deeper picks ── */
check('R12, 1st keeper season → 11th', cost({ originalRound: 12, keeperSeason: 1 }), 11);
check('R12, 2nd keeper season → 9th', cost({ originalRound: 12, keeperSeason: 2 }), 9);

/* ── Term limit / final-season warning ── */
check('R5 season 2 is the final season',
  Rules.computeKeeperCost({ originalRound: 5, keeperSeason: 2, draftRounds: 15 }).isFinalSeason, true);
check('R5 season 1 is not the final season',
  Rules.computeKeeperCost({ originalRound: 5, keeperSeason: 1, draftRounds: 15 }).isFinalSeason, false);
check('R5 season 1 uses 2 roster seasons',
  Rules.computeKeeperCost({ originalRound: 5, keeperSeason: 1, draftRounds: 15 }).seasonsUsed, 2);

/* ── OBJ Rule: one round LATER than ADP ── */
check('waiver, ADP R2 → costs a 3rd',
  cost({ acquisition: 'waiver', adpRound: 2, keeperSeason: 1, waiverWeeksRosteredMet: true }), 3);
check('waiver, ADP R7 → costs an 8th',
  cost({ acquisition: 'waiver', adpRound: 7, keeperSeason: 1, waiverWeeksRosteredMet: true }), 8);
check('waiver, ADP R10 → capped at final round',
  cost({ acquisition: 'waiver', adpRound: 10, keeperSeason: 1, waiverWeeksRosteredMet: true }), 15);
check('waiver, ADP R14 → capped at final round',
  cost({ acquisition: 'waiver', adpRound: 14, keeperSeason: 1, waiverWeeksRosteredMet: true }), 15);
check('waiver, 2nd keeper season steps down 2 rounds',
  cost({ acquisition: 'waiver', adpRound: 7, keeperSeason: 2, waiverWeeksRosteredMet: true }), 6);

/* ── Waiver eligibility gate ── */
check('waiver under 3 weeks rostered → ineligible',
  Rules.computeKeeperCost({ acquisition: 'waiver', adpRound: 5, keeperSeason: 1, draftRounds: 15, waiverWeeksRosteredMet: false }).eligible, false);

/* ── Injury exception: excused season neither burns the cap nor advances cost ── */
check('R5 season 2 with 1 excused season still costs a 4th',
  cost({ originalRound: 5, keeperSeason: 2, injuryExemptSeasons: 1 }), 4);
check('R5 season 3 with 1 excused season is eligible',
  Rules.computeKeeperCost({ originalRound: 5, keeperSeason: 3, injuryExemptSeasons: 1, draftRounds: 15 }).eligible, true);
check('injury exception is never auto-applied by default',
  Rules.computeKeeperCost({ originalRound: 5, keeperSeason: 3, draftRounds: 15 }).eligible, false);

/* ── Candidate flagging only nominates, never decides ── */
check('3 scoring games while rostered all year → candidate',
  Rules.isInjuryExceptionCandidate(3, true), true);
check('4 scoring games → not a candidate', Rules.isInjuryExceptionCandidate(4, true), false);
check('not rostered all season → not a candidate', Rules.isInjuryExceptionCandidate(1, false), false);

/* ── Ordinals ── */
check('ordinal 1', Rules.ordinal(1), '1st');
check('ordinal 2', Rules.ordinal(2), '2nd');
check('ordinal 3', Rules.ordinal(3), '3rd');
check('ordinal 4', Rules.ordinal(4), '4th');
check('ordinal 11', Rules.ordinal(11), '11th');
check('ordinal 12', Rules.ordinal(12), '12th');
check('ordinal 13', Rules.ordinal(13), '13th');
check('ordinal 21', Rules.ordinal(21), '21st');

/* ── Missing inputs are reported, never guessed ── */
check('no original round → flagged incomplete',
  Rules.computeKeeperCost({ keeperSeason: 1, draftRounds: 15 }).incomplete, true);
check('no ADP round → flagged incomplete',
  Rules.computeKeeperCost({ acquisition: 'waiver', keeperSeason: 1, draftRounds: 15 }).incomplete, true);

if (failures.length) {
  console.error('\n' + failures.length + ' FAILED, ' + passed + ' passed\n');
  failures.forEach(function (f) { console.error('  ✗ ' + f); });
  process.exit(1);
}
console.log('✓ all ' + passed + ' rules-engine checks passed');
