# EX9 Card Implementation Revalidation

## Current status

**Verification candidate, not delivered or marked complete.**

- Branch: `audit-ex9-card-by-card-20260904`.
- Immutable base: `53616a8e464dacbcb4e73dd31deb043ae59f88e0`.
- Latest local implementation/effects commit: `f054a1a0b`.
- Catalog: 74 contiguous cards, EX9-001..074, each with an IR module and test.
- Exact collection: 77 files / 862 tests passed, exit 0, one worker, 92.86 seconds.
- Dynamic inventory: 850 tests in 74 primary files and 12 complementary tests.
- Affected mechanisms: 8 files / 311 tests passed in 3.46 seconds.
- Shared evolution requirements: 106/106 passed after the exact-name fix.
- Full shared/API/web typecheck passed after the last card module fix; subsequent test-only follow-ups passed API typecheck.
- Shared/API production builds passed during effects verification; web production build passed with chunk/import warnings.
- Independent review of all 34 changed engine files: Ready, 0 Critical / 0 Important / 0 Minor.
- Push, remote verification and coordinator completion notification: pending.

Passing tests are behavioral evidence, not automatic 10/10 fidelity scores.
Final card-review and historical-residual reconciliation remains required.
No later collection is claimed reviewed by this ledger.

## Historical evidence

[EX9-CHECKPOINTS.md](EX9-CHECKPOINTS.md) preserves the preceding ledger verbatim,
including atomic commits, red/green traces, reviewer reports and runtime counts.
Its OPEN/Pending labels and intermediate results describe their historical
checkpoints, not the current gate status above. No historical evidence was discarded.

The coordinator owns shared changes, staging, commits and delivery. Earlier
worker assignments are historical; workers must not stage concurrent files.
The pre-existing EX9-001 comment-only cleanup is preserved and still uncommitted.

## Reproduction

Exact collection:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX9 --no-file-parallelism --pool=forks --maxWorkers=1 --reporter=dot
```

Dynamic inventory without executing test bodies:

```text
pnpm --filter @aegis/api exec vitest list src/cards/EX9 --json --staticParse=false --maxWorkers=1
```

Default static listing returned 663 declarations; it does not expand all
parameterized cases. Dynamic collection returned 862, matching the passing run.
Supplementary files: EX9-074.behavior (7), EX9-074.faceDown (2), EX9.audit (3).

The eight affected regression files, run with the same worker options:

```text
src/engine/actions/assemblySkullGreymon.test.ts
src/engine/combat/advancedKeywords.test.ts
src/engine/combat/retaliationOverflow.test.ts
src/engine/effects/interpreter.test.ts
src/engine/effects/interpreter/actions/play.test.ts
src/engine/effects/interpreter/targeting/colorMatching.test.ts
src/engine/effects/modifiers.test.ts
src/engine/effects/stack.test.ts
```

## Effects and style scope

EX9 sync/check passed for 74 records with 62 semantic changes against the audit
base and zero out-of-set semantic or byte changes at `d1487361b`. One check
attempt timed out in the formatter; the subsequent check passed.

Explicit exception `f054a1a0b` adds only `position: bottom` to BT8-084,
matching the previously delivered module and compiled runtime exactly. Its focused
file passed 4/4. A full-branch effects scope assertion must allow EX9 plus
BT8-084; do not claim zero outside EX9 for the entire branch.

Global effects JSON format checking reports preserved differences in BT25 and
EX12-066/067/068. Formatter range comparison found none in EX9 or BT8-084.
No unrelated formatting rewrite was performed. Changed card/engine files passed
scoped checks during atomic delivery; final whole-diff style reconciliation remains.
Current `git diff --check` passes.

## Latest corrective evidence

- `b79958a97`: Q4785 selects the lowest hidden source above visible sources;
  ordinary absolute-bottom selection remains unchanged. Red/green selector proof.
- `959f43911`: exact Sukamon route, shared recovery limit and real Q4786 order.
- `0376df695`: EX9-004/006 obsolete expectations corrected to the same
  bottom-face-down rule; 11/11 focused. The earlier 860-pass/2-fail collection
  is superseded by the current 862-pass result.
- `94958c0e9`: EX9-042 old-Main-window fixture race corrected; 19/19.
- `700b85713`: EX9-043 payment, refusal and independent routes; 22/22.
- `71d673fa8`, `aefea6919`: EX9-044 real play and shared DNA limit; 18/18.
- `373a8dc88`: EX9-045 normal/DNA routing and leave-play boundaries; 22/22.

## Remaining closeout

1. Reconcile final per-card fidelity evidence and historical residual reports.
   The engine reviewer did not establish multiple physical intrinsic reducer
   copies in hand as an introduced regression and did not claim it resolved.
2. Finish scoped style checks and resolve the preserved comment cleanup.
   This ledger and the complete checkpoint archive are delivered together.
3. Verify clean scope, push the branch and verify its remote hash.
4. Only after all 74 cards have reproducible 10/10 evidence and final gates pass,
   mark the Orca worktree completed and notify the coordinator with collection,
   counts, tests, commit, push result and remaining queue. Remain available.

The persistent full queue is EX9 closeout → EX10 → EX11 → EX12 → LM → Promo →
all ST collections. Recalculate each later group from the catalog when it begins.
EX9 delivery alone does not complete that goal.
