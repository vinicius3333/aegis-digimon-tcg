---
title: Diaboromon token exact-name identity
updated: 2026-09-12
---

# Diaboromon token exact-name identity

Q1033 in the committed [rules KB](../../../data/kb/qa.json) establishes that a
Diaboromon token shares the printed Digimon's name. The synthetic catalog contains
both `TOKEN-Diaboromon` and the legacy display identity `TOKEN-Diaboromon-Token`.
The latter previously failed an exact Diaboromon filter because its display name
includes the token label.

The shared static-name data now grants only that legacy token the exact Diaboromon
alias. Printed bracketed names can use `nameExact` without losing legitimate tokens;
ordinary longer card names retain their existing boundaries. P114's scaling filter
uses that shared name mechanism. No production card receives a legacy registration.

The existing matcher suite was extended with one table covering the two existing
token identities. Before the data correction it passed 14 cases and failed only
the legacy-token case. After the shared rebuild the coordinator independently
passed the matcher and twelve affected Promo suites: 13 files, 50 tests.
Focused Oxlint, Oxfmt and diff checks passed. Collection and closing engine results
are recorded in the [P ledger](../P.md).
