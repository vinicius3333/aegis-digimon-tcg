# Seam 32 — `settle` silent timeout

REVIEW-NOTES entry 32 (`settle-silent-timeout`).

## Mechanism

`settle(predicate, maxTicks)` in `apps/api/src/engine/testkit/harness.ts` spun the microtask
queue for `maxTicks * 10` polls and then **returned normally** whether or not the predicate
ever held. A test that waited on a milestone the engine never reaches therefore continued
past the wait and asserted against a board that had not advanced. Any assertion that also
holds in the un-advanced state passed, so the test proved nothing.

Example (`src/engine/blockerProof.test.ts`): two tests waited for `blockWindowOpened`, then
asserted that `declareBlock` was rejected. Combat never opens a block window when no eligible
blocker exists, so the wait always timed out; the rejection they observed came from there
being no combat in flight, not from the `hasBlocker` / `isSuspended` gates the tests claim to
prove.

## Fix

`settle` now throws when its tick budget is exhausted and the predicate still does not hold.
The message carries the tick count, the poll count, the predicate source, and the three
legitimate next steps (raise `maxTicks`, use `settleAcrossTimers`, use `drainMicrotasks`).

The drain-only form stays silent, because "run the queue for N ticks" is a real and common
need — 1539 bare `settle()` calls and 531 explicit `settle(() => false, n)` calls. A drain is
recognised as the default predicate or a predicate whose source normalises to `() => false`.
`drainMicrotasks(maxTicks)` is the new explicit affordance and is what new code should use;
the `() => false` sentinel is kept only so the existing call sites stay valid.

`settle` and `settleAcrossTimers` now share a private `tickUntil` that reports whether the
predicate held. `settleAcrossTimers` polls through `tickUntil`, so its per-round 5-tick probe
does not throw; that helper remains non-strict and is a follow-up seam.

## Red / green

- Red: with the `throw` suppressed, `settle tick-budget exhaustion > throws with the tick
  count and predicate when a predicate never holds` fails (`promise resolved "undefined"
  instead of rejecting`).
- Green: with the throw in place, `src/engine/testkit/harness.test.ts` is 13/13.

## Tests changed

| Test | Why |
| --- | --- |
| `src/engine/testkit/harness.test.ts` — new `settle tick-budget exhaustion` describe | Proves the throw fires on an unmet predicate and that all three drain-only forms stay quiet. |
| `src/engine/blockerProof.test.ts` — "a Digimon WITHOUT ＜Blocker＞ is rejected from declaring a block" | Hollow proof. The `blockWindowOpened` wait could never hold. Replaced with `drainMicrotasks()` plus an explicit assertion that no block window opened, which is the real behaviour. |
| `src/engine/blockerProof.test.ts` — "a SUSPENDED Digimon with ＜Blocker＞ cannot block" | Same hollow proof, same repair. |

## Blast radius

Full run: `pnpm --filter @aegis/api exec vitest run src/cards src/engine --maxWorkers=1
--no-file-parallelism` — log in `logs/seam-32-full-suite.log`.

```
Test Files  362 failed | 4586 passed (4948)
      Tests  502 failed | 36030 passed | 2 expected fail (36534)
```

Baseline with the throw suppressed, same working tree: **15 files / 40 tests failed** (other
lanes: catalog-sync files, BT20-025/042/045, BT22-009, BT23-009, EX10-032,
promo-lm-rb.catalog-parity, appFusionLinkPlacement).

So the throw newly reddens roughly **462 tests across 349 files**. Every one of them is a
`settle` predicate that never holds — the same hollow-proof shape as the two blockerProof
tests, at a scale the seam note did not anticipate. The per-file list is
`logs/seam-32-hollow-settle-files.txt`.

These were not repaired here. Each needs a per-test judgement (is the milestone real but
late? is the wait a disguised negative proof? is the card behaviour wrong?), and the files
span every card lane currently in flight. Repairing them is a fan-out task, not a
single-agent edit; the ledger is the handoff.
