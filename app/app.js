// Leonida Platinum Guide v2 — offline GTA VI trophy tracker (vanilla JS, no libraries).
// Loads app/data/trophies.json, which also carries the dated source registry, the
// audit counts and the disagreements log. Renders checklist, guide panes, roadmap,
// missables, the sources + matrix page, planner and save page. Progress lives in
// localStorage only; the app fetches nothing else and reaches for no network.
var STORE_KEY = 'gta6-trophy-guide-v2';
var DEMO_EARNED = [2, 3, 8, 10, 16, 20, 21, 33, 44, 46, 47, 51, 55];
var DEMO_PROGRESS = { 15: 87, 35: 41, 42: 19, 31: 23, 52: 64000, 53: 41200 };
var ROADMAP_PHASES = [
  { n: 1, title: 'Phase 1 — Story first', hours: '60–80 h', note: 'Play the story, and grab the one-time moments as they come. PowerPyx puts the story at 60–80 hours across five chapters; the trophy descriptions name Chapters 1–4 plus a final mission (see disagreement 2).', ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 33, 34, 37, 38, 39, 44, 45, 46, 47, 48, 49, 50, 51] },
  { n: 2, title: 'Phase 2 — Strangers & side stories', hours: '≈10 h', note: 'Clear the stranger strands and side characters. Andy is Lucia-only; Tyrone and Bret are Jason-only.', ids: [20, 22, 23, 24, 25, 26, 27, 29] },
  { n: 3, title: 'Phase 3 — Activities & exploration', hours: '≈25 h', note: 'Races, ranges, fishing, meditation, vehicles and the open map. Start the 100% checklist counts now — they already count.', ids: [15, 16, 17, 18, 19, 21, 28, 35, 41, 42, 43, 55] },
  { n: 4, title: 'Phase 4 — Collectibles, grind & cleanup', hours: '≈100 h', note: 'Cards, WAiNK spots, money goals, the last combat trophies, and the 100% completion checklist — about 100 hours on its own. Then the platinum.', ids: [14, 30, 31, 32, 36, 40, 52, 53, 54, 1] }
];
var KIND_LABELS = { story: 'Story', mission: 'Mission', activity: 'Activity', collectible: 'Collectible', combat: 'Combat', coop: 'Co-op', exploration: 'Exploration', money: 'Money', side: 'Side', misc: 'Misc', completion: 'Completion', platinum: 'Platinum' };
var DIFF_WORDS = { 1: 'Easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Very hard' };

var trophies = [];
var sourceList = [];
var disputeList = [];
var auditInfo = null;
var lastChecked = '2026-11-20';
var state = loadState();
var view = document.getElementById('view');

