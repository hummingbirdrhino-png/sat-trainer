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

## SAT Math question bank link

Isaac provided this Google Drive PDF link for the SAT Math question bank, but it was not parsed in this free-tier session due to low remaining credits:

https://drive.google.com/file/d/1i3v10obENa-iosFyqllGYTreFa_FUlgq/view?usp=drivesdk

Recommended next step in paid Clawbite account:
1. Download this PDF.
2. Inspect page count and extraction quality with PyMuPDF.
3. Build a separate `public/math_questions.json` or merge into `questions.json` with a `section` field.
4. Add math-specific domains/topics and figure extraction.
5. Add section selector and separate RW/Math/Total predicted scores.

## SAT Math import status

The SAT Math PDF has now been parsed into a first structured data pass.

Generated files:

- `public/math_questions.json` — 826 SAT Math question records.
- `public/math_questions_summary.json` — summary counts/domains/skills/difficulties/import notes.
- `public/math_figures/` — rendered question-only PDF crops used to preserve exact math notation, graphs, and tables without exposing the answer/rationale during practice.
- `public/math_choices/` — rendered A/B/C/D choice crops for Math questions whose answer choices are visual equations/graphs/tables.
- `scripts/parse_math_pdf.py` — parser used to regenerate the Math JSON/page images from the source PDF.

Important Math parsing notes:

- The PDF stores many equations, fractions, graphs, and tables as positioned visual/image snippets, so plain text extraction often omits the actual math symbols.
- For display fidelity, each Math question includes `page_image` and `page_images`; these are question-only crops and should be treated as the authoritative student-facing rendering until a richer math renderer is built.
- Structured fields like `domain`, `skill`, `difficulty`, `question_type`, `correct_answer`, and `rationale` are extracted for filtering/adaptive/mastery/search.
- Some multiple-choice graph/table answer choices have label-only text (`A.`, `B.`, etc.) because the choice content is visual; render the page image for those.
- The PDF exposes one specific skill label under each broad domain in extracted text. `skill_level_2` is currently `null`; if a later source exposes deeper subskill metadata, preserve it rather than flattening to broad domains.

Import summary:

- 826 Math questions.
- 646 multiple-choice questions.
- 180 student-produced-response questions.
- 0 missing correct answers after audit/manual rationale fallback.
- 28 multi-page questions.
- Domains:
  - Algebra: 266
  - Advanced Math: 220
  - Problem-Solving and Data Analysis: 198
  - Geometry and Trigonometry: 142

Recommended next app step:

1. Add section-aware loading for `questions.json` and `math_questions.json`.
2. Add Math practice mode using the Math JSON while rendering `page_images` for fidelity.
3. Add student-produced-response input support.
4. Preserve current app styling/flow; do not copy PracticeSAT's UI.
5. Add embedded Desmos later via iframe `https://www.desmos.com/testing/cb-sat-ap/graphing` in a way that fits the existing app design.
