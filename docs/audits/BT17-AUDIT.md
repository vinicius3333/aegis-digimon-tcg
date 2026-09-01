# BT17 Completed Card Audit

Status: complete — 102/102 cards have reproducible 10/10 evidence.

Audit date: 2026-09-01

This report supersedes `BT17-STATIC-AUDIT.md` and the provisional range reports
in `internal-docs/audits/BT17/`. The earlier files remain as historical review
notes.

## Scope and score

- Catalog scope: exactly `BT17-001` through `BT17-102`.
- Production scope: 102 direct TypeScript modules and 102 persisted IR records.
- Registration invariant: every production module has exactly one
  `registerIrCard(cardId, compiled)` call and no `registerCard` call.
- Runtime contract: every record has `coverage: "full"` and `residual: []`.
- Score model: catalog/rules, IR trace, behavioral proof, peer/stack proof, and
  delivery gates are each worth 2 points. Every card earned 2/2 in every
  component.

## Reproducible card evidence

Every card below has a direct focused test at
`apps/api/src/cards/BT17/<card-id>.test.ts`, a direct executable module at
`apps/api/src/cards/BT17/<card-id>.ts`, and a persisted-equality assertion in
`BT17-catalog-sync.test.ts`.

| Cards | Focused evidence | Final score |
| --- | --- | --- |
| BT17-001–BT17-010 | Natural attack, deletion, source-zone, Tamer-placement, DNA, recovery, reveal, and inherited-stack boundaries | 10/10 each |
| BT17-011–BT17-020 | Named-Tamer evolution, Raid, stack-host effects, modal play, Blast Digivolve, DigiXros, and inherited DNA | 10/10 each |
| BT17-021–BT17-030 | Hybrid routes, effect-play binding, hand activation, security movement, Tamer suspension, and start-main branches | 10/10 each |
| BT17-031–BT17-040 | Option filters, security-trash timing, leave replacement, exact-three branches, later entrants, and inherited effects | 10/10 each |
| BT17-041–BT17-050 | Free Tamer play, reveal, effect-play watchers, Alliance, linked hosts, and hand activation | 10/10 each |
| BT17-051–BT17-060 | Live restrictions, Collision, redirection, leave protection, stack placement, tokens, and trash-cost reduction | 10/10 each |
| BT17-061–BT17-070 | Retaliation, attack evolution, no-source targeting, replacement evolution, memory thresholds, and deck routing | 10/10 each |
| BT17-071–BT17-080 | Exact stack names, Eosmon redirection, non-DNA branches, DNA, Security, and end-turn flows | 10/10 each |
| BT17-081–BT17-090 | Provenance gates, self-bound costs, recovery locality, selected-host grants, Mind Link, and end-turn conditions | 10/10 each |
| BT17-091–BT17-100 | Mind Link, live auras, Delay, synchronous leave replacement, Trash DNA, stack-bottom placement, and win conditions | 10/10 each |
| BT17-101–BT17-102 | Natural Trash-origin DNA, opponent-seat memory, exclusive play/hatch choice, alternate evolution, and inherited DP | 10/10 each |

## Corrections completed in this pass

- BT17-011 and BT17-012 now expose their named-Takuya alternate evolution route
  through the runtime's Tamer-base contract.
- BT17-025 binds its delayed return only to Digimon played by an effect.
- BT17-040 applies the opponent-wide Security Attack reduction to Digimon that
  enter after the continuous effect starts. The shared grant path now tracks
  permanent identity instead of the current top-card identity.
- BT17-095 now implements Delay as the printed all-turns, non-battle
  leave-replacement window. The synchronous replacement path validates and
  performs a legal Omnimon DNA digivolution before the leaving material is
  removed, consuming the Option only when the DNA action can proceed.
- The shared DNA preflight now supports pinned trigger subjects, loose hand
  materials, distinct results, and full requirement legality.
- BT17-100 places the selected card at the bottom of the digivolution stack.
- BT17-101 now has natural behavioral proof for Trash-origin DNA and
  opponent-seat memory loss.
- BT17-102 presents play and hatch as one optional, exclusive modal choice. The
  shared modal preflight now hides a `PlayWithoutCost` branch when it has no
  eligible loose-card target.
- The persisted BT17 catalog was recalculated automatically from the executable
  compiled IR: exactly 87 BT17 records changed both textually and semantically,
  and zero records outside BT17 changed.

## Executed gates

- Focused corrected-card suite: 8 files, 52 tests passed.
- BT17-095 natural replacement suite: 8 tests passed.
- Persisted catalog contract: 104 tests passed.
- BT17 collection: 109 files, 674 tests passed, one worker, no file parallelism.
- Core mechanisms: 5 files, 537 tests passed, one worker, no file parallelism.
- Primitive and fire-site mechanisms: 201 tests passed, one worker, no file
  parallelism.
- Shared catalog and DNA mechanisms: 116 tests passed.
- Web DNA/digivolution projection: 6 tests passed.
- Synchronized-array and later-entrant regression suite: 14 tests passed.
- Shared and API builds passed with explicit 180-second limits.
- Workspace typechecks passed serially with an explicit 300-second limit.
- Oxlint and Oxfmt checks passed on the changed TypeScript files.
- `git diff --check` passed.
- Persisted semantic diff: 87 changed records, all 87 within BT17, zero outside
  the audited set.

All Vitest commands used explicit timeouts, `--maxWorkers=1`, and
`--no-file-parallelism`. Builds and workspace typechecks also used explicit
timeouts; workspace typechecks ran with concurrency 1.
