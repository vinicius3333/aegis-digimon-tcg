# Interaction coverage plan

Date: 2026-09-23. Owner: coordinator session. Workers: three subagents, one per workstream.

## Why

Every card collection is audited at 10/10, yet players reported about 40 bugs between
2026-09-19 and 2026-09-23. Card audits prove each card alone. The reported bugs sit in
interactions between cards, in play routes other than the hand, and in mobile layouts. This
plan adds tests for those three areas and fixes what the tests expose.

## Rules for every worker

- Work in an isolated git worktree on the branch named in your workstream. Do not push to
  `main`. The coordinator reviews and merges.
- Memory: `NODE_OPTIONS=--max-old-space-size=2048`, `TEST_MAX_WORKERS=1`,
  `TEST_HEAP_MB=2048`, and `nice -n 15` for every test run. Typecheck may use 4096 MB.
  Run `oxlint` with `--threads 2`.
- Card modules register only with `registerIrCard`. Never add `registerCard` (see
  `AGENTS.md`).
- Cite the comprehensive rules or a KB ruling (`node tools/kb/query.mjs`) for every expected
  behavior. When the rules are unclear, record the question and skip that case. Do not guess.
- Test first. Write the failing test, confirm it fails for the reported reason, then fix.
- Keep each fix atomic: one commit per bug, conventional commit format, no AI attribution.
- Before you report done, run the affected card sets one set per process, the conformance
  suite, `pnpm --filter @aegis/api typecheck`, lint and format on changed files, and
  `git diff --check`.
- Report: tests added, bugs found and fixed, bugs found and not fixed (with the failing test
  marked `it.fails` and a reason), and rules questions.

## Workstream A: trigger timing and ordering (item 3)

Branch: `test/interaction-trigger-timing`.

Goal: prove the rules for simultaneous triggers with real card combinations.

Rules to cover (comprehensive rules chapter 15-2, and `docs/audits/engine/trigger-ordering.md`):

1. Turn player's triggered effects resolve before the non-turn player's.
2. A player orders their own simultaneous triggers.
3. On Deletion and "when a Digimon is deleted" watchers trigger at the same time.
4. When Attacking and "when an opponent's Digimon attacks" trigger at the same time. The turn
   player resolves first.
5. Effects triggered during resolution wait until the current effect finishes.
6. Once Per Turn resets for a new Digimon (DNA, and play after leaving the field).

Seed cases from player reports (all resolved; each needs a regression test if missing):

- EX13 King Etemon with EX13 King Sukamon inherited, when a Sukamon with On Deletion is deleted.
- EX5 Metal Etemon and EX5 Etemon inherited against EX6 Shoutmon with Alliance and When Attacking.
- BT11 Analogman's Opponent's Turn effect against the opponent's When Attacking.
- EX13 Alphamon playing BT20 or EX13 Grademon during an attack.
- EX13 Magnamon end-of-turn timing and the Reboot keyword.
- DNA digivolve resets inherited Once Per Turn uses (open report, 2026-09-23).

Deliverable: `apps/api/src/engine/conformance/interaction-trigger-timing.test.ts`, with one
`describe` per rule above and real card IDs, plus fixes.

## Workstream B: plays made by an effect (item 4)

Branch: `test/effect-play-route-matrix`.

Goal: every special play mechanic works on every play route.

Build a matrix test:

| Mechanic \ route            | Hand (manual) | Effect from hand | Effect from trash | Effect from security | Effect from deck reveal |
| --------------------------- | ------------- | ---------------- | ----------------- | -------------------- | ----------------------- |
| Assembly                    |               |                  |                   |                      |                         |
| DigiXros                    |               |                  |                   |                      |                         |
| DNA digivolve               |               |                  |                   |                      |                         |
| App Fusion                  |               |                  |                   |                      |                         |
| Burst digivolve             |               |                  |                   |                      |                         |
| Alternate digivolution cost |               |                  |                   |                      |                         |

For each cell, choose one real card that can take that route and assert the mechanic is
offered and resolves. Mark an impossible cell `n/a` with the rule that forbids it.

Seed cases from player reports:

- Assembly when played by an effect (Metal Empire revealing Megadramon; BT26-073 Aegiochus Dark
  via Wizardmon).
- EX13 Examon DNA over level 5 Digimon treated as level 6.
- Bitting Crush playing Leviamon from trash after an effect play.
- Metal Empire security effect filtering by level, not cost.

Deliverable: `apps/api/src/engine/conformance/effect-play-route-matrix.test.ts`, a filled
matrix in the test file header, plus fixes. Reuse `docs/plans/2026-09-21-effect-play-assembly-design.md`.

## Workstream C: mobile layout of long prompts (item 5)

Branch: `test/mobile-prompt-layout`.

Goal: no prompt or control leaves the screen on phone sizes, and reconnect restores the game.

Cover, at 360x640 and 390x844 portrait and 844x390 landscape:

1. Pending-effects list with 6 or more triggers (EX13 Crania line blocking with Giromon and
   two ST Tai).
2. Alliance prompt with 5 or more eligible allies.
3. `chooseTargets` and `selectCards` with 10 or more candidates, and a revealed-cards panel.
4. `orderTriggers` with long clause text.
5. Reconnect during an open decision on mobile: the game screen comes back, not a white screen.

Approach: extend `apps/web/src/game/game.mobile.test.ts` and `mobileScenario` in
`apps/web/test/scenarioHarness/scenario.ts`. jsdom has no layout, so assert the structural
guarantees the CSS relies on: scroll containers present, max-height classes applied, the
confirm control rendered outside the scroll region. If a guarantee cannot be checked in jsdom,
list it for a manual check in the report instead of faking it.

Deliverable: new mobile tests, fixes, and a manual-check list.

## Coordination

- The three workstreams share no files except possibly `apps/api/src/engine/decisions`. If a
  fix needs a shared engine seam, the worker stops and reports instead of changing it.
- Another session was editing `devScenario.ts`, `recentIssueScenarios.test.ts`,
  `LiveArenaDemo.tsx` and `apps/web/src/net/types.ts` on 2026-09-23. Workers must not touch
  those files.
- The coordinator merges A, then B, then C, rerunning the full API suite (one set per process)
  and the web suite after each merge.
