# Sketch screen — feature documentation

An optional drawing step added to the journey flow. After you finish exploring a
planet (and choose to keep its journal), you get a simple drawing space to sketch
what you saw. The drawing is appended to the end of that planet's journal.

This document captures **exactly what changed**, how to preview it, and — most
importantly — **how to revert it** if the update doesn't work out.

---

## 1. Where it sits in the flow

```
   finish exploring a planet
        │
        ▼
  "What to do with your journal?"   ← button copy changed: "Publish it" → "Keep it"
        │  (Keep it)
        ▼
  ★ SKETCH SCREEN  (new, optional)  ← Back · Skip · Add
        │
        ▼
  "Give the planet a name."         ← button copy changed: "Go back" → "Back"
        │  (Finish)
        ▼
   journal published to the Archive  ← the sketch renders at the END of the journal
```

The sketch screen has three exits:
- **Back** — return to the finished-exploring card screen.
- **Skip** — continue to naming with no sketch (the screen is optional).
- **Add** — save the drawing and continue to naming. Disabled until you draw.

## 2. The drawing space

Deliberately minimal, matching the restraint of the reference exquisite-corpse app:
- **Pen** — one thin line (2px), dark ink (`#1a1a1a`) on cream paper (`#f5f3ee`).
- **Eraser** — 18px, paints back to the paper color.
- **Undo** — steps back one stroke (snapshot history, up to 40 steps).

Visuals reuse the app's existing tokens and patterns: cream "paper" like the cards,
circular tool buttons like the home/help chrome, the `heading` type style, and the
journal-entry `entry-actions` button row.

---

## 3. How to preview (no build, no network)

The real app (`index.html`) loads React + Babel from a CDN, so it can't run in a
locked-down/offline context. For previewing the feature anywhere, open the
**self-contained standalone build**:

> `docs/sketch-feature/preview-standalone.html`

It's a dependency-free vanilla-JS reimplementation of the whole flow (same visuals
and behavior) — just open it in any browser. It is a **preview aid only**; the real
implementation is the React version in `index.html`.

Note: the standalone preview keeps its archive in memory (not `localStorage`), so
trying it never touches real saved data.

---

## 4. What changed in `index.html`

All changes are additive; nothing existing was removed. Summary: **166 insertions,
3 deletions** (the 3 deletions are the two button-label edits and one route swap).
The full diff is saved alongside this file as `index.html.patch`.

| # | Area | Change |
|---|------|--------|
| 1 | CSS | Added a `/* ---------- sketch ---------- */` block: `.sketch-wrap`, `.sketch-head`, `.sketch-paper`, `.sketch-paper canvas`, `.sketch-tools`, `.tool-btn`, `.sketch-actions`, `.journal-sketch`. |
| 2 | `gameplayScreens` | Added `'sketch'` to the gameplay-screen list (so the home button shows its confirm dialog here too). |
| 3 | `publishPlanet()` | Persists `sketch: session.sketch || null` onto the saved planet object. |
| 4 | `renderCardSelect()` | "Publish it" → **"Keep it"**, and it now routes to the sketch screen (`setScreen('sketch')`) instead of straight to naming. |
| 5 | Handlers | Added `finishSketch(dataURL)` (saves sketch → naming) and `skipSketch()` (clears sketch → naming). |
| 6 | `renderSketch()` | New renderer that mounts `<SketchScreen>`. |
| 7 | `renderNamePlanet()` | Its **Back** button now returns to the sketch screen (`'sketch'`) instead of `'cardSelect'`. |
| 8 | screen `switch` | Added `case 'sketch': body = renderSketch(); break;`. |
| 9 | `renderFullJournal()` | Renders the sketch (if any) as the final entry, captioned *"A sketch of what you saw."* |
| 10 | New component | `SketchScreen` (canvas drawing, pen/eraser/undo, Back/Skip/Add). Placed just above `NamePlanet`. |
| 11 | `NamePlanet` | Its left button label "Go back" → **"Back"**. |

### Data / storage note
Saved planets now carry a `sketch` field — a PNG **data URL** string, or `null`.
- Old planets saved before this feature simply have no `sketch` field; the journal
  renders fine without one (`p.sketch` is falsy → nothing drawn).
- A data-URL PNG adds weight to each archived planet in `localStorage`. For a
  hand-drawn sketch at screen resolution this is typically tens to a few hundred KB.
  If storage pressure ever becomes a concern, options are: downscale the canvas
  before export, or export as JPEG at reduced quality.

---

## 5. How to REVERT

The whole feature is isolated on branch `claude/drawing-sketch-screen-tSd4T`;
`main` is untouched and remains the known-good version. Pick whichever fits:

**A. Haven't merged yet** — do nothing. `main` has none of this. Don't merge the
branch and the live app is unchanged.

**B. Revert just the app, keep the docs** — restore `index.html` from main:
```bash
git checkout origin/main -- index.html
```
(or apply the saved patch in reverse:)
```bash
git apply -R docs/sketch-feature/index.html.patch
```

**C. Already merged and shipped, want it gone** — revert the merge/commit:
```bash
git revert <commit-sha>      # the commit that introduced the sketch feature
```
then redeploy. Because the change is a single self-contained commit, this cleanly
removes the screen, the copy changes, and the journal rendering in one step.

**D. Nuclear option** — re-point the deployment at `main`. Since `main` never
received this change, that instantly restores the previous experience.

Reverting the app does **not** corrupt existing saved journals: planets keep their
`sketch` field in `localStorage`, but the reverted code simply ignores it.

---

## 6. Still-open design questions

These were intentionally left for a later call:
- **Placement**: the sketch sits at the *end of the whole journal*. A per-card
  sketch is the alternative.
- **Pen weight**: fixed single thin line (2px). No size options by design.
- **Very small phones (≤320px)**: the three short button labels (Back/Skip/Add) fit
  comfortably at common widths; if ≤320px matters, the row can be made to wrap.
