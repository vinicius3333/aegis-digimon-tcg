# EX7-011 §15-7-5 payable `by`-condition mechanism

Serialized engine lane, 2026-09-09. Scope is only the EX7-011 no-legal-payload seam. No git write
was performed.

## Rule and peer basis

EX7-011's `[On Play]` and `[When Digivolving]` text says, in substance, “By placing 1 Option with
the [Three Musketeers] trait from hand or trash as this Digimon's bottom digivolution card, delete
1 opposing Digimon with 6000 DP or less.” The indexed §15-7-5 rule permits executing the optional
processing condition regardless of whether the content after it can be executed.

The committed peer evidence is consistent but intentionally distinguishes activation costs:

- `ch15-02-timing-and-resolution.test.ts` and `interactionAudit.test.ts` cover payable optional
  conditions with empty later content.
- EX10-036 and BT15-009 use the explicit `allowCostWithoutTarget` flag for their ruling-specific
  cost-bearing Delete shapes.
- EX9-010 has the same unflagged optional Delete whose independent cost places a hand card under
  its own host, making it the closest compiled shape peer.
- EX2-051's suspend activation remains a negative control: a no-target Main activation is still
  not declarable. The generic fix must not turn all optional Delete costs into payable no-target
  activations.

## Red reproduction and causal root cause

Before the fix, the EX7-011 focused lane reported:

```text
Test Files  1 passed (1)
Tests  7 passed | 1 expected fail (8)
```

The retained `it.fails` probe had a payable EX7-071 in hand and only a 7000-DP opposing Digimon.
The first intended assertion that was not met was the stack assertion: `[]` was received instead
of `['EX7-071']`. The card's 7-cost was paid, but the independent placement condition was skipped.

The cause was shared, not card IR. In `runAction.ts`, the Delete no-target preflight ran before the
optional prompt and generic cost payment. For a cost-bearing Delete with no candidate target it
returned `action.abortOnDecline === true`; EX7-011 therefore never reached `payCost`. The
declaration-time `canActivateEffect` board-target gate made the same target-only assumption for
this triggered optional shape.

## Narrow generic fix

Added `allowsOptionalProcessingCostWithoutTarget` in
`apps/api/src/engine/effects/interpreter/processingCondition.ts`. It preserves the existing
explicit `allowCostWithoutTarget` escape hatch and infers only this compiled form:

```text
Delete + optional + abortOnDecline
  + place cost to digivolutionStack
  + host self
  + loose source from hand or trash
```

This describes an independent placement processing condition, not the target itself. The shared
predicate is used at both relevant gates:

- `runAction.ts:427-437`: the action can reach optional prompting and generic cost payment even
  when the Delete payload has zero candidates; the Delete handler then safely resolves zero
  targets.
- `effect.ts:822-826`: declaration-time board scanning does not suppress the same payable
  processing condition.

The predicate does not infer permission for suspend, deleteOwn, memory, or other activation-cost
families. Existing target-gating behavior remains for those families; EX2-051's no-target
negative-control test stayed green. No card module, shared IR/catalog, ledger, or RUN file changed.

## Red-to-green proof

The card probe's assertions were preserved and `it.fails` was converted to ordinary `it` only after
the shared fix made it pass. The final public result is:

```text
memory: 10 -> 3
Megadramon stack: ['EX7-071']
EX7-071 in hand: false
opposing battle area: one permanent
opposing permanent DP: 7000
```

The focused mechanism regression in
`apps/api/src/engine/effects/interpreter/processingCondition.test.ts` repeats the same public
path. The final serial runs were:

```text
EX7-011 + mechanism/conformance/interaction suite: 4 files, 65 passed
full engine suite: 226 files, 6,775 passed
```

The full engine process still prints a pre-existing unsupported legacy `ActivateEffect` log for
AD1-002, but the suite is green and this lane added no debug residue.

## Static gates

Oxlint passed for the five changed TypeScript files. Oxfmt check passed for those files, and
`git diff --check` passed. API typecheck initially exposed a concurrent duplicate-property edit
in EX7-014's lane; after that lane corrected its owned fixture, the coordinator reran API typecheck
successfully against the combined worktree.

## Result

The EX7-011 §15-7-5 seam is resolved generically for its independent loose-card placement shape.
The card lane can claim Behavior **2/2** and total **8/10** under the worker brief's delivery-gate
cap. No retained engine gap remains for this seam.
