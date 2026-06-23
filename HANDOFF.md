# SAT Trainer Handoff

This repo is the source project for Isaac's SAT Reading & Writing trainer.

## Important links

- Source repo: https://github.com/hummingbirdrhino-png/sat-trainer
- Live static site: https://hummingbirdrhino-png.github.io/sat-trainer-live/
- Live deployment repo: https://github.com/hummingbirdrhino-png/sat-trainer-live

The live site is currently served from GitHub Pages because Vercel production deployments started getting stuck/protected by Vercel Authentication.

## Local setup

```bash
npm install
npm run dev
npm run build
```

The project is a Vite + React + TypeScript app.

## Deploying updates to GitHub Pages

Build the app, copy `dist/` into the live repo, commit, and push.

```bash
cd /path/to/sat-trainer
npm run build
cp dist/index.html dist/404.html

# Then copy dist contents to the sat-trainer-live repo root:
rm -rf /path/to/sat-trainer-live/*
cp -a dist/. /path/to/sat-trainer-live/
cd /path/to/sat-trainer-live
git add -A
git commit -m "Update live build"
git push origin main
```

GitHub Pages can take ~30-60 seconds to update.

## Major files

- `src/pages/Practice.tsx` — main practice UI, timers, answer handling, adaptive/random endless drill behavior, figure rendering, keyboard shortcuts.
- `src/pages/ModeSelection.tsx` — mode cards and session start logic.
- `src/lib/utils.ts` — mastery math, timing multiplier, predicted score, question selection helpers.
- `src/types/index.ts` — question/session/mode types.
- `src/store/useStore.ts` — Zustand localStorage store for auth demo, answers, mastery, bookmarks, settings.
- `public/questions.json` — cleaned SAT Reading & Writing question bank.
- `public/figures/` — cropped graph/table images from the PDF.
- `pdf-source/parse_pdf.py` was used outside this repo to parse the original PDF; if needed it exists in the old OpenClaw workspace, not necessarily this repo.

## Current behavior

### Modes

- Adaptive Practice: endless drill. Starts with one question; next question is selected based on weak/mastery skills. End Practice saves answered questions and returns home without a final score penalty.
- Random Practice: endless drill. Same UI as Adaptive, but next question is fully random while still updating mastery/history.
- Focused / Mock / Review Wrong / Weak Spots / Bookmarked: finite modes.

### Timer

- Adaptive/random/focused/review: per-question timer.
- Mock: total test/session timer.
- Target time benchmark is 71 seconds/question.

### Mastery and predicted score

In `src/lib/utils.ts`:

- `TARGET_SECONDS_PER_QUESTION = 71`
- `calculateTimeMultiplier()` rewards fast/normal pacing and penalizes slow pacing.
- `updateMasteryScore()` uses correctness, difficulty, confidence, and time.
- `calculatePredictedScore()` blends:
  - 65% mastery
  - 35% accuracy + timing

### Confidence shortcut

Only Shift+Enter should do the 100% confident action.

Behavior:
1. Select an answer.
2. Press Shift+Enter.
3. Other choices are eliminated.
4. Selected answer remains active.

Shift+E intentionally does nothing.

### Notes formatting

Rhetorical Synthesis questions beginning with:

`While researching a topic, a student has taken the following notes:`

are rendered as a left-aligned notes card with bullets.

### Graphs/tables

Many graph/table questions use cropped figure images in `public/figures`. The stimulus paragraph should appear separately below the figure.

## Known limitations / next improvements

- Auth is demo-only and stored in localStorage; passwords are not production-secure.
- Pro access is localStorage-only; real payments/entitlements still need Stripe/Lemon Squeezy + backend or Supabase.
- Vercel project exists but has deployment protection issues; GitHub Pages is the reliable live path right now.
- Some PDF extraction artifacts may still exist, though many split-word issues were cleaned.
- SAT Math has not been added yet. Recommended next architecture: add `section: "reading_writing" | "math"`, separate math question bank, and separate RW/Math/total score predictions.
