---
title: Replacement effects audit
updated: 2026-09-13
---

# Replacement effects audit

## Status

Inventory and bounded evidence. The batch placement replacement seam has a
minimal engine correction and focused mechanism proof; this document does not
claim completion of the full replacement denominator.

## Contract and KB sources

The relevant local rules are comprehensive §15-4-3 (simultaneous triggering),
§15-4-4 (pending activation), §15-7 (processing costs), §15-8-5 (immediate
effects and ordering), §16-18 (Decoy), §16-45 (Guard), and §16-46 (Detach).
The repository's reviewed fingerprints are recorded in the existing owner
documents: `comprehensive-0177` for immediate-effect ordering,
`comprehensive-0236` for Decoy, `comprehensive-0322` for Guard, and
`comprehensive-0323` for Detach. The placement contract is owned by
[`digivolution-card-placement.md`](digivolution-card-placement.md), which
also records §4-7-7/8 as `comprehensive-0292/0293`.

## Implementation trace

Replacement installation is represented by `SubTriggerRegistry` in
`apps/api/src/engine/effects/subtriggers.ts`; the interpreter creates the
discriminated modes in `effects/interpreter/actions/replacement.ts`.
`GameEngine.consultLeavePrevention` delegates to `effects/leavePrevention.ts`,
which filters cause, target, source, once-per-turn and re-entry, then orders
eligible reactions. `dropPermanentSubscriptions`, `sweepExpired`, and
`clearContinuous` provide the source-leave, duration, and recomputation
boundaries. Placement movement itself is in `effects/primitives.ts` and its
event identity/position obligations remain open in the placement owner doc.

## Persisted IR inventory

The read-only scan of `packages/shared/src/effects/effects.json` at this
checkpoint found these action occurrences (card counts are distinct where
shown):

| Event and mode (`mode` omitted means the implicit action shape)                          |          Occurrences |                Cards |
| ---------------------------------------------------------------------------------------- | -------------------: | -------------------: |
| `wouldLeavePlay` implicit action / prevent / instead                                     |        132 / 61 / 14 |        122 / 58 / 13 |
| `wouldBeDeleted` implicit action / prevent / instead                                     |          16 / 15 / 3 |          16 / 15 / 3 |
| `wouldBePlayed` implicit action / reduceCost / instead                                   |         89 / 112 / 5 |         89 / 111 / 5 |
| `wouldDigivolve` implicit action / reduceCost / instead / increaseCost / gainMemoryOnDna | 93 / 110 / 1 / 2 / 2 | 92 / 109 / 1 / 2 / 2 |

These are discovery counts, not a behavioral denominator. They include
structured action records and cannot prove every printed replacement clause.

## Existing proof and baseline

Existing reusable proof covers Guard/Detach choice and payer identity in
`conformance/keyword-guard-lifecycle.test.ts`, source departure in
`engine/breedingInheritedLeaveReplacement.test.ts`, replacement teardown in
`effects/primitives.test.ts`, registry ordering and once-per-turn behavior in
`effects/subtriggers.test.ts` and `effects/leavePrevent.test.ts`, and placement
identity/position in `conformance/digivolution-card-placement.test.ts`,
`king-drasil-batch-placement-events.test.ts`, and
`king-drasil-joint-placement.test.ts`.

Root recorded the serialized bounded baseline as **7 files / 28 tests passed**:

```sh
TEST_MAX_WORKERS=1 TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run \
  src/engine/conformance/digivolution-card-placement.test.ts \
  src/engine/conformance/mother-eater-placement.test.ts \
  src/engine/conformance/king-drasil-batch-placement-events.test.ts \
  src/engine/conformance/king-drasil-joint-placement.test.ts \
  src/engine/replacementRecomputeBarrier.test.ts \
  src/engine/breedingInheritedLeaveReplacement.test.ts \
  src/cards/source-placement-watcher-scope.test.ts \
  --maxWorkers=1 --no-file-parallelism
```

The replacement-focused expansion also passed **9 files / 97 tests** across
`leavePrevent`, `digiXrosReplacementBudget`, Guard, Detach, Save placement and
source-identity suites. The mechanism guard expansion passed
`primitives.test.ts`, `subtriggers.test.ts`, `subTriggerFireSites.guard.test.ts`,
and `testkitSeam.guard.test.ts`: **4 files / 265 tests**. Across the three
serialized runs root recorded **20 files / 390 tests passed**. These are
reusable regression evidence only; they do not close the batch replacement gap
below.

## Obligations and residuals

| Obligation                                                                       | Evidence                                             | Status                                                                            |
| -------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| A replacement is eligible only for its cause, source, target, and live zone      | `leavePrevention.ts`, Guard/Detach suites            | Bounded evidence; all providers unproved                                          |
| One applicable replacement is chosen in simultaneous departure                   | §15-8-5 / `orderReplacements`                        | Bounded Guard+Detach witness; broader competing classes open                      |
| Prevention cost can fail without changing the original event                     | `leavePrevent.ts`, existing refusal cases            | Bounded evidence; public provider denominator open                                |
| A successful `instead` actually relocates or supersedes the event                | `consultLeavePrevention` and Decode/Eater consumers  | Partial; mixed side-effect/relocation races open                                  |
| Source departure and re-entry do not retain stale replacement state              | `dropPermanent`, breeding witness, recompute barrier | Partial; loose-source replacement lifetime and all departure seams open           |
| Placement preserves stack order, source shedding, identity, position, and timing | `digivolution-card-placement.md`                     | Producer-specific checkpoints only; downstream reactions and mixed snapshots open |

