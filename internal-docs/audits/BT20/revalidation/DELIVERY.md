# BT20 audit delivery

All 102 catalog cards have independently reviewed 10/10 behavioral evidence: 1020/1020 points, mean 10/10, 100% verified. Reproduce the score with `node internal-docs/audits/BT20/revalidation/recalculate.mjs`. The calculator checks each accepted module, colocated test, Markdown report and JSON report against its SHA-256 hash. Historical scores contribute no points.

The implementation, per-card proofs and validation artifacts are delivered in atomic commits through pushed commit `6cc6c17b0` on `audit-bt20-astra-luna`. [PR 4721](https://github.com/vinicius3333/aegis-digimon-tcg/pull/4721) is the review entry point. The acceptance and score records are a subsequent closeout commit on the same branch.

## Validation

- 968/968 full BT20 and new mechanism tests pass, including all 102 colocated card modules and collection/catalog contracts.
- 465/465 affected mechanism tests and 8/8 affected BT22 source-play tests pass. Earlier affected mechanism regressions remain recorded with their delivering commits.
- Shared/API/web typecheck and the final API check pass.
- Set-scoped BT20 effects sync/check verifies all 102 records.
- Changed-file Oxlint and Oxfmt checks pass; Oxlint reports five non-blocking conditional-expect warnings in parameterized test assertions, recorded verbatim.
- `git diff --check` passes.
- Runtime-disabled card behavior produces meaningful state assertion failures; every mutation is restored. Engine and IR defect reproductions preserve the original failures and corrected passing runs.

Exact commands and outputs are in [round5-gates.json](round5-gates.json), the linked result/log files, and each per-card report. The final collection run renews the 43 previously accepted, unchanged proofs as well as the remaining 59 independently reviewed cards.

## Scope and review

Astra owned integration, shared engine changes, generated catalogs and delivery. Three explicitly delegated Luna lanes audited non-overlapping cards and supplied implementation/test work. Final review corrected public cost, choice, timing, trait, inherited, security, duration, legal-stack and negative-path evidence before acceptance. No audited production BT20 module uses a second handwritten registration.

The final fixes include selecting an own-stack play source, offering Omekamon activation before its suspension cost, exposing Black Sabbath's Trash/Main activation and paying its full six-memory/return cost. Earlier commits correct shared timing, evolution, targeting, optional-cost, source-identity and continuous-effect gaps described in the per-card reports.

No BT20 ambiguity or unsupported clause remains accepted. This is not a claim that every unrelated repository test passes: the BT22-007 standalone zero-DP On Play fixture fails under both old and new source-play code, while its eight affected source mechanisms pass. The separate legacy P-176 paid-evolution limitation remains outside BT20; legal paid peer routes are used. These limits are recorded in the gate evidence.

## Authorized integration into main

The user subsequently authorized merging PR4721. Main at `9bb623a88` is integrated in merge commit `2884e3097`; evidence is pushed through `822e75a9f`. The renewed gates pass 969 collection, 473 mechanism and 180 shared DNA tests, full workspace/final API typecheck, scoped catalog and style/diff checks. Four card proofs were reviewed and renewed; the other 98 artifact sets are unchanged. See [MERGE-MAIN.md](MERGE-MAIN.md) for the corrected DNA expectations and [merge-main-gates.json](merge-main-gates.json) for exact commands/results. These gates supersede the earlier snapshot above.
