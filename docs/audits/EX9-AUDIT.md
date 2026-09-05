# EX9 Card Implementation Revalidation

## Final verification — 2026-09-05

**74/74 cards reviewed at 10/10, with no unresolved EX9 implementation gap.**
Scores follow catalog/KB clause review and reproducible behavioral evidence, including
negative cases, payment, timing, duration, targeting, optionality and inherited
behavior where applicable. Passing test counts alone do not establish fidelity.

- Branch: `audit-ex9-card-by-card-20260904` (the existing audit worktree).
- Immutable base: `53616a8e464dacbcb4e73dd31deb043ae59f88e0`.
- Catalog: EX9-001 through EX9-074; every card has a direct IR module and colocated test.
- All 74 modules register exclusively through `registerIrCard`.
- Three Luna slices were reconciled; invalid fixtures and
  structural-only proof found during review were replaced before final validation.
- Final EX9 execution: **77 files / 924 tests passed**, 280.52 seconds.
- Dynamic inventory: **924 cases in 77 files**, matching execution exactly.
- Affected mechanisms: **13 files / 504 tests passed**.
- Shared evolution requirements: **106/106 tests passed**.
- Shared/API/web typecheck: **passed**, using serial workspace execution. An earlier
  parallel attempt was killed by the system (exit 137); the serial retry exited 0.
- EX9 effects synchronization/check: all 74 records aligned; shared/API builds passed.
- Scoped Oxfmt: **137 changed TypeScript files passed**. Oxlint: zero errors,
  four existing warnings (two shadowed targets, one `any`, one `_exhaustive`).
- `git diff --check`: clean.
- Independent reviews of the final intrinsic-cost fix and strengthened behavioral
  tests: Ready, no Critical/Important/Minor findings. Earlier shared engine review
  covered all 34 changed engine files; final affected regressions also passed.

## Card-by-card evidence

- [EX9-001–025](EX9-001-025-FINAL.md): 25 cards.
- [EX9-026–050](EX9-026-050-FINAL.md): 25 cards.
- [EX9-051–074](EX9-051-074-FINAL.md): 24 cards.
- [Final dynamic inventory](EX9-FINAL-INVENTORY.md): per-file expanded case counts.
- [EX9-013/020 follow-up](EX9-013-020-FOLLOWUP.md): legal stacks and real combat windows.
- [Intrinsic reduction design and red/green evidence](INTRINSIC-EVO-KEY-DESIGN.md).

The three score tables contain exactly 74 unique contiguous card IDs, all 10/10.
Final review inspected the final implementation and corrected causal evidence
before accepting those tables.

## Final corrective evidence

Eight printed exact-name routes (012, 018, 019, 024, 041, 047, 057, 063) now use
`namesExact`; their direct modules and generated effects agree. Reproduced
substring false positives include Alterous Mode, Sagittarius Mode, MetalMamemon,
RareRaremon and Abbadomon Core. Positive exact-name and other valid routes remain.

Commit `607c9b617` fixes duplicate intrinsic evolution reductions from physical
copies of the same card in hand. Deduplication occurs after predicate matching,
per card ID and compiled action identity, preserving distinct clauses, owner
predicates and registration lifecycles. BT22-076 supplies the red/green reproducer;
EX9-070 proves Q4939 with two physical reducer copies and the correct payment.

Inherited DP, Raid, Jamming, Barrier, Security Attack, attack redirection and
replacement behavior now have stronger proofs using legal evolution stacks,
neutral hosts and actual combat. EX9-013/020 exercise Blast, Alliance, Blocker,
DNA refusal and proper De-Digivolve ordering. EX9-032/033 establish battlefield
costs, effect provenance, optionality, target boundaries and Once Per Turn.
The EX9-032 hand-payment suspicion was an invalid uncommitted fixture; its
speculative module change was reverted. No such defect is claimed.
The obsolete EX9-001 handwritten-registration comment was removed.

## Reproduction

Run from the audit worktree:

```sh
pnpm --filter @aegis/api exec vitest run src/cards/EX9 --no-file-parallelism --pool=forks --maxWorkers=1 --reporter=dot
pnpm --filter @aegis/api exec vitest list src/cards/EX9 --json --staticParse=false --maxWorkers=1
pnpm --filter @aegis/shared exec vitest run src/effects/digivolutionRequirementsFor.test.ts
pnpm effects:check:set -- --set EX9
pnpm -r --workspace-concurrency=1 typecheck
git diff --check
```

Mechanism command:

```sh
pnpm --filter @aegis/api exec vitest run src/engine/actions/assemblySkullGreymon.test.ts src/engine/combat/advancedKeywords.test.ts src/engine/combat/retaliationOverflow.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/interpreter/actions/play.test.ts src/engine/effects/interpreter/targeting/colorMatching.test.ts src/engine/effects/modifiers.test.ts src/engine/effects/stack.test.ts src/engine/effects/primitives.test.ts src/engine/actions/digivolve.test.ts src/engine/cards/costModCluster.test.ts src/cards/BT22/BT22-076.test.ts src/cards/BT8/BT8-084.test.ts --no-file-parallelism --pool=forks --maxWorkers=1 --reporter=dot
```

## Scope and historical record

[EX9-CHECKPOINTS.md](EX9-CHECKPOINTS.md) preserves earlier checkpoints, commits,
red/green traces and reviewer reports. Its pending labels and smaller counts are
historical and superseded by this final ledger. The current request covers EX9
only; references there to later sets do not extend this delivery's scope.

The full branch includes shared engine corrections needed by EX9. The explicit
out-of-set effects exception `f054a1a0b` adds only `position: bottom` to BT8-084,
matching its existing module; its regression passes. Preserved global effects
format differences in BT25 and EX12 were not rewritten. No UI change is included.

Delivery requires atomic commits, a pushed branch with matching remote hash,
a review PR and the Orca completion status. These delivery
receipts are recorded in the PR and Orca card after verification.
