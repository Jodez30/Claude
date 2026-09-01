/* ──────────────────────────────────────────────────────────────
   Keeper Hub — UI wiring.
   Reads config.js, data/drafts.js and the Sleeper API, and drives the
   two tabs. No framework, no build step; everything runs from the file.
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CONFIG = window.LEAGUE_CONFIG;
  var RULES = window.KeeperRules;
  var MANUAL = (window.KEEPER_DATA && window.KEEPER_DATA.seasons) || {};
  var ROUNDS_OVERRIDE_KEY = 'keeperhub.draftRounds';

  var state = {
    season: CONFIG.defaultSeason,
    tab: 'calculator',
    /* season → { status:'loading'|'ready'|'empty'|'error'|'unconfigured', ... } */
    seasons: {},
    selected: null,
    acquisition: 'draft',
    keeperSeason: 1,
    sort: { key: 'overall', dir: 'asc' },
    teamFilter: ''
  };

  var el = {};
  ['leagueLabel', 'yearSelector', 'playerSearch', 'searchResults', 'searchEmpty', 'selectedPlayer',
   'acquisitionChoice', 'draftInputs', 'waiverInputs', 'originalRound', 'adpRound', 'waiverWeeks',
   'draftRoundsField', 'draftRoundsInput', 'keeperSeasonChoice', 'injuryException', 'verdictCost',
   'verdictCap', 'verdictNotes', 'ladder', 'teamFilter', 'boardLabel', 'boardContent'
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

  /* …falling back to a count the user typed in when nothing else knows it. */
  function draftRoundsFor(season) {
    var known = draftRoundsFromData(season);
    if (known) return known;
    var override = Number(localStorage.getItem(ROUNDS_OVERRIDE_KEY + '.' + season));
    return override > 0 ? override : null;
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
        message: 'Couldn\'t reach Sleeper: ' + err.message +
          ' Nothing is being shown for ' + season + ' rather than guessing at picks.'
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
    /* Prefill from the season on screen if the player was drafted that year,
       otherwise from their most recent draft. */
    var forSeason = player.seasons.filter(function (s) { return s.season === state.season; })[0];
    var source = forSeason || player.seasons[0];
    if (source) el.originalRound.value = source.round;
    state.acquisition = 'draft';
    syncChoiceGroup(el.acquisitionChoice, 'draft');
    render();
  }

  function clearPlayer() {
    state.selected = null;
    el.originalRound.value = '';
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
        h('div', { class: 'selected-meta', text: player.nflTeam })
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

  function calculatorInput() {
    var rounds = draftRoundsFor(state.season);
    return {
      acquisition: state.acquisition,
      originalRound: Number(el.originalRound.value) || null,
      adpRound: Number(el.adpRound.value) || null,
      keeperSeason: state.keeperSeason,
      draftRounds: rounds,
      injuryExemptSeasons: el.injuryException.checked ? 1 : 0,
      waiverWeeksRosteredMet: state.acquisition === 'waiver' ? (el.waiverWeeks.checked || null) : undefined
    };
  }

  function renderVerdict() {
    var input = calculatorInput();
    var result = RULES.computeKeeperCost(input);

    clear(el.verdictNotes);

    if (result.incomplete) {
      el.verdictCost.textContent = '—';
      el.verdictCost.className = 'verdict-cost';
      el.verdictCap.textContent = result.reason;
      el.ladder.hidden = true;
      return;
    }

    if (!result.eligible) {
      el.verdictCost.textContent = 'Not eligible';
      el.verdictCost.className = 'verdict-cost blocked';
      el.verdictCap.textContent = 'Back to the general draft pool.';
      el.verdictNotes.appendChild(note('danger', result.reason));
    } else {
      el.verdictCost.textContent = result.costLabel;
      el.verdictCost.className = 'verdict-cost';
      el.verdictCap.textContent = 'round pick · season ' + result.seasonsUsed + ' of ' +
        RULES.MAX_SEASONS_ON_ROSTER + ' on the roster';
      if (result.isFinalSeason) {
        el.verdictNotes.appendChild(note('warn',
          'Final keeper season. After this year the player hits the 3-season cap and returns to the draft pool.'));
      }
    }

    result.notes.forEach(function (text) { el.verdictNotes.appendChild(note('info', text)); });

    /* Injury exception is only ever nominated, never applied on its own. */
    if ((result.isFinalSeason || !result.eligible) && !el.injuryException.checked) {
      el.verdictNotes.appendChild(note('warn',
        'If this player was rostered all season but played or scored in 3 games or fewer because of ' +
        'injury, that season may not count toward the cap. Confirm with the commissioner before ' +
        'applying it — it is never applied automatically.'));
    }

    renderLadder(input, result);
  }

  function renderLadder(input, current) {
    var body = el.ladder.querySelector('tbody');
    clear(body);
    if (current.incomplete) { el.ladder.hidden = true; return; }
    el.ladder.hidden = false;

    RULES.costLadder(input).forEach(function (row) {
      var isCurrent = row.keeperSeason === input.keeperSeason;
      var eligible = row.result.eligible;
      body.appendChild(h('tr', { 'data-current': isCurrent ? 'true' : 'false' }, [
        h('td', { text: row.keeperSeason === 1 ? '1st kept' : row.keeperSeason + (row.keeperSeason === 2 ? 'nd kept' : 'rd kept') }),
        h('td', {
          class: eligible ? '' : 'out',
          text: eligible ? (row.result.isFinalSeason ? 'Final season' : 'Keepable') : 'Back to pool'
        }),
        h('td', { class: 'cost' + (eligible ? '' : ' out'), text: eligible ? row.result.costLabel : '—' })
      ]));
    });
  }

  function renderCalculator() {
    el.draftInputs.hidden = state.acquisition !== 'draft';
    el.waiverInputs.hidden = state.acquisition !== 'waiver';

    /* Only ask for the draft-round count when we genuinely don't know it. */
    el.draftRoundsField.hidden = !(state.acquisition === 'waiver' && !draftRoundsFromData(state.season));
    if (!el.draftRoundsField.hidden) {
      el.draftRoundsInput.value = localStorage.getItem(ROUNDS_OVERRIDE_KEY + '.' + state.season) || '';
    }

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
    { key: 'nflTeam', label: 'NFL', cell: function (p) { return h('td', { class: 'cell-nfl', text: p.nflTeam }); } },
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
      var action = null;
      if (data.status === 'error') {
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

  function syncChoiceGroup(group, value) {
    Array.prototype.forEach.call(group.querySelectorAll('button'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.value === String(value)));
    });
  }

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
    var rounds = draftRoundsFor(state.season);
    el.leagueLabel.textContent = name + (rounds ? ' · ' + rounds + ' rounds' : '');
  }

  function render() {
    renderYearSelector();
    renderLeagueLabel();
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

  el.acquisitionChoice.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    if (!button) return;
    state.acquisition = button.dataset.value;
    syncChoiceGroup(el.acquisitionChoice, state.acquisition);
    render();
  });

  el.keeperSeasonChoice.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    if (!button) return;
    state.keeperSeason = Number(button.dataset.value);
    syncChoiceGroup(el.keeperSeasonChoice, state.keeperSeason);
    render();
  });

  el.playerSearch.addEventListener('input', function () {
    if (state.selected) state.selected = null;
    renderCalculator();
  });

  ['originalRound', 'adpRound'].forEach(function (id) {
    el[id].addEventListener('input', renderVerdict);
  });
  ['waiverWeeks', 'injuryException'].forEach(function (id) {
    el[id].addEventListener('change', renderVerdict);
  });

  el.draftRoundsInput.addEventListener('input', function () {
    var value = Number(el.draftRoundsInput.value);
    if (value > 0) localStorage.setItem(ROUNDS_OVERRIDE_KEY + '.' + state.season, String(value));
    renderLeagueLabel();
    renderVerdict();
  });

  el.teamFilter.addEventListener('change', function () {
    state.teamFilter = el.teamFilter.value;
    renderBoard();
  });

  loadAll();
  render();
})();
