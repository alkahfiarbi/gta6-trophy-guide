/* Leonida Platinum Guide v3 — offline GTA VI trophy guide & tracker.
   Vanilla JS, no libraries, no network calls. Data lives in data/trophies.json. */
(function () {
  "use strict";
  var KEY = "gta6-trophy-guide-v1";
  var DEMO_EARNED = [2, 3, 8, 10, 16, 20, 21, 33, 44, 46, 47, 51, 55];
  var DEMO_PROGRESS = { 15: 87, 35: 41 };
  var PHASES = [
    { n: 1, name: "Story first", time: "60–80 h", blurb: "Play chapters 1–5 and grab the one-time moments as they come." },
    { n: 2, name: "Strangers & side stories", time: "10–20 h", blurb: "Stranger strands and side missions." },
    { n: 3, name: "Activities & exploration", time: "60–80 h", blurb: "Activities, exploration and the open map." },
    { n: 4, name: "Collectibles, grind & cleanup", time: "40–60 h", blurb: "Cards, WAiNK, challenges, money — then the platinum." }
  ];
  var TIMES = {
    1: "200 h total", 2: "story", 3: "story", 4: "story", 5: "story", 6: "story", 7: "story",
    8: "story", 9: "story", 10: "story", 11: "story", 12: "story", 13: "story",
    14: "100 h", 15: "5–10 h", 16: "1 h", 17: "5–10 h", 18: "2–4 h", 19: "3–6 h",
    20: "30 min", 21: "30 min", 22: "30 min–1 h", 23: "30 min–1 h", 24: "30 min–1 h",
    25: "10–20 h", 26: "30 min–1 h", 27: "30 min–1 h", 28: "2–4 h", 29: "30 min–1 h",
    30: "5–10 h", 31: "5–10 h", 32: "10–20 h", 33: "minutes", 34: "minutes",
    35: "3–6 h", 36: "30 min", 37: "minutes", 38: "minutes", 39: "minutes",
    40: "2–4 h", 41: "30 min", 42: "5–10 h", 43: "2–4 h", 44: "minutes",
    45: "minutes", 46: "minutes", 47: "minutes", 48: "as you play", 49: "minutes",
    50: "minutes", 51: "minutes", 52: "5–10 h", 53: "as you play", 54: "2–4 h", 55: "1 h"
  };
  var KIND_LABELS = { platinum: "Platinum", story: "Story", mission: "Mission", completion: "Completion", activity: "Activity", side: "Side", collectible: "Collectible", coop: "Co-op", combat: "Combat", misc: "Misc", exploration: "Exploration", money: "Money" };

  var DATA = null;
  var state = loadState();
  var view = document.getElementById("view");
  var revealed = {}; // hidden trophies the user chose to reveal in this session

  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* corrupted save: start fresh */ }
    var fresh = { earned: {}, progress: {}, notes: {}, theme: "paper", spoiler: true };
    if (new URLSearchParams(location.search).get("demo") === "1") {
      DEMO_EARNED.forEach(function (id) { fresh.earned[id] = true; });
      fresh.progress = { 15: 87, 35: 41 };
    }
    return fresh;
  }
  function saveState() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full/blocked */ }
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function byId(id) { return DATA.trophies.find(function (t) { return t.id === id; }); }
  function srcById(id) { return DATA.sources.find(function (s) { return s.id === id; }); }
  function srcTags(ids) {
    return (ids || []).map(function (id) { return "<b>S" + id + "</b>"; }).join(", ");
  }
  function countClaims() {
    var total = 0, two = 0;
    DATA.trophies.forEach(function (t) {
      ["steps", "prose", "tips"].forEach(function (k) {
        (t[k] || []).forEach(function (it) {
          if (it.s && it.s.length) { total++; if (it.s.length >= 2) two++; }
        });
      });
    });
    return { total: total, two: two };
  }
  function earnedCount() {
    return DATA.trophies.filter(function (t) { return state.earned[t.id]; }).length;
  }
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme === "night" ? "night" : "paper");
    var b = document.getElementById("themeBtn");
    if (b) { b.textContent = state.theme === "night" ? "Paper" : "Night"; b.setAttribute("aria-pressed", state.theme === "night" ? "true" : "false"); }
  }
  function applySpoilerBtn() {
    var b = document.getElementById("spoilerBtn");
    if (b) { b.textContent = state.spoiler ? "Show hidden" : "Hide hidden"; b.setAttribute("aria-pressed", state.spoiler ? "true" : "false"); }
  }

  /* ---------- shared bits ---------- */
  function gradeBadge(t) {
    return '<span class="badge ' + t.grade + '">' + t.grade + '</span>';
  }
  function stepper(t) {
    if (!t.target) return "";
    var cur = state.progress[t.id] || 0;
    var unit = t.target.unit === "$" ? "$" : "";
    var label = unit ? unit + cur.toLocaleString() + " / " + unit + t.target.count.toLocaleString()
      : cur + " / " + t.target.count + (t.target.unit && t.target.unit !== "%" ? " " + t.target.unit : t.target.unit === "%" ? "%" : "");
    return '<span class="stepper"><button type="button" data-step="-1" data-id="' + t.id + '" aria-label="Decrease progress">−</button><b>' + esc(label) + '</b><button type="button" data-step="1" data-id="' + t.id + '" aria-label="Increase progress">+</button></span>';
  }
  function trophyRow(t, opts) {
    opts = opts || {};
    var hidden = t.hidden && state.spoiler && !revealed[t.id] && !opts.reveal;
    var name = hidden ? "Hidden trophy" : esc(t.name);
    var desc = hidden ? "Hidden until revealed — turn off the spoiler setting to see it." : esc(t.description);
    var badges = gradeBadge(t)
      + '<span class="badge">' + esc(KIND_LABELS[t.kind] || t.kind) + '</span>'
      + '<span class="badge diff">Difficulty ' + t.difficulty + '/5</span>'
      + (t.missable ? '<span class="badge missable">Missable</span>' : "")
      + (t.hidden ? '<span class="badge hidden">Hidden</span>' : "")
      + (TIMES[t.id] && TIMES[t.id] !== "story" ? '<span class="badge">' + esc(TIMES[t.id]) + '</span>' : "");
    var checked = state.earned[t.id] ? " checked" : "";
    return '<div class="trow' + (state.earned[t.id] ? " earned" : "") + '" data-open="' + t.id + '">'
      + '<input type="checkbox" class="check" data-earn="' + t.id + '"' + checked + ' aria-label="Mark ' + name + ' earned">'
      + '<div class="body"><div class="name">' + name + '</div><div class="desc">' + desc + '</div><div class="meta">' + badges + '</div></div>'
      + stepper(t) + "</div>";
  }
  function statCards() {
    var c = countClaims();
    return '<div class="statgrid">'
      + '<div class="stat"><b>' + c.total + '</b><span>cited claims in the guide</span></div>'
      + '<div class="stat"><b>' + c.two + '</b><span>claims backed by 2+ sources</span></div>'
      + '<div class="stat"><b>' + DATA.sources.length + '</b><span>dated sources, checked 21 Nov 2026</span></div>'
      + '<div class="stat"><b>' + DATA.disputes.length + '</b><span>disagreements logged</span></div>'
      + '<div class="stat"><b>21 Nov 2026</b><span>last checked</span></div>'
      + "</div>";
  }

  /* ---------- views ---------- */
  function renderChecklist() {
    var q = (renderChecklist.q || "").toLowerCase();
    var grade = renderChecklist.grade || "all";
    var kind = renderChecklist.kind || "all";
    var status = renderChecklist.status || "all";
    var missOnly = !!renderChecklist.missOnly;
    var total = DATA.trophies.length, done = earnedCount();
    var byGrade = {};
    DATA.trophies.forEach(function (t) {
      byGrade[t.grade] = byGrade[t.grade] || { done: 0, total: 0 };
      byGrade[t.grade].total++;
      if (state.earned[t.id]) byGrade[t.grade].done++;
    });
    var gradeLine = ["platinum", "gold", "silver", "bronze"].map(function (g) {
      return g + " " + (byGrade[g] ? byGrade[g].done : 0) + "/" + (byGrade[g] ? byGrade[g].total : 0);
    }).join(" · ");
    var kinds = Object.keys(KIND_LABELS).filter(function (k) { return DATA.trophies.some(function (t) { return t.kind === k; }); });
    var list = DATA.trophies.filter(function (t) {
      if (grade !== "all" && t.grade !== grade) return false;
      if (kind !== "all" && t.kind !== kind) return false;
      if (status === "earned" && !state.earned[t.id]) return false;
      if (status === "not" && state.earned[t.id]) return false;
      if (missOnly && !t.missable) return false;
      if (q && (t.name + " " + t.description).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var html = '<div class="card"><h2>Checklist — all 55 trophies</h2>'
      + '<p class="muted">Official list: 1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden. '
      + 'Every step, sentence and tip in this guide carries its sources — nothing here is an uncited guess.</p>'
      + statCards()
      + '<div class="progress" role="progressbar" aria-valuenow="' + done + '" aria-valuemax="' + total + '"><i style="width:' + Math.round(done / total * 100) + '%"></i></div>'
      + '<p><b>' + done + ' / ' + total + ' earned</b> <span class="muted">· ' + esc(gradeLine) + '</span></p>'
      + '<div class="filters"><input type="search" id="q" placeholder="Search trophies…" value="' + esc(renderChecklist.q || "") + '">'
      + '<select id="fGrade" aria-label="Filter by grade"><option value="all">All grades</option>'
      + ["platinum", "gold", "silver", "bronze"].map(function (g) { return '<option value="' + g + '"' + (grade === g ? " selected" : "") + ">" + g + "</option>"; }).join("") + "</select>"
      + '<select id="fKind" aria-label="Filter by kind"><option value="all">All kinds</option>'
      + kinds.map(function (k) { return '<option value="' + k + '"' + (kind === k ? " selected" : "") + ">" + esc(KIND_LABELS[k]) + "</option>"; }).join("") + "</select>"
      + '<select id="fStatus" aria-label="Filter by status"><option value="all">All</option>'
      + '<option value="earned"' + (status === "earned" ? " selected" : "") + '>Earned</option>'
      + '<option value="not"' + (status === "not" ? " selected" : "") + '>Not earned</option></select>'
      + '<label><input type="checkbox" id="fMiss"' + (missOnly ? " checked" : "") + '> Missable only</label>'
      + "</div></div>";
    if (!list.length) html += '<div class="card"><p class="muted">No trophies match these filters.</p></div>';
    list.forEach(function (t) { html += trophyRow(t); });
    view.innerHTML = html;
    document.getElementById("q").addEventListener("input", function (e) { renderChecklist.q = e.target.value; rerender(false); });
    document.getElementById("fGrade").addEventListener("change", function (e) { renderChecklist.grade = e.target.value; rerender(false); });
    document.getElementById("fKind").addEventListener("change", function (e) { renderChecklist.kind = e.target.value; rerender(false); });
    document.getElementById("fStatus").addEventListener("change", function (e) { renderChecklist.status = e.target.value; rerender(false); });
    document.getElementById("fMiss").addEventListener("change", function (e) { renderChecklist.missOnly = e.target.checked; rerender(false); });
    var qi = document.getElementById("q");
    if (renderChecklist.q) { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); }
  }

  function renderGuide(id) {
    var t = byId(id);
    if (!t) { view.innerHTML = '<div class="card"><p>Unknown trophy.</p><a class="backlink" href="#/">← Back to checklist</a></div>'; return; }
    var hidden = t.hidden && state.spoiler && !revealed[t.id];
    var srcList = (t.sources || []).map(function (sid) {
      var s = srcById(sid);
      if (!s) return "";
      return "<li><b>" + esc(s.label) + "</b> — " + esc(s.covers) + "<br><span class='url'>" + esc(s.url) + "</span> <span class='muted'>(checked " + esc(s.checked) + ")</span></li>";
    }).join("");
    var disputeLinks = (t.disputeIds || []).map(function (did) {
      var d = DATA.disputes.find(function (x) { return x.id === did; });
      if (!d) return "";
      return '<li><a href="#/save">Dispute D' + d.id + ": " + esc(d.topic) + '</a> — this guide follows: ' + esc(d.follows) + "</li>";
    }).join("");
    var html = '<a class="backlink" href="#/">← Back to checklist</a><div class="card">'
      + '<div class="guide-head"><div style="flex:1"><h2>' + (hidden ? "Hidden trophy" : esc(t.name)) + '</h2>'
      + '<p class="muted">' + (hidden ? "Hidden until revealed." : esc(t.description)) + "</p></div>"
      + '<div>' + gradeBadge(t) + ' <span class="badge diff">Difficulty ' + t.difficulty + '/5</span>'
      + (TIMES[t.id] && TIMES[t.id] !== "story" ? ' <span class="badge">' + esc(TIMES[t.id]) + '</span>' : "")
      + (t.missable ? ' <span class="badge missable">Missable</span>' : "")
      + (t.hidden ? ' <span class="badge hidden">Hidden</span>' : "") + "</div></div>";
    if (hidden) {
      html += '<p>This is a hidden trophy and your spoiler setting is on. <button class="btn" type="button" id="revealBtn">Reveal this trophy</button></p></div>';
      view.innerHTML = html;
      document.getElementById("revealBtn").addEventListener("click", function () { revealed[t.id] = true; rerender(true); });
      return;
    }
    html += '<div class="answer"><b>Short answer:</b> ' + esc(t.answer) + ' <span class="srcs">[' + srcTags(t.answerSrc) + "]</span></div>";
    if (t.missable && t.missableNote) {
      html += '<div class="missbox"><h4>⚠ When it can be missed</h4><p>' + esc(t.missableNote) + "</p></div>";
    }
    html += "<h3>Steps</h3><ol class='steps'>"
      + (t.steps || []).map(function (s) { return "<li>" + esc(s.t) + ' <span class="srcs">[' + srcTags(s.s) + "]</span></li>"; }).join("") + "</ol>";
    html += '<div class="srcblock"><h4>Sources for this trophy</h4><ul>' + srcList + "</ul>"
      + '<p class="small muted">Guide text is our own advice written from the official description and the sources above — not copied from any guide, and not yet checked by playing the game.</p></div>';
    if (disputeLinks) html += "<h3>Disputed — read before you trust this one</h3><ul class='tips'>" + disputeLinks + "</ul>";
    html += "<h3>Tips</h3><ul class='tips'>"
      + (t.tips || []).map(function (s) { return "<li>" + esc(s.t) + ' <span class="srcs">[' + srcTags(s.s) + "]</span></li>"; }).join("") + "</ul>";
    html += "<h3>In short</h3><p>" + (t.prose || []).map(function (s) { return esc(s.t) + ' <span class="srcs">[' + srcTags(s.s) + "]</span>"; }).join(" ") + "</p>";
    if (t.target) {
      html += "<h3>Your progress</h3><p>" + stepper(t) + "</p>";
    }
    html += '<div class="notebox"><h3>Your notes</h3><textarea id="note" placeholder="e.g. where you found it, what worked…">' + esc(state.notes[t.id] || "") + '</textarea><p class="saved" id="noteSaved"></p></div>';
    html += '<p><label><input type="checkbox" id="earnBox"' + (state.earned[t.id] ? " checked" : "") + '> Earned</label></p>';
    html += "</div>";
    view.innerHTML = html;
    document.getElementById("note").addEventListener("input", function (e) {
      state.notes[t.id] = e.target.value; saveState();
      document.getElementById("noteSaved").textContent = "Saved in this browser.";
    });
    document.getElementById("earnBox").addEventListener("change", function (e) {
      if (e.target.checked) state.earned[t.id] = true; else delete state.earned[t.id];
      saveState();
    });
  }

  function renderRoadmap() {
    var html = '<div class="card"><h2>Roadmap — four phases</h2>'
      + '<p class="muted">Estimates from the PowerPyx roadmap (story 60–80 h, checklist ~100 h, cleanup ~10 h). Phases overlap; the whole run is about 200 hours. Per-trophy times are rough — treat them as planning guesses, not promises.</p><div class="phase-strip">';
    PHASES.forEach(function (p) {
      var ts = DATA.trophies.filter(function (t) { return t.phase === p.n; });
      var done = ts.filter(function (t) { return state.earned[t.id]; }).length;
      html += '<div class="phase-cell"><b>Phase ' + p.n + " — " + esc(p.name) + "</b>"
        + '<span class="t">' + ts.length + " trophies</span>"
        + '<span class="ttime">' + esc(p.time) + "</span>"
        + "<span>" + esc(p.blurb) + "</span><br><span>" + done + " / " + ts.length + " earned</span></div>";
    });
    html += "</div></div><div class='phase-list'>";
    PHASES.forEach(function (p) {
      var ts = DATA.trophies.filter(function (t) { return t.phase === p.n; }).sort(function (a, b) { return a.id - b.id; });
      var done = ts.filter(function (t) { return state.earned[t.id]; }).length;
      html += '<div class="card"><h3>Phase ' + p.n + " — " + esc(p.name) + " (" + done + "/" + ts.length + ")</h3>"
        + '<div class="progress"><i style="width:' + Math.round(done / ts.length * 100) + '%"></i></div>';
      ts.forEach(function (t) { html += trophyRow(t); });
      html += "</div>";
    });
    view.innerHTML = html + "</div>";
  }

  function renderMissables() {
    var ms = DATA.trophies.filter(function (t) { return t.missable; });
    var done = ms.filter(function (t) { return state.earned[t.id]; }).length;
    var html = '<div class="warnhead"><h2>Missables — do these when you see them</h2>'
      + "<p><b>No mission replay is confirmed for GTA VI.</b> The trophies below are one-time moments: a co-op escape, a first-visit scene, a choice that cannot be unmade. "
      + "If you pass one, the only rewind is a manual save from before it — keep one at the start and end of each chapter. "
      + "The guides name only one possibly missable trophy (the Chapter 1 meditation); this guide flags 13 one-time moments as well, and says so plainly — see dispute D5 on the Save &amp; Sources page.</p>"
      + "<p>" + done + " / " + ms.length + " missables earned.</p></div>";
    ms.forEach(function (t) { html += trophyRow(t); });
    view.innerHTML = html;
  }

  function renderPlanner() {
    var un = DATA.trophies.filter(function (t) { return !state.earned[t.id]; });
    var easiest = un.slice().sort(function (a, b) { return (a.difficulty - b.difficulty) || (a.phase - b.phase) || (a.id - b.id); }).slice(0, 5);
    var withTarget = un.filter(function (t) { return t.target; });
    var closest = withTarget.map(function (t) {
      var cur = state.progress[t.id] || 0;
      return { t: t, ratio: cur / t.target.count };
    }).sort(function (a, b) { return (b.ratio - a.ratio) || (a.t.target.count - b.t.target.count); }).slice(0, 3);
    var html = '<div class="card"><h2>Next Up — what to do first</h2><p class="muted">Five easiest trophies you have not earned yet, and the three you are closest to finishing.</p></div><div class="plan-col"><div class="card"><h3>5 easiest un-earned</h3>';
    easiest.forEach(function (t) { html += trophyRow(t); });
    html += '</div><div class="card"><h3>3 closest to done</h3>';
    if (!closest.length) html += '<p class="muted">No target trophies left.</p>';
    closest.forEach(function (c) { html += trophyRow(c.t); });
    html += "</div></div>";
    view.innerHTML = html;
  }

  function renderSave() {
    var c = countClaims();
    var html = '<div class="card"><h2>Save &amp; Sources</h2>'
      + '<p class="muted">Progress lives in this browser (localStorage). Export a backup before clearing browser data.</p>'
      + '<div class="btnrow"><button class="btn" type="button" id="exportBtn">Export progress (JSON)</button>'
      + '<label class="btn ghost" for="importFile" style="cursor:pointer">Import progress (JSON)</label>'
      + '<input type="file" id="importFile" accept="application/json" style="display:none">'
      + '<button class="btn ghost" type="button" id="resetBtn">Reset progress</button></div>'
      + '<p class="small" id="saveMsg"></p>'
      + "<h3>Your stats</h3><p>" + earnedCount() + " / " + DATA.trophies.length + " trophies earned · " + c.total + " cited claims · " + c.two + " on 2+ sources · " + DATA.sources.length + " dated sources · " + DATA.disputes.length + " disputes logged.</p>"
      + '<h3>Settings</h3><p><label><input type="checkbox" id="spoilerSet"' + (state.spoiler ? " checked" : "") + '> Hide hidden trophies (mask their names and descriptions)</label></p>'
      + '<p><label>Theme: <select id="themeSet"><option value="paper"' + (state.theme !== "night" ? " selected" : "") + '>Paper</option><option value="night"' + (state.theme === "night" ? " selected" : "") + '>Night</option></select></label></p>'
      + "</div>"
      + '<div class="card"><h2>Sources &amp; honesty</h2>'
      + "<p>GTA VI launched 19 November 2026. No trophy in this guide has been earned in the game by the guide's author; every step is written from the official trophy descriptions and the guides below. Where a location or step is not pinned down by any source, the guide says so instead of guessing. URLs are printed as plain text, not links.</p>"
      + '<ol class="src-list">'
      + DATA.sources.map(function (s) {
          return "<li><b>S" + s.id + " — " + esc(s.label) + "</b><br>" + esc(s.covers) + "<br><span class='url'>" + esc(s.url) + "</span> <span class='muted'>(checked " + esc(s.checked) + ")</span></li>";
        }).join("")
      + "</ol><h3>Disagreements we found (20)</h3><p class='muted'>Where sources disagree, this guide follows one side and says which — the full reasoning is here, not hidden.</p>";
    DATA.disputes.forEach(function (d) {
      var links = (d.trophies || []).map(function (tid) {
        var t = byId(tid);
        return t ? '<a href="#/trophy/' + tid + '">' + esc(t.name) + "</a>" : "";
      }).filter(Boolean).join(", ");
      html += '<div class="dispute" id="dispute-' + d.id + '"><b>D' + d.id + " — " + esc(d.topic) + "</b>"
        + "<p>A: " + esc(d.a) + "</p><p>B: " + esc(d.b) + "</p>"
        + "<p><b>This guide follows:</b> " + esc(d.follows) + ". " + esc(d.why) + "</p>"
        + (links ? "<p class='small'>Affects: " + links + "</p>" : "") + "</div>";
    });
    html += "</div>";
    view.innerHTML = html;
    document.getElementById("exportBtn").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "leonida-platinum-guide-progress.json";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      document.getElementById("saveMsg").textContent = "Exported.";
    });
    document.getElementById("importFile").addEventListener("change", function (e) {
      var f = e.target.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var imp = JSON.parse(r.result);
          if (imp && typeof imp === "object") {
            state.earned = imp.earned || {}; state.progress = imp.progress || {}; state.notes = imp.notes || {};
            if (imp.theme) state.theme = imp.theme;
            if (typeof imp.spoiler === "boolean") state.spoiler = imp.spoiler;
            saveState(); applyTheme(); applySpoilerBtn();
            document.getElementById("saveMsg").textContent = "Imported — " + earnedCount() + " trophies earned.";
            rerender(true);
          }
        } catch (err) { document.getElementById("saveMsg").textContent = "That file is not valid progress JSON."; }
      };
      r.readAsText(f);
    });
    document.getElementById("resetBtn").addEventListener("click", function () {
      if (!confirm("Reset all earned trophies, counters and notes?")) return;
      state.earned = {}; state.progress = {}; state.notes = {};
      saveState();
      document.getElementById("saveMsg").textContent = "Progress reset.";
      rerender(true);
    });
    document.getElementById("spoilerSet").addEventListener("change", function (e) {
      state.spoiler = e.target.checked; saveState(); applySpoilerBtn();
    });
    document.getElementById("themeSet").addEventListener("change", function (e) {
      state.theme = e.target.value; saveState(); applyTheme();
    });
  }

  /* ---------- router & events ---------- */
  function route() {
    var h = location.hash || "#/";
    var parts = h.replace(/^#\/?/, "").split("/");
    document.querySelectorAll(".mainnav a").forEach(function (a) {
      var nav = a.getAttribute("data-nav");
      var active = (parts[0] === "" && nav === "checklist") || parts[0] === nav
        || (parts[0] === "trophy" && nav === "checklist");
      a.classList.toggle("active", !!active);
    });
    if (parts[0] === "trophy" && parts[1]) renderGuide(parseInt(parts[1], 10));
    else if (parts[0] === "roadmap") renderRoadmap();
    else if (parts[0] === "missables") renderMissables();
    else if (parts[0] === "planner") renderPlanner();
    else if (parts[0] === "save") renderSave();
    else renderChecklist();
    window.scrollTo(0, 0);
  }
  var rerenderTimer = null;
  function rerender(now) {
    if (now) { route(); return; }
    clearTimeout(rerenderTimer);
    rerenderTimer = setTimeout(route, 250);
  }
  view.addEventListener("click", function (e) {
    var step = e.target.closest("[data-step]");
    if (step) {
      e.stopPropagation();
      var t = byId(parseInt(step.getAttribute("data-id"), 10));
      if (!t || !t.target) return;
      var cur = state.progress[t.id] || 0;
      cur = Math.max(0, Math.min(t.target.count, cur + parseInt(step.getAttribute("data-step"), 10)));
      state.progress[t.id] = cur;
      if (cur >= t.target.count) state.earned[t.id] = true;
      saveState();
      rerender(true);
      return;
    }
    var earn = e.target.closest("[data-earn]");
    if (earn) {
      e.stopPropagation();
      var id = parseInt(earn.getAttribute("data-earn"), 10);
      if (earn.checked) state.earned[id] = true; else delete state.earned[id];
      saveState();
      rerender(true);
      return;
    }
    var row = e.target.closest("[data-open]");
    if (row) { location.hash = "#/trophy/" + row.getAttribute("data-open"); }
  });
  document.getElementById("themeBtn").addEventListener("click", function () {
    state.theme = state.theme === "night" ? "paper" : "night";
    saveState(); applyTheme();
  });
  document.getElementById("spoilerBtn").addEventListener("click", function () {
    state.spoiler = !state.spoiler;
    saveState(); applySpoilerBtn();
    rerender(true);
  });
  window.addEventListener("hashchange", route);

  fetch("data/trophies.json").then(function (r) {
    if (!r.ok) throw new Error("trophies.json not found");
    return r.json();
  }).then(function (d) {
    DATA = d;
    applyTheme(); applySpoilerBtn();
    route();
  }).catch(function (err) {
    view.innerHTML = '<div class="card"><p>Could not load the trophy data (data/trophies.json). Serve this folder over HTTP — for example, run <code>node serve.ts</code> and open http://localhost:8080 — and reload.</p></div>';
  });
})();
