(function () {
  var ITEMS_URL = "assets/data/trip-items.json";
  var CONTEXT_URL = "assets/data/trip-context.json";
  var LS_KEY = "trip_gemini_api_key";
  var LS_MODEL = "trip_gemini_model";
  var DEFAULT_MODEL = "gemini-3.1-flash-lite";

  var DAY_TABS = [
    { day: 1, iso: "2026-07-29", label: "Day 1 · Grindelwald" },
    { day: 2, iso: "2026-07-30", label: "Day 2 · Zermatt" },
    { day: 3, iso: "2026-07-31", label: "Day 3 · Brig" },
    { day: 4, iso: "2026-08-01", label: "Day 4 · Milan" }
  ];

  var baseItems = null; // { iso: [item, ...] }
  var tripContext = null;
  var activeIso = DAY_TABS[0].iso;
  var working = {}; // iso -> array of item objects (working copy for the session)
  var els = {};
  var dragSrcId = null;

  function getKey() { return localStorage.getItem(LS_KEY) || ""; }
  function getModel() { return localStorage.getItem(LS_MODEL) || DEFAULT_MODEL; }
  function mapsUrl(q) { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q); }
  function apiUrl(model, key) {
    return "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(key);
  }

  function loadBaseItems() {
    return fetch(ITEMS_URL).then(function (r) { return r.json(); });
  }

  function loadContext() {
    return fetch(CONTEXT_URL).then(function (r) { return r.json(); })
      .then(function (d) { return d.context || ""; })
      .catch(function () { return ""; });
  }

  function buildWorkingList(iso) {
    var base = baseItems[iso] || [];
    var overlay = window.TripPlan ? TripPlan.getDayOverlay(iso) : { hidden: [], added: [], overrides: {}, order: null };
    var hiddenSet = {};
    overlay.hidden.forEach(function (id) { hiddenSet[id] = true; });

    var list = [];
    base.forEach(function (item) {
      if (hiddenSet[item.id]) return;
      var copy = Object.assign({}, item, { isDefault: true });
      var ov = overlay.overrides[item.id];
      if (ov) {
        if (ov.start) copy.start = ov.start;
        if (ov.end) copy.end = ov.end;
        if (ov.time) copy.time = ov.time;
      }
      list.push(copy);
    });
    overlay.added.forEach(function (item) {
      list.push(Object.assign({}, item, { isDefault: false }));
    });

    if (overlay.order && overlay.order.length) {
      var byId = {};
      list.forEach(function (it) { byId[it.id] = it; });
      var ordered = [];
      overlay.order.forEach(function (id) { if (byId[id]) { ordered.push(byId[id]); delete byId[id]; } });
      Object.keys(byId).forEach(function (id) { ordered.push(byId[id]); });
      list = ordered;
    }

    var hiddenItems = base.filter(function (item) { return hiddenSet[item.id]; });
    return { list: list, hiddenItems: hiddenItems };
  }

  function ensureWorking(iso) {
    if (!working[iso]) {
      var built = buildWorkingList(iso);
      working[iso] = built.list;
      working[iso + ":hidden"] = built.hiddenItems;
    }
    return working[iso];
  }

  function safe(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function renderTabs() {
    els.tabs.innerHTML = "";
    DAY_TABS.forEach(function (t) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "editor-tab" + (t.iso === activeIso ? " active" : "");
      btn.textContent = t.label;
      btn.addEventListener("click", function () {
        activeIso = t.iso;
        renderTabs();
        renderList();
      });
      els.tabs.appendChild(btn);
    });
  }

  function rowTimeLabel(item) {
    if (!item.start) return "Unscheduled";
    return item.time || (item.start + "–" + item.end);
  }

  function renderList() {
    var list = ensureWorking(activeIso);
    var hidden = working[activeIso + ":hidden"] || [];
    els.list.innerHTML = "";

    list.forEach(function (item) {
      var row = document.createElement("li");
      row.className = "editor-row" + (item.start ? "" : " editor-row-pending") + (item.isDefault ? "" : " editor-row-added");
      row.draggable = true;
      row.dataset.id = item.id;

      row.innerHTML =
        '<span class="editor-row-handle" title="Drag to reorder">&#9776;</span>' +
        '<span class="editor-row-time">' + safe(rowTimeLabel(item)) + '</span>' +
        '<span class="editor-row-title">' + (item.isDefault ? "" : '<span class="ai-added-badge">NEW</span> ') + safe(item.title) + '</span>' +
        '<a class="editor-row-map" href="' + mapsUrl(item.map_query || item.title) + '" target="_blank" rel="noopener" title="View on Google Maps">&#128205;</a>' +
        '<button type="button" class="editor-row-remove" title="Remove from this day">&#10005;</button>';

      row.querySelector(".editor-row-remove").addEventListener("click", function () {
        working[activeIso] = list.filter(function (it) { return it.id !== item.id; });
        var hiddenList = working[activeIso + ":hidden"] || [];
        hiddenList.push(item);
        working[activeIso + ":hidden"] = hiddenList;
        renderList();
      });

      row.addEventListener("dragstart", function (ev) {
        dragSrcId = item.id;
        row.classList.add("dragging");
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData("text/plain", item.id);
      });
      row.addEventListener("dragend", function () {
        row.classList.remove("dragging");
      });
      row.addEventListener("dragover", function (ev) {
        ev.preventDefault();
        row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", function () {
        row.classList.remove("drag-over");
      });
      row.addEventListener("drop", function (ev) {
        ev.preventDefault();
        row.classList.remove("drag-over");
        if (!dragSrcId || dragSrcId === item.id) return;
        var current = working[activeIso];
        var srcIdx = current.findIndex(function (it) { return it.id === dragSrcId; });
        var dstIdx = current.findIndex(function (it) { return it.id === item.id; });
        if (srcIdx === -1 || dstIdx === -1) return;
        var moved = current.splice(srcIdx, 1)[0];
        current.splice(dstIdx, 0, moved);
        renderList();
      });

      els.list.appendChild(row);
    });

    if (hidden.length) {
      els.hiddenSection.hidden = false;
      els.hiddenSection.querySelector(".editor-hidden-title").textContent =
        "Removed from this day (" + hidden.length + ") — tap to restore";
      var chipsWrap = els.hiddenSection.querySelector(".editor-hidden-chips");
      chipsWrap.innerHTML = "";
      hidden.forEach(function (item) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "editor-hidden-chip";
        chip.textContent = "+ " + item.title;
        chip.addEventListener("click", function () {
          var restored = Object.assign({}, item);
          if (restored.isDefault === undefined) restored.isDefault = true;
          working[activeIso].push(restored);
          working[activeIso + ":hidden"] = hidden.filter(function (h) { return h.id !== item.id; });
          renderList();
        });
        chipsWrap.appendChild(chip);
      });
    } else {
      els.hiddenSection.hidden = true;
    }

    els.draftPreview.hidden = true;
    els.draftPreview.innerHTML = "";
  }

  function addPlace() {
    var title = els.addInput.value.trim();
    if (!title) return;
    var id = "pending-" + Date.now();
    working[activeIso].push({
      id: id, start: null, end: null, time: "", title: title,
      detail: "", note: "", map_query: title, category: "default", isDefault: false
    });
    els.addInput.value = "";
    renderList();
  }

  function saveDay() {
    var list = working[activeIso];
    var base = baseItems[activeIso] || [];
    var baseById = {};
    base.forEach(function (b) { baseById[b.id] = b; });

    var keptDefaultIds = {};
    var added = [];
    var overrides = {};
    var order = [];

    list.forEach(function (item) {
      order.push(item.id);
      if (item.isDefault && baseById[item.id]) {
        keptDefaultIds[item.id] = true;
        var b = baseById[item.id];
        var ov = {};
        if (item.start && item.start !== b.start) ov.start = item.start;
        if (item.end && item.end !== b.end) ov.end = item.end;
        if (item.time && item.time !== b.time) ov.time = item.time;
        if (Object.keys(ov).length) overrides[item.id] = ov;
      } else {
        added.push({
          id: item.id, start: item.start || "00:00", end: item.end || item.start || "23:59",
          time: item.time || rowTimeLabel(item), title: item.title, detail: item.detail || "",
          note: item.note || "", map_query: item.map_query || item.title, category: item.category || "default"
        });
      }
    });

    var hidden = base.filter(function (b) { return !keptDefaultIds[b.id]; }).map(function (b) { return b.id; });

    TripPlan.saveDayOverlay(activeIso, { hidden: hidden, added: added, overrides: overrides, order: order });
    els.saveStatus.textContent = "Saved ✓ — open the day page to see it live.";
    els.saveStatus.hidden = false;
    setTimeout(function () { els.saveStatus.hidden = true; }, 4000);
  }

  function resetDay() {
    TripPlan.resetDay(activeIso);
    delete working[activeIso];
    delete working[activeIso + ":hidden"];
    renderList();
  }

  function organizeWithAI() {
    var key = getKey();
    if (!key) {
      alert("Set your Gemini API key first via the chat button (bottom-right), then come back here.");
      return;
    }
    var model = getModel();
    var list = working[activeIso];
    els.aiBtn.disabled = true;
    els.aiBtn.textContent = "Thinking…";

    loadContext().then(function (context) {
      var payload = list.map(function (it) {
        return { id: it.id, title: it.title, start: it.start, end: it.end, time: it.time, note: it.note };
      });

      var sysText = "You help reorganize a single day of a Switzerland/Italy trip itinerary. " +
        "You do NOT have access to live train/bus timetables (no SBB/Trenord/Google Directions API) — " +
        "any times or travel notes you give are general-knowledge estimates, not verified schedules. " +
        "Given the day's current items (some may have start/end null meaning unscheduled), return ALL of " +
        "them in a sensible visiting order with realistic start/end times (24h HH:MM) that fit within the " +
        "day, plus a short travel_note for each explaining how to get there from the previous stop " +
        "(e.g. '15 min walk', 'take the valley train'). Keep the same 'id' for every item, do not invent " +
        "or drop items.\n\nDay's current items:\n" + JSON.stringify(payload) +
        "\n\nFull trip context for background:\n" + context;

      var schema = {
        type: "OBJECT",
        properties: {
          summary: { type: "STRING" },
          items: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                start: { type: "STRING" },
                end: { type: "STRING" },
                time: { type: "STRING" },
                title: { type: "STRING" },
                travel_note: { type: "STRING" }
              },
              required: ["id", "start", "end", "title"]
            }
          }
        },
        required: ["items"]
      };

      var body = {
        system_instruction: { parts: [{ text: sysText }] },
        generationConfig: { responseMimeType: "application/json", responseSchema: schema },
        contents: [{ role: "user", parts: [{ text: "Please reorganize this day." }] }]
      };

      return fetch(apiUrl(model, key), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
      })
      .then(function (result) {
        if (!result.ok) {
          var msg = (result.data && result.data.error && result.data.error.message) ||
            ("Request failed (HTTP " + result.status + ")");
          renderDraftError("Error: " + msg + " — check your API key/model in the chat settings.");
          return;
        }
        var candidates = result.data.candidates || [];
        var rawText = candidates.length && candidates[0].content && candidates[0].content.parts
          ? candidates[0].content.parts.map(function (p) { return p.text || ""; }).join("")
          : "";
        var parsed;
        try {
          parsed = JSON.parse(rawText);
        } catch (e) {
          renderDraftError("The AI didn't return a usable plan. Try again or rephrase.");
          return;
        }
        if (!parsed || !Array.isArray(parsed.items)) {
          renderDraftError("The AI didn't return a usable plan. Try again or rephrase.");
          return;
        }
        renderDraftPreview(parsed);
      })
      .catch(function (err) {
        renderDraftError("Error: " + (err && err.message ? err.message : "network error") + " — are you online?");
      })
      .finally(function () {
        els.aiBtn.disabled = false;
        els.aiBtn.textContent = "🪄 Ask AI to organize this day";
      });
  }

  function renderDraftError(msg) {
    els.draftPreview.hidden = false;
    els.draftPreview.innerHTML = '<div class="editor-draft-error">' + safe(msg) + "</div>";
  }

  function renderDraftPreview(parsed) {
    var currentById = {};
    working[activeIso].forEach(function (it) { currentById[it.id] = it; });

    var rows = parsed.items.map(function (it) {
      var titleFallback = currentById[it.id] ? currentById[it.id].title : it.title;
      return '<li class="editor-draft-row">' +
        '<span class="editor-row-time">' + safe(it.time || (it.start + "–" + it.end)) + "</span>" +
        '<span class="editor-row-title">' + safe(it.title || titleFallback) + "</span>" +
        (it.travel_note ? '<span class="editor-draft-travel">' + safe(it.travel_note) + "</span>" : "") +
        "</li>";
    }).join("");

    els.draftPreview.hidden = false;
    els.draftPreview.innerHTML =
      '<div class="editor-draft-banner">⚠️ Estimated by AI — not a live timetable. Double-check train/bus ' +
      'times against SBB, Trenord or Google Maps before you travel.</div>' +
      (parsed.summary ? '<p class="editor-draft-summary">' + safe(parsed.summary) + "</p>" : "") +
      '<ul class="editor-draft-list">' + rows + "</ul>" +
      '<div class="editor-draft-actions">' +
      '<button type="button" class="editor-draft-apply">Apply this order &amp; times</button>' +
      '<button type="button" class="editor-draft-dismiss">Dismiss</button>' +
      "</div>";

    els.draftPreview.querySelector(".editor-draft-dismiss").addEventListener("click", function () {
      els.draftPreview.hidden = true;
      els.draftPreview.innerHTML = "";
    });
    els.draftPreview.querySelector(".editor-draft-apply").addEventListener("click", function () {
      var reordered = [];
      parsed.items.forEach(function (it) {
        var existing = currentById[it.id];
        if (!existing) return;
        existing.start = it.start;
        existing.end = it.end;
        existing.time = it.time || (it.start + "–" + it.end);
        if (it.travel_note) existing.note = it.travel_note;
        reordered.push(existing);
      });
      working[activeIso].forEach(function (it) {
        if (reordered.indexOf(it) === -1) reordered.push(it);
      });
      working[activeIso] = reordered;
      renderList();
    });
  }

  function setupAutoScroll() {
    var EDGE = 90;
    var SPEED = 18;
    document.addEventListener("dragover", function (ev) {
      var y = ev.clientY;
      var vh = window.innerHeight;
      if (y < EDGE) {
        window.scrollBy(0, -SPEED);
      } else if (y > vh - EDGE) {
        window.scrollBy(0, SPEED);
      }
    });
  }

  function buildUI() {
    var main = document.querySelector(".editor-main");
    els.tabs = main.querySelector(".editor-tabs");
    els.list = main.querySelector(".editor-list");
    els.hiddenSection = main.querySelector(".editor-hidden-section");
    els.draftPreview = main.querySelector(".editor-draft-preview");
    els.addInput = main.querySelector(".editor-add-input");
    els.aiBtn = main.querySelector(".editor-ai-btn");
    els.saveBtn = main.querySelector(".editor-save-btn");
    els.resetBtn = main.querySelector(".editor-reset-btn");
    els.saveStatus = main.querySelector(".editor-save-status");

    main.querySelector(".editor-add-btn").addEventListener("click", addPlace);
    els.addInput.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); addPlace(); }
    });
    els.aiBtn.addEventListener("click", organizeWithAI);
    els.saveBtn.addEventListener("click", saveDay);
    els.resetBtn.addEventListener("click", resetDay);
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildUI();
    setupAutoScroll();
    renderTabs();
    loadBaseItems().then(function (data) {
      baseItems = data;
      renderList();
    });
  });
})();
