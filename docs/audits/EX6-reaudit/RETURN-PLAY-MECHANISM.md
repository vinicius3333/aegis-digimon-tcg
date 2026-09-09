# Return-triggered stack play — EX6-031

## Seam

EX6-031's `wouldBeReturned` watcher resolves two optional `PlayWithoutCost`
actions from the leaving permanent's digivolution stack. `returnToHand` must
await that watcher and its nested play entry windows before collecting the
permanent; the same ordering is used by `returnToDeck`.

## Red → green evidence

The initial public hand test omitted the testkit's optional-decision responder:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-031.test.ts --maxWorkers=1 --no-file-parallelism
→ 1 failed: "publicly plays exact named cards from its stack after returning to hand"
  Test timed out in 15000ms
```

The watcher is printed as optional. Without an answer, the serialized return
coroutine correctly remains suspended at the optional decision, which made the
timeout look like a hand/deck engine divergence. The deck fixture already
configured `autoAcceptOptional`, so it was green.

The smallest reusable correction is to give the hand fixture the same decision
driver and to retain a mechanism-level regression around the awaited primitive:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-031.test.ts --maxWorkers=1 --no-file-parallelism
→ PASS — 1 file, 13 tests

pnpm --filter @aegis/api exec vitest run src/engine/returnPlaySerialization.test.ts --maxWorkers=1 --no-file-parallelism
→ PASS — 1 file, 1 test
```

The regression asserts that `await returnToHand(...)` does not complete until
both EX6-025 and EX6-023 are on the battle area and EX6-031 is in hand. This
proves the shared serialized `wouldBeReturned` → `PlayWithoutCost` → On Play
chain, rather than substituting a return-to-deck-only check.

## Scope decision

No production engine behavior was changed: the hand and deck primitives already
share the required awaited `wouldBeReturned` path. The observable defect was an
incomplete hand-test decision fixture; the new engine regression guards the
reusable behavior and the public hand/deck tests now exercise both destinations.
