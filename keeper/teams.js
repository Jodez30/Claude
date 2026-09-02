/* ──────────────────────────────────────────────────────────────
   Team identity: fantasy franchise names, and NFL club colours.

   Two separate concerns that both answer "what do we call/paint this
   team", kept together so there is one place to edit when a manager
   renames their team again.
   ────────────────────────────────────────────────────────────── */
window.Teams = (function () {
  'use strict';

  /* ── Fantasy franchises ──────────────────────────────────────
     Managers rename their team most years, so the same franchise reads
     as three different names across the three boards. Every board shows
     the CURRENT (2026) name so a franchise is recognisable at a glance
     and can be followed across seasons.

     The draft data itself is left untouched — it stays the historical
     record of what the team was called that year. Only the display name
     is swapped.

     Keyed by season, because a name is only unambiguous within its own
     season. Matching is done on a squashed form (case, spaces,
     punctuation and emoji removed) since the boards were transcribed
     from screenshots where emoji didn't always survive. */
  var FRANCHISE_2026 = {
    2024: {
      "JJ's Torn Meniscus":            "THIS IS JJ'S YEAR",
      "ACE":                           'Sarantoga',
      "Nabers think I'm selling dope": 'NoseMan17',
      'Stable Master':                 'TakeOver',
      '5IVE TIME':                     '5IVE TIME',
      'KIRK IS A TERRORIST':           'yuumismom',
      'Green Ti':                      'buuubuuu',
      'Da Bears💅':                    'Iceman MVP',
      'Legion of Coom':                'Come Take These Dakshots',
      'THE FADEDBOYZ':                 'JaSwitch',
      "Georgia's Uber Driver":         'Off in the Shower',
      'Cucamonga Cracka Killaz':       'Cucamonga Cracka Killaz'
    },
    2025: {
      "the voices in josh's head":  "THIS IS JJ'S YEAR",
      'ACE':                        'Sarantoga',
      'Nose':                       'NoseMan17',
      'Stable Master':              'TakeOver',
      '5IVE TIME':                  '5IVE TIME',
      'Boss Allen':                 'yuumismom',
      'FootballDemon😈':            'buuubuuu',
      'Da Bears💅':                 'Iceman MVP',
      'Come Take These Dakshots':   'Come Take These Dakshots',
      'Njigbas in paris🛩️':         'JaSwitch',
      'Taking Time to Heal':        'Off in the Shower',
      'Cucamonga Cracka Killaz':    'Cucamonga Cracka Killaz'
    }
    /* 2026 needs no mapping — Sleeper already reports current names. */
  };

  /* Emoji, apostrophes, spacing and case all vary between the Sleeper
     app and a transcribed screenshot; none of them identify a team. */
  function squash(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  var bySeason = {};
  Object.keys(FRANCHISE_2026).forEach(function (season) {
    var lookup = {};
    var table = FRANCHISE_2026[season];
    Object.keys(table).forEach(function (oldName) {
      lookup[squash(oldName)] = table[oldName];
    });
    bySeason[season] = lookup;
  });

  /**
   * The 2026 name for a franchise, given whatever it was called that season.
   * Returns null when the name isn't in the table, so callers can surface
   * the gap rather than silently displaying a stale name.
   */
  function currentName(season, historicalName) {
    var lookup = bySeason[season];
    if (!lookup) return historicalName || null;   /* 2026 is already current */
    return lookup[squash(historicalName)] || null;
  }

  /* ── NFL clubs ───────────────────────────────────────────────
     Primary colours from the official club palettes. Denver and
     Cincinnati genuinely share #FB4F14, and Dallas and the Rams share
     #003594 — those pairs carry a Color 2 stripe so they stay tellable
     apart at a glance. */
  var CLUBS = {
    BAL: { primary: '#1A195F' },
    CIN: { primary: '#FB4F14', stripe: '#000000' },  /* shares orange with DEN */
    CLE: { primary: '#311D00' },
    PIT: { primary: '#FFB612' },
    BUF: { primary: '#00338D' },
    MIA: { primary: '#008E97' },
    NE:  { primary: '#002244' },
    NYJ: { primary: '#125740' },
    HOU: { primary: '#03202F' },
    IND: { primary: '#002C5F' },
    JAX: { primary: '#101820' },
    TEN: { primary: '#0C2340' },
    DEN: { primary: '#FB4F14', stripe: '#002244' },  /* shares orange with CIN */
    KC:  { primary: '#E31837' },
    LV:  { primary: '#000000' },
    LAC: { primary: '#0080C6' },
    CHI: { primary: '#0B162A' },
    DET: { primary: '#0076B6' },
    GB:  { primary: '#183028' },
    MIN: { primary: '#4F2683' },
    DAL: { primary: '#003594', stripe: '#869397' },  /* shares blue with LAR */
    NYG: { primary: '#012952' },
    PHI: { primary: '#004C54' },
    WAS: { primary: '#5A1414' },
    ATL: { primary: '#A71930' },
    CAR: { primary: '#0085CA' },
    NO:  { primary: '#D3BC8D' },
    TB:  { primary: '#D50A0A' },
    ARI: { primary: '#97233F' },
    LAR: { primary: '#003594', stripe: '#FFA300' },  /* shares blue with DAL */
    SF:  { primary: '#AA0000' },
    SEA: { primary: '#002244' }
  };

  /* ESPN and Sleeper don't spell every club the same way. */
  var ALIASES = {
    WSH: 'WAS', WFT: 'WAS',
    JAC: 'JAX',
    LA: 'LAR', STL: 'LAR',
    SD: 'LAC',
    OAK: 'LV', LVR: 'LV',
    KAN: 'KC', SFO: 'SF', TAM: 'TB', NOR: 'NO', GNB: 'GB', NWE: 'NE'
  };

  function normalizeClub(abbr) {
    var key = String(abbr || '').toUpperCase().replace(/[^A-Z]/g, '');
    return ALIASES[key] || key;
  }

  /* WCAG relative luminance, to pick readable text on each club colour. */
  function luminance(hex) {
    var c = hex.replace('#', '');
    var channels = [0, 2, 4].map(function (i) {
      var v = parseInt(c.substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  /**
   * Chip styling for an NFL club abbreviation, or null for anything that
   * isn't a club — "FA" for a free agent, or a blank from a bad row.
   * Several primaries (Raiders black, Browns brown, Jaguars, Bears) are
   * darker than the page itself, so the chip always carries a faint
   * outline to stay readable as a chip.
   */
  function clubStyle(abbr) {
    var key = normalizeClub(abbr);
    var club = CLUBS[key];
    if (!club) return null;
    return {
      code: key,
      background: club.primary,
      /* Near-black reads better than pure black on the light primaries. */
      color: luminance(club.primary) > 0.35 ? '#0A1420' : '#FFFFFF',
      stripe: club.stripe || null
    };
  }

  return {
    currentName: currentName,
    clubStyle: clubStyle,
    normalizeClub: normalizeClub,
    /* exposed for tests */
    _squash: squash,
    _clubs: CLUBS,
    _franchises: FRANCHISE_2026
  };
})();
