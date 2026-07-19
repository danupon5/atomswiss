# Switzerland & Italy Trip — 29 Jul–1 Aug 2026

A static, mobile-friendly itinerary site for a 4-day trip:
**Lucerne → Grindelwald → Zermatt → Brig → Lake Como → Milan**.

Live site (GitHub Pages): https://danupon5.github.io/atomswiss/

Installable and works offline after the first visit (add to home screen on
your phone before the trip) — handy since you'll be checking it on trains
and buses across borders with patchy signal. Each timeline card also
auto-highlights and jumps to whatever is happening now / coming up next
when you open the site on the actual trip day.

## Structure

- `index.html` — trip overview, day cards (today's day is auto-highlighted), advance booking checklist, timing rules
- `day1.html` … `day4.html` — collapsible hour-by-hour timeline for each day (tap a card to expand), plus day-specific notes (weather alternative, mountain safety, relaxed alternative). Each stop links out to Google Maps.
- `assets/css/style.css` — shared styling
- `assets/js/main.js` — mobile nav toggle, live now/next highlighting, service worker registration
- `manifest.webmanifest` / `sw.js` — offline install support (PWA)

## Run locally

No build step required — plain HTML/CSS/JS.

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/ in a browser.
