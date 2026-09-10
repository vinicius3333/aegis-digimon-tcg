# EX7-023 Q3844 — source-relative restriction mechanism

Serialized engine lane, 2026-09-09. Scope is exactly EX7-023. No git write was performed.

## Contract

EX7-023's [Opponent's Turn] clause says that none of the opponent's Digimon with as many
or fewer digivolution cards as Hexeblaumon can suspend. Q3844 confirms this is live: with
one source on Hexeblaumon, an opposing one-source Digimon is initially restricted, but
after that Digimon gains a second source during the opponent's turn it can suspend.

## Red reproduction

The pre-fix focused run was **1 file, 7 passed, 1 expected-fail retained red**. The
top-level Q3844 `it.fails` independently reached the initial restriction, legally evolved
the target through the public `digivolve` intent, and then failed the intended public attack
with `illegal-target`. The red was a generic engine seam, not a fixture-direction error.

## Root cause

`runRestrictionAction` resolved the `count: "all"` target filter once and recorded one
restriction per matching permanent. For the continuous [Opponent's Turn] effect, that
captured the target's initial source count. The continuous ledger already supported live
player-scoped predicates, but source-relative `Restrict` did not use that path.

The interpreter normalizes printed `suspend` to effect-facing `beSuspended`. The individual
restriction lookup treated those spellings as equivalent, but the player-scoped lookup
compared them exactly. That second boundary would hide a dynamic `beSuspended` restriction
from combat's `suspend` consumer.

## Narrow generic fix

The interpreter now infers dynamic handling only when all of these hold:

- the action is being resolved in a continuous pass;
- its target count is `all`; and
- its filter contains `digivolutionCardsCompareToSource`.

It then calls the existing `restrictPlayer` primitive with a live
`permanentMatchesFilter(..., ctx.source)` callback. One-shot and finite target restrictions
remain snapshot-based. The ledger's player-scoped read now uses the same
`suspend`/`beSuspended` equivalence set as individual restrictions.

## Mechanism regression

`apps/api/src/engine/cards/ex7HexeblaumonMechanism.test.ts` uses a real EX7-023 source and
public intents. It asserts the one-source target is restricted, adds a second source by
public evolution, observes the restriction reopen, and successfully declares the attack.
It uses the real turn loop and no injected timing.

## Evidence

```text
Mechanism regression: 1/1 passed
Public EX7-023 + mechanism: 2 files, 9/9 passed
Relevant conformance/effect suite: 6 files, 87/87 passed
Full src/engine regression: 262 files, 7304/7304 passed
Workspace typecheck: PASS (shared, web, API)
Oxlint: PASS with no warnings
Oxfmt --check: PASS
git diff --check: PASS
```

The public Q3844 test is now an ordinary green `it`; no assertion was weakened or removed.
