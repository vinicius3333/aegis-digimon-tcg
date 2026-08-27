# BT3 Card Implementation Audit

Status: in progress

Catalog snapshot: `ef2e5b367c616299806c87d6b078ce6fc2822b78`

Authoritative scope: 112 cards, `BT3-001` through `BT3-112`, derived from `packages/shared/src/cards/data/cards.json`.

This ledger follows the repository's `verify-card-implementation` protocol and the chronological execution plan in `docs/plans/2026-08-27-bt-card-by-card-audit.md`. File presence, full IR metadata, generated snapshots, and existing tests are evidence inputs rather than proof of fidelity.

## Current execution state

The initial pass intentionally does not execute tests, typecheck, lint, formatting, or `git diff --check`, at the user's request. Workers may correct implementation gaps and strengthen tests, but every inspected card remains provisional and no collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT3-001–010 | Luna in progress | `internal-docs/audits/BT3/BT3-001-010.md` | No |
| BT3-011–020 | Static audit integrated | `internal-docs/audits/BT3/BT3-011-020.md` | Yes |
| BT3-021–030 | Luna in progress | `internal-docs/audits/BT3/BT3-021-030.md` | No |
| BT3-031–040 | Luna in progress | `internal-docs/audits/BT3/BT3-031-040.md` | No |
| BT3-041–050 | Queued | `internal-docs/audits/BT3/BT3-041-050.md` | No |
| BT3-051–060 | Queued | `internal-docs/audits/BT3/BT3-051-060.md` | No |
| BT3-061–070 | Queued | `internal-docs/audits/BT3/BT3-061-070.md` | No |
| BT3-071–080 | Queued | `internal-docs/audits/BT3/BT3-071-080.md` | No |
| BT3-081–090 | Queued | `internal-docs/audits/BT3/BT3-081-090.md` | No |
| BT3-091–100 | Queued | `internal-docs/audits/BT3/BT3-091-100.md` | No |
| BT3-101–110 | Queued | `internal-docs/audits/BT3/BT3-101-110.md` | No |
| BT3-111–112 | Queued | `internal-docs/audits/BT3/BT3-111-112.md` | No |

## Score model

Each card is scored across five 2-point components:

1. **Catalog and rules (0–2):** complete identity, printed contract, local KB, rulings, errata, restrictions, and ambiguities.
2. **IR trace (0–2):** every clause maps to direct compiled IR and real shared primitives, with exclusive `registerIrCard` registration.
3. **Behavioral proof (0–2):** positive, negative, boundary, optionality, cost, zones, duration, Security, and once-per-turn cases as applicable.
4. **Peer and stack proof (0–2):** relevant comparative trait/name/color cases and realistic evolution-stack behavior.
5. **Executed delivery gates (0–2):** focused/mechanism/collection tests, typecheck, repository quality gate, and `git diff --check` have passed on the delivered commit.

A provisional static audit can earn at most 8/10 because component 5 requires executed evidence. Unsupported or ambiguous behavior may reduce any other component and is never rounded up.

## Card ledger

| Card | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT3-011 Greymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Security play to end-of-battle watcher; focused and aggregate static proof |
| BT3-012 Aquilamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Full inherited delete IR and legal-stack focused proof |
| BT3-013 Duramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Full inherited level-7 aura IR and corrected legal-stack proof |
| BT3-014 Silphymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Authoritative direct SetBaseDP/color IR and focused boundary proof |
| BT3-015 MetalGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Full Piercing/optional return IR and legal-stack proof |
| BT3-016 Durandamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Full inherited Piercing IR and corrected legal-stack proof |
| BT3-017 Valkyrimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Full dual-trigger delete IR and threshold proof |
| BT3-018 BlitzGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Full Piercing/De-Digivolve IR and stack proof |
| BT3-019 RagnaLoardmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Authoritative direct keyword/PlaceUnder IR and optionality proof |
| BT3-020 Patamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Catalog-defined vanilla card with empty full-coverage snapshot |

Detailed clause traces and deferred commands will be recorded in the integrated range reports under `internal-docs/audits/BT3/`.

## Aggregate

- Catalog cards: 112
- Assigned: 40
- Integrated card audits: 10
- Corrected: 1
- Provisional: 10
- Verified 10/10: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 72

BT3 remains open.
