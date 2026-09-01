# BT21 Card Implementation Audit Ledger

Status: complete — 102/102 cards independently traceable at 10/10

Baseline catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT21-001` through `BT21-102`, reconciled card by card against the committed catalog, local rules knowledge base, direct TypeScript IR, focused behavioral tests, shared runtime primitives, representative peers and stacks, and the persisted effects catalog.

The eleven range reports under `internal-docs/audits/BT21/` and the prior internal collection ledger are historical artifacts and are explicitly superseded by this ledger and `docs/audits/BT21-AUDIT.md`.

## Executed audit scope

- Three Luna/high auditors reviewed non-overlapping ranges; one Luna/high challenge review then targeted the prior manual-proof gaps and the final production diff.
- BT21-093 and BT21-097 received executable IR corrections; BT21-013, BT21-021, BT21-076, BT21-093, and BT21-097 received stronger public behavioral proof.
- All 102 modules register only through `registerIrCard(cardId, compiled)`; no BT21 production module contains a legacy `registerCard` registration.
- Exact module-to-catalog equality is enforced by `BT21-catalog-sync.test.ts`. The audit refreshed 85 BT21 records and proved zero semantic changes outside the collection.
- Tests were run only by the coordinator, serially with one worker, no file parallelism, and explicit hard timeouts.

## Score model

Each card receives two points in each fixed category: Catalog/rules, IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates. A 10/10 entry means all printed clauses and applicable rulings are represented, focused observable proof is green, persisted IR is synchronized, and the bounded collection, mechanism, type, style, and diff gates have passed.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT21-001 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-002 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-003 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-004 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-005 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-006 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-007 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-008 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-009 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-010 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-011 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-012 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-013 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Public attack evolution now answers the legal route choice and verifies AD1-003 plus exact memory. |
| BT21-014 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-015 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-016 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-017 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-018 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-019 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-020 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-021 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Q4530 public End of Attack flow proves that an eligible Tamer is playable before OmniShoutmon deletes and saves itself. |
| BT21-022 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-023 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-024 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-025 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-026 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-027 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-028 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-029 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-030 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-031 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-032 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-033 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-034 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-035 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-036 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-037 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-038 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-039 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-040 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-041 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-042 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-043 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-044 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-045 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-046 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-047 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-048 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-049 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-050 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-051 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-052 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-053 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-054 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-055 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-056 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-057 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-058 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-059 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-060 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-061 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-062 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-063 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-064 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-065 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-066 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-067 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-068 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-069 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-070 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-071 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-072 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-073 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-074 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-075 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-076 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Attack-driven evolution fixtures now answer the legal printed/alternate route choice without masking either route. |
| BT21-077 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-078 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-079 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-080 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-081 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-082 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-083 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-084 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-085 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-086 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-087 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-088 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-089 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-090 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-091 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-092 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-093 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Opponent-security watcher, armed Main Delay routing, and Reptile/Dragonkin host/destination filters are publicly proven. |
| BT21-094 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-095 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-096 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-097 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Q4621 Link-capable material and explicit friendly-Digimon recipient are enforced by a public End of Turn Delay flow. |
| BT21-098 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-099 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-100 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-101 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT21-102 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 10/10 | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |

## Aggregate and reproducible gates

- Catalog cards: 102
- Audited and verified at 10/10: 102 (100%)
- Blocked or ambiguous: 0
- Executable card-module corrections in this closeout: 2
- Persisted records changed semantically: 85; semantic changes outside BT21: 0
- Full collection gate: 103 files, 837/837 tests passed in 13.22 seconds; 300-second hard limit, one worker, no file parallelism.
- Mechanism gate: 13 files, 614/614 tests passed in 10.51 seconds; 300-second hard limit, one worker, no file parallelism.
- State-sync gate: 2 files, 7/7 tests passed in 3.10 seconds; 120-second hard limit, one worker, no file parallelism.
- Serial workspace typecheck: shared, API, and web passed under a 300-second hard limit with workspace concurrency 1.
- Repository lint: passed with zero errors and historical warnings only under a 180-second hard limit.
- Delivery closeout: scoped formatting, `git diff --check`, exact registration/keyset checks, and final Luna/high review passed.
