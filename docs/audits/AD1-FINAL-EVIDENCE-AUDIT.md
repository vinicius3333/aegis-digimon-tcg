# AD1 re-audit verification evidence

Audit date: 2026-09-05. Base: `1fd29ef3642054d686bc406b778cad248514bafb`.
Branch: `audit-ad1-20260905`. All commands run from its isolated worktree.
The [plan](../plans/2026-09-05-ad1-audit-design.md),
[baseline](AD1-BASELINE-AUDIT.md), and [recalculated ledger](AD1-AUDIT.md)
define the scope and score. The three Luna reports provide clause-level evidence.

## Behavioral corrections

| Card    | Defect and resulting behavior                                                                                                                | Revert-sensitive test                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| AD1-007 | Both three-card costs now identify the digivolution stack destination and request an independent top/bottom choice for each card.            | `records an independent top-or-bottom choice for each of the three cards`       |
| AD1-013 | The leave replacement only plays a Blue Flare source from this permanent's stack, without introducing DigiXros materials.                    | `does not play an eligible Blue Flare card from another permanent's stack`      |
| AD1-017 | Security Attack -1 and -3000 DP bind to the same single selected Digimon, using one decision.                                                | `applies Security Attack -1 and -3000 DP to selected opposing Digimon`          |
| AD1-020 | The inherited attack grants Security Attack +1 only after a legal attack declaration; refusal and an unable-to-attack host receive no bonus. | `does not leave Security Attack +1 active when a qualifying host cannot attack` |
| AD1-024 | The All Turns watcher observes either player's Digimon play and digivolution.                                                                | `reacts when the opponent plays a Digimon as well as when I play one`           |

The attack-cost implementation adds a callback after declaration and before suspension
and When Attacking effects, within the combat controller's cleanup boundary. It uses
the existing attack legality checks. Controller tests assert callback order and cleanup
on rejection. This is a narrowly supported `GainKeyword` attack-cost path, not a claim
that every action supports an attack cost.

The combined suite exposed a synthetic AD1-002 registration leaking from the combat
failure-path test. That test now restores the production compiled card in `finally`.
Its deliberate `UnsupportedEffectError` log is expected; the regression asserts turn
closure after the rejected attack. The real AD1-002 suite passes in the same process.

The App Fusion implementation already draws a card. The conformance test now proves
the exact draw and corrects a stale comment; no App Fusion engine behavior was changed.

## Revert proof

Each of the five executable card corrections was tested against its pre-audit module
while keeping the final behavioral test. All five old implementations failed at the
intended assertion: missing placement decision (007), another stack's card played
(013), two selection decisions instead of one (017), leaked keyword (020), and missing
opponent-play suspension (024). The corrected versions pass in the final combined run.

Reproduce one comparison without editing the production source:

1. Create a temporary sibling directory `apps/api/src/cards/__ad1_audit_mutants`.
2. Write `git show 1fd29ef36:apps/api/src/cards/AD1/AD1-NNN.ts` to
   `old-NNN.ts` in that directory. Keeping the same directory depth preserves imports.
3. Add `mutant-NNN.test.ts` with the following content, replacing `NNN`:

   ```ts
   import { vi } from "vitest";
   vi.mock("../AD1/AD1-NNN.js", () => import("./old-NNN.js"));
   import "../AD1/AD1-NNN.test.js";
   ```

4. Run `pnpm --filter @aegis/api exec vitest run
src/cards/__ad1_audit_mutants/mutant-NNN.test.ts --maxWorkers=1 -t "TEST TITLE"`
   with the title from the table. Expect the documented assertion failure.
5. Remove only the temporary directory, then run the original focused test and
   `git diff --check`. The audit left no mutant modules in the collection.

## Reproducible gates

```sh
# Catalog, all rulings, errata and restrictions for each of the 25 exact IDs:
for n in $(seq 1 25); do
  node tools/kb/query.mjs card "AD1-$(printf '%03d' "$n")" --json
done

# All card proofs, collection invariants and affected shared mechanisms:
pnpm --filter @aegis/api exec vitest run src/cards/AD1 src/engine/combat src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/capabilities.test.ts src/engine/conformance --maxWorkers=1

# Actual rendered client connected to the real local Colyseus room:
pnpm --filter @aegis/web exec vitest run test/ad1EvolutionStack.scenario.test.tsx --maxWorkers=1

NODE_OPTIONS=--max-old-space-size=2048 pnpm effects:check:set -- --set AD1 --base 1fd29ef36
pnpm --filter @aegis/shared build
pnpm -r --workspace-concurrency=1 typecheck
pnpm lint
git diff --check
```

The combined API gate passed **1,504 tests in 73 files**, including **204 AD1 tests
in 26 files**: 202 card-specific tests and two collection registration gates. The
remaining 1,300 tests cover shared combat, interpreter, primitives, capabilities and
rules conformance. These counts describe executed assertions, not a percentage of all
possible game states. The KB coverage meta-test omits its citation-coverage proxy in
this combined execution; that proxy is not being used to infer rules completeness.

All 25 local KB queries were inspected, containing 85 Q&A entries in total. None
returned an AD1 erratum or restriction. Every module has one `registerIrCard` call,
no `registerCard` call, full compiled coverage and no residual action text.

The UI proof exercises legal ST1-03 Agumon → AD1-001 evolution, observes the paid
two-memory cost through the rendered gauge, and opens the resulting source stack.
Its vanilla base avoids incidental reveal/order decisions. This is representative
UI coverage; the remaining card-specific stacks and trait comparisons are proved
through engine tests as identified in the range reports.

Generated effect synchronization refreshed 25 AD1 records; 21 differed semantically
from the base snapshot, which was stale beyond the five corrected card modules.
No record outside AD1 changed. The set parity check compares generated output with
the current executable card modules and enforces that outside-set boundary.

Luna peer reviews covered the five card corrections, shared attack-cost callback,
DNA and Partition fixtures, and the combat registration cleanup. Review feedback
was incorporated, including a live opposing attack for the AD1-012 DNA redirection
test and single-decision proof for AD1-017. No unresolved functional finding remains. Final peer review additionally required and verified Tai Kamiya/When Digivolving paths for AD1-001, empty-opponent memory gates for AD1-019/022, Ten Warriors hosts for AD1-020/023, and refusal, empty-security, nonmatching-host and once-per-turn replacement boundaries for AD1-023.

The UI gate passed 1/1. Serial shared/API/web typechecks passed after the parallel command was killed by the operating system. Lint passed with 864 warnings, all in files unchanged by this audit, and zero warnings in changed files. The effect-parity build encountered both its 120-second limit and a confirmed ENOSPC failure under host resource pressure; the final retry uses `NODE_OPTIONS=--max-old-space-size=2048` with the same full build and parity check. The full retry passed: 25 records already synchronized and no outside-set changes. Final changed-file formatting and diff checks also passed, as recorded in the ledger. Completion additionally requires committed evidence, a pushed
branch and the Orca collection completion update; test success alone does not close it.
