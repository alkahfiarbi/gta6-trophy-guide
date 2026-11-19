// Leonida Platinum Guide — offline GTA VI trophy tracker (vanilla JS, no libraries).
// Loads app/data/trophies.json, renders the checklist, guide panes, roadmap,
// missables, planner and save page. Progress lives in localStorage only.
var STORE_KEY = 'gta6-trophy-guide-v1';
var DEMO_EARNED = [2, 3, 8, 10, 16, 20, 21, 33, 44, 46, 47, 51, 55];
var DEMO_PROGRESS = { 15: 87, 35: 41, 42: 19, 31: 23, 52: 64000, 53: 41200 };
var PHASES = [
  { n: 1, title: 'Phase 1 — Story first', note: 'Play the story, and grab the one-time moments as they come.', ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 33, 34, 37, 38, 39, 44, 45, 46, 47, 48, 49, 50, 51] },
  { n: 2, title: 'Phase 2 — Strangers & side stories', note: 'Clear the stranger strands and side characters after the story opens them up.', ids: [20, 22, 23, 24, 25, 26, 27, 29] },
  { n: 3, title: 'Phase 3 — Activities & exploration', note: 'Races, ranges, fishing, meditation, vehicles and the open map.', ids: [15, 16, 17, 18, 19, 21, 28, 35, 41, 42, 43, 55] },
  { n: 4, title: 'Phase 4 — Collectibles, grind & cleanup', note: 'Cards, WAiNK spots, money goals, the last combat trophies — then the platinum.', ids: [14, 30, 31, 32, 36, 40, 52, 53, 54, 1] }
];
var KIND_LABELS = { story: 'Story', mission: 'Mission', activity: 'Activity', collectible: 'Collectible', combat: 'Combat', coop: 'Co-op', exploration: 'Exploration', money: 'Money', side: 'Side', misc: 'Misc', completion: 'Completion', platinum: 'Platinum' };
var DIFF_LABELS = { 1: 'Easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Very hard' };

var trophies = [];
var state = loadState();
var view = document.getElementById('view');

