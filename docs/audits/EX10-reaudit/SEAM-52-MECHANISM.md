# Seam 52 — `opponent-option-vanishes-in-recompute` (P-179 Justimon: Critical Arm)

## Symptom

`apps/api/src/cards/P/P-179.test.ts` > "digivolves from a named Justimon for 1, places a
Device, gains DP, and deletes cost 9" timed out in `settle`. P-179's second
`[When Digivolving]` clause pays "by trashing 1 of your opponent's Option cards in the battle
area"; the opponent's seeded P-155 left the battle area before the cost ran, so the clause
declined and aborted (`abortOnDecline: true`).

## Mechanism

Not an engine defect and not P-155's printed text. Instrumenting
`extractPermanentAt` (`apps/api/src/engine/state/access.ts`) showed the removal coming from
`GameEngine.trashOptionsInBattleArea` inside `runRuleProcessFixpoint` — the §17-1-3-2-2 rule
sweep that trashes every pure-Option battle-area permanent not marked `placedByEffect`.

The gap is in the test harness. `buildPermanent` in
`apps/api/src/engine/testkit/harness.ts` never set `placedByEffect`, so any board that seeds
an Option onto the battle area seeds an illegal state. In real play a pure Option only reaches
the battle area through an effect placement, which sets the marker; the first rule check after
the digivolve therefore swept both seeded P-155s away.

## Fix

`buildPermanent` now defaults `placedByEffect` to `true` for a pure-Option card (Option kind,
neither Digimon nor DigiEgg), and `PermanentSpec` gains an explicit `placedByEffect?: boolean`
so a test can still seed the illegal, sweep-eligible state.

No production code changed: the harness is test-only, so match behaviour is untouched. The
§17-1-3-2-2 sweep itself is unchanged and still fires on genuinely unplaced Options.

## Red / green

Command (from `apps/api`):

```
./node_modules/.bin/vitest run src/cards/P/P-179.test.ts --maxWorkers=1 --no-file-parallelism
```

- Before: `Error: settle: predicate never held within 500 ticks` — `Tests 1 failed | 3 passed`.
- After: `Tests 4 passed (4)`.

New focused conformance test, `apps/api/src/engine/conformance/ch17-rule-checks.test.ts` >
"§17-1-3-2-2 board-laid Option seeding" — a seeded Option survives the sweep by default, one
seeded with `placedByEffect: false` is still trashed.

- Before the harness fix: `AssertionError: permanent for "placed" (seed-perm-3) is no longer on
  the board`.
- After: `Tests 5 passed (5)`.

## Other cards affected

Every test that seeds a pure Option onto `battleArea` through the harness now keeps it. Boards
that comment on this explicitly (BT23-091, BT23-095, BT24-093, EX10-069, EX10-070) already
placed their Options through an effect and are unaffected. The full gate scope
(`src/engine/conformance src/engine/effects src/engine/combat src/cards/P`) passes:
367 files, 3259 tests.