function defaultState() {
  return { earned: {}, progress: {}, notes: {}, hideSpoilers: true, theme: 'paper' };
}
function loadState() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return Object.assign(defaultState(), parsed);
    }
  } catch (err) { /* corrupted storage: start fresh */ }
  return defaultState();
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (err) { /* storage full */ }
}
function demoApplies() {
  var q = new URLSearchParams(window.location.search);
  return q.get('demo') === '1' && Object.keys(state.earned).length === 0 && Object.keys(state.progress).length === 0;
}
function seedDemo() {
  if (!demoApplies()) return;
  DEMO_EARNED.forEach(function (id) { state.earned[id] = true; });
  Object.keys(DEMO_PROGRESS).forEach(function (id) { state.progress[id] = DEMO_PROGRESS[id]; });
  saveState();
}
function trophyById(id) {
  for (var i = 0; i < trophies.length; i++) if (trophies[i].id === id) return trophies[i];
  return null;
}
function sourceById(id) {
  for (var i = 0; i < sourceList.length; i++) if (sourceList[i].id === id) return sourceList[i];
  return null;
}
function isEarned(t) { return !!state.earned[t.id]; }
function progressOf(t) { return state.progress[t.id] || 0; }
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function shownName(t) {
  if (t.hidden && state.hideSpoilers && !isEarned(t)) return 'Hidden trophy — earn it to reveal its name';
  return t.name;
}
function shownDesc(t) {
  if (t.hidden && state.hideSpoilers && !isEarned(t)) return 'This trophy is hidden on PlayStation until it is earned. Its description is masked here.';
  return t.description;
}
function stars(n) {
  var out = '';
  for (var i = 1; i <= 5; i++) out += i <= n ? '★' : '☆';
  return out;
}
function effortBadge(t) {
  return '<span class="badge effort">' + stars(t.difficulty) + ' ' + (DIFF_WORDS[t.difficulty] || '') + ' · ' + esc(t.time || '') + '</span>';
}
function gradeBadge(t) {
  return '<span class="badge ' + esc(t.grade) + '">' + esc(t.grade) + '</span>';
}
function badgesFor(t) {
  var out = gradeBadge(t);
  out += '<span class="badge">' + esc(KIND_LABELS[t.kind] || t.kind) + '</span>';
  out += effortBadge(t);
  out += '<span class="badge">Phase ' + t.phase + '</span>';
  if (t.missable) out += '<span class="badge missable">MISSABLE</span>';
  if (t.hidden) out += '<span class="badge hidden-badge">Hidden</span>';
  return out;
}
function targetLabel(t) {
  if (!t.target) return '';
  var unit = t.target.unit || '';
  var goal = t.target.count;
  if (unit === '$') return '$' + progressOf(t).toLocaleString('en-US') + ' / $' + goal.toLocaleString('en-US');
  if (unit === '%') return progressOf(t) + ' / ' + goal + '%';
  return progressOf(t) + ' / ' + goal + ' ' + esc(unit);
}
function stepperHtml(t) {
  if (!t.target) return '';
  return '<div class="stepper"><button type="button" data-step="-1" data-id="' + t.id + '" aria-label="Decrease progress">−</button>' +
    '<span class="count">' + esc(targetLabel(t)) + '</span>' +
    '<button type="button" data-step="1" data-id="' + t.id + '" aria-label="Increase progress">+</button></div>';
}
function rowHtml(t) {
  var cls = isEarned(t) ? 'trophy-row earned' : 'trophy-row';
  var checked = isEarned(t) ? ' checked' : '';
  return '<li class="' + cls + '">' +
    '<input type="checkbox" data-earn="' + t.id + '"' + checked + ' aria-label="Mark ' + esc(shownName(t)) + ' earned">' +
    '<div><h3><a href="#/trophy/' + t.id + '">' + esc(shownName(t)) + '</a></h3>' +
    '<p class="desc">' + esc(shownDesc(t)) + '</p>' +
    '<div class="badges">' + badgesFor(t) + '</div></div>' +
    stepperHtml(t) + '</li>';
}
function citedStepCount() {
  var total = 0;
  trophies.forEach(function (t) { total += (t.steps || []).length; });
  return total;
}
function renderAuditStrip() {
  var el = document.getElementById('audit-strip');
  if (!el) return;
  var named = trophies.length;
  var steps = citedStepCount();
  var srcs = sourceList.length;
  var disputes = disputeList.length;
  var diffTimed = trophies.filter(function (t) { return t.difficulty && t.time; }).length;
  el.innerHTML = '<b>AUDIT · checked ' + esc(lastChecked) + '</b> — ' + named + '/55 trophies named · ' +
    steps + ' cited steps · ' + srcs + ' dated sources · ' + disputes + ' disagreements logged · ' +
    'difficulty + time on ' + diffTimed + '/55 trophies';
}
function updateHeader() {
  var earned = trophies.filter(isEarned).length;
  var total = trophies.length || 55;
  var pct = total ? Math.round(earned / total * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = earned + ' / ' + total + ' earned (' + pct + '%)';
  var counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  var totals = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  trophies.forEach(function (t) { totals[t.grade]++; if (isEarned(t)) counts[t.grade]++; });
  document.getElementById('makeup').textContent =
    '55 trophies: 1 platinum, 2 gold, 6 silver, 46 bronze · 28 hidden until earned · ' +
    'Earned by grade — Platinum ' + counts.platinum + '/1, Gold ' + counts.gold + '/2, Silver ' + counts.silver + '/6, Bronze ' + counts.bronze + '/46';
  renderAuditStrip();
}
function applyTheme() {
  document.body.classList.toggle('night', state.theme === 'night');
  document.getElementById('theme-toggle').textContent = state.theme === 'night' ? 'Paper theme' : 'Night theme';
}
function renderChecklist() {
  var q = (document.getElementById('search').value || '').toLowerCase();
  var grade = document.getElementById('filter-grade').value;
  var kind = document.getElementById('filter-kind').value;
  var status = document.getElementById('filter-status').value;
  var missOnly = document.getElementById('filter-missable').checked;
  var list = trophies.filter(function (t) {
    if (grade && t.grade !== grade) return false;
    if (kind && t.kind !== kind) return false;
    if (status === 'earned' && !isEarned(t)) return false;
    if (status === 'unearned' && isEarned(t)) return false;
    if (missOnly && !t.missable) return false;
    if (q && (t.name.toLowerCase().indexOf(q) === -1 && t.description.toLowerCase().indexOf(q) === -1)) return false;
    return true;
  });
  var counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  trophies.forEach(function (t) { if (isEarned(t)) counts[t.grade]++; });
  var missCount = trophies.filter(function (t) { return t.missable; }).length;
  view.innerHTML =
    '<h2>Trophy checklist</h2>' +
    '<p class="lede">Tick a trophy when you earn it. Counters track partial progress on trophies with a target. Every row shows its difficulty and estimated time; click a name for the cited guide, answer first.</p>' +
    '<div class="grade-counts"><span>Platinum ' + counts.platinum + ' / 1</span><span>Gold ' + counts.gold + ' / 2</span><span>Silver ' + counts.silver + ' / 6</span><span>Bronze ' + counts.bronze + ' / 46</span><span>Hidden 28</span><span>Missable ' + missCount + '</span><span>' + citedStepCount() + ' cited steps</span><span>' + sourceList.length + ' sources</span></div>' +
    '<p class="count-line">Showing ' + list.length + ' of ' + trophies.length + ' trophies</p>' +
    '<ul class="trophy-list">' + list.map(rowHtml).join('') + '</ul>';
}
function sourceLineFor(id) {
  var s = sourceById(id);
  if (!s) return '<p>' + esc(id) + '</p>';
  return '<p><strong>' + esc(s.label) + ' (' + esc(s.date) + '):</strong> ' + esc(s.covers) + '<br><span class="url">' + esc(s.url) + '</span></p>';
}
function renderGuide(id) {
  var t = trophyById(id);
  if (!t) { view.innerHTML = '<h2>Trophy not found</h2><p><a href="#/">Back to the checklist</a></p>'; return; }
  var steps = (t.steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
  var tips = (t.tips || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
  var srcs = (t.sources || []).map(sourceLineFor).join('');
  var missNote = t.missable
    ? '<div class="warn"><strong>When it can be missed:</strong> this trophy is flagged MISSABLE. No mission replay is confirmed for GTA VI, so do it when the chance appears. If you miss it, try replaying the mission from the pause menu.</div>'
    : '<p><strong>When it can be missed:</strong> not flagged missable — it can be done at any time.</p>';
  var prev = trophyById(id - 1);
  var next = trophyById(id + 1);
  view.innerHTML =
    '<p class="back-link"><a href="#/">&larr; Back to the checklist</a></p>' +
    '<article class="guide-pane">' +
    '<h2>' + esc(shownName(t)) + '</h2>' +
    '<div class="badges">' + badgesFor(t) + '</div>' +
    '<p class="desc">Official description: “' + esc(shownDesc(t)) + '”</p>' +
    '<div class="answer-box"><p><strong>Cited answer:</strong> ' + esc(t.answer || t.guide) + '</p></div>' +
    (t.target ? '<p><strong>Target:</strong> ' + esc(targetLabel(t)) + '</p>' + stepperHtml(t) : '') +
    '<h3>Guide</h3><p>' + esc(t.guide) + '</p>' +
    (steps ? '<h3>Cited steps (' + (t.steps || []).length + ')</h3><ol>' + steps + '</ol>' : '') +
    (tips ? '<h3>Tips</h3><ul>' + tips + '</ul>' : '') +
    missNote +
    '<h3>Your notes</h3><textarea class="notes" id="notes-box" placeholder="Your own notes for this trophy…">' + esc(state.notes[t.id] || '') + '</textarea>' +
    '<div class="sources"><h4>Sources for this trophy</h4>' + srcs +
    '<p>Guide text: our own advice from the official description and the sources above, not yet checked in the game.</p></div>' +
    '<div class="pager"><span>' + (prev ? '<a href="#/trophy/' + prev.id + '">&larr; ' + esc(shownName(prev)) + '</a>' : '') + '</span>' +
    '<span>' + (next ? '<a href="#/trophy/' + next.id + '">' + esc(shownName(next)) + ' &rarr;</a>' : '') + '</span></div>' +
    '</article>';
  var box = document.getElementById('notes-box');
  box.addEventListener('input', function () { state.notes[t.id] = box.value; saveState(); });
}
function renderRoadmap() {
  var html = '<h2>Roadmap to the platinum</h2>' +
    '<p class="lede">Four phases, in play order, built from the official trophy descriptions and PowerPyx’s roadmap (difficulty 4/10, about 200 hours, 1 playthrough, 0 online trophies). Finish the story first, then the stranger strands, then activities and exploration, then collectibles and the long grinds — the platinum pops last.</p>';
  ROADMAP_PHASES.forEach(function (ph) {
    var items = ph.ids.map(trophyById).filter(Boolean);
    var done = items.filter(isEarned).length;
    var pct = items.length ? Math.round(done / items.length * 100) : 0;
    html += '<section class="phase"><h3>' + esc(ph.title) + ' — ' + done + ' / ' + items.length + ' · ' + esc(ph.hours) + '</h3>' +
      '<p>' + esc(ph.note) + '</p><div class="mini-bar"><div class="mini-fill" style="width:' + pct + '%"></div></div>' +
      '<ul>' + items.map(function (t) {
        return '<li class="' + (isEarned(t) ? 'earned' : '') + '"><a href="#/trophy/' + t.id + '">' + esc(shownName(t)) + '</a> ' + gradeBadge(t) + ' ' + effortBadge(t) + (t.missable ? ' <span class="badge missable">MISSABLE</span>' : '') + '</li>';
      }).join('') + '</ul></section>';
  });
  view.innerHTML = html;
}
function renderMissables() {
  var list = trophies.filter(function (t) { return t.missable; });
  view.innerHTML =
    '<h2>Missable trophies</h2>' +
    '<p class="lede">' + list.length + ' trophies are flagged missable. No mission replay is confirmed for GTA VI, so do each of these when its chance appears — and if you miss one, try replaying the mission from the pause menu.</p>' +
    '<div class="warn"><strong>How strict is “missable”?</strong> PowerPyx and KeenGamer count only 1 trophy that can actually lock the platinum: Positive Mental Attitude, whose first meditation can only be done in Chapter 1. This guide flags all ' + list.length + ' one-time moments, because each can only be done when it appears. See disagreement 1 on the Sources page.</div>' +
    '<ul class="trophy-list">' + list.map(rowHtml).join('') + '</ul>';
}
function renderSources() {
  var matrixHead = '<tr><th>Trophy</th>' + sourceList.map(function (s) { return '<th>' + esc(s.id) + '</th>'; }).join('') + '</tr>';
  var matrixRows = trophies.map(function (t) {
    var cells = sourceList.map(function (s) {
      var hit = (t.sources || []).indexOf(s.id) !== -1;
      return '<td class="' + (hit ? 'hit' : '') + '">' + (hit ? '●' : '·') + '</td>';
    }).join('');
    return '<tr><td>' + esc(shownName(t)) + '</td>' + cells + '</tr>';
  }).join('');
  var srcItems = sourceList.map(function (s) {
    return '<li><strong>' + esc(s.id) + ' — ' + esc(s.label) + ' (' + esc(s.date) + ')</strong><br>' + esc(s.covers) + '<br><span class="url">' + esc(s.url) + '</span></li>';
  }).join('');
  var disputes = disputeList.map(function (d) {
    return '<div class="dispute"><h4>' + d.n + '. ' + esc(d.topic) + '</h4>' +
      '<p><strong>Side A:</strong> ' + esc(d.a) + '</p>' +
      '<p><strong>Side B:</strong> ' + esc(d.b) + '</p>' +
      '<p class="call">Call: ' + esc(d.call) + '</p></div>';
  }).join('');
  view.innerHTML =
    '<h2>Sources &amp; matrix</h2>' +
    '<p class="lede">' + sourceList.length + ' dated sources. Every step in every guide names the source it comes from; a step no source pins down says so instead of guessing. The matrix shows which sources back each trophy.</p>' +
    '<h3>Source matrix — trophies × sources</h3>' +
    '<div class="matrix-wrap"><table class="matrix">' + matrixHead + matrixRows + '</table></div>' +
    '<h3>Disagreements — where the sources differ</h3>' + disputes +
    '<h3>All sources (dated, checked ' + esc(lastChecked) + ')</h3>' +
    '<ul class="source-list">' + srcItems + '</ul>';
}
function renderPlanner() {
  var remaining = trophies.filter(function (t) { return !isEarned(t); });
  var easiest = remaining.slice().sort(function (a, b) { return (a.difficulty - b.difficulty) || (a.phase - b.phase) || (a.id - b.id); }).slice(0, 5);
  var closest = remaining.filter(function (t) { return t.target; }).map(function (t) {
    return { t: t, frac: Math.min(1, progressOf(t) / t.target.count) };
  }).sort(function (a, b) { return b.frac - a.frac; }).slice(0, 3);
  view.innerHTML =
    '<h2>Next up — your planner</h2>' +
    '<p class="lede">The five easiest trophies you still need, and the three you are closest to finishing. Start at the top and work down.</p>' +
    '<section class="planner-card"><h3>Five easiest un-earned trophies</h3><ol>' +
    easiest.map(function (t) { return '<li><a href="#/trophy/' + t.id + '">' + esc(shownName(t)) + '</a> — ' + stars(t.difficulty) + ' ' + esc(t.time || '') + ', phase ' + t.phase + ' ' + gradeBadge(t) + '</li>'; }).join('') +
    '</ol></section>' +
    '<section class="planner-card"><h3>Closest to done (by target progress)</h3><ol>' +
    (closest.length ? closest.map(function (c) { return '<li><a href="#/trophy/' + c.t.id + '">' + esc(shownName(c.t)) + '</a> — ' + esc(targetLabel(c.t)) + ' (' + Math.round(c.frac * 100) + '%)</li>'; }).join('') : '<li>No target trophies started yet — pick one from the checklist and use its counter.</li>') +
    '</ol></section>';
}
function renderSave() {
  var earned = trophies.filter(isEarned).length;
  var remaining = trophies.length - earned;
  var effort = trophies.filter(function (t) { return !isEarned(t); }).reduce(function (sum, t) { return sum + t.difficulty; }, 0);
  view.innerHTML =
    '<h2>Save &amp; settings</h2>' +
    '<p class="lede">Your progress is saved in this browser (localStorage). Export it to a file as a backup, and import it back on another device or after clearing browser data.</p>' +
    '<div class="save-grid">' +
    '<section class="save-card"><h3>Your stats</h3><p>Earned: ' + earned + ' / ' + trophies.length + '</p><p>Remaining: ' + remaining + '</p><p>Estimated remaining effort: ' + effort + ' difficulty points (sum of the difficulty of every un-earned trophy, 1–5 each)</p><p>Cited steps in this guide: ' + citedStepCount() + ' across ' + sourceList.length + ' dated sources.</p></section>' +
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
  document.getElementById('export-btn').addEventListener('click', exportProgress);
  document.getElementById('import-file').addEventListener('change', importProgress);
  document.getElementById('save-spoiler').addEventListener('change', function (e) {
    state.hideSpoilers = e.target.checked;
    document.getElementById('spoiler-toggle').checked = state.hideSpoilers;
    saveState(); route();
  });
  document.getElementById('save-theme').addEventListener('click', function () {
    state.theme = state.theme === 'night' ? 'paper' : 'night';
    saveState(); applyTheme(); route();
  });
  document.getElementById('reset-btn').addEventListener('click', function () {
    if (window.confirm('Reset all progress, counters and notes?')) {
      state = defaultState();
      document.getElementById('spoiler-toggle').checked = state.hideSpoilers;
      saveState(); applyTheme(); updateHeader(); route();
    }
  });
}
function exportProgress() {
  var blob = new Blob([JSON.stringify({ app: 'gta6-trophy-guide', version: 2, earned: state.earned, progress: state.progress, notes: state.notes }, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}
function importProgress(e) {
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
      saveState(); updateHeader(); route();
      msg.textContent = 'Imported progress from ' + file.name + '.';
    } catch (err) { msg.textContent = 'That file could not be read as progress JSON.'; }
  };
  reader.readAsText(file);
}
function setActiveTab(name) {
  var tabs = document.querySelectorAll('#tabs a');
  tabs.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-view') === name); });
}
function route() {
  var hash = window.location.hash || '#/';
  var toolbar = document.getElementById('toolbar');
  var match = hash.match(/^#\/trophy\/(\d+)$/);
  if (match) {
    toolbar.style.display = 'none';
    setActiveTab('checklist');
    renderGuide(Number(match[1]));
  } else if (hash === '#/roadmap') {
    toolbar.style.display = 'none';
    setActiveTab('roadmap');
    renderRoadmap();
  } else if (hash === '#/missables') {
    toolbar.style.display = 'none';
    setActiveTab('missables');
    renderMissables();
  } else if (hash === '#/sources') {
    toolbar.style.display = 'none';
    setActiveTab('sources');
    renderSources();
  } else if (hash === '#/planner') {
    toolbar.style.display = 'none';
    setActiveTab('planner');
    renderPlanner();
  } else if (hash === '#/save') {
    toolbar.style.display = 'none';
    setActiveTab('save');
    renderSave();
  } else {
    toolbar.style.display = 'flex';
    setActiveTab('checklist');
    renderChecklist();
  }
  updateHeader();
}
function initControls() {
  var kinds = [];
  trophies.forEach(function (t) { if (kinds.indexOf(t.kind) === -1) kinds.push(t.kind); });
  kinds.sort();
  var sel = document.getElementById('filter-kind');
  kinds.forEach(function (k) {
    var o = document.createElement('option');
    o.value = k; o.textContent = KIND_LABELS[k] || k;
    sel.appendChild(o);
  });
  document.getElementById('search').addEventListener('input', renderChecklist);
  document.getElementById('filter-grade').addEventListener('change', renderChecklist);
  document.getElementById('filter-kind').addEventListener('change', renderChecklist);
  document.getElementById('filter-status').addEventListener('change', renderChecklist);
  document.getElementById('filter-missable').addEventListener('change', renderChecklist);
  document.getElementById('spoiler-toggle').addEventListener('change', function (e) {
    state.hideSpoilers = e.target.checked; saveState(); route();
  });
  document.getElementById('theme-toggle').addEventListener('click', function () {
    state.theme = state.theme === 'night' ? 'paper' : 'night';
    saveState(); applyTheme();
  });
  document.getElementById('spoiler-toggle').checked = state.hideSpoilers;
  view.addEventListener('change', function (e) {
    var earn = e.target.getAttribute && e.target.getAttribute('data-earn');
    if (earn) {
      var id = Number(earn);
      if (e.target.checked) state.earned[id] = true; else delete state.earned[id];
      saveState(); route();
    }
  });
  view.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-step]') : null;
    if (!btn) return;
    var id = Number(btn.getAttribute('data-id'));
    var t = trophyById(id);
    if (!t || !t.target) return;
    var cur = progressOf(t);
    var next = Math.max(0, Math.min(t.target.count, cur + Number(btn.getAttribute('data-step'))));
    state.progress[id] = next;
    saveState(); route();
  });
  window.addEventListener('hashchange', route);
}
fetch('data/trophies.json').then(function (r) { return r.json(); }).then(function (data) {
  trophies = data.trophies || data;
  sourceList = data.sources || [];
  disputeList = data.disagreements || [];
  if (data.audit && data.audit.last_checked) lastChecked = data.audit.last_checked;
  seedDemo();
  applyTheme();
  initControls();
  route();
}).catch(function () {
  view.innerHTML = '<h2>Could not load the trophy data</h2><p>The file app/data/trophies.json could not be read. Serve the app/ folder with a static server and try again.</p>';
});
