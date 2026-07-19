# Switzerland & Italy Trip — 29 Jul–1 Aug 2026

A static, mobile-friendly itinerary site for a 4-day trip:
**Lucerne → Grindelwald → Zermatt → Brig → Lake Como → Milan**.

Live site (GitHub Pages): https://danupon5.github.io/atomswiss/

Installable and works offline after the first visit (add to home screen on
your phone before the trip) — handy since you'll be checking it on trains
and buses across borders with patchy signal. Each timeline card also
auto-highlights and jumps to whatever is happening now / coming up next
when you open the site on the actual trip day.

Also includes an optional "Ask about your trip" chat button (bottom-right,
every page). It calls the Gemini API directly from your browser using your
own API key — get one free at
[aistudio.google.com/apikey](https://aistudio.google.com/apikey), paste it
into the chat settings (gear icon). The key is saved only in that browser's
local storage, never in this repo, and the AI is given the full itinerary as
context so it can answer things like "what train do I need to catch next"
or "what's the backup plan if it rains on day 1." Everything else on the
site works fine without a key.

The AI can also propose changes to the plan itself — extra restaurant,
activity or photo-spot suggestions (each with a Google Maps link), or
skipping an existing item. Nothing is applied automatically: every proposal
shows as a preview card with its own Add/Remove button, and confirmed
changes are saved to that browser's local storage (per day, per device —
doesn't sync between your phone and laptop). Use the "Reset this day's
plan" link next to a day's heading to undo everything for that day.

There's also a dedicated **Edit Plan** page (nav bar, every page) for more
deliberate restructuring: drag rows to reorder within a day, type in a place
to add it, remove things, and optionally click "Ask AI to organize this
day" to get a suggested order/timing with a travel note between stops.
**AI-suggested times are estimates, not real timetables** — this site has
no live SBB/Trenord/transit-API integration, so anything AI proposes is
general-knowledge guesswork, always shown behind a clear warning banner and
never applied until you click Apply. Verify real train/bus times against
SBB, Trenord or Google Maps before travelling. Saving on this page uses the
same local-storage overlay as the chat, so edits show up on the regular day
pages too.

## Structure

- `index.html` — trip overview, day cards (today's day is auto-highlighted), advance booking checklist, timing rules
- `day1.html` … `day4.html` — hour-by-hour timeline for each day (each card is individually collapsible), plus day-specific notes (weather alternative, mountain safety, relaxed alternative). Each stop links out to Google Maps.
- `plan.html` — dedicated drag-and-drop plan editor (add/remove/reorder, optional AI-drafted ordering)
- `assets/css/style.css` — shared styling
- `assets/js/main.js` — mobile nav toggle, live now/next highlighting, service worker registration
- `assets/js/plan.js` — applies saved local plan edits (added/hidden/reordered/re-timed items) on top of the static pages
- `assets/js/plan-editor.js` — the Edit Plan page's drag-and-drop list, AI "organize this day" flow
- `assets/js/chat.js` — "Ask about your trip" AI chat widget (bring-your-own Gemini key), can propose plan edits
- `assets/data/trip-context.json` — itinerary text (with stable item ids) fed to the AI as context
- `assets/data/trip-items.json` — the same itinerary as structured data, used by the plan editor
- `manifest.webmanifest` / `sw.js` — offline install support (PWA)

## Run locally

No build step required — plain HTML/CSS/JS.

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/ in a browser.
