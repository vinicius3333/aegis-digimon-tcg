# BT18 Completed Card Audit

Status: complete — 102/102 cards have reproducible 10/10 evidence.

Audit date: 2026-09-02

This report supersedes `BT18-STATIC-AUDIT.md` and the provisional range reports in
`internal-docs/audits/BT18/`. The earlier files remain as historical review notes.

## Scope and score

- Catalog scope: exactly `BT18-001` through `BT18-102`.
- Production scope: 102 direct TypeScript modules and 102 persisted IR records.
- Registration invariant: every production module has exactly one `registerIrCard(cardId, compiled)` call and no `registerCard` call.
- Runtime contract: every record has `coverage: "full"` and `residual: []`.
- Score model: catalog/rules, IR trace, behavioral proof, peer/stack proof, and delivery gates are each worth 2 points. Every card earned 2/2 in every component.

## Reproducible card evidence

Every card below has a direct focused test at
`apps/api/src/cards/BT18/<card-id>.test.ts`, a direct executable module at
`apps/api/src/cards/BT18/<card-id>.ts`, and a persisted-equality assertion in
`BT18-catalog-sync.test.ts`.

| Cards             | Focused evidence                                                                                                                               | Final score |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| BT18-001–BT18-010 | One focused test file per card, including natural attack, deletion, aura, replacement, evolution, and timing boundaries                        | 10/10 each  |
| BT18-011–BT18-020 | One focused test file per card, including Ten Warriors peers, same-turn reattacks, optional refusal, DNA, DigiXros, and source-scoped watchers | 10/10 each  |
| BT18-021–BT18-030 | One focused test file per card, including Hybrid evolution, inherited stacks, reveal, activation, DigiXros, and leave replacement              | 10/10 each  |
| BT18-031–BT18-040 | One focused test file per card, including public activation, security, ACE, alternate evolution, and exact destination controls                | 10/10 each  |
| BT18-041–BT18-050 | One focused test file per card, including all four DNA color pairs, continuous effects, attack restrictions, and Hybrid routes                 | 10/10 each  |
| BT18-051–BT18-060 | One focused test file per card, including suspension, Royal Base, protection, reduction, reveal, and inherited effects                         | 10/10 each  |
| BT18-061–BT18-070 | One focused test file per card, including Collision, DigiXros, forced attack, stack placement, and controller boundaries                       | 10/10 each  |
| BT18-071–BT18-080 | One focused test file per card, including Blast Digivolve, modal leave effects, attack evolution, deletion, and security flows                 | 10/10 each  |
| BT18-081–BT18-090 | One focused test file per card, including compound Tamer placement, target choice, Collision, breeding, and start-main behavior                | 10/10 each  |
| BT18-091–BT18-100 | One focused test file per card, including Security, Delay, public activation, route choice, Hybrid thresholds, and stack-bound costs           | 10/10 each  |
| BT18-101–BT18-102 | One focused test file per card, including exact Lucemon references, empty-breeding behavior, source-stack scaling, and Blast Digivolve         | 10/10 each  |

## Corrections completed in this pass

- BT18-011 now has a direct Ten Warriors trash-return proof.
- BT18-012 and BT18-014 now prove their inherited once-per-turn boundary with a natural same-turn reattack.
- BT18-015 restricts its optional DNA destination to a hand Digimon with a DNA requirement.
- BT18-017 now proves that its leave replacement can be declined.
- BT18-018 binds its inherited battle-deletion watcher to this Digimon rather than any friendly attacker.
- BT18-019 explicitly returns distinct opponent-trash levels to deck top and its On Deletion payment to deck bottom.
- BT18-033 explicitly returns its Three Great Angels payment to deck bottom.
- BT18-041's catalog and persisted IR now contain the printed DNA header and all four Q2965 material pairs. The web projection now searches every pair instead of only the first.
- BT18-082 restricts the opponent's deletion choice to Digimon or Tamers, excluding battle-area Options.
- BT18-083 has a direct Tamer-negative proof for its all-Digimon Collision aura.
- BT18-100's Delay proof now explicitly selects the printed digivolution route when both printed and alternate routes are legal.

## Typed revalidation

- Removed the TypeScript suppression from all 102 direct BT18 modules. BT18 now has zero
  `@ts-nocheck` directives, zero legacy `registerCard` calls, and zero `RawUnparsed` actions.
- Replaced invalid or stale IR shapes without casts: BT18-034's two timings are separate effects;
  BT18-037 uses the typed security search shape; BT18-042 uses the supported stored-level
  comparison; BT18-070 uses a typed self target; BT18-100 uses the canonical breeding zone; and
  BT18-101 uses the runtime-owned security-trash target.
- Made top-security costs explicit on BT18-036 and BT18-039, and made the controller scope of the
  Tamer branches explicit on BT18-043 and BT18-057.
- Moved BT18-029's per-other-Digimon level-ceiling scaling onto both Return actions and added
  positive and negative level-5 behavioral proof.
- Typed BT18-078's structured static color grant through the shared IR contract.
- Typed BT18-098's self source and added proof that declining its security-trash cost aborts the
  following clause.
- Reconciled an EX11-026 shared regression test left stale by the latest `main` merge: its ordinary
  green level-2 EvoCost is not exposed as an alternate digivolution requirement.
- `packages/shared/src/effects/effects.json` was regenerated with the scoped synchronization tool;
  it was not edited manually.

## Executed gates

- Typed/semantic focused cards: 15 files, 77 tests passed.
- BT18 collection: 108 files, 658 tests passed, one fork, no file parallelism.
- Core mechanisms: 15 files, 637 tests passed, one fork, no file parallelism.
- Primitive mechanisms: 1 file, 138 tests passed, one fork, no file parallelism.
- Pure shared DNA/catalog lookup: 1 file, 103 tests passed.
- Web DNA material projection: 1 file, 80 tests passed.
- Synchronized-array regression tests: 2 files, 7 tests passed.
- Effect-snapshot synchronization tool: 13 tests passed.
- Shared build and shared, API, and web typechecks: passed serially.
- Oxlint: full-repository run passed with existing baseline warnings; all changed TypeScript files
  passed without warnings.
- Oxfmt: all 112 matched changed files passed with one thread.
- `git diff --check`: passed.
- Persisted semantic diff: 67 changed records, all 67 within BT18, with zero semantic or byte
  changes outside the audited set; the subsequent scoped `--check` passed.

All Vitest commands used explicit timeouts, a single fork, and
`--no-file-parallelism`. Builds, synchronization, and workspace typechecks also used explicit
timeouts and ran serially.
