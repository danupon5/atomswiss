var TripPlan = (function () {
  var OVERLAY_KEY = "trip_plan_overlay_v1";

  var ICONS = {
    train: "🚂", hike: "🥾", food: "🍽️",
    view: "📸", hotel: "🏨", "default": "⏱️"
  };

  function categorize(title) {
    var t = title.toLowerCase();
    if (t.indexOf("hike") !== -1 || t.indexOf("trail") !== -1 ||
        t.indexOf("walk to") !== -1 || t.indexOf("walk from") !== -1) return "hike";
    if (t.indexOf("train") !== -1 || t.indexOf("railway") !== -1 || t.indexOf("gondola") !== -1 ||
        t.indexOf("cogwheel") !== -1 || t.indexOf("bus") !== -1 || t.indexOf("ferry") !== -1 ||
        t.indexOf("change at") !== -1 || t.indexOf("connection") !== -1 || t.indexOf("descent") !== -1 ||
        t.indexOf("→") !== -1) return "train";
    if (t.indexOf("breakfast") !== -1 || t.indexOf("lunch") !== -1 || t.indexOf("dinner") !== -1 ||
        t.indexOf("brunch") !== -1 || t.indexOf("caf") !== -1 || t.indexOf("coffee") !== -1 ||
        t.indexOf("gelato") !== -1 || t.indexOf("wake") !== -1) return "food";
    if (t.indexOf("hotel") !== -1 || t.indexOf("check-in") !== -1 || t.indexOf("checkout") !== -1 ||
        t.indexOf("luggage") !== -1 || t.indexOf("check in") !== -1) return "hotel";
    if (t.indexOf("viewpoint") !== -1 || t.indexOf("old town") !== -1 || t.indexOf("church") !== -1 ||
        t.indexOf("museum") !== -1 || t.indexOf("waterfront") !== -1 || t.indexOf("village") !== -1 ||
        t.indexOf("town") !== -1 || t.indexOf("palace") !== -1 || t.indexOf("summit") !== -1) return "view";
    return "default";
  }

  function mapsUrl(query) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
  }

  function loadOverlay() {
    try {
      return JSON.parse(localStorage.getItem(OVERLAY_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveOverlay(overlay) {
    localStorage.setItem(OVERLAY_KEY, JSON.stringify(overlay));
  }

  function getDayOverlay(isoDate) {
    var overlay = loadOverlay();
    return overlay[isoDate] || { hidden: [], added: [] };
  }

  function addItem(isoDate, item) {
    var overlay = loadOverlay();
    if (!overlay[isoDate]) overlay[isoDate] = { hidden: [], added: [] };
    if (!item.id) item.id = "added-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    overlay[isoDate].added.push(item);
    saveOverlay(overlay);
  }

  function hideItem(isoDate, itemId) {
    var overlay = loadOverlay();
    if (!overlay[isoDate]) overlay[isoDate] = { hidden: [], added: [] };
    if (overlay[isoDate].hidden.indexOf(itemId) === -1) {
      overlay[isoDate].hidden.push(itemId);
    }
    saveOverlay(overlay);
  }

  function resetDay(isoDate) {
    var overlay = loadOverlay();
    delete overlay[isoDate];
    saveOverlay(overlay);
  }

  function buildItemLi(item) {
    var cat = item.category && ICONS[item.category] ? item.category : categorize(item.title || "");
    var icon = ICONS[cat] || ICONS["default"];
    var li = document.createElement("li");
    li.className = "timeline-item cat-" + cat + " t-added";
    li.setAttribute("data-item-id", item.id);
    li.setAttribute("data-start", item.start || "00:00");
    li.setAttribute("data-end", item.end || "23:59");

    var safe = function (s) {
      var d = document.createElement("div");
      d.textContent = s || "";
      return d.innerHTML;
    };

    li.innerHTML =
      '<div class="t-time">' + safe(item.time) + '</div>' +
      '<div class="t-dot"></div>' +
      '<details class="t-card" open>' +
      '  <summary>' +
      '    <p class="t-title"><span class="t-live-badge t-badge-now">NOW</span>' +
      '<span class="t-live-badge t-badge-next">NEXT</span>' +
      '<span class="ai-added-badge">AI</span>' +
      '<span class="t-icon">' + icon + '</span> <span class="t-title-text">' + safe(item.title) + '</span></p>' +
      '    <svg class="t-chevron" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '  </summary>' +
      '  <div class="t-body">' +
      '    <p class="t-detail">' + safe(item.detail) + '</p>' +
      (item.note ? '    <p class="t-note">' + safe(item.note) + '</p>' : "") +
      (item.map_query
        ? '    <a class="t-map-link" href="' + mapsUrl(item.map_query) + '" target="_blank" rel="noopener">&#128205; Open in Google Maps</a>'
        : "") +
      '  </div>' +
      '</details>';
    return li;
  }

  function apply() {
    var timeline = document.querySelector(".timeline[data-date]");
    if (!timeline) return;
    var isoDate = timeline.dataset.date;
    var dayOverlay = getDayOverlay(isoDate);

    var hiddenCount = 0;
    dayOverlay.hidden.forEach(function (id) {
      var li = timeline.querySelector('[data-item-id="' + id + '"]');
      if (li) {
        li.classList.add("t-hidden");
        hiddenCount++;
      }
    });

    var toggle = document.querySelector(".hidden-items-toggle");
    if (toggle) {
      if (hiddenCount > 0) {
        toggle.hidden = false;
        toggle.textContent = "";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "hidden-toggle-btn";
        btn.textContent = "Show " + hiddenCount + " hidden item" + (hiddenCount > 1 ? "s" : "");
        btn.addEventListener("click", function () {
          timeline.querySelectorAll(".t-hidden").forEach(function (li) {
            li.classList.remove("t-hidden");
          });
          toggle.hidden = true;
        });
        toggle.appendChild(btn);
      } else {
        toggle.hidden = true;
      }
    }

    dayOverlay.added.forEach(function (item) {
      var li = buildItemLi(item);
      var existing = Array.prototype.slice.call(timeline.querySelectorAll(".timeline-item"));
      var inserted = false;
      for (var i = 0; i < existing.length; i++) {
        if ((item.start || "00:00") < existing[i].dataset.start) {
          timeline.insertBefore(li, existing[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) timeline.appendChild(li);
    });

    var resetBtn = document.querySelector(".reset-day-link");
    if (resetBtn) {
      var hasOverlay = dayOverlay.hidden.length > 0 || dayOverlay.added.length > 0;
      resetBtn.hidden = !hasOverlay;
      resetBtn.addEventListener("click", function () {
        resetDay(isoDate);
        location.reload();
      });
    }
  }

  return {
    apply: apply,
    addItem: addItem,
    hideItem: hideItem,
    resetDay: resetDay,
    getDayOverlay: getDayOverlay
  };
})();
