---
title: KB citation integrity audit
updated: 2026-09-12
---

# KB citation integrity audit

## Status

In progress. `cite(id, note?, expectedFingerprint?)` now checks an optional
SHA-256 fingerprint of exact chunk text before recording a citation. Existing
two-argument calls remain compatible and are explicitly unpinned. Citation
diagnostics also retain the calling file. This is source-integrity evidence,
not behavioral rule coverage.

The rule importer now reconciles IDs against the previous index instead of
reusing extraction positions. Unchanged chunks match within their source,
section and title by exact text; unique section/title chunks retain identity
when prose changes so reviewed fingerprints can detect drift. Ambiguous
split/merged chunks and duplicate extraction content fail before committed
documents or the index are replaced. Removed IDs remain reserved in
`retiredIds` across later refreshes. Missing source extraction also fails,
instead of silently dropping that source from the index.

## Proof and gates

`src/engine/conformance/kb-citation-drift.test.ts`: 4/4 focused tests passed.
Tests prove unchanged content acceptance, changed content under the same ID
rejection before citation registration, unknown ID rejection, and legacy
compatibility. The mutation test restores cached text in `finally`.

`tools/kb/reconcile-rule-chunks.test.mjs`: 7/7 passed. Proof covers insertions,
reordering, changed prose, unchanged split chunks, ambiguous merging, permanent
ID retirement, source namespaces, duplicate prior IDs, and duplicate fresh
content with distinct or shared object references. Direct reconciliation of
the existing committed index preserved all 363 chunks exactly. The root
`pnpm test:tools` gate now includes KB tool tests: 26/26 passed. Independent
review reproduced the duplicate-input gap; its correction was re-reviewed
without remaining blockers in this bounded reconciliation change.

## Open items

- Pin reviewed citations as each mechanism is audited; most existing citations
  remain unpinned and must not be reported as protected against drift.
- Conformance README updated for opt-in fingerprinting and current serial flags.
- Shared regression passed: 217 files / 3119 tests. API typecheck and scoped formatting passed. Infrastructure delivery commit:
  `d2753b28e`. Reviewed pilot obligations pin both local §15-7 chunks.
- Citation counts still do not establish obligation coverage. Retain honest
  residual reporting until a complete classified denominator exists.
- Official comprehensive version 4.2 was downloaded and extracted (27559 words,
  286 provisional chunks before fixing history separation). Multi-source refresh
  failed on the removed glossary URL, then on ambiguous illustrated-manual OCR
  chunks. `--source=comprehensive` now updates just the chosen source and records
  `refreshedSources`; the other active source remains explicitly unrefreshed.
  The reviewed glossary is archived and its historical chunks retained.
- Scoped comprehensive import produced 285 comprehensive chunks and 371 total
  chunks. Four reviewed heading-footer artifacts and TOC page numbers no longer
  retire otherwise matching identities. Loop citation `comprehensive-0270` is
  preserved after separating history; its normative text is unchanged after
  whitespace normalization. History-only IDs 0271–0276 retire; the appendix is
  classified from its explicit title and null section, without treating game
  rules as non-testable.
- Baseline inconsistency verified directly: HEAD's prose `comprehensive.md`
  already contains version 4.2, while its indexed title chunk says version 4.0.
  The freshly extracted prose matches baseline exactly after repository
  formatting; this delivery updates the stale indexed source rather than
  changing that already-current prose artifact.
- First source regression: 29 files failed / 1 passed, four failed / 17 passed;
  an unknown seeded TOC ID prevented chapter collection and the processing pin
  correctly detected text drift. After reviewed TOC correction, history
  classification and cost-pin review: 11 files failed / 19 passed, 60 failed /
  338 passed. Remaining retired normative citations require individual review;
  they have not been replaced just to make the suite pass.
- Reviewed §15-7 source changes: the old `126 [Machinedramon]` extraction artifact
  is now `1 [Machinedramon]`, with a trailing page marker; §15-7-5 now renders
  `- 5000 DP` instead of `-5000 DP`. Processing semantics are unchanged. Reviewed
  fingerprints are now `255a54ddb16e8b3afbf5e0e984ade2a3525df85fae97c11e90af762d2932bc0b`
  (0169) and `6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97`
  (0170). Name-reference chunk 0034 retains its prior fingerprint. Cost, Detach
  and citation-drift focused regression: 3 files / 45 tests passed.
- Retired-citation review is now corrected and green for the existing suite.
  The inserted §4-2 Cost shifts the former §4-2–§4-27 topics by one: citations
  0069–0098 now reference 0286–0315, matched by exact topic and new section.
  Source differences include DUAL declaration wording and the token's destination
  before removal; existing tests exercise only their named consequences. They
  do not certify every changed clause or the new cost section.
- Other reviewed mappings: 0057 → 0280 (batch private placement), 0061/0062 →
  0281/0282 (breeding), 0063 → 0283 (battle), 0154 → 0318 (security continuation),
  0203 → 0320 (private searches/numeric effects). The former 0126 mixed chunk
  splits by obligation: permanent identity now cites 0060 §3-4-5; no-draw
  digivolution cites 0125 §8-1-2-8. Burst final stacking cites 0317 §8-3-3-4;
  cost/Tamer procedure remains in 0132. The old Arts-information citation 0050
  was inappropriate for Option declaration; that prerequisite now cites DUAL
  chunk 0289, without claiming the Arts overwrite itself.
- Normative exclusions 0025 (DigiXros/Assembly declaration cost interaction) and
  0269 (immediate overwrite interruption) were removed: missing fixtures or
  implementation cannot make a game rule non-normative. Their full behavioral
  obligations remain open in the engine plan. Genuine revision history and the
  physical marker classification remain separate.
- One edit accidentally removed adjacent loop-fixture helpers with the invalid
  exclusion: 2 failed / 419 passed. The helpers were restored unchanged from
  baseline. Final conformance: 30 files / 421 tests passed.
- Added 64 literal fingerprint arguments for reviewed topic/obligation citations;
  current literal pins total 73 calls over 41 chunks. This is integrity coverage,
  not a behavioral denominator or completion score.
- Affected broad regression: 425 files / 4627 tests passed across conformance,
  combat, effects, engine cards, BT26, EX10, BT14 and audit layout. The expected
  unsupported-effect logger receipt belongs to its negative regression test.
- Current tool gate: 30/30 passed, including malformed/archived CLI source
  rejection. Independent review found no weakened behavioral assertions or
  semantic blocker, with stale narrative references subsequently corrected.
- Oxlint: zero new findings against an isolated HEAD snapshot; the same 23
  pre-existing conformance warnings remain. Final API typecheck passed. Formatter, audit layout
  (4/4), generated index and diff checks passed. Repeated reconciliation preserves
  all 371 current identities and 46 retired IDs; the 67 manual and 19 glossary
  chunks match baseline exactly. Illustrated-manual OCR reconciliation and
  complete mechanism proofs remain open.

## History

- 2026-09-12: compatible opt-in drift detection and four focused tests added
  from baseline `de4dda717d8c9e0c2420796cb387f68b1379b863`.
