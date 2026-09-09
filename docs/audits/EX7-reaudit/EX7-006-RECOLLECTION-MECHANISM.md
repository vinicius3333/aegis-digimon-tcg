# EX7-006 recollection mechanism lane

## Outcome

The EX7-006 retained red is resolved as a false fixture expectation, not an engine recollection defect. The inherited `[When Attacking] [Once Per Turn]` effect is recollected after a real turn when its printed hand condition is satisfied. No production engine edit was necessary.

The lane result is **8/10 under the worker-brief cap**: catalog/rules 2/2, IR fidelity 2/2, behavioral proof 2/2, stack/evolution proof 2/2, gates 0 by policy.

## Contract and Q&A coverage

Catalog source: `packages/shared/src/cards/data/cards.json`, EX7-006, Yaamon. The sole printed clause is:

`[When Attacking] [Once Per Turn] If you have 4 or fewer cards in your hand, this Digimon may digivolve into a Digimon card with the [Dark Dragon]/[Evil Dragon] trait in the trash.`

`node tools/kb/query.mjs card EX7-006` reports no knowledge-base entries. The JSON query reports `banlist: null`, `errata: null`, and `qa: []`; there are no card-specific Q&A IDs, restrictions, errata, or rulings to cover.

## Red reproduction and root cause

Before correction, the focused test reported:

```text
Tests 6 passed | 1 expected fail (7)
```

The retained-red fixture seeded four cards in hand. The first effect-driven evolution into BT11-079 correctly drew the standard digivolution bonus card, and the next real turn correctly drew one card during Draw. Thus the next observed Main phase had five cards in hand, so EX7-006's `4 or fewer` condition correctly failed. The attack produced no second evolution; the watcher was not missing from the engine.

The old assertion also expected the stack to remain `[EX7-006, BT11-075]`, which was only valid while the incorrectly expected second evolution did not happen.

## Fix and green proof

The focused fixture now seeds two hand cards. It asserts the observable hand boundary:

- before the first attack: 2 cards;
- after the effect-driven BT11-079 evolution's mandatory bonus draw: 3 cards;
- after the next real turn's draw: 4 cards.

The test now uses `it(...)` rather than `it.fails(...)`. It preserves the same-turn Once Per Turn refusal, then uses a real opponent turn and next owner turn. The next public attack recollects EX7-006, pays 4 memory for BT21-077, removes it from trash, and proves the final stack is `[EX7-006, BT11-075, BT11-079]` beneath BT21-077. Existing wrong-trait, wrong-color, over-four-hand, and optional-decline negatives remain unchanged.

The only test-only structural seam is the named arbitrary-unsuspend bridge needed to create a second same-turn public attack. It does not inject timing, fire an effect, or alter the collection/ledger state.

## Engine compatibility conclusion

The existing path is correct and unchanged:

1. The attack opens the scoped `WhenAttacking` timing for the whole permanent, including its stack.
2. Effect-driven digivolution draws the standard bonus card and preserves the prior top card under the new top.
3. The real turn machine advances through Active, Draw, Breeding, and Main.
4. The next attack re-collects the stack's EX7-006 effect when the hand is exactly four.

No files under `apps/api/src/engine/**` or `engine/testkit` were changed. This preserves compatibility for inherited-effect collection, effect-driven digivolution, bonus draws, and Once Per Turn accounting. Assertions were strengthened rather than weakened.

## Verification

- Red reproduction: focused EX7-006 test, **6 passed, 1 expected fail (7)**; the fixture had four seeded cards and crossed the printed hand boundary after the two legitimate draws.
- Green focused proof: `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-006.test.ts --maxWorkers=1 --no-file-parallelism` — **7 passed**.
- Full engine regression: `pnpm --filter @aegis/api run test:engine -- --maxWorkers=1 --no-file-parallelism` — **225 files, 6,774 tests passed**. The run logged an existing AD1-002 unsupported-effect diagnostic but reported no failing tests.
- `pnpm typecheck` — shared, web, and API passed.
- Targeted Oxlint/Oxfmt and `git diff --check` — passed.

No git writes were performed. No other card, shared/catalog, ledger, RUN, or unrelated file was edited.
