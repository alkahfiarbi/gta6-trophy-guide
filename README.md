# gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/alkahfiarbi/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/alkahfiarbi/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Leonida Platinum Guide v3** — an offline, unofficial GTA VI trophy guide and tracker. All 55 trophies (1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden) with a checklist, a 4-phase roadmap, a missables page, a Next Up planner, and save/export — plus 450 cited claims, 19 dated sources checked 21 November 2026, and 20 logged disagreements between the sources. Every step, sentence and tip carries its source tags; where a location or step is not pinned down by any source, the guide says so instead of guessing. No Rockstar art or logos — CSS only. Works fully offline; progress stays in your browser.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 (or build the hand-in with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`).

## What is inside

- `app/` — the single-page guide: `index.html`, `style.css`, `app.js`, `data/trophies.json`
- `screenshots/` — the four judge screenshots (checklist, guide pane, roadmap, missables)
- `main.ts` — hand-in builder (copies `app/` + `screenshots/` to the output dir and writes `dossier.json`)
- `shots.json` — the four screenshot views
- `serve.ts` — the local dev server

---

Entered on [make.fun](https://make.fun/?ref=scdytkwz&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards
