# BT22 Card Implementation Audit Ledger

> Historical ledger. The independent audit started on 2026-09-06 is incomplete;
> see [BT22-reaudit/PLAN.md](BT22-reaudit/PLAN.md) and
> [BT22-reaudit/ledger.json](BT22-reaudit/ledger.json) for current evidence.

Status: complete — 102/102 cards independently traceable at 10/10

Baseline catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT22-001` through `BT22-102`, reconciled card by card against the committed catalog, local rules knowledge base, direct TypeScript IR, focused behavioral tests, shared runtime primitives, representative peers/stacks, and the persisted effects catalog.

The eleven range reports under `internal-docs/audits/BT22/` are historical provisional artifacts and are explicitly superseded by this ledger and `docs/audits/BT22-AUDIT.md`.

## Executed audit scope

- Three Luna/high auditors reviewed exact non-overlapping ranges, followed by independent cross-range challenge reviews and a final production-diff review.
- Thirteen executable card modules were corrected: BT22-001, BT22-004, BT22-015, BT22-019, BT22-022, BT22-027, BT22-038, BT22-041, BT22-043, BT22-044, BT22-081, BT22-082, and BT22-090.
- Effect-driven digivolution now filters level-less bases through printed alternate or base-granted requirements before presenting destinations. Synthetic BT19/BT25 test definitions were made explicit and remain green; no persisted records outside BT22 are resynchronized by this audit.
- Public attack, play, evolution, Link, App Fusion, Overclock, Delay, Security, source-placement, deletion, leave-replacement, and optional-decline flows replace or augment provisional structural evidence where the engine exposes a player-facing route.
- Production seams remain only where no player-facing intent exists, such as App Fusion execution, face-down source setup, and direct opponent-effect deletion; their mechanism coverage is bounded and reproducible.
- All 102 modules register only through `registerIrCard(cardId, compiled)`; no BT22 module contains a legacy `registerCard` registration.
- Exact module-to-catalog equality is enforced by `BT22-catalog-sync.test.ts`. The audit refreshed 93 stale BT22 records and proved zero semantic changes outside the collection in the branch diff against `main`; pre-existing persisted drift in other collections remains outside this audit.

## Score model

Each card receives two points in each fixed category: Catalog/rules, IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates. A 10/10 entry means all printed clauses and applicable rulings are represented, focused observable proof is green, persisted IR is synchronized, and the bounded collection/mechanism/workspace gates have passed.

## Card ledger

| Card     | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence                                                                                             |
| -------- | ------------: | -------: | ---------------: | -------------------: | ----------------------: | ------ | ----------------------------------------------------------------------------------------------------------- |
| BT22-001 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Aqua/Sea Animal stack watcher now requires a Digimon card and proves the non-Digimon boundary.              |
| BT22-002 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-003 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-004 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | CS stack watcher now requires a Digimon card; both legal evolution routes settle deterministically.         |
| BT22-005 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-006 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-007 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-008 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-009 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-010 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-011 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-012 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-013 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-014 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-015 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Both Decode clauses are bound to Omnimon's own stack and preserve an eligible decoy stack.                  |
| BT22-016 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-017 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-018 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-019 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Inherited leave protection requires the live carrier to have Veedramon in its name.                         |
| BT22-020 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-021 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-022 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Inherited Veedramon protection is bound to the carrying Digimon, with an unrelated-host negative.           |
| BT22-023 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-024 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-025 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-026 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-027 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Added-source watcher requires effect provenance and rejects manual stack placement.                         |
| BT22-028 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-029 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-030 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-031 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-032 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-033 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-034 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-035 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-036 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-037 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-038 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-039 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-040 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-041 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Play-cost replacement is explicitly self-scoped and does not reduce another card.                           |
| BT22-042 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-043 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | CS added-source watcher requires a Digimon card and rejects a CS Tamer.                                     |
| BT22-044 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | CS added-source watcher requires a Digimon card and rejects a CS Tamer.                                     |
| BT22-045 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-046 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-047 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-048 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-049 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-050 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-051 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-052 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-053 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-054 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-055 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-056 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-057 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-058 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-059 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-060 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-061 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-062 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-063 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-064 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-065 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-066 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-067 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-068 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-069 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-070 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-071 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-072 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-073 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-074 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-075 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-076 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-077 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-078 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-079 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-080 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-081 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Leave replacement can play Yuuko only from this Eater's stack; a decoy stack is preserved.                  |
| BT22-082 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Leave replacement can play Arata only from this Eater's stack and coexists with Arata's redirect.           |
| BT22-083 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-084 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-085 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-086 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-087 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-088 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-089 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-090 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Level-less Tamer evolution now offers only destinations with a legal alternate/base-granted route.          |
| BT22-091 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-092 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-093 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-094 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-095 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-096 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-097 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-098 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-099 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-100 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-101 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |
| BT22-102 |           2/2 |      2/2 |              2/2 |                  2/2 |                     2/2 | 10/10  | Catalog/KB, executable IR, focused behavior, peer/stack, persistence, and bounded delivery evidence passed. |

## Aggregate and reproducible gates

- Catalog cards: 102
- Audited and verified at 10/10: 102 (100%)
- Blocked or ambiguous: 0
- Type safety: 94 stale `@ts-nocheck` directives removed; zero remain in BT22 production modules; API typecheck passed.
- Executable card-module corrections: 13
- Persisted records refreshed: 93; semantic changes outside BT22: 0
- Full collection gate after reconciling current `main` and removing suppressions: 103 files, 565/565 tests passed in 13.43 seconds; 300-second hard limit, one fork, no file parallelism.
- Mechanism/state gate: 11 files, 467/467 tests passed in isolated processes; 120-second hard limit per file, one fork, no file parallelism. The resolution seam also passed 7/7 focused tests.
- Serial workspace typecheck: shared, API, and web passed under a 300-second hard limit.
- Repository lint: passed with zero errors and historical warnings only under a 180-second hard limit.
- Delivery closeout: scoped formatting, `git diff --check`, exact registration/keyset checks, and independent Luna/high production review passed.
- Current-main reconciliation: 102 valid per-card KB queries; all 94 suppressions removed; scoped generation/check synchronized all 102 BT22 records (93 semantic changes, zero semantic or byte changes outside BT22); eleven affected mechanism/state files passed 467/467 in isolated processes; generator tests passed 13/13; API typecheck passed.
