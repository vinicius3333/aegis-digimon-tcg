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

## Proof and gates

`src/engine/conformance/kb-citation-drift.test.ts`: 4/4 focused tests passed.
Tests prove unchanged content acceptance, changed content under the same ID
rejection before citation registration, unknown ID rejection, and legacy
compatibility. The mutation test restores cached text in `finally`.

## Open items

- Pin reviewed citations as each mechanism is audited; most existing citations
  remain unpinned and must not be reported as protected against drift.
- Conformance README updated for opt-in fingerprinting and current serial flags.
- Shared regression passed: 217 files / 3119 tests. API typecheck and scoped formatting passed. Infrastructure delivery commit:
  `d2753b28e`. Reviewed pilot obligations pin both local §15-7 chunks.
- Citation counts still do not establish obligation coverage. Retain honest
  residual reporting until a complete classified denominator exists.

## History

- 2026-09-12: compatible opt-in drift detection and four focused tests added
  from baseline `de4dda717d8c9e0c2420796cb387f68b1379b863`.
