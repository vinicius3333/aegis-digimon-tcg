# App Fusion client flow

This is the web lane for App Fusion (CR 8-4-3-3). The client renders server-projected
routes and sends one intent. It derives no legality of its own.

## What the flow does

1. The server projects legal App Fusion routes onto each hand card. A route names the
   host permanent, the exact linked material instance and the projected memory cost.
   `GameEngine.syncHandAffordances` writes them; `CardInstance.appFusionRoutes` carries
   them. The client only reads them.
2. The player selects a hand card. Every own permanent that has at least one route for
   that card lights up as an eligible base, next to ordinary digivolution bases.
3. Tap or drag onto that permanent opens the App Fusion overlay. Both routes call the
   same `openAppFusionChoice`.
4. The overlay lists one radio per route: the linked card art, its name and its projected
   cost. The first route is selected and focused on open.
5. "App Fuse" sends `intents.appFusion(room, hostPermanentId, handInstanceId,
   linkedInstanceId)` and plays the digivolve cue.
6. "Digivolve normally" appears only when the server also lists that permanent in the
   card's ordinary digivolve targets. It hands off to the existing
   `digivolveWithChoice`, so the alternate-cost overlay still appears where it applies.
7. "Cancel" and Escape close the overlay and clear the hand selection. No intent is sent.

Staleness is re-derived on every render, never cached:

- A route is dropped when its host is gone, or when the named linked card is no longer
  on that host.
- All routes are dropped when the action is no longer available: game over, board
  locked, a pending decision, not the viewer's turn, or not the Main phase.
- With no routes left the overlay stays mounted, shows "No legal linked material is
  available." and disables confirmation. The player sees why the action went away
  instead of the dialog vanishing.
- Confirmation re-reads the live entry, host and route before sending, so a route that
  goes stale between render and click sends nothing.

## Files

| File | Role |
| --- | --- |
| `apps/web/src/game/AppFusionChoiceOverlay.tsx` | The dialog. Radio group, focus, cancel. |
| `apps/web/src/game/AppFusionChoiceOverlay.css` | Panel styling and the narrow-width layout. |
| `apps/web/src/game/boardModel.ts` | `appFusionRoutesForHost` joins projected routes to the host's current links. |
| `apps/web/src/game/boardPieces.tsx` | `HandEntry.appFusionRoutes`. |
| `apps/web/src/game/GameScreen.tsx` | Eligible-base highlighting, tap and drop routing, overlay wiring. |
| `apps/web/src/net/intents.ts` | `intents.appFusion`. |
| `apps/web/src/i18n/en.ts`, `pt-BR.ts` | Seven `overlay.appFusion*` keys in both locales. |
| `apps/web/src/dev/CardEffectsDemo.tsx` | `appFusionDemo()` fixture, served at `/dev/card-effects/BT23-021`. |

## Tests

| File | Covers |
| --- | --- |
| `apps/web/src/game/AppFusionChoiceOverlay.test.tsx` | Selecting the second material and sending its exact instance id; the shown cost; cancel and normal-evolution buttons; Escape; a selected route that disappears; an empty route list. |
| `apps/web/src/game/boardModel.test.ts` | `appFusionRoutesForHost` joins two links with server costs; rejects a foreign host, a removed link and a missing host. |
| `apps/web/test/appFusionGameScreen.test.tsx` | Tap and drag both open the overlay on the second host; the intent carries the exact host, hand and link ids; no normal fallback is invented; cancel sends nothing; a removed link disables confirmation; wrong turn, wrong phase, game over, a pending decision and a removed host all block the send. |

## Commands and results

Run from the worktree root on branch `audit-bt23-astra-luna`.

| Command | Result |
| --- | --- |
| `pnpm --filter @aegis/web typecheck` | Pass, 0 errors. |
| `pnpm --filter @aegis/web test` | 130 files, 1501 tests passed. |
| `pnpm --filter @aegis/web exec vitest run src/game/AppFusionChoiceOverlay.test.tsx src/game/boardModel.test.ts test/appFusionGameScreen.test.tsx` | 3 files, 101 tests passed. |
| `./node_modules/.bin/oxlint apps/web/src apps/web/test` | Exit 0. Warnings only, all pre-existing in unrelated files. Zero findings in the App Fusion files. |
| `./node_modules/.bin/oxfmt --check <changed files>` | 11 files, correct format. |
| `git diff --check` | Clean. |

The full suite was run four times. Three runs were fully clean. One printed a stray
`Errors 1` line with all 1501 tests still passing and no failing file named. It did not
reproduce, and nothing changed between runs, so it is not attributed to this work. It is
recorded here rather than hidden.

## Observable proof

The dev harness was served with `pnpm --filter @aegis/web dev --port 5199` and driven in
Chrome at `/dev/card-effects/BT23-021`.

- Selecting the Dosukomon hand card highlighted the linked Dokamon as an eligible base.
- Tapping that permanent opened the overlay with one route, Perorimon at cost 0, the
  radio selected and focused.
- Escape closed the dialog; the accessibility tree then held no dialog.

Screenshot: `logs/app-fusion-overlay-ptbr.jpg` (pt-BR locale, so it also shows the
translated strings in place).

## Remaining gaps

- **No positive normal-evolution proof through GameScreen.** No test drives a fixture
  where the same host is both an App Fusion host and an ordinary digivolve target, so the
  "Digivolve normally" button is proven present-or-absent and unit-tested in the overlay,
  but its `digivolveWithChoice` hand-off is not proven end to end. Building that fixture
  needs a card pair the server projects both ways.
- **Narrow-width layout not captured.** The CSS media query at 28rem exists, but the
  board scales its own stage, so resizing the browser window did not change the captured
  viewport. The responsive rule is reviewed, not photographed.
- **Card names are always English.** The overlay uses `nameEn`, matching every other
  surface in `GameScreen.tsx`. Localized card names are a repo-wide gap, not one this
  flow should fix alone.
- **Drag cursor label.** A drop that is App Fusion only reports the `normal` evolution
  label to `dragIntentFor`, because there is no App Fusion drag label. The drop itself
  routes correctly; only the hint text is approximate.

## Server interface used

No server or shared change is needed. The flow consumes the existing boundary as shipped:

- `CardInstance.appFusionRoutes`: `{ hostPermanentId, linkedInstanceId, projectedCost }[]`,
  private to the owner, recomputed by `GameEngine.syncHandAffordances`.
- Intent `{ type: "appFusion", permanentId, instanceId, linkedInstanceId }`.

The client depends on the server keeping two guarantees: the projection uses the same
validator as the declaration, and a stale material is rejected server-side. The client
duplicates neither.
