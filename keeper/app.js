/* ──────────────────────────────────────────────────────────────
   No Fun Allowed — UI wiring.
   Reads config.js, data/drafts.js and the Sleeper API, and drives the
   two tabs. No framework, no build step; everything runs from the file.
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CONFIG = window.LEAGUE_CONFIG;
  var RULES = window.KeeperRules;
  var MANUAL = (window.KEEPER_DATA && window.KEEPER_DATA.seasons) || {};

  var state = {
    /* Only the Draft History tab is season-scoped; the calculator prices a
       player for the upcoming draft and has no year selector. */
    season: CONFIG.defaultSeason,
    tab: 'calculator',
    /* season → { status:'loading'|'ready'|'empty'|'error'|'unconfigured', ... } */
    seasons: {},
    selected: null,
    sort: { key: 'overall', dir: 'asc' },
    teamFilter: ''
  };

  var el = {};
  ['leagueLabel', 'yearSelector', 'playerSearch', 'searchResults', 'searchEmpty', 'selectedPlayer',
   'verdictCost', 'verdictCap', 'verdictNotes', 'ladder', 'teamFilter', 'boardLabel', 'boardContent'
  ].forEach(function (id) { el[id] = document.getElementById(id); });

  /* ── helpers ───────────────────────────────────────────────── */

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function posBadge(position) {
    return h('span', { class: 'pos pos-' + (position || '').toUpperCase(), text: position || '—' });
  }

  function note(kind, text) { return h('div', { class: 'note ' + kind, text: text }); }

  /* NFL club chip, painted in that club's primary. Returns a neutral chip
     for anything that isn't a club — "FA" for a free agent, mainly. */
  function nflChip(abbr) {
    var style = window.Teams.clubStyle(abbr);
    if (!style) {
      return h('span', { class: 'nfl-chip nfl-chip-none', text: abbr || '—' });
    }
    var chip = h('span', { class: 'nfl-chip', text: style.code });
    chip.style.backgroundColor = style.background;
    chip.style.color = style.color;
    /* Denver/Cincinnati and Dallas/the Rams genuinely share a primary, so
       those four carry their Color 2 along the bottom to stay tellable apart. */
    if (style.stripe) chip.style.borderBottom = '3px solid ' + style.stripe;
    return chip;
  }

  function emptyState(icon, title, bodyHtml, action) {
    var box = h('div', { class: 'empty' }, [
      h('div', { class: 'empty-icon', text: icon }),
      h('div', { class: 'empty-title', text: title }),
      h('div', { class: 'empty-body', html: bodyHtml })
    ]);
    if (action) box.appendChild(action);
    return box;
  }

  /* Round count we can derive without asking: explicit config, then Sleeper,
     then whatever the loaded board actually contains. Never guessed. */
  function draftRoundsFromData(season) {
    var configured = CONFIG.draftRounds && CONFIG.draftRounds[season];
    if (configured) return configured;
    var data = state.seasons[season];
    if (data && data.rounds) return data.rounds;
    if (data && data.picks && data.picks.length) {
      return data.picks.reduce(function (max, p) { return Math.max(max, p.round || 0); }, 0) || null;
    }
    return null;
  }

  /* Rounds in the draft the calculator is pricing for. Prefers the current
     season, then falls back to the most recent board that knows — the count
     only shifts if the league changes its draft length. */
  function upcomingDraftRounds() {
    var seasons = CONFIG.seasons.slice().sort(function (a, b) { return b - a; });
    for (var i = 0; i < seasons.length; i++) {
      var rounds = draftRoundsFromData(seasons[i]);
      if (rounds) return rounds;
    }
    return null;
  }

  /* ── data loading ──────────────────────────────────────────── */

  function loadManualSeason(season) {
    var raw = MANUAL[season];
    if (!raw || !raw.complete || !raw.picks || !raw.picks.length) {
      state.seasons[season] = {
        status: 'empty',
        source: 'manual',
        picks: [],
        message: 'The ' + season + ' draft was on ESPN, so it has to be entered by hand. ' +
          'Nothing has been added yet — send the ' + season + ' draft board (screenshot, CSV or ' +
          'pasted text) and it goes into <code>keeper/data/drafts.js</code>.'
      };
      return;
    }
    /* Derive the overall pick number from round/pick so the board sorts right
       even if rows get pasted in out of order. */
    var perRound = raw.picks.reduce(function (max, p) { return Math.max(max, p.pick || 0); }, 0);
    var picks = raw.picks.map(function (p, i) {
      var overall = p.overall;
      if (overall == null) overall = perRound ? (p.round - 1) * perRound + p.pick : i + 1;
      return Object.assign({}, p, { overall: overall });
    });
    /* Every board shows the franchise's CURRENT name, so a team is
       recognisable across seasons. The historical name is kept alongside
       rather than thrown away. */
    var unmapped = [];
    picks = picks.map(function (pick) {
      var current = window.Teams.currentName(season, pick.fantasyTeam);
      if (!current && unmapped.indexOf(pick.fantasyTeam) === -1) unmapped.push(pick.fantasyTeam);
      return Object.assign({}, pick, {
        fantasyTeam: current || pick.fantasyTeam,
        fantasyTeamHistorical: pick.fantasyTeam
      });
    });
    if (unmapped.length) {
      /* Loud rather than silently showing a stale name. */
      console.warn('No 2026 name mapped for ' + season + ' team(s): ' + unmapped.join(', '));
    }

    state.seasons[season] = {
      status: 'ready', source: 'manual', picks: picks, rounds: raw.rounds || null
    };
  }

  function loadSleeperSeason(season) {
    if (!CONFIG.sleeperLeagueId) {
      state.seasons[season] = {
        status: 'unconfigured', source: 'sleeper', picks: [],
        message: 'The ' + season + ' draft is live on Sleeper, but the league ID hasn\'t been set yet. ' +
          'Drop it into <code>sleeperLeagueId</code> in <code>keeper/config.js</code> — it\'s the number ' +
          'in your Sleeper URL, <code>sleeper.com/leagues/<b>1234…</b>/team</code>.'
      };
      render();
      return;
    }

    state.seasons[season] = { status: 'loading', source: 'sleeper', picks: [] };
    render();

    window.SleeperAPI.loadDraft(CONFIG.sleeperLeagueId, {
      cacheMinutes: CONFIG.sleeperCacheMinutes,
      force: false
    }).then(function (result) {
      if (!result.picks.length) {
        state.seasons[season] = {
          status: 'empty', source: 'sleeper', picks: [], rounds: result.rounds,
          leagueName: result.leagueName,
          message: result.emptyReason || 'Sleeper returned no picks for this draft yet.'
        };
      } else {
        state.seasons[season] = {
          status: 'ready', source: 'sleeper', picks: result.picks,
          rounds: result.rounds, leagueName: result.leagueName,
          draftStatus: result.draftStatus, fromCache: result.fromCache
        };
      }
      buildPlayerIndex();
      render();
    }).catch(function (err) {
      state.seasons[season] = {
        status: 'error', source: 'sleeper', picks: [],
        /* sleeper.js already phrases a complete, accurate sentence per failure
           mode — don't prefix it with a cause it may contradict. */
        message: err.message + '<br><br>Nothing is shown for ' + season +
          ' rather than guessing at picks.'
      };
      render();
    });
  }

  function loadAll() {
    CONFIG.seasons.forEach(function (season) {
      if (MANUAL[season]) loadManualSeason(season);
      else loadSleeperSeason(season);
    });
    buildPlayerIndex();
  }

  /* ── player index (search across every loaded season) ──────── */

  var playerIndex = [];

  /* Sources disagree on how a player's name is written — ESPN added generational
     suffixes between 2024 and 2025 (James Cook vs James Cook III, Deebo Samuel vs
     Deebo Samuel Sr.), and Sleeper punctuates differently again. Matching on a
     stripped-down form keeps one player from splitting into several entries,
     which would hide exactly the draft history the calculator needs. */
  function nameKey(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/[.'’]/g, '')
      .replace(/\s+(jr|sr|ii|iii|iv|v)$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildPlayerIndex() {
    var byKey = {};
    CONFIG.seasons.forEach(function (season) {
      var data = state.seasons[season];
      if (!data || data.status !== 'ready') return;
      data.picks.forEach(function (pick) {
        var key = nameKey(pick.player) + '|' + (pick.position || '');
        if (key.charAt(0) === '|') return;
        if (!byKey[key]) byKey[key] = { key: key, position: pick.position, seasons: [] };
        byKey[key].seasons.push({
          season: season, round: pick.round, pick: pick.pick,
          fantasyTeam: pick.fantasyTeam, name: pick.player, nflTeam: pick.nflTeam
        });
      });
    });
    playerIndex = Object.keys(byKey).map(function (k) {
      var entry = byKey[k];
      entry.seasons.sort(function (a, b) { return b.season - a.season; });
      /* Show the most recent season's spelling and club. */
      entry.name = entry.seasons[0].name;
      entry.nflTeam = entry.seasons[0].nflTeam;
      return entry;
    });
    playerIndex.sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  function searchPlayers(query) {
    var q = query.toLowerCase().trim();
    if (q.length < 2) return [];
    var starts = [], contains = [];
    playerIndex.forEach(function (p) {
      var name = p.name.toLowerCase();
      if (name.indexOf(q) === 0 || name.split(' ').some(function (w) { return w.indexOf(q) === 0; })) starts.push(p);
      else if (name.indexOf(q) > -1) contains.push(p);
    });
    return starts.concat(contains).slice(0, 25);
  }

  /* ── calculator ────────────────────────────────────────────── */

  function renderSearch() {
    var query = el.playerSearch.value;
    clear(el.searchResults);
    clear(el.searchEmpty);

    if (state.selected || query.trim().length < 2) return;

    var anyLoaded = playerIndex.length > 0;
    if (!anyLoaded) {
      el.searchEmpty.appendChild(note('info',
        'No draft data is loaded yet, so there\'s nothing to search. You can still compute a cost ' +
        'by typing the original round below.'));
      return;
    }

    var matches = searchPlayers(query);
    if (!matches.length) {
      el.searchEmpty.appendChild(note('info', 'No drafted player matches "' + query.trim() + '".'));
      return;
    }

    matches.forEach(function (player) {
      var recent = player.seasons[0];
      var button = h('button', { type: 'button', class: 'result' }, [
        posBadge(player.position),
        h('div', { class: 'result-grow' }, [
          h('div', { class: 'result-name', text: player.name }),
          h('div', {
            class: 'result-meta',
            text: player.nflTeam + ' · ' + player.seasons.map(function (s) { return s.season; }).join(', ')
          })
        ]),
        h('div', { class: 'result-round', text: recent.season + ' R' + recent.round })
      ]);
      button.addEventListener('click', function () { selectPlayer(player); });
      el.searchResults.appendChild(button);
    });
  }

  function selectPlayer(player) {
    state.selected = player;
    el.playerSearch.value = '';
    render();
  }

  function clearPlayer() {
    state.selected = null;
    render();
  }

  function renderSelected() {
    if (!state.selected) { el.selectedPlayer.hidden = true; clear(el.selectedPlayer); return; }
    var player = state.selected;
    el.selectedPlayer.hidden = false;
    clear(el.selectedPlayer);

    var clearBtn = h('button', { type: 'button', class: 'btn-clear', text: 'Change' });
    clearBtn.addEventListener('click', clearPlayer);

    el.selectedPlayer.appendChild(h('div', { class: 'selected', style: 'margin-top:12px' }, [
      posBadge(player.position),
      h('div', { class: 'result-grow' }, [
        h('div', { class: 'selected-name', text: player.name }),
        h('div', { class: 'selected-meta' }, [nflChip(player.nflTeam)])
      ]),
      clearBtn
    ]));

    var history = h('div', { style: 'margin-top:10px' });
    player.seasons.forEach(function (s) {
      history.appendChild(h('div', { class: 'history-line' }, [
        h('span', { html: '<b>' + s.season + '</b> · Round ' + s.round + ', Pick ' + s.pick }),
        h('span', { text: s.fantasyTeam })
      ]));
    });
    el.selectedPlayer.appendChild(history);
  }

  /* The boards say what round a player went in; nothing in them says whether
     he was then KEPT. ESPN never recorded it and the Sleeper feed is down, so
     rather than ask the reader to pick a keeper season, the whole ladder is
     shown and the headline is the first-time cost. */
  function calculatorInput(keeperSeason) {
    var player = state.selected;
    var source = player && player.seasons[0];
    return {
      acquisition: 'draft',
      originalRound: source ? source.round : null,
      keeperSeason: keeperSeason || 1,
      draftRounds: upcomingDraftRounds(),
      injuryExemptSeasons: 0
    };
  }

  function renderVerdict() {
    clear(el.verdictNotes);

    if (!state.selected) {
      el.verdictCost.textContent = '—';
      el.verdictCost.className = 'verdict-cost';
      el.verdictCap.textContent = 'Search for a player above';
      el.ladder.hidden = true;
      return;
    }

    var input = calculatorInput(1);
    var result = RULES.computeKeeperCost(input);
    var source = state.selected.seasons[0];

    if (!result.eligible) {
      el.verdictCost.textContent = 'Not eligible';
      el.verdictCost.className = 'verdict-cost blocked';
      el.verdictCap.textContent = 'Back to the general draft pool';
      el.verdictNotes.appendChild(note('danger', result.reason));
    } else {
      el.verdictCost.textContent = result.costLabel;
      el.verdictCost.className = 'verdict-cost';
      el.verdictCap.textContent = 'round pick · first season kept';
      result.notes.forEach(function (text) { el.verdictNotes.appendChild(note('info', text)); });
    }

    el.verdictNotes.appendChild(note('info',
      'Based on ' + state.selected.name + ' going in round ' + source.round +
      ' of the ' + source.season + ' draft. If he has already been kept once, ' +
      'read the second row of the ladder instead.'));

    renderLadder();
  }

  function renderLadder() {
    var body = el.ladder.querySelector('tbody');
    clear(body);
    if (!state.selected) { el.ladder.hidden = true; return; }
    el.ladder.hidden = false;

    RULES.costLadder(calculatorInput(1)).forEach(function (row) {
      var eligible = row.result.eligible;
      var label = row.keeperSeason === 1 ? '1st kept'
                : row.keeperSeason === 2 ? '2nd kept' : '3rd kept';
      body.appendChild(h('tr', {}, [
        h('td', { text: label }),
        h('td', {
          class: eligible ? '' : 'out',
          text: eligible ? (row.result.isFinalSeason ? 'Final season' : 'Keepable') : 'Back to pool'
        }),
        h('td', { class: 'cost' + (eligible ? '' : ' out'), text: eligible ? row.result.costLabel : '—' })
      ]));
    });
  }

  function renderCalculator() {
    renderSearch();
    renderSelected();
    renderVerdict();
  }

  /* ── draft history ─────────────────────────────────────────── */

  function renderTeamFilter() {
    var data = state.seasons[state.season];
    var teams = [];
    if (data && data.status === 'ready') {
      var seen = {};
      data.picks.forEach(function (p) {
        if (p.fantasyTeam && !seen[p.fantasyTeam]) { seen[p.fantasyTeam] = true; teams.push(p.fantasyTeam); }
      });
      teams.sort();
    }
    if (teams.indexOf(state.teamFilter) === -1) state.teamFilter = '';

    clear(el.teamFilter);
    el.teamFilter.appendChild(h('option', { value: '', text: teams.length ? 'All teams' : 'No teams loaded' }));
    teams.forEach(function (team) {
      el.teamFilter.appendChild(h('option', { value: team, text: team }));
    });
    el.teamFilter.value = state.teamFilter;
    el.teamFilter.disabled = !teams.length;
  }

  var COLUMNS = [
    { key: 'overall', label: 'Pick', cell: function (p) { return h('td', { class: 'cell-pick', text: p.round + '.' + String(p.pick).padStart(2, '0') }); } },
    { key: 'player',  label: 'Player', cell: function (p) { return h('td', { class: 'cell-player', text: p.player }); } },
    { key: 'position', label: 'Pos', cell: function (p) { return h('td', {}, [posBadge(p.position)]); } },
    { key: 'nflTeam', label: 'NFL', cell: function (p) { return h('td', { class: 'cell-nfl' }, [nflChip(p.nflTeam)]); } },
    { key: 'fantasyTeam', label: 'Team', cell: function (p) { return h('td', { class: 'cell-team', text: p.fantasyTeam }); } }
  ];

  function sortPicks(picks) {
    var key = state.sort.key, dir = state.sort.dir === 'asc' ? 1 : -1;
    return picks.slice().sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir || (a.overall - b.overall);
    });
  }

  function renderBoard() {
    var data = state.seasons[state.season];
    clear(el.boardContent);
    el.boardLabel.textContent = state.season + ' draft board';

    if (!data || data.status === 'loading') {
      el.boardContent.appendChild(emptyState('⏳', 'Loading from Sleeper…', 'Fetching the ' + state.season + ' draft.'));
      return;
    }

    if (data.status !== 'ready') {
      /* Retry only. Diagnosing a Sleeper failure is a commissioner job, and
         lives in the unlisted admin console rather than in front of the
         whole league. */
      var action = null;
      if (data.source === 'sleeper' && data.status !== 'unconfigured') {
        action = h('button', { class: 'btn', type: 'button', text: 'Try Sleeper again' });
        action.addEventListener('click', function () {
          window.SleeperAPI.clearCache();
          loadSleeperSeason(state.season);
        });
      }
      var titles = {
        empty: 'No ' + state.season + ' draft data yet',
        unconfigured: 'Sleeper league ID not set',
        error: 'Couldn\'t load ' + state.season
      };
      el.boardContent.appendChild(emptyState(
        data.status === 'error' ? '⚠️' : '📥', titles[data.status], data.message, action));
      return;
    }

    var picks = state.teamFilter
      ? data.picks.filter(function (p) { return p.fantasyTeam === state.teamFilter; })
      : data.picks;

    if (!picks.length) {
      el.boardContent.appendChild(emptyState('🔍', 'No picks for this team', 'Nothing recorded for ' + state.teamFilter + ' in ' + state.season + '.'));
      return;
    }

    var columns = COLUMNS.filter(function (c) { return !(c.key === 'fantasyTeam' && state.teamFilter); });

    var headRow = h('tr');
    columns.forEach(function (col) {
      var th = h('th', {
        text: col.label,
        'aria-sort': state.sort.key === col.key ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
      });
      th.addEventListener('click', function () {
        if (state.sort.key === col.key) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
        else state.sort = { key: col.key, dir: 'asc' };
        renderBoard();
      });
      headRow.appendChild(th);
    });

    var body = h('tbody');
    var sorted = sortPicks(picks);
    /* In natural pick order the board reads better broken up by round. */
    var groupByRound = state.sort.key === 'overall' && state.sort.dir === 'asc' && !state.teamFilter;
    var lastRound = null;
    sorted.forEach(function (pick) {
      if (groupByRound && pick.round !== lastRound) {
        lastRound = pick.round;
        body.appendChild(h('tr', { class: 'round-head' }, [
          h('td', { colspan: columns.length, text: 'Round ' + pick.round })
        ]));
      }
      body.appendChild(h('tr', {}, columns.map(function (col) { return col.cell(pick); })));
    });

    var table = h('table', { class: 'board' }, [h('thead', {}, [headRow]), body]);
    el.boardContent.appendChild(h('div', { class: 'table-scroll' }, [table]));

    var summary = picks.length + ' pick' + (picks.length === 1 ? '' : 's') +
      (data.source === 'sleeper' ? ' · live from Sleeper' : ' · entered manually');
    el.boardContent.appendChild(h('div', { class: 'empty-body', style: 'margin-top:12px;text-align:center', text: summary }));
  }

  /* ── chrome ────────────────────────────────────────────────── */

  function renderYearSelector() {
    clear(el.yearSelector);
    CONFIG.seasons.slice().sort().forEach(function (season) {
      var button = h('button', {
        type: 'button', role: 'tab', text: String(season),
        'aria-selected': String(season === state.season)
      });
      button.addEventListener('click', function () {
        state.season = season;
        render();
      });
      el.yearSelector.appendChild(button);
    });
  }

  function renderLeagueLabel() {
    var data = state.seasons[state.season];
    var name = (data && data.leagueName) || CONFIG.leagueName;
    var rounds = state.tab === 'history' ? draftRoundsFromData(state.season) : upcomingDraftRounds();
    /* Abbreviated — this sits on one line beside the title on a phone. */
    el.leagueLabel.textContent = name + (rounds ? ' · ' + rounds + ' rds' : '');
  }

  function render() {
    renderYearSelector();
    renderLeagueLabel();
    /* The calculator is single-year, so the season plates only belong to
       Draft History. The header keeps its own padding when they're gone. */
    var seasonsHidden = state.tab !== 'history';
    el.yearSelector.hidden = seasonsHidden;
    document.querySelector('.header').classList.toggle('no-seasons', seasonsHidden);
    document.getElementById('panel-calculator').hidden = state.tab !== 'calculator';
    document.getElementById('panel-history').hidden = state.tab !== 'history';
    if (state.tab === 'calculator') renderCalculator();
    else { renderTeamFilter(); renderBoard(); }
  }

  /* ── events ────────────────────────────────────────────────── */

  Array.prototype.forEach.call(document.querySelectorAll('.tabbar button'), function (button) {
    button.addEventListener('click', function () {
      state.tab = button.dataset.tab;
      Array.prototype.forEach.call(document.querySelectorAll('.tabbar button'), function (b) {
        b.setAttribute('aria-selected', String(b === button));
      });
      window.scrollTo(0, 0);
      render();
    });
  });

  el.playerSearch.addEventListener('input', function () {
    if (state.selected) state.selected = null;
    renderCalculator();
  });

  el.teamFilter.addEventListener('change', function () {
    state.teamFilter = el.teamFilter.value;
    renderBoard();
  });

  loadAll();
  render();
})();
