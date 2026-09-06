# BT20 Blast DNA Counter correction

Status: shared mechanism corrected; collection remains incomplete.

## Reproduced defects

BT20-045 accepted a Main-phase DNA declaration despite having no printed ordinary DNA requirement. Its Counter marker was registered as ordinary Blast Digivolve, which evolved a single field Digimon without consuming the required hand partner. `blast-dna-red.log` records those three engine failures alongside two independent fixture failures subsequently corrected.

A second public Counter response could pass the window while the first accepted DNA effect was still resolving. The isolated regression in `blast-counter-reentry-red.log` fails only that assertion (10 passing controls).

## Rules and implementation

The committed comprehensive rules, sections 16-31-1 through 16-31-6, specify one named field Digimon and one named hand card during Counter timing. Section 8-2-2-2 puts the printed left material above the right material. BT20-025/042 name treatment applies to the field source, never a hand card.

The compiled keyword registry now distinguishes Blast DNA from ordinary Blast Digivolve. Counter choices bind the result instance, field permanent and top instance, hand material, and printed material order. The response recomputes live eligibility, including field digivolution restrictions, before the existing mixed-zone DNA primitive consumes the pair. The primitive preserves the selected order, includes both material faces in the announcement, draws once, and creates a fresh unsuspended permanent with DNA effect context. All Counter responses reject reentry while accepted processing is unfinished.

The public Main DNA verb now matches printed DNA requirements and rejects its old Blast waiver flag. Effect-directed DNA retains its existing independent cost procedure. No card IR or generated catalog changed.

## Verification

- `blast-dna-affected-suites.log`: 14 files / 922 tests passed, one worker, including ordinary Blast, combat, DNA effects, primitives and conformance.
- `blast-dna-060-focus.log`: 2 files / 22 tests passed. The mechanism file includes 13 public regressions; BT20-060 verifies the real Counter route and Recovery before zero-DP deletion.
- `blast-dna-typecheck.log`: API typecheck result for this checkpoint.
- Scoped Oxlint, Oxfmt and git diff checks are required before committing.
- Luna A independently reviewed the shared implementation and found no correctness blocker. The additional reentry regression and guard address concurrent responses. An unexpected primitive rejection emits actionRejected and clears the in-flight guard, leaving the open Counter available for a retry or pass.

Per-card reports remain provisional until lead acceptance. This mechanism checkpoint does not certify the whole BT20 collection or satisfy final delivery gates.
