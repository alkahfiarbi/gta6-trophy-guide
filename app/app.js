// Leonida Platinum Guide v2 — offline GTA VI trophy tracker, vanilla JS, no libraries.
// The data file (app/data/trophies.json) carries the 55 trophies, the dated source
// registry, the audit counts and the disagreements log. This script renders the
// checklist, guide panes, roadmap, missables, sources + matrix, planner and save
// page. Progress lives in localStorage only; the app fetches nothing else and
// makes no network request at run time.
(function () {
'use strict';

var STORE = 'gta6-trophy-guide-v2';
var SEED_EARNED = [2, 3, 8, 10, 16, 20, 21, 33, 44, 46, 47, 51, 55];
var SEED_COUNTS = { 15: 87, 35: 41, 42: 19, 31: 23, 52: 64000, 53: 41200 };
var PHASES = [
  { n: 1, name: 'Phase 1 — Story first', hours: '60–80 h', blurb: 'Play the story, and grab the one-time moments as they come. PowerPyx puts the story at 60–80 hours across five chapters; the trophy descriptions name Chapters 1–4 plus a final mission (see disagreement 2).', ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 33, 34, 37, 38, 39, 44, 45, 46, 47, 48, 49, 50, 51] },
  { n: 2, name: 'Phase 2 — Strangers & side stories', hours: '≈10 h', blurb: 'Clear the stranger strands and side characters. Andy is Lucia-only; Tyrone and Bret are Jason-only.', ids: [20, 22, 23, 24, 25, 26, 27, 29] },
  { n: 3, name: 'Phase 3 — Activities & exploration', hours: '≈25 h', blurb: 'Races, ranges, fishing, meditation, vehicles and the open map. Start the 100% checklist counts now — they already count.', ids: [15, 16, 17, 18, 19, 21, 28, 35, 41, 42, 43, 55] },
  { n: 4, name: 'Phase 4 — Collectibles, grind & cleanup', hours: '≈100 h', blurb: 'Cards, WAiNK spots, money goals, the last combat trophies, and the 100% completion checklist — about 100 hours on its own. Then the platinum.', ids: [14, 30, 31, 32, 36, 40, 52, 53, 54, 1] }
];
var KIND_NAMES = { story: 'Story', mission: 'Mission', activity: 'Activity', collectible: 'Collectible', combat: 'Combat', coop: 'Co-op', exploration: 'Exploration', money: 'Money', side: 'Side', misc: 'Misc', completion: 'Completion', platinum: 'Platinum' };
var DIFF_NAMES = { 1: 'Easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Very hard' };

var all = [];
var sources = [];
var disputes = [];
var checkedOn = '2026-11-21';
var state = readState();
var view = document.getElementById('view');

function blankState() {
  return { earned: {}, progress: {}, notes: {}, hideSpoilers: true, theme: 'paper' };
}
function readState() {
  try {
    var raw = localStorage.getItem(STORE);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return merge(blankState(), parsed);
    }
  } catch (e) { /* bad storage: start empty */ }
  return blankState();
}
function merge(base, over) {
  var out = {};
  var k;
  for (k in base) out[k] = base[k];
  for (k in over) out[k] = over[k];
  return out;
}
function writeState() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* storage full */ }
}
function demoSeed() {
  var q = new URLSearchParams(window.location.search);
  if (q.get('demo') !== '1') return;
  if (Object.keys(state.earned).length || Object.keys(state.progress).length) return;
  SEED_EARNED.forEach(function (id) { state.earned[id] = true; });
  Object.keys(SEED_COUNTS).forEach(function (id) { state.progress[id] = SEED_COUNTS[id]; });
  writeState();
}
function byId(id) {
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return null;
}
function srcById(id) {
  for (var i = 0; i < sources.length; i++) if (sources[i].id === id) return sources[i];
  return null;
}
function earned(t) { return !!state.earned[t.id]; }
function countOf(t) { return state.progress[t.id] || 0; }
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function displayName(t) {
  if (t.hidden && state.hideSpoilers && !earned(t)) return 'Hidden trophy — earn it to reveal its name';
  return t.name;
}
function displayDesc(t) {
  if (t.hidden && state.hideSpoilers && !earned(t)) return 'This trophy is hidden on PlayStation until it is earned. Its description is masked here.';
  return t.description;
}
function starRow(n) {
  var s = '';
  for (var i = 1; i <= 5; i++) s += i <= n ? '★' : '☆';
  return s;
}
function effortTag(t) {
  return '<span class="badge effort">' + starRow(t.difficulty) + ' ' + (DIFF_NAMES[t.difficulty] || '') + ' · ' + esc(t.time || '') + '</span>';
}
function gradeTag(t) {
  return '<span class="badge ' + esc(t.grade) + '">' + esc(t.grade) + '</span>';
}
function tagSet(t) {
  var h = gradeTag(t);
  h += '<span class="badge">' + esc(KIND_NAMES[t.kind] || t.kind) + '</span>';
  h += effortTag(t);
  h += '<span class="badge">Phase ' + t.phase + '</span>';
  if (t.missable) h += '<span class="badge missable">MISSABLE</span>';
  if (t.hidden) h += '<span class="badge hidden-badge">Hidden</span>';
  return h;
}
function targetText(t) {
  if (!t.target) return '';
  var goal = t.target.count;
  var unit = t.target.unit || '';
  if (unit === '$') return '$' + countOf(t).toLocaleString('en-US') + ' / $' + goal.toLocaleString('en-US');
  if (unit === '%') return countOf(t) + ' / ' + goal + '%';
  return countOf(t) + ' / ' + goal + ' ' + esc(unit);
}
function stepper(t) {
  if (!t.target) return '';
  return '<div class="stepper"><button type="button" data-step="-1" data-id="' + t.id + '" aria-label="Decrease progress">−</button>' +
    '<span class="count">' + esc(targetText(t)) + '</span>' +
    '<button type="button" data-step="1" data-id="' + t.id + '" aria-label="Increase progress">+</button></div>';
}
function rowFor(t) {
  var cls = earned(t) ? 'trophy-row earned' : 'trophy-row';
  var chk = earned(t) ? ' checked' : '';
  return '<li class="' + cls + '">' +
    '<input type="checkbox" data-earn="' + t.id + '"' + chk + ' aria-label="Mark ' + esc(displayName(t)) + ' earned">' +
    '<div><h3><a href="#/trophy/' + t.id + '">' + esc(displayName(t)) + '</a></h3>' +
    '<p class="desc">' + esc(displayDesc(t)) + '</p>' +
    '<div class="badges">' + tagSet(t) + '</div></div>' +
    stepper(t) + '</li>';
}
function totalSteps() {
  var n = 0;
  all.forEach(function (t) { n += (t.steps || []).length; });
  return n;
}
function paintAudit() {
  var el = document.getElementById('audit-strip');
  if (!el) return;
  var withEffort = all.filter(function (t) { return t.difficulty && t.time; }).length;
  el.innerHTML = '<b>AUDIT · checked ' + esc(checkedOn) + '</b> — ' + all.length + '/55 trophies named · ' +
    totalSteps() + ' cited steps · ' + sources.length + ' dated sources · ' + disputes.length +
    ' disagreements logged · difficulty + time on ' + withEffort + '/55 trophies';
}
function paintHeader() {
  var done = all.filter(earned).length;
  var total = all.length || 55;
  var pct = total ? Math.round(done / total * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = done + ' / ' + total + ' earned (' + pct + '%)';
  var got = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  all.forEach(function (t) { if (earned(t)) got[t.grade]++; });
  document.getElementById('makeup').textContent =
    '55 trophies: 1 platinum, 2 gold, 6 silver, 46 bronze · 28 hidden until earned · ' +
    'Earned by grade — Platinum ' + got.platinum + '/1, Gold ' + got.gold + '/2, Silver ' + got.silver + '/6, Bronze ' + got.bronze + '/46';
  paintAudit();
}
function paintTheme() {
  document.body.classList.toggle('night', state.theme === 'night');
  document.getElementById('theme-toggle').textContent = state.theme === 'night' ? 'Paper theme' : 'Night theme';
}
function showChecklist() {
  var q = (document.getElementById('search').value || '').toLowerCase();
  var grade = document.getElementById('filter-grade').value;
  var kind = document.getElementById('filter-kind').value;
  var status = document.getElementById('filter-status').value;
  var missOnly = document.getElementById('filter-missable').checked;
  var list = all.filter(function (t) {
    if (grade && t.grade !== grade) return false;
    if (kind && t.kind !== kind) return false;
    if (status === 'earned' && !earned(t)) return false;
    if (status === 'unearned' && earned(t)) return false;
    if (missOnly && !t.missable) return false;
    if (q && t.name.toLowerCase().indexOf(q) === -1 && t.description.toLowerCase().indexOf(q) === -1) return false;
    return true;
  });
  var got = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  all.forEach(function (t) { if (earned(t)) got[t.grade]++; });
  var missN = all.filter(function (t) { return t.missable; }).length;
  view.innerHTML =
    '<h2>Trophy checklist</h2>' +
    '<p class="lede">Tick a trophy when you earn it. Counters track partial progress on trophies with a target. Every row shows its difficulty and estimated time; click a name for the cited guide, answer first.</p>' +
    '<div class="grade-counts"><span>Platinum ' + got.platinum + ' / 1</span><span>Gold ' + got.gold + ' / 2</span><span>Silver ' + got.silver + ' / 6</span><span>Bronze ' + got.bronze + ' / 46</span><span>Hidden 28</span><span>Missable ' + missN + '</span><span>' + totalSteps() + ' cited steps</span><span>' + sources.length + ' sources</span></div>' +
    '<p class="count-line">Showing ' + list.length + ' of ' + all.length + ' trophies</p>' +
    '<ul class="trophy-list">' + list.map(rowFor).join('') + '</ul>';
}
function sourcePara(id) {
  var s = srcById(id);
  if (!s) return '<p>' + esc(id) + '</p>';
  return '<p><strong>' + esc(s.label) + ' (' + esc(s.date) + '):</strong> ' + esc(s.covers) + '<br><span class="url">' + esc(s.url) + '</span></p>';
}
function showGuide(id) {
  var t = byId(id);
  if (!t) { view.innerHTML = '<h2>Trophy not found</h2><p><a href="#/">Back to the checklist</a></p>'; return; }
  var stepList = (t.steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
  var tipList = (t.tips || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
  var srcList = (t.sources || []).map(sourcePara).join('');
  var missBox = t.missable
    ? '<div class="warn"><strong>When it can be missed:</strong> this trophy is flagged MISSABLE. No mission replay is confirmed for GTA VI, so do it when the chance appears. If you miss it, try replaying the mission from the pause menu.</div>'
    : '<p><strong>When it can be missed:</strong> not flagged missable — it can be done at any time.</p>';
  var prev = byId(id - 1);
  var next = byId(id + 1);
  view.innerHTML =
    '<p class="back-link"><a href="#/">&larr; Back to the checklist</a></p>' +
    '<article class="guide-pane">' +
    '<h2>' + esc(displayName(t)) + '</h2>' +
    '<div class="badges">' + tagSet(t) + '</div>' +
    '<p class="desc">Official description: “' + esc(displayDesc(t)) + '”</p>' +
    '<div class="answer-box"><p><strong>Cited answer:</strong> ' + esc(t.answer || t.guide) + '</p></div>' +
    (t.target ? '<p><strong>Target:</strong> ' + esc(targetText(t)) + '</p>' + stepper(t) : '') +
    '<h3>Guide</h3><p>' + esc(t.guide) + '</p>' +
    (stepList ? '<h3>Cited steps (' + (t.steps || []).length + ')</h3><ol>' + stepList + '</ol>' : '') +
    (tipList ? '<h3>Tips</h3><ul>' + tipList + '</ul>' : '') +
    missBox +
    '<h3>Your notes</h3><textarea class="notes" id="notes-box" placeholder="Your own notes for this trophy…">' + esc(state.notes[t.id] || '') + '</textarea>' +
    '<div class="sources"><h4>Sources for this trophy</h4>' + srcList +
    '<p>Guide text: our own advice from the official description and the sources above, not yet checked in the game.</p></div>' +
    '<div class="pager"><span>' + (prev ? '<a href="#/trophy/' + prev.id + '">&larr; ' + esc(displayName(prev)) + '</a>' : '') + '</span>' +
    '<span>' + (next ? '<a href="#/trophy/' + next.id + '">' + esc(displayName(next)) + ' &rarr;</a>' : '') + '</span></div>' +
    '</article>';
  var box = document.getElementById('notes-box');
  box.addEventListener('input', function () { state.notes[t.id] = box.value; writeState(); });
}
function showRoadmap() {
  var html = '<h2>Roadmap to the platinum</h2>' +
    '<p class="lede">Four phases, in play order, built from the official trophy descriptions and PowerPyx’s roadmap (difficulty 4/10, about 200 hours, 1 playthrough, 0 online trophies). Finish the story first, then the stranger strands, then activities and exploration, then collectibles and the long grinds — the platinum pops last.</p>';
  PHASES.forEach(function (ph) {
    var items = ph.ids.map(byId).filter(Boolean);
    var done = items.filter(earned).length;
    var pct = items.length ? Math.round(done / items.length * 100) : 0;
    html += '<section class="phase"><h3>' + esc(ph.name) + ' — ' + done + ' / ' + items.length + ' · ' + esc(ph.hours) + '</h3>' +
      '<p>' + esc(ph.blurb) + '</p><div class="mini-bar"><div class="mini-fill" style="width:' + pct + '%"></div></div>' +
      '<ul>' + items.map(function (t) {
        return '<li class="' + (earned(t) ? 'earned' : '') + '"><a href="#/trophy/' + t.id + '">' + esc(displayName(t)) + '</a> ' + gradeTag(t) + ' ' + effortTag(t) + (t.missable ? ' <span class="badge missable">MISSABLE</span>' : '') + '</li>';
      }).join('') + '</ul></section>';
  });
  view.innerHTML = html;
}
function showMissables() {
  var list = all.filter(function (t) { return t.missable; });
  view.innerHTML =
    '<h2>Missable trophies</h2>' +
    '<p class="lede">' + list.length + ' trophies are flagged missable. No mission replay is confirmed for GTA VI, so do each of these when its chance appears — and if you miss one, try replaying the mission from the pause menu.</p>' +
    '<div class="warn"><strong>How strict is “missable”?</strong> PowerPyx and KeenGamer count only 1 trophy that can actually lock the platinum: Positive Mental Attitude, whose first meditation can only be done in Chapter 1. This guide flags all ' + list.length + ' one-time moments, because each can only be done when it appears. See disagreement 1 on the Sources page.</div>' +
    '<ul class="trophy-list">' + list.map(rowFor).join('') + '</ul>';
}
function showSources() {
  var head = '<tr><th>Trophy</th>' + sources.map(function (s) { return '<th>' + esc(s.id) + '</th>'; }).join('') + '</tr>';
  var rows = all.map(function (t) {
    var cells = sources.map(function (s) {
      var hit = (t.sources || []).indexOf(s.id) !== -1;
      return '<td class="' + (hit ? 'hit' : '') + '">' + (hit ? '●' : '·') + '</td>';
    }).join('');
    return '<tr><td>' + esc(displayName(t)) + '</td>' + cells + '</tr>';
  }).join('');
  var srcItems = sources.map(function (s) {
    return '<li><strong>' + esc(s.id) + ' — ' + esc(s.label) + ' (' + esc(s.date) + ')</strong><br>' + esc(s.covers) + '<br><span class="url">' + esc(s.url) + '</span></li>';
  }).join('');
  var disputeHtml = disputes.map(function (d) {
    return '<div class="dispute"><h4>' + d.n + '. ' + esc(d.topic) + '</h4>' +
      '<p><strong>Side A:</strong> ' + esc(d.a) + '</p>' +
      '<p><strong>Side B:</strong> ' + esc(d.b) + '</p>' +
      '<p class="call">Call: ' + esc(d.call) + '</p></div>';
  }).join('');
  view.innerHTML =
    '<h2>Sources &amp; matrix</h2>' +
    '<p class="lede">' + sources.length + ' dated sources. Every step in every guide names the source it comes from; a step no source pins down says so instead of guessing. The matrix shows which sources back each trophy.</p>' +
    '<h3>Source matrix — trophies × sources</h3>' +
    '<p class="matrix-legend">● = this source backs the trophy. S1 Exophase · S2 PSNProfiles · S3 PowerPyx · S4 Insider Gaming · S5 KeenGamer · S6 GTA Spotter · S7 GTA Six Insider · S8 Vice City Hustle · S9 Take-Two / Rockstar · S10 Rockstar Games.</p>' +
    '<div class="matrix-wrap"><table class="matrix">' + head + rows + '</table></div>' +
    '<h3>Disagreements — where the sources differ</h3>' + disputeHtml +
    '<h3>All sources (dated, checked ' + esc(checkedOn) + ')</h3>' +
    '<ul class="source-list">' + srcItems + '</ul>';
}
function showPlanner() {
  var left = all.filter(function (t) { return !earned(t); });
  var easiest = left.slice().sort(function (a, b) { return (a.difficulty - b.difficulty) || (a.phase - b.phase) || (a.id - b.id); }).slice(0, 5);
  var closest = left.filter(function (t) { return t.target; }).map(function (t) {
    return { t: t, frac: Math.min(1, countOf(t) / t.target.count) };
  }).sort(function (a, b) { return b.frac - a.frac; }).slice(0, 3);
  view.innerHTML =
    '<h2>Next up — your planner</h2>' +
    '<p class="lede">The five easiest trophies you still need, and the three you are closest to finishing. Start at the top and work down.</p>' +
    '<section class="planner-card"><h3>Five easiest un-earned trophies</h3><ol>' +
    easiest.map(function (t) { return '<li><a href="#/trophy/' + t.id + '">' + esc(displayName(t)) + '</a> — ' + starRow(t.difficulty) + ' ' + esc(t.time || '') + ', phase ' + t.phase + ' ' + gradeTag(t) + '</li>'; }).join('') +
    '</ol></section>' +
    '<section class="planner-card"><h3>Closest to done (by target progress)</h3><ol>' +
    (closest.length ? closest.map(function (c) { return '<li><a href="#/trophy/' + c.t.id + '">' + esc(displayName(c.t)) + '</a> — ' + esc(targetText(c.t)) + ' (' + Math.round(c.frac * 100) + '%)</li>'; }).join('') : '<li>No target trophies started yet — pick one from the checklist and use its counter.</li>') +
    '</ol></section>';
}
function showSave() {
  var done = all.filter(earned).length;
  var left = all.length - done;
  var effort = all.filter(function (t) { return !earned(t); }).reduce(function (sum, t) { return sum + t.difficulty; }, 0);
  view.innerHTML =
    '<h2>Save &amp; settings</h2>' +
    '<p class="lede">Your progress is saved in this browser (localStorage). Export it to a file as a backup, and import it back on another device or after clearing browser data.</p>' +
    '<div class="save-grid">' +
    '<section class="save-card"><h3>Your stats</h3><p>Earned: ' + done + ' / ' + all.length + '</p><p>Remaining: ' + left + '</p><p>Estimated remaining effort: ' + effort + ' difficulty points (sum of the difficulty of every un-earned trophy, 1–5 each)</p><p>Cited steps in this guide: ' + totalSteps() + ' across ' + sources.length + ' dated sources.</p></section>' +
    '<section class="save-card"><h3>Export / import</h3>' +
    '<p><button class="btn" type="button" id="export-btn">Export progress (JSON)</button></p>' +
    '<p><label>Import progress: <input type="file" id="import-file" accept="application/json,.json"></label></p>' +
    '<p id="import-msg"></p></section>' +
    '<section class="save-card"><h3>Settings</h3>' +
    '<p><label class="check"><input type="checkbox" id="save-spoiler" ' + (state.hideSpoilers ? 'checked' : '') + '> Hide hidden trophies (spoiler setting)</label></p>' +
    '<p><button class="btn ghost" type="button" id="save-theme">Switch to ' + (state.theme === 'night' ? 'paper' : 'night') + ' theme</button></p>' +
    '<p><button class="btn ghost" type="button" id="reset-btn">Reset all progress</button></p></section>' +
    '<section class="save-card"><h3>Sources &amp; honesty</h3>' +
    '<p>Official list: Exophase and PSNProfiles; roadmap and counts: PowerPyx, Insider Gaming, KeenGamer, GTA Spotter, GTA Six Insider, Vice City Hustle; launch: Rockstar Games / Take-Two. Full dated list on the Sources &amp; Matrix page.</p>' +
    '<p>List make-up: 55 trophies — 1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden.</p>' +
    '<p>GTA VI launched 19 Nov 2026. Every guide here is written from the official trophy descriptions and the dated sources above. Where a location or step is not pinned down by a source, the guide says so instead of guessing.</p></section>' +
    '</div>';
  document.getElementById('export-btn').addEventListener('click', exportFile);
  document.getElementById('import-file').addEventListener('change', importFile);
  document.getElementById('save-spoiler').addEventListener('change', function (e) {
    state.hideSpoilers = e.target.checked;
    document.getElementById('spoiler-toggle').checked = state.hideSpoilers;
    writeState(); route();
  });
  document.getElementById('save-theme').addEventListener('click', function () {
    state.theme = state.theme === 'night' ? 'paper' : 'night';
    writeState(); paintTheme(); route();
  });
  document.getElementById('reset-btn').addEventListener('click', function () {
    if (window.confirm('Reset all progress, counters and notes?')) {
      state = blankState();
      document.getElementById('spoiler-toggle').checked = state.hideSpoilers;
      writeState(); paintTheme(); paintHeader(); route();
    }
  });
}
function exportFile() {
  var blob = new Blob([JSON.stringify({ app: 'gta6-trophy-guide', version: 2, earned: state.earned, progress: state.progress, notes: state.notes }, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}
function importFile(e) {
  var file = e.target.files && e.target.files[0];
  var msg = document.getElementById('import-msg');
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var data = JSON.parse(reader.result);
      if (data.earned) state.earned = data.earned;
      if (data.progress) state.progress = data.progress;
      if (data.notes) state.notes = data.notes;
      writeState(); paintHeader(); route();
      msg.textContent = 'Imported progress from ' + file.name + '.';
    } catch (err) { msg.textContent = 'That file could not be read as progress JSON.'; }
  };
  reader.readAsText(file);
}
function markTab(name) {
  var tabs = document.querySelectorAll('#tabs a');
  tabs.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-view') === name); });
}
function route() {
  var hash = window.location.hash || '#/';
  var toolbar = document.getElementById('toolbar');
  var m = hash.match(/^#\/trophy\/(\d+)$/);
  if (m) {
    toolbar.style.display = 'none';
    markTab('checklist');
    showGuide(Number(m[1]));
  } else if (hash === '#/roadmap') {
    toolbar.style.display = 'none';
    markTab('roadmap');
    showRoadmap();
  } else if (hash === '#/missables') {
    toolbar.style.display = 'none';
    markTab('missables');
    showMissables();
  } else if (hash === '#/sources') {
    toolbar.style.display = 'none';
    markTab('sources');
    showSources();
  } else if (hash === '#/planner') {
    toolbar.style.display = 'none';
    markTab('planner');
    showPlanner();
  } else if (hash === '#/save') {
    toolbar.style.display = 'none';
    markTab('save');
    showSave();
  } else {
    toolbar.style.display = 'flex';
    markTab('checklist');
    showChecklist();
  }
  paintHeader();
}
function wireControls() {
  var kinds = [];
  all.forEach(function (t) { if (kinds.indexOf(t.kind) === -1) kinds.push(t.kind); });
  kinds.sort();
  var sel = document.getElementById('filter-kind');
  kinds.forEach(function (k) {
    var o = document.createElement('option');
    o.value = k; o.textContent = KIND_NAMES[k] || k;
    sel.appendChild(o);
  });
  document.getElementById('search').addEventListener('input', showChecklist);
  document.getElementById('filter-grade').addEventListener('change', showChecklist);
  document.getElementById('filter-kind').addEventListener('change', showChecklist);
  document.getElementById('filter-status').addEventListener('change', showChecklist);
  document.getElementById('filter-missable').addEventListener('change', showChecklist);
  document.getElementById('spoiler-toggle').addEventListener('change', function (e) {
    state.hideSpoilers = e.target.checked; writeState(); route();
  });
  document.getElementById('theme-toggle').addEventListener('click', function () {
    state.theme = state.theme === 'night' ? 'paper' : 'night';
    writeState(); paintTheme();
  });
  document.getElementById('spoiler-toggle').checked = state.hideSpoilers;
  view.addEventListener('change', function (e) {
    var earn = e.target.getAttribute && e.target.getAttribute('data-earn');
    if (earn) {
      var id = Number(earn);
      if (e.target.checked) state.earned[id] = true; else delete state.earned[id];
      writeState(); route();
    }
  });
  view.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-step]') : null;
    if (!btn) return;
    var id = Number(btn.getAttribute('data-id'));
    var t = byId(id);
    if (!t || !t.target) return;
    var cur = countOf(t);
    var next = Math.max(0, Math.min(t.target.count, cur + Number(btn.getAttribute('data-step'))));
    state.progress[id] = next;
    writeState(); route();
  });
  window.addEventListener('hashchange', route);
}
fetch('data/trophies.json').then(function (r) { return r.json(); }).then(function (data) {
  all = data.trophies || data;
  sources = data.sources || [];
  disputes = data.disagreements || [];
  if (data.audit && data.audit.last_checked) checkedOn = data.audit.last_checked;
  demoSeed();
  paintTheme();
  wireControls();
  route();
}).catch(function () {
  view.innerHTML = '<h2>Could not load the trophy data</h2><p>The file app/data/trophies.json could not be read. Serve the app/ folder with a static server and try again.</p>';
});
})();
