# EX12 Versioned Audit Ledger Design

Date: 2026-08-27

## Context and decision

The EX12 collection already had an executable audit proving catalog completeness, direct module and focused-test presence, exclusive compiled-IR registration, full runtime coverage, empty residuals, and absence of `RawUnparsed` nodes. The 77 focused suites also passed as a collection. That evidence supported implementation completeness, but the repository did not persist the individual 10/10 judgments that were reported during closeout. A passing collection test therefore could not answer which cards were explicitly scored or whether a later catalog addition had been added to the stated 100% total.

The selected design adds `apps/api/src/cards/EX12/AUDIT.md` as a human-readable, versioned ledger. It follows the repository's existing BT10/BT20 audit-document convention and gives every committed EX12 card five explicit 2/2 component scores: contract/rules, IR trace, behavioral proof, peer/stack proof, and delivery gates. Each row links to the card's direct module and colocated behavioral test. The ledger states the aggregate as 77/77 cards at 10/10 and explains exactly what each component means.

## Enforcement and verification

`EX12.audit.test.ts` reads the ledger as part of the normal collection audit. It derives the authoritative ordered card list and English names from the committed catalog, parses only card rows, and requires one exact row per catalog card. For every row it checks the card ID, catalog name, all five `2/2` component values, final `10/10`, and canonical links to the module and test. It also checks the explicit aggregate statement.

This makes documentation drift fail loudly: a missing, duplicated, renamed, newly added, partially scored, or incorrectly linked card breaks the executable audit. Semantic correctness still comes from the card-specific tests and code review; the ledger is intentionally not treated as a substitute for behavioral proof. Verification runs the updated audit test first, then the shared mechanism/audit gate, all 77 focused suites, typecheck, formatting/lint checks, and `git diff --check` before the branch is republished and its Orca completion notice is refreshed.
