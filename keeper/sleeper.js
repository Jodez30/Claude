/* ──────────────────────────────────────────────────────────────
   Sleeper API client for the live (2026) draft.

   Sleeper's read API is public and needs no key or auth, which is what
   lets this stay a static page with no login. Everything here either
   returns real data or throws — there is no placeholder fallback.
   ────────────────────────────────────────────────────────────── */
window.SleeperAPI = (function () {
  'use strict';

  var BASE = 'https://api.sleeper.app/v1';
  var CACHE_PREFIX = 'keeperhub.sleeper.';

  function getJSON(path) {
    return fetch(BASE + path, { headers: { accept: 'application/json' } }).then(function (res) {
      if (!res.ok) {
        throw new Error('Sleeper returned ' + res.status + ' for ' + path +
          (res.status === 404 ? ' — check the league ID.' : ''));
      }
      return res.json();
    });
  }

  function readCache(key, maxAgeMinutes) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (Date.now() - entry.at > maxAgeMinutes * 60000) return null;
      return entry.value;
    } catch (err) {
      return null;
    }
  }

  function writeCache(key, value) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), value: value }));
    } catch (err) {
      /* Private mode or a full quota — caching is a nicety, not a requirement. */
    }
  }

  function clearCache() {
    try {
      Object.keys(localStorage)
        .filter(function (k) { return k.indexOf(CACHE_PREFIX) === 0; })
        .forEach(function (k) { localStorage.removeItem(k); });
    } catch (err) { /* nothing to clear */ }
  }

  /* roster_id → the manager's team name, falling back to their handle. */
  function buildTeamNames(users, rosters) {
    var byUserId = {};
    users.forEach(function (u) {
      byUserId[u.user_id] = (u.metadata && u.metadata.team_name) || u.display_name || 'Unknown manager';
    });
    var byRosterId = {};
    rosters.forEach(function (r) {
      byRosterId[r.roster_id] = byUserId[r.owner_id] || ('Roster ' + r.roster_id);
    });
    return byRosterId;
  }

  function normalizePick(pick, teamNames, slotToRoster, teamCount) {
    var meta = pick.metadata || {};
    var rosterId = pick.roster_id || (slotToRoster && slotToRoster[pick.draft_slot]) || null;
    var name = [meta.first_name, meta.last_name].filter(Boolean).join(' ');
    return {
      round: pick.round,
      pick: teamCount ? pick.pick_no - (pick.round - 1) * teamCount : pick.draft_slot,
      overall: pick.pick_no,
      player: name || ('Player ' + pick.player_id),
      position: meta.position || '—',
      nflTeam: meta.team || '—',
      fantasyTeam: (rosterId && teamNames[rosterId]) || 'Unassigned',
      playerId: pick.player_id
    };
  }

  /**
   * Load a season's draft board straight from Sleeper.
   * Resolves to { source:'sleeper', complete, rounds, picks, teams, draftStatus, fetchedAt }.
   * Rejects with a human-readable Error if anything is missing or unreachable.
   */
  function loadDraft(leagueId, options) {
    options = options || {};
    var cacheMinutes = options.cacheMinutes == null ? 15 : options.cacheMinutes;
    var cacheKey = 'draft.' + leagueId;

    if (!options.force) {
      var cached = readCache(cacheKey, cacheMinutes);
      if (cached) return Promise.resolve(Object.assign({}, cached, { fromCache: true }));
    }

    return getJSON('/league/' + leagueId).then(function (league) {
      if (!league) throw new Error('No league found for ID ' + leagueId + '.');
      if (!league.draft_id) throw new Error('League "' + league.name + '" has no draft attached yet.');

      return Promise.all([
        Promise.resolve(league),
        getJSON('/league/' + leagueId + '/users'),
        getJSON('/league/' + leagueId + '/rosters'),
        getJSON('/draft/' + league.draft_id),
        getJSON('/draft/' + league.draft_id + '/picks')
      ]);
    }).then(function (parts) {
      var league = parts[0], users = parts[1], rosters = parts[2], draft = parts[3], picks = parts[4];
      var teamNames = buildTeamNames(users || [], rosters || []);
      var teamCount = (draft.settings && draft.settings.teams) || league.total_rosters || null;
      var slotToRoster = draft.slot_to_roster_id || null;

      var normalized = (picks || [])
        .map(function (p) { return normalizePick(p, teamNames, slotToRoster, teamCount); })
        .sort(function (a, b) { return a.overall - b.overall; });

      var result = {
        source: 'sleeper',
        leagueName: league.name,
        season: Number(league.season),
        draftStatus: draft.status,
        complete: normalized.length > 0,
        rounds: (draft.settings && draft.settings.rounds) || null,
        teams: Object.keys(teamNames).map(function (k) { return teamNames[k]; }).sort(),
        picks: normalized,
        fetchedAt: Date.now()
      };

      if (!normalized.length) {
        result.emptyReason = draft.status === 'complete'
          ? 'Sleeper reports the draft as complete but returned no picks.'
          : 'The 2026 draft has not started yet on Sleeper (status: ' + (draft.status || 'unknown') + ').';
      }

      writeCache(cacheKey, result);
      return result;
    });
  }

  return { loadDraft: loadDraft, clearCache: clearCache };
})();
