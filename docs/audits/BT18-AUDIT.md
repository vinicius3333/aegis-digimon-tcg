# BT18 Completed Card Audit

Status: complete — 102/102 cards have reproducible 10/10 evidence.

Audit date: 2026-09-01

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

| Cards | Focused evidence | Final score |
| --- | --- | --- |
| BT18-001–BT18-010 | One focused test file per card, including natural attack, deletion, aura, replacement, evolution, and timing boundaries | 10/10 each |
| BT18-011–BT18-020 | One focused test file per card, including Ten Warriors peers, same-turn reattacks, optional refusal, DNA, DigiXros, and source-scoped watchers | 10/10 each |
| BT18-021–BT18-030 | One focused test file per card, including Hybrid evolution, inherited stacks, reveal, activation, DigiXros, and leave replacement | 10/10 each |
| BT18-031–BT18-040 | One focused test file per card, including public activation, security, ACE, alternate evolution, and exact destination controls | 10/10 each |
| BT18-041–BT18-050 | One focused test file per card, including all four DNA color pairs, continuous effects, attack restrictions, and Hybrid routes | 10/10 each |
| BT18-051–BT18-060 | One focused test file per card, including suspension, Royal Base, protection, reduction, reveal, and inherited effects | 10/10 each |
| BT18-061–BT18-070 | One focused test file per card, including Collision, DigiXros, forced attack, stack placement, and controller boundaries | 10/10 each |
| BT18-071–BT18-080 | One focused test file per card, including Blast Digivolve, modal leave effects, attack evolution, deletion, and security flows | 10/10 each |
| BT18-081–BT18-090 | One focused test file per card, including compound Tamer placement, target choice, Collision, breeding, and start-main behavior | 10/10 each |
| BT18-091–BT18-100 | One focused test file per card, including Security, Delay, public activation, route choice, Hybrid thresholds, and stack-bound costs | 10/10 each |
| BT18-101–BT18-102 | One focused test file per card, including exact Lucemon references, empty-breeding behavior, source-stack scaling, and Blast Digivolve | 10/10 each |

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

## Executed gates

- Focused corrections and persisted contract: 12 files, 167 tests passed.
- BT18 collection: 108 files, 656 tests passed, one worker, no file parallelism.
- Core mechanisms: 15 files, 362 tests passed, one worker, no file parallelism.
- Primitive mechanisms: 1 file, 138 tests passed, one worker, no file parallelism.
- Pure shared DNA/catalog lookup: 1 file, 103 tests passed.
- Web DNA material projection: 1 file, 80 tests passed.
- Synchronized-array baseline repair: 2 files, 7 tests passed.
- Shared build and all workspace typechecks: passed serially.
- Oxlint: passed with four pre-existing `no-explicit-any` warnings in `BT18-033.test.ts`.
- Oxfmt check: all 24 changed TypeScript files passed.
- `git diff --check`: passed.
- Persisted semantic diff: 65 changed records, all 65 within BT18, zero outside the audited set.

All Vitest commands used explicit timeouts, `--maxWorkers=1`, and
`--no-file-parallelism`. Builds and workspace typechecks also used explicit
timeouts; workspace typechecks ran with concurrency 1.
