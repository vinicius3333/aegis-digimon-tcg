# EX7-004 once-per-turn reset mechanism lane

## Outcome

The EX7-004 retained red is resolved. The card's inherited `[Your Turn] [Once Per Turn]` watcher now has green focused proof across a real turn boundary. No production engine edit was necessary: the existing `UseTracker.resetForNewTurn()` lifecycle was correct, and the retained red came from the test fixture's memory assertion.

The lane result is **8/10 under the worker-brief cap**: catalog/rules 2/2, IR fidelity 2/2, behavioral proof 2/2, stack/evolution proof 2/2, gates 0 by policy.

## Contract and Q&A coverage

Catalog source: `packages/shared/src/cards/data/cards.json`, EX7-004. The inherited contract is:

`[Your Turn] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, gain 1 memory.`

`node tools/kb/query.mjs card EX7-004` returned `EX7-004 Fluffymon (no knowledge-base entries)`. There are no card-specific Q&A IDs, errata, restrictions, or rulings to cover.

## Red reproduction

Before the test correction:

```text
Tests 6 passed | 1 expected fail (7)
```

Instrumentation showed the watcher was reinstalled after the turn transition, its per-turn key count was `0`, and the next real attack emitted `effectTriggered` followed by `memoryChanged` from `3` to `4`. The failure expected the original `firstTurnMemory + 2`, which was `5`.

The fixture manually negated the memory gauge around hand-laid turn changes:

```ts
s.state.memory = -s.state.memory;
```

The real turn machine's pass/normalization therefore changed the baseline between the first and next attacks. The expected-fail label incorrectly attributed that baseline change to a watcher lifecycle failure.

## Fix and green proof

The focused test now:

- uses `it(...)` instead of `it.fails(...)`;
- preserves the same-turn refusal assertion;
- runs the actual Active -> Draw -> Breeding -> Main turn machine for both intervening turns;
- asserts the reinstalled watcher's `oncePerTurnKey` exists and its `subtrigger` ledger count is `0` at the next owner's Main phase;
- captures the actual post-transition memory baseline and asserts the next public battle deletion adds exactly `1`.

The final attack still uses the real public `attack` intent and real combat deletion. The only test seam is the documented arbitrary-unsuspend bridge needed to restore a suspended defender; it does not fire the watcher or mutate the per-turn ledger.

## Engine compatibility conclusion

The relevant production path is already correct:

1. `TurnStateMachine.activePhase()` calls `clearDurations("ownerTurnStart")`.
2. `GameEngine` handles that boundary with `tracker.resetForNewTurn()`.
3. Continuous recomputation removes and reinstalls the watcher while preserving its stable `oncePerTurnKey`.
4. The next `whenDeletesInBattle` event observes a zero-count ledger and fires once.

No change was made under `apps/api/src/engine/**` or `engine/testkit`. This preserves existing `UseTracker`, `SubTriggerRegistry`, continuous-recompute, and once-per-turn compatibility behavior. Assertions were strengthened rather than weakened.

## Verification

- Red reproduction: focused EX7-004 test, `6 passed | 1 expected fail (7)`.
- Green focused proof: `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-004.test.ts --maxWorkers=1 --no-file-parallelism` — **7 passed**.
- Engine regression: `pnpm --filter @aegis/api run test:engine -- --maxWorkers=1 --no-file-parallelism` — **225 files, 6,774 tests passed**. The run logged an existing AD1-002 unsupported-effect diagnostic but reported no failing tests.
- Typecheck: `pnpm typecheck` — shared, web, and API passed.
- Targeted style: Oxlint and Oxfmt check for `EX7-004.test.ts` passed.
- `git diff --check` passed.

No git writes were performed. No card module, shared/catalog data, ledger, RUN file, or existing EX7-004 report was edited.