function defaultState() {
  return { earned: {}, progress: {}, notes: {}, hideSpoilers: true, theme: 'paper' };
}
function loadState() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      var s = JSON.parse(raw);
      if (s && typeof s === 'object') return Object.assign(defaultState(), s);
    }
  } catch (e) { /* fresh start on bad data */ }
  return defaultState();
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage full */ }
}
function isDemo() {
  var q = new URLSearchParams(window.location.search);
  return q.get('demo') === '1' && Object.keys(state.earned).length === 0 && Object.keys(state.progress).length === 0;
}
function seedDemo() {
  if (!isDemo()) return;
  DEMO_EARNED.forEach(function (id) { state.earned[id] = true; });
  Object.keys(DEMO_PROGRESS).forEach(function (id) { state.progress[id] = DEMO_PROGRESS[id]; });
  saveState();
}
function byId(id) {
  for (var i = 0; i < trophies.length; i++) if (trophies[i].id === id) return trophies[i];
  return null;
}
function isEarned(t) { return !!state.earned[t.id]; }
function progressOf(t) { return state.progress[t.id] || 0; }
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function displayName(t) {
  if (t.hidden && state.hideSpoilers && !isEarned(t)) return 'Hidden trophy — earn it to reveal its name';
  return t.name;
}
function displayDesc(t) {
  if (t.hidden && state.hideSpoilers && !isEarned(t)) return 'This trophy is hidden on PlayStation until it is earned. Its description is masked here.';
  return t.description;
}
function gradeBadge(t) {
  return '<span class="badge ' + esc(t.grade) + '">' + esc(t.grade) + '</span>';
}
function badgesFor(t) {
  var out = gradeBadge(t);
  out += '<span class="badge">' + esc(KIND_LABELS[t.kind] || t.kind) + '</span>';
  out += '<span class="badge">Difficulty ' + t.difficulty + ' / 5 — ' + esc(DIFF_LABELS[t.difficulty] || '') + '</span>';
  out += '<span class="badge">Phase ' + t.phase + '</span>';
  if (t.missable) out += '<span class="badge missable">MISSABLE</span>';
  if (t.hidden) out += '<span class="badge hidden-badge">Hidden</span>';
  return out;
}
function targetText(t) {
  if (!t.target) return '';
  var unit = t.target.unit || '';
  var val = t.target.count;
  if (unit === '$') return '$' + progressOf(t).toLocaleString('en-US') + ' / $' + val.toLocaleString('en-US');
  if (unit === '%') return progressOf(t) + ' / ' + val + '%';
  return progressOf(t) + ' / ' + val + ' ' + esc(unit);
}
function stepperHtml(t) {
  if (!t.target) return '';
  return '<div class="stepper"><button type="button" data-step="-1" data-id="' + t.id + '" aria-label="Decrease progress">−</button>' +
    '<span class="count">' + esc(targetText(t)) + '</span>' +
    '<button type="button" data-step="1" data-id="' + t.id + '" aria-label="Increase progress">+</button></div>';
}
function rowHtml(t) {
  var cls = isEarned(t) ? 'trophy-row earned' : 'trophy-row';
  var checked = isEarned(t) ? ' checked' : '';
  return '<li class="' + cls + '">' +
    '<input type="checkbox" data-earn="' + t.id + '"' + checked + ' aria-label="Mark ' + esc(displayName(t)) + ' earned">' +
    '<div><h3><a href="#/trophy/' + t.id + '">' + esc(displayName(t)) + '</a></h3>' +
    '<p class="desc">' + esc(displayDesc(t)) + '</p>' +
    '<div class="badges">' + badgesFor(t) + '</div></div>' +
    stepperHtml(t) + '</li>';
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
  view.innerHTML =
    '<h2>Trophy checklist</h2>' +
    '<p class="lede">Tick a trophy when you earn it. Use the counters on trophies with a target (stunts, vehicles, money) to track partial progress. Click a trophy name to open its full guide, with sources.</p>' +
    '<div class="grade-counts"><span>Platinum ' + counts.platinum + ' / 1</span><span>Gold ' + counts.gold + ' / 2</span><span>Silver ' + counts.silver + ' / 6</span><span>Bronze ' + counts.bronze + ' / 46</span><span>Hidden 28</span><span>Missable 13</span></div>' +
    '<p class="count-line">Showing ' + list.length + ' of ' + trophies.length + ' trophies</p>' +
    '<ul class="trophy-list">' + list.map(rowHtml).join('') + '</ul>';
}
function renderGuide(id) {
  var t = byId(id);
  if (!t) { view.innerHTML = '<h2>Trophy not found</h2><p><a href="#/">Back to the checklist</a></p>'; return; }
  var steps = (t.steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
  var tips = (t.tips || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
  var sources = (t.sources || []).filter(function (s) { return s.url; }).map(function (s) {
    return '<p><strong>' + esc(s.label) + ':</strong> ' + esc(s.url) + '</p>';
  }).join('');
  var missNote = t.missable
    ? '<div class="warn"><strong>When it can be missed:</strong> this trophy is flagged MISSABLE. No mission replay is confirmed for GTA VI, so do it when the chance appears. If you miss it, try replaying the mission from the pause menu.</div>'
    : '<p><strong>When it can be missed:</strong> not flagged missable — it can be done at any time.</p>';
  view.innerHTML =
    '<p class="back-link"><a href="#/">&larr; Back to the checklist</a></p>' +
    '<article class="guide-pane">' +
    '<h2>' + esc(displayName(t)) + '</h2>' +
    '<div class="badges">' + badgesFor(t) + '</div>' +
    '<p class="desc">Official description: “' + esc(displayDesc(t)) + '”</p>' +
    (t.target ? '<p><strong>Target:</strong> ' + esc(targetText(t)) + '</p>' + stepperHtml(t) : '') +
    '<h3>Guide</h3><p>' + esc(t.guide) + '</p>' +
    (steps ? '<h3>Steps</h3><ol>' + steps + '</ol>' : '') +
    (tips ? '<h3>Tips</h3><ul>' + tips + '</ul>' : '') +
    missNote +
    '<h3>Your notes</h3><textarea class="notes" id="notes-box" placeholder="Your own notes for this trophy…">' + esc(state.notes[t.id] || '') + '</textarea>' +
    '<div class="sources"><h4>Sources</h4>' + sources +
    '<p>Guide text: our own advice from the official description, not yet checked in the game.</p></div>' +
    '</article>';
  var box = document.getElementById('notes-box');
  box.addEventListener('input', function () { state.notes[t.id] = box.value; saveState(); });
}
function renderRoadmap() {
  var html = '<h2>Roadmap to the platinum</h2>' +
    '<p class="lede">Four phases, in play order, built from the official trophy descriptions. Finish the story first, then the stranger strands, then activities and exploration, then collectibles and the long grinds — the platinum pops last.</p>';
  PHASES.forEach(function (ph) {
    var items = ph.ids.map(byId).filter(Boolean);
    var done = items.filter(isEarned).length;
    var pct = items.length ? Math.round(done / items.length * 100) : 0;
    html += '<section class="phase"><h3>' + esc(ph.title) + ' — ' + done + ' / ' + items.length + '</h3>' +
      '<p>' + esc(ph.note) + '</p><div class="mini-bar"><div class="mini-fill" style="width:' + pct + '%"></div></div>' +
      '<ul>' + items.map(function (t) {
        return '<li class="' + (isEarned(t) ? 'earned' : '') + '"><a href="#/trophy/' + t.id + '">' + esc(displayName(t)) + '</a> ' + gradeBadge(t) + (t.missable ? ' <span class="badge missable">MISSABLE</span>' : '') + '</li>';
      }).join('') + '</ul></section>';
  });
  view.innerHTML = html;
}
function renderMissables() {
  var list = trophies.filter(function (t) { return t.missable; });
  view.innerHTML =
    '<h2>Missable trophies</h2>' +
    '<p class="lede">' + list.length + ' trophies are flagged missable. No mission replay is confirmed for GTA VI, so do each of these when its chance appears — and if you miss one, try replaying the mission from the pause menu.</p>' +
    '<div class="warn"><strong>Read this first:</strong> the game has no confirmed mission replay. Keep a manual save at the start of every chapter and one before the final mission, so a missed moment never costs you a whole playthrough.</div>' +
    '<ul class="trophy-list">' + list.map(rowHtml).join('') + '</ul>';
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
    easiest.map(function (t) { return '<li><a href="#/trophy/' + t.id + '">' + esc(displayName(t)) + '</a> — difficulty ' + t.difficulty + ' / 5, phase ' + t.phase + ' ' + gradeBadge(t) + '</li>'; }).join('') +
    '</ol></section>' +
    '<section class="planner-card"><h3>Closest to done (by target progress)</h3><ol>' +
    (closest.length ? closest.map(function (c) { return '<li><a href="#/trophy/' + c.t.id + '">' + esc(displayName(c.t)) + '</a> — ' + esc(targetText(c.t)) + ' (' + Math.round(c.frac * 100) + '%)</li>'; }).join('') : '<li>No target trophies started yet — pick one from the checklist and use its counter.</li>') +
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
    '<section class="save-card"><h3>Your stats</h3><p>Earned: ' + earned + ' / ' + trophies.length + '</p><p>Remaining: ' + remaining + '</p><p>Estimated remaining effort: ' + effort + ' difficulty points (sum of the difficulty of every un-earned trophy, 1–5 each)</p></section>' +
    '<section class="save-card"><h3>Export / import</h3>' +
    '<p><button class="btn" type="button" id="export-btn">Export progress (JSON)</button></p>' +
    '<p><label>Import progress: <input type="file" id="import-file" accept="application/json,.json"></label></p>' +
    '<p id="import-msg"></p></section>' +
    '<section class="save-card"><h3>Settings</h3>' +
    '<p><label class="check"><input type="checkbox" id="save-spoiler" ' + (state.hideSpoilers ? 'checked' : '') + '> Hide hidden trophies (spoiler setting)</label></p>' +
    '<p><button class="btn ghost" type="button" id="save-theme">Switch to ' + (state.theme === 'night' ? 'paper' : 'night') + ' theme</button></p>' +
    '<p><button class="btn ghost" type="button" id="reset-btn">Reset all progress</button></p></section>' +
    '<section class="save-card"><h3>Sources &amp; honesty</h3>' +
    '<p>Official list: Exophase — https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/ and PSNProfiles — https://psnprofiles.com/trophies/43531-grand-theft-auto-vi</p>' +
    '<p>List make-up: 55 trophies — 1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden.</p>' +
    '<p>GTA VI is not out yet (19 Nov 2026). No trophy has been earned in the game by anyone; every guide here is written from the official trophy descriptions. Where a location or step is not pinned down by the description, the guide says so instead of guessing.</p></section>' +
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
  var blob = new Blob([JSON.stringify({ app: 'gta6-trophy-guide', version: 1, earned: state.earned, progress: state.progress, notes: state.notes }, null, 2)], { type: 'application/json' });
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
function route() {
  var hash = window.location.hash || '#/';
  var tabs = document.querySelectorAll('#tabs a');
  tabs.forEach(function (a) { a.classList.remove('active'); });
  var toolbar = document.getElementById('toolbar');
  var match = hash.match(/^#\/trophy\/(\d+)$/);
  if (match) {
    toolbar.style.display = 'none';
    document.querySelector('[data-view="checklist"]').classList.add('active');
    renderGuide(Number(match[1]));
  } else if (hash === '#/roadmap') {
    toolbar.style.display = 'none';
    document.querySelector('[data-view="roadmap"]').classList.add('active');
    renderRoadmap();
  } else if (hash === '#/missables') {
    toolbar.style.display = 'none';
    document.querySelector('[data-view="missables"]').classList.add('active');
    renderMissables();
  } else if (hash === '#/planner') {
    toolbar.style.display = 'none';
    document.querySelector('[data-view="planner"]').classList.add('active');
    renderPlanner();
  } else if (hash === '#/save') {
    toolbar.style.display = 'none';
    document.querySelector('[data-view="save"]').classList.add('active');
    renderSave();
  } else {
    toolbar.style.display = 'flex';
    document.querySelector('[data-view="checklist"]').classList.add('active');
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
    var t = byId(id);
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
  seedDemo();
  applyTheme();
  initControls();
  route();
}).catch(function () {
  view.innerHTML = '<h2>Could not load the trophy data</h2><p>The file app/data/trophies.json could not be read. Serve the app/ folder with a static server and try again.</p>';
});
