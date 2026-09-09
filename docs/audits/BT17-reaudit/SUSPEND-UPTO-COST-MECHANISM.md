# Suspend cost with `upTo`

## Symptom

BT17-041 ShineGreymon: Burst Mode reads "[When Attacking] By suspending up to 2 of
your yellow Tamers, for every Tamer this effect suspended, this Digimon gains
＜Security Attack +1＞for the turn."

With exactly one unsuspended yellow Tamer on board, the effect was never offered:
no decision was raised, nothing was suspended, and the attack checked one security
card instead of two.

## Root cause

`canPayCost` in `apps/api/src/engine/effects/interpreter/costs.ts` decided the
`suspend` branch with

```ts
const required = cost.target?.count === "all" ? candidates.length : (cost.target?.count ?? 1);
return required > 0 && candidates.length >= required;
```

The branch never read `cost.target.upTo`. Every neighbouring cost kind does —
`deleteOwn`, `trash` from security, `return` from trash/hand/multi-zone all branch
on `upTo`. So an "up to 2" cost was judged by the ceiling (2) rather than by "at
least one payable candidate", and one candidate made the whole effect unpayable.

The payment side was already correct: the `suspend` case in `payCost` skips the
exact-count check when `cost.target?.upTo === true`, suspends whatever
`resolvePermanentTargets` returns, and records `out.paidCount` for the
`usePaidCount` scaling on the parent `GainKeyword`. Only the payability gate was
wrong, which is why the effect never reached the decision at all.

## Fix

`canPayCost`, `suspend` branch:

```ts
// "By suspending up to N ..." is payable with any non-zero number of candidates:
// the player chooses how many, and the parent action scales by what was paid.
// A zero-candidate board still leaves nothing to suspend, so the cost fails.
if (cost.target?.upTo === true) return candidates.length > 0;
```

`candidates` already excludes suspended permanents, so "non-zero" means "at least
one Tamer can actually be suspended".

### Why zero candidates stays unpayable

`deleteOwn` returns `true` for `upTo` with zero candidates. `suspend` deliberately
does not. An `upTo` cost that can move no state is an unperformable optional
process (Comprehensive Rules §15-8-4-4-1): returning `true` would raise an
optional prompt whose payment then fails inside `payCost`, aborting the effect one
step later. The existing BT17-041 test "still attacks with no Security Attack bonus
when no yellow Tamer can be suspended" asserts no pending decision is left behind
in that state, and it still passes.

## Evidence

Red (before the change) — the reproducer was kept as `it.fails` and passed as an
expected failure, i.e. the broken behaviour was reproduced:

```
Tests  11 passed | 1 expected fail (12)
```

Green (after the change) — `it.fails` now errors with "Expect test to fail",
proving the behaviour flipped; the single `it.fails` was then changed to `it`:

```
Tests  1 failed | 11 passed (12)     # Error: Expect test to fail
Tests  12 passed (12)                # after flipping it.fails -> it
```

Test stdout at the green run: `SEC 1 1 true` — one security card left (Security
Attack +1 checked two of three), keyword amount 1, yellow Tamer suspended. The red
Tamer stays unsuspended, so the colour gate on the cost target is unaffected.

Runs (all `--maxWorkers=1 --no-file-parallelism`):

- `src/cards/BT17/BT17-041.test.ts` — 12 passed
- `src/engine/effects/cardCapabilities.test.ts` — 8 passed
- `src/engine/effects/interpreter.test.ts` — 210 passed

## Blast radius

`rg` over `apps/api/src/cards` for a `suspend` cost carrying `upTo: true` matches
only `BT17-041.ts` and its test. Every other suspend cost is fixed-count and takes
the unchanged `candidates.length >= required` path, so no card outside BT17 changes
behaviour.

## Re-application note (engine lane E1)

This document was written by an earlier lane, but the `canPayCost` change it
describes was absent from `costs.ts` on `audit-bt17-complete`: only the
neighbouring `upTo` branches (`trash` from hand and security, `deleteOwn`,
`return` from trash and hand) were present, and BT17-041's reproducer was a plain
`it` failing at `expect(s.perm("yellowTamer").isSuspended).toBe(true)`. The
engine change was lost between the lane and this branch; the doc's conclusions
were re-verified and the fix re-applied verbatim.

Re-verification (`--maxWorkers=1 --no-file-parallelism`):

- Red: `Tests 1 failed | 11 passed (12)` — `src/cards/BT17/BT17-041.test.ts:341`,
  `expected false to be true`.
- Green: `Tests 12 passed (12)` after re-applying the `upTo` branch.
- Engine gate (`src/cards/BT17 src/engine/conformance src/engine/combat
  src/engine/effects src/engine/cards`): `Test Files 1 failed | 235 passed (236)`,
  `Tests 1 failed | 3122 passed | 11 expected fail (3134)` — the single failure is
  the known pre-existing BT17-019 timeout.