## Confirmed shared-engine correction

`effects/primitives.ts:2382-2437` implements `relocatePermanentsByEffect` as
an atomic existence/restriction preflight followed by synchronous calls to
`relocatePermanent`. Before this correction, unlike the singular
`relocatePermanentByEffect` path at `~2330`, the batch path never called
`consultLeavePrevention` before the first source was removed. The batch is used
by the effect-cost path in
`effects/interpreter/costs.ts:2084-2104`, so this is an effect-driven
multi-source placement seam, not merely a player DigiXros procedure.

The correction now consults once for all battle-area sources, preserves
all-or-nothing behavior, and revalidates selected top identities after the
await. `placeMixedMaterialsUnder` remains a separate mixed payment procedure
and was not changed. The persisted scan also contains one placement-related
`wouldTrashDigivolutionCard` shape outside these four replacement event names;
it remains classified with the placement owner rather than being silently
dropped from the inventory.

`leavePrevent.test.ts` contains a focused reproduction using a compiled
`wouldLeavePlay` replacement on the second source of an atomic batch. It
failed against the unchanged engine (**1 failed / 27 passed**) because both
sources moved. The minimal correction in `effects/primitives.ts` now passes the
focused replacement/placement regression (**10 files / 272 tests passed** in
the final serialized run, including audit layout). Two adjacent controls cover
deletion-only exclusion and optional decline, and a third synthetic control
covers stale top identity in the batch path. This is a
mechanism proof, not a public card certificate. Further work should extend the existing suites
for public replacement producers and competing departure groups, without
duplicating already-covered witnesses.

The selected top IDs are snapshotted before replacement consultation. After
that await, the current physical groups are re-read and snapshotted before the
first relocation; later addition events dispatch those immutable groups. This
closes both stale-selection and mutable-reference risks identified during
review.

The persisted IR scan found `BT18-096` as the current multi-source
`relocatePermanentsByEffect` consumer. Its public card suite is the relevant
consumer regression; the synthetic replacement cases above prove the shared
adapter contract and do not claim that Guard or Detach applies to the card's
own payment. Other placement producers remain classified in
`digivolution-card-placement.md`.

The inventory can be reproduced without running tests:

```sh
node --input-type=module <<'NODE'
import fs from "node:fs";
const ir = JSON.parse(fs.readFileSync("packages/shared/src/effects/effects.json", "utf8"));
const events = new Set(["wouldLeavePlay", "wouldBeDeleted", "wouldBePlayed", "wouldDigivolve"]);
const counts = new Map();
function walk(value, cardId) {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) return value.forEach((entry) => walk(entry, cardId));
  if (value.kind === "Replacement" && events.has(value.event)) {
    const key = `${value.event}:${value.mode ?? "(implicit action)"}`;
    const bucket = counts.get(key) ?? { occurrences: 0, cards: new Set() };
    bucket.occurrences++;
    bucket.cards.add(cardId);
    counts.set(key, bucket);
  }
  Object.values(value).forEach((entry) => walk(entry, cardId));
}
Object.entries(ir).forEach(([cardId, value]) => walk(value, cardId));
console.table([...counts].sort().map(([shape, bucket]) => ({
  shape, occurrences: bucket.occurrences, cards: bucket.cards.size,
})));
NODE
```

## Delivery gates and baseline comparison

Workspace `pnpm typecheck` passed for shared, API and web. The final correction
focus passed **10 files / 272 tests**; this includes the four new mechanism
cases, BT18-096 and BT17-085 public controls, and audit layout. Scoped Oxlint
and Oxfmt passed after correcting a callback shadow warning. The generated
index remains current for 66 sets (`pnpm audit:index --check`).

The broader command below did **not** pass:

```sh
TEST_MAX_WORKERS=1 TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run \
  src/engine --maxWorkers=1 --no-file-parallelism
```

Current correction: **2 failed / 326 passed files; 3 failed / 7850 passed
tests**, 27.07 seconds. A detached, unchanged checkout of `805400f2c` using
the same installed dependencies and command reproduced all three failures:
the two color-waiver assertions in `mechanic.test.ts` and the unused-color
selection assertion in `effects/interpreter.test.ts`. Baseline totals were
**3 failed / 325 passed files; 4 failed / 7845 passed tests**, 31.61 seconds.
The extra baseline failure was `_kb.meta.test.ts` detecting
`comprehensive-0206` as both cited and not-testable; the current engine run
did not detect that overlap. This order-dependent KB integrity finding is
reserved for the integrity front and cannot earn a green integrity claim.

Fresh official source verification on 2026-09-13 confirmed manual version
4.2, updated 2026-08-18: §15-7-3 disallows partial optional processing
conditions and §15-8-5-1/2 places immediate reactions before removal.
[Official comprehensive manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf).
No KB source refresh or card-score promotion was performed in this correction.

## Remaining validation

Run the root's serialized baseline above, then add only the affected public
consumer files for any newly reproduced seam. Finish with `pnpm typecheck`,
`git diff --check`, and the audit layout/index checks. Do not claim 10/10 or
collection completion from this bounded engine inventory.
