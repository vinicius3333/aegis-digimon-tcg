# Attack-target filter answered from the declaration snapshot (BT17-064, Q2816)

## Symptom

BT17-064 Pipismon prints "[Your Turn] When this Digimon attacks an opponent's Digimon with
no digivolution cards, delete that Digimon."

Attacking a defender that HAD one digivolution card, with BT16-016 [Patamon]'s inherited
[When Attacking] under Pipismon stripping that card in the same window, deleted the
defender. Q2816 says it must not: the gate is answered by the board at declaration.

## Root cause

`evaluateCondition`'s `attackTargetMatchesFilter` case in
`apps/api/src/engine/effects/interpreter/conditions.ts` resolved the declared defender by id
and re-ran `candidatePermanents` against LIVE state at the moment the sub-trigger fired. The
attack payload carried no declaration-time facts about the defender, so a same-window
[When Attacking] effect that emptied its stack made the gate true after the fact.

The attacker side of the same window was already snapshotted — `attackerDPAtDeclaration`,
captured in `combat/controller.ts` and consumed in `matching/trigger.ts` for exactly this
reason (Q6263, a self-boost must not satisfy a DP watcher retroactively). The defender had
no counterpart.

## Fix

1. `combat/controller.ts`, at attack declaration: capture
   `defenderAtDeclaration = { permanentId, digivolutionCardCount }` before
   `afterAttackDeclaration` and the [When Attacking] windows run, and put it on both the
   `CombatTrigger` (System-A timing effects, which read `targetPermanentId`) and the
   `attackSubTriggerPayload` (the watcher bus, which reads `defenderPermanentId`).
2. `GameEngine.combatTriggerInfo`: pass it through to `TriggerInfo`.
3. `conditions.ts`: when the snapshot names the same permanent as the condition's target,
   answer the digivolution-stack predicates from it and strip them from the filter handed
   to the live candidate scan.

Only the stack predicates are snapshot-answered — `digivolutionCards` (`none`/`hasNone`/
`hasAny`), `hasDigivolutionCards`, `digivolutionCardsAtMost`, `digivolutionCardsAtLeast`.
`digivolutionCards: "hasFaceDown"` needs face state a count cannot carry and stays live, and
`dp` was deliberately left live: its comparison supports `relativeTo`/`relativeToSource`/
`relativeToFilter` forms that a scalar snapshot cannot reproduce, and no BT17 ruling asks for
it. Everything else — controller scope, kinds, names, superlatives — stays on the live scan,
which is where those predicates are defined.

## Evidence

```
pnpm --filter @aegis/api exec vitest run src/cards/BT17/BT17-064.test.ts --maxWorkers=1 --no-file-parallelism
Tests  7 passed | 1 expected fail (8)     # red: the delete fired, reproducing the defect
Tests  8 passed (8)                       # green
```

## Corrected assertion in the reproducer

The Q2816 test also asserted `players[0].battleArea` empty, i.e. that Pipismon is deleted by
the battle. That is wrong for this fixture: Pipismon carries ＜Armor Purge＞ and a BT16-016
source, so losing the battle trashes its TOP card and promotes [Patamon] — the same endpoint
the file's own "does not trigger if the target had a source when the attack was declared"
test describes. Observed end state with the fix: `[["BT16-016", 0, 2000]]`. The assertion was
replaced with the precise endpoint (one permanent, top card BT16-016, empty stack), which is
stricter than the original count check, not weaker.

## Blast radius

Every module carrying an `attackTargetMatchesFilter` condition was run:

```
pnpm --filter @aegis/api exec vitest run src/cards/BT3/BT3-004.test.ts src/cards/BT3/BT3-058.test.ts \
  src/cards/BT2/BT2-112.test.ts src/cards/EX7/EX7-034.test.ts src/cards/ST4/ST4-06.test.ts \
  src/cards/ST4/ST4-04.test.ts src/cards/BT1/BT1-001.test.ts src/cards/BT6/BT6-004.test.ts \
  --maxWorkers=1 --no-file-parallelism
Test Files  8 passed (8)
     Tests  25 passed (25)
```

None of them filters on the defender's digivolution stack (they use controller, kind and
`dp`), so BT17-064 is the only behaviour change in the catalog today.
