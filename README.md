# Switzerland & Italy Trip — 29 Jul–1 Aug 2026

A static, mobile-friendly itinerary site for a 4-day trip:
**Lucerne → Grindelwald → Zermatt → Brig → Lake Como → Milan**.

Live site (GitHub Pages): https://danupon5.github.io/atomswiss/

## Structure

- `index.html` — trip overview, day cards, advance booking checklist, timing rules
- `day1.html` … `day4.html` — hour-by-hour timeline for each day, plus day-specific notes (weather alternative, mountain safety, relaxed alternative)
- `assets/css/style.css` — shared styling
- `assets/js/main.js` — mobile nav toggle

## Run locally

No build step required — plain HTML/CSS/JS.

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/ in a browser.
