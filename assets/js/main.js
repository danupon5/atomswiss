function pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}

function toMinutes(hhmm) {
  var p = hhmm.split(":");
  return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}

function todayISO(now) {
  return now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
}

function highlightLiveTimeline() {
  var timeline = document.querySelector(".timeline[data-date]");
  if (!timeline) return;

  var now = new Date();
  if (timeline.dataset.date !== todayISO(now)) return;

  var nowMinutes = now.getHours() * 60 + now.getMinutes();
  var items = Array.prototype.slice.call(timeline.querySelectorAll(".timeline-item"));
  var current = null;
  var next = null;

  items.forEach(function (li) {
    var s = toMinutes(li.dataset.start);
    var en = toMinutes(li.dataset.end);
    if (nowMinutes >= s && nowMinutes < en) {
      current = li;
    } else if (!next && s > nowMinutes) {
      next = li;
    }
  });

  var target = current || next;
  if (!target) return;

  target.classList.add(current ? "t-now" : "t-next-up");
  var details = target.querySelector("details.t-card");
  if (details) details.open = true;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
}

function highlightTodayCard() {
  var cards = document.querySelectorAll(".day-card[data-date]");
  if (!cards.length) return;
  var iso = todayISO(new Date());
  cards.forEach(function (card) {
    if (card.dataset.date === iso) {
      card.classList.add("day-card-today");
    }
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
}

document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
      });
    });
  }

  highlightLiveTimeline();
  highlightTodayCard();
  registerServiceWorker();
});
