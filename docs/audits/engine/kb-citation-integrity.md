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
  286 provisional chunks). The complete multi-source refresh is still being
  processed. Import success, reviewed source deltas and citation regressions
  remain required before declaring the committed KB current.

## History

- 2026-09-12: compatible opt-in drift detection and four focused tests added
  from baseline `de4dda717d8c9e0c2420796cb387f68b1379b863`.
