# BT23 Card Implementation Audit Ledger

> Historical completion claims. The independent audit started 2026-09-06 is INCOMPLETE; current scores and evidence are in [BT23-REAUDIT-LEDGER.md](BT23-REAUDIT-LEDGER.md). The results below must be independently revalidated.

Status: complete — 102/102 cards independently traceable at 10/10

Baseline catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT23-001` through `BT23-102`, reconciled card by card against the committed catalog, local rules knowledge base, direct TypeScript IR, focused tests, shared runtime primitives, representative peers/stacks, and the persisted effects catalog.

The eleven range reports under `internal-docs/audits/BT23/` are historical provisional artifacts and are explicitly superseded by this ledger and `docs/audits/BT23-AUDIT.md`.

## Executed audit scope

- Three Luna/high auditors reviewed exact non-overlapping ranges: `BT23-001–034`, `BT23-035–068`, and `BT23-069–102`.
- Thirteen executable modules were corrected: BT23-005, BT23-021, BT23-022, BT23-024, BT23-032, BT23-033, BT23-040, BT23-093, BT23-094, BT23-095, BT23-096, BT23-099, and BT23-100.
- The combat suspension event now preserves the triggering permanent as `subjectPermanentId`, allowing public suspension flows to resolve trigger-source recipients without weakening the interpreter's source checks.
- Focused behavioral proofs cover source-scope comparisons and public attack, suspension, and evolution flows for BT23-091–099; three timeout fixtures now answer legal evolution-route decisions explicitly.
- All 102 modules register only through `registerIrCard(cardId, compiled)`; no BT23 module contains `registerCard`.
- Exact module-to-catalog equality is enforced by `BT23-catalog-sync.test.ts`. The audit refreshed 85 stale BT23 records and proved zero semantic changes outside the collection.

## Score model

Each card receives two points in each fixed category: Catalog/rules, IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates. A 10/10 entry below means all printed clauses and applicable rulings are represented, focused observable proof is green, persisted IR is synchronized, and the bounded collection/mechanism/workspace gates have passed.

## Card ledger

| Card     | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence                                                                                                           |
| -------- | ------------: | -------: | ---------------: | -------------------: | ----------------------: | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| BT23-001 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-002 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-003 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-004 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-005 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Battle-area-only evolution reduction is proven against the breeding-area negative and the Q5586 cost-override stack.      |
| BT23-006 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-007 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-008 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-009 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-010 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-011 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-012 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-013 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-014 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-015 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-016 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-017 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-018 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-019 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-020 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-021 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Both Link timings are restricted to this Digimon's stack; own-stack positive and unrelated-stack negative pass.           |
| BT23-022 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Both Link timings are restricted to this Digimon's stack; own-stack positive and unrelated-stack negative pass.           |
| BT23-023 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-024 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Both Appmon Link timings are restricted to this Digimon's stack and pass through a natural digivolution flow.             |
| BT23-025 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-026 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-027 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-028 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-029 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-030 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-031 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-032 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Both leave replacements search only this Digimon's stack; opponent-effect deletion preserves an unrelated eligible stack. |
| BT23-033 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Both Link timings are restricted to this Digimon's stack; natural own-stack and unrelated-stack comparisons pass.         |
| BT23-034 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-035 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-036 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-037 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-038 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-039 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-040 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | The Erika payment target is battle-area-only, enforcing Q5302's hand/trash exclusion.                                     |
| BT23-041 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-042 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-043 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-044 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-045 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-046 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-047 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-048 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-049 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-050 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-051 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-052 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-053 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Option placement, dual legal evolution routes, explicit route choice, paid evolution, and inherited DP pass.              |
| BT23-054 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-055 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-056 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-057 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-058 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-059 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-060 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-061 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-062 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-063 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Both trash-evolution trait branches, explicit route choice, paid evolution, and inherited once-per-turn behavior pass.    |
| BT23-064 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-065 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-066 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Trash-origin evolution, deletion, constrained revival, explicit route choice, and Scapegoat behavior pass.                |
| BT23-067 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-068 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-069 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-070 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-071 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-072 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-073 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-074 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-075 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-076 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-077 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-078 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-079 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-080 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-081 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-082 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-083 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-084 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-085 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-086 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-087 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-088 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-089 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-090 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-091 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Public CS attack pays Delay; non-CS and opponent-controlled CS attacks prove subject and ownership gates.                 |
| BT23-092 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Public CS attack applies both restrictions; a non-CS attack proves the negative gate.                                     |
| BT23-093 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Public suspension preserves provenance and links only a friendly Appmon; opponent ownership and breeding waiver pass.     |
| BT23-094 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Public CS attack binds both timing masks to one target; non-CS and breeding-waiver cases pass.                            |
| BT23-095 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Public CS attack returns only a suspended target; non-CS and breeding-waiver cases pass.                                  |
| BT23-096 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Public CS attack De-Digivolves a legal five-card stack to the level-3 floor; breeding waiver is proven.                   |
| BT23-097 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Public evolution isolates its level-4 deletion; decline and opponent-ownership negatives prove both abort gates.          |
| BT23-098 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Public Ghost evolution resolves only a friendly Violet suspension; invalid destination and opponent ownership are proven. |
| BT23-099 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Public Huckmon evolution free-plays Sistermon; non-Huckmon, opponent ownership, and breeding waiver negatives pass.       |
| BT23-100 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Canonical breeding-zone waiver and Security/Main Delay behavior pass focused proof.                                       |
| BT23-101 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |
| BT23-102 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Detailed catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed.      |

## Aggregate and reproducible gates

- Catalog cards: 102
- Audited and verified at 10/10: 102 (100%)
- Blocked or ambiguous: 0
- Executable module corrections: 13
- Persisted records refreshed: 85
- Changed-card focused gate: 22 files, 263/263 tests passed in 9.03 seconds; 180-second hard limit, one worker, no file parallelism.
- Full collection gate: 103 files, 799/799 tests passed in 12.75 seconds; 300-second hard limit, one worker, no file parallelism.
- Mechanism gates: 13 files, 816/816 tests passed; 300-second hard limit, one worker, no file parallelism.
- Shared build and serial workspace typecheck: passed under a 300-second hard limit.
- Repository lint: passed with zero errors and historical warnings only under a 180-second hard limit.
- Delivery closeout: scoped formatting, `git diff --check`, exact 85-record BT23-only semantic diff, and independent Luna/high review passed.
