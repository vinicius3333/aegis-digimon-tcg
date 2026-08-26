# BT5 collection audit ledger

Base: origin/main at d3c2191b04cf35c4e926fa391d224a5e1398fd46.

## Method

For every card, the audit reads its committed catalog record and local KB query, maps printed clauses to the direct compiled-IR module, verifies exclusive registerIrCard registration, follows shared interpreter actions, reviews the colocated behavioral proof and relevant peer/evolution-stack fixtures, and runs that card's test file in isolation (one fork, no file parallelism). A missing KB entry is explicitly recorded by its query output rather than assumed to be a ruling.

The final collection gate runs only after all individual serial proofs. Detailed evidence is reproducible from the catalog, node tools/kb/query.mjs card <ID>, direct module, and named test.

## Inventory and evidence index

| Card | Catalog / KB / IR / peers | Behavioral proof |
| --- | --- | --- |
| BT5-001 | catalog + KB query + src/cards/BT5/BT5-001.ts (IR-only) | src/cards/BT5/BT5-001.test.ts |
| BT5-002 | catalog + KB query + src/cards/BT5/BT5-002.ts (IR-only) | src/cards/BT5/BT5-002.test.ts |
| BT5-003 | catalog + KB query + src/cards/BT5/BT5-003.ts (IR-only) | src/cards/BT5/BT5-003.test.ts |
| BT5-004 | catalog + KB query + src/cards/BT5/BT5-004.ts (IR-only) | src/cards/BT5/BT5-004.test.ts |
| BT5-005 | catalog + KB query + src/cards/BT5/BT5-005.ts (IR-only) | src/cards/BT5/BT5-005.test.ts |
| BT5-006 | catalog + KB query + src/cards/BT5/BT5-006.ts (IR-only) | src/cards/BT5/BT5-006.test.ts |
| BT5-007 | catalog + KB query + src/cards/BT5/BT5-007.ts (IR-only) | src/cards/BT5/BT5-007.test.ts |
| BT5-008 | catalog + KB query + src/cards/BT5/BT5-008.ts (IR-only) | src/cards/BT5/BT5-008.test.ts |
| BT5-009 | catalog + KB query + src/cards/BT5/BT5-009.ts (IR-only) | src/cards/BT5/BT5-009.test.ts |
| BT5-010 | catalog + KB query + src/cards/BT5/BT5-010.ts (IR-only) | src/cards/BT5/BT5-010.test.ts |
| BT5-011 | catalog + KB query + src/cards/BT5/BT5-011.ts (IR-only) | src/cards/BT5/BT5-011.test.ts |
| BT5-012 | catalog + KB query + src/cards/BT5/BT5-012.ts (IR-only) | src/cards/BT5/BT5-012.test.ts |
| BT5-013 | catalog + KB query + src/cards/BT5/BT5-013.ts (IR-only) | src/cards/BT5/BT5-013.test.ts |
| BT5-014 | catalog + KB query + src/cards/BT5/BT5-014.ts (IR-only) | src/cards/BT5/BT5-014.test.ts |
| BT5-015 | catalog + KB query + src/cards/BT5/BT5-015.ts (IR-only) | src/cards/BT5/BT5-015.test.ts |
| BT5-016 | catalog + KB query + src/cards/BT5/BT5-016.ts (IR-only) | src/cards/BT5/BT5-016.test.ts |
| BT5-017 | catalog + KB query + src/cards/BT5/BT5-017.ts (IR-only) | src/cards/BT5/BT5-017.test.ts |
| BT5-018 | catalog + KB query + src/cards/BT5/BT5-018.ts (IR-only) | src/cards/BT5/BT5-018.test.ts |
| BT5-019 | catalog + KB query + src/cards/BT5/BT5-019.ts (IR-only) | src/cards/BT5/BT5-019.test.ts |
| BT5-020 | catalog + KB query + src/cards/BT5/BT5-020.ts (IR-only) | src/cards/BT5/BT5-020.test.ts |
| BT5-021 | catalog + KB query + src/cards/BT5/BT5-021.ts (IR-only) | src/cards/BT5/BT5-021.test.ts |
| BT5-022 | catalog + KB query + src/cards/BT5/BT5-022.ts (IR-only) | src/cards/BT5/BT5-022.test.ts |
| BT5-023 | catalog + KB query + src/cards/BT5/BT5-023.ts (IR-only) | src/cards/BT5/BT5-023.test.ts |
| BT5-024 | catalog + KB query + src/cards/BT5/BT5-024.ts (IR-only) | src/cards/BT5/BT5-024.test.ts |
| BT5-025 | catalog + KB query + src/cards/BT5/BT5-025.ts (IR-only) | src/cards/BT5/BT5-025.test.ts |
| BT5-026 | catalog + KB query + src/cards/BT5/BT5-026.ts (IR-only) | src/cards/BT5/BT5-026.test.ts |
| BT5-027 | catalog + KB query + src/cards/BT5/BT5-027.ts (IR-only) | src/cards/BT5/BT5-027.test.ts |
| BT5-028 | catalog + KB query + src/cards/BT5/BT5-028.ts (IR-only) | src/cards/BT5/BT5-028.test.ts |
| BT5-029 | catalog + KB query + src/cards/BT5/BT5-029.ts (IR-only) | src/cards/BT5/BT5-029.test.ts |
| BT5-030 | catalog + KB query + src/cards/BT5/BT5-030.ts (IR-only) | src/cards/BT5/BT5-030.test.ts |
| BT5-031 | catalog + KB query + src/cards/BT5/BT5-031.ts (IR-only) | src/cards/BT5/BT5-031.test.ts |
| BT5-032 | catalog + KB query + src/cards/BT5/BT5-032.ts (IR-only) | src/cards/BT5/BT5-032.test.ts |
| BT5-033 | catalog + KB query + src/cards/BT5/BT5-033.ts (IR-only) | src/cards/BT5/BT5-033.test.ts |
| BT5-034 | catalog + KB query + src/cards/BT5/BT5-034.ts (IR-only) | src/cards/BT5/BT5-034.test.ts |
| BT5-035 | catalog + KB query + src/cards/BT5/BT5-035.ts (IR-only) | src/cards/BT5/BT5-035.test.ts |
| BT5-036 | catalog + KB query + src/cards/BT5/BT5-036.ts (IR-only) | src/cards/BT5/BT5-036.test.ts |
| BT5-037 | catalog + KB query + src/cards/BT5/BT5-037.ts (IR-only) | src/cards/BT5/BT5-037.test.ts |
| BT5-038 | catalog + KB query + src/cards/BT5/BT5-038.ts (IR-only) | src/cards/BT5/BT5-038.test.ts |
| BT5-039 | catalog + KB query + src/cards/BT5/BT5-039.ts (IR-only) | src/cards/BT5/BT5-039.test.ts |
| BT5-040 | catalog + KB query + src/cards/BT5/BT5-040.ts (IR-only) | src/cards/BT5/BT5-040.test.ts |
| BT5-041 | catalog + KB query + src/cards/BT5/BT5-041.ts (IR-only) | src/cards/BT5/BT5-041.test.ts |
| BT5-042 | catalog + KB query + src/cards/BT5/BT5-042.ts (IR-only) | src/cards/BT5/BT5-042.test.ts |
| BT5-043 | catalog + KB query + src/cards/BT5/BT5-043.ts (IR-only) | src/cards/BT5/BT5-043.test.ts |
| BT5-044 | catalog + KB query + src/cards/BT5/BT5-044.ts (IR-only) | src/cards/BT5/BT5-044.test.ts |
| BT5-045 | catalog + KB query + src/cards/BT5/BT5-045.ts (IR-only) | src/cards/BT5/BT5-045.test.ts |
| BT5-046 | catalog + KB query + src/cards/BT5/BT5-046.ts (IR-only) | src/cards/BT5/BT5-046.test.ts |
| BT5-047 | catalog + KB query + src/cards/BT5/BT5-047.ts (IR-only) | src/cards/BT5/BT5-047.test.ts |
| BT5-048 | catalog + KB query + src/cards/BT5/BT5-048.ts (IR-only) | src/cards/BT5/BT5-048.test.ts |
| BT5-049 | catalog + KB query + src/cards/BT5/BT5-049.ts (IR-only) | src/cards/BT5/BT5-049.test.ts |
| BT5-050 | catalog + KB query + src/cards/BT5/BT5-050.ts (IR-only) | src/cards/BT5/BT5-050.test.ts |
| BT5-051 | catalog + KB query + src/cards/BT5/BT5-051.ts (IR-only) | src/cards/BT5/BT5-051.test.ts |
| BT5-052 | catalog + KB query + src/cards/BT5/BT5-052.ts (IR-only) | src/cards/BT5/BT5-052.test.ts |
| BT5-053 | catalog + KB query + src/cards/BT5/BT5-053.ts (IR-only) | src/cards/BT5/BT5-053.test.ts |
| BT5-054 | catalog + KB query + src/cards/BT5/BT5-054.ts (IR-only) | src/cards/BT5/BT5-054.test.ts |
| BT5-055 | catalog + KB query + src/cards/BT5/BT5-055.ts (IR-only) | src/cards/BT5/BT5-055.test.ts |
| BT5-056 | catalog + KB query + src/cards/BT5/BT5-056.ts (IR-only) | src/cards/BT5/BT5-056.test.ts |
| BT5-057 | catalog + KB query + src/cards/BT5/BT5-057.ts (IR-only) | src/cards/BT5/BT5-057.test.ts |
| BT5-058 | catalog + KB query + src/cards/BT5/BT5-058.ts (IR-only) | src/cards/BT5/BT5-058.test.ts |
| BT5-059 | catalog + KB query + src/cards/BT5/BT5-059.ts (IR-only) | src/cards/BT5/BT5-059.test.ts |
| BT5-060 | catalog + KB query + src/cards/BT5/BT5-060.ts (IR-only) | src/cards/BT5/BT5-060.test.ts |
| BT5-061 | catalog + KB query + src/cards/BT5/BT5-061.ts (IR-only) | src/cards/BT5/BT5-061.test.ts |
| BT5-062 | catalog + KB query + src/cards/BT5/BT5-062.ts (IR-only) | src/cards/BT5/BT5-062.test.ts |
| BT5-063 | catalog + KB query + src/cards/BT5/BT5-063.ts (IR-only) | src/cards/BT5/BT5-063.test.ts |
| BT5-064 | catalog + KB query + src/cards/BT5/BT5-064.ts (IR-only) | src/cards/BT5/BT5-064.test.ts |
| BT5-065 | catalog + KB query + src/cards/BT5/BT5-065.ts (IR-only) | src/cards/BT5/BT5-065.test.ts |
| BT5-066 | catalog + KB query + src/cards/BT5/BT5-066.ts (IR-only) | src/cards/BT5/BT5-066.test.ts |
| BT5-067 | catalog + KB query + src/cards/BT5/BT5-067.ts (IR-only) | src/cards/BT5/BT5-067.test.ts |
| BT5-068 | catalog + KB query + src/cards/BT5/BT5-068.ts (IR-only) | src/cards/BT5/BT5-068.test.ts |
| BT5-069 | catalog + KB query + src/cards/BT5/BT5-069.ts (IR-only) | src/cards/BT5/BT5-069.test.ts |
| BT5-070 | catalog + KB query + src/cards/BT5/BT5-070.ts (IR-only) | src/cards/BT5/BT5-070.test.ts |
| BT5-071 | catalog + KB query + src/cards/BT5/BT5-071.ts (IR-only) | src/cards/BT5/BT5-071.test.ts |
| BT5-072 | catalog + KB query + src/cards/BT5/BT5-072.ts (IR-only) | src/cards/BT5/BT5-072.test.ts |
| BT5-073 | catalog + KB query + src/cards/BT5/BT5-073.ts (IR-only) | src/cards/BT5/BT5-073.test.ts |
| BT5-074 | catalog + KB query + src/cards/BT5/BT5-074.ts (IR-only) | src/cards/BT5/BT5-074.test.ts |
| BT5-075 | catalog + KB query + src/cards/BT5/BT5-075.ts (IR-only) | src/cards/BT5/BT5-075.test.ts |
| BT5-076 | catalog + KB query + src/cards/BT5/BT5-076.ts (IR-only) | src/cards/BT5/BT5-076.test.ts |
| BT5-077 | catalog + KB query + src/cards/BT5/BT5-077.ts (IR-only) | src/cards/BT5/BT5-077.test.ts |
| BT5-078 | catalog + KB query + src/cards/BT5/BT5-078.ts (IR-only) | src/cards/BT5/BT5-078.test.ts |
| BT5-079 | catalog + KB query + src/cards/BT5/BT5-079.ts (IR-only) | src/cards/BT5/BT5-079.test.ts |
| BT5-080 | catalog + KB query + src/cards/BT5/BT5-080.ts (IR-only) | src/cards/BT5/BT5-080.test.ts |
| BT5-081 | catalog + KB query + src/cards/BT5/BT5-081.ts (IR-only) | src/cards/BT5/BT5-081.test.ts |
| BT5-082 | catalog + KB query + src/cards/BT5/BT5-082.ts (IR-only) | src/cards/BT5/BT5-082.test.ts |
| BT5-083 | catalog + KB query + src/cards/BT5/BT5-083.ts (IR-only) | src/cards/BT5/BT5-083.test.ts |
| BT5-084 | catalog + KB query + src/cards/BT5/BT5-084.ts (IR-only) | src/cards/BT5/BT5-084.test.ts |
| BT5-085 | catalog + KB query + src/cards/BT5/BT5-085.ts (IR-only) | src/cards/BT5/BT5-085.test.ts |
| BT5-086 | catalog + KB query + src/cards/BT5/BT5-086.ts (IR-only) | src/cards/BT5/BT5-086.test.ts |
| BT5-087 | catalog + KB query + src/cards/BT5/BT5-087.ts (IR-only) | src/cards/BT5/BT5-087.test.ts |
| BT5-088 | catalog + KB query + src/cards/BT5/BT5-088.ts (IR-only) | src/cards/BT5/BT5-088.test.ts |
| BT5-089 | catalog + KB query + src/cards/BT5/BT5-089.ts (IR-only) | src/cards/BT5/BT5-089.test.ts |
| BT5-090 | catalog + KB query + src/cards/BT5/BT5-090.ts (IR-only) | src/cards/BT5/BT5-090.test.ts |
| BT5-091 | catalog + KB query + src/cards/BT5/BT5-091.ts (IR-only) | src/cards/BT5/BT5-091.test.ts |
| BT5-092 | catalog + KB query + src/cards/BT5/BT5-092.ts (IR-only) | src/cards/BT5/BT5-092.test.ts |
| BT5-093 | catalog + KB query + src/cards/BT5/BT5-093.ts (IR-only) | src/cards/BT5/BT5-093.test.ts |
| BT5-094 | catalog + KB query + src/cards/BT5/BT5-094.ts (IR-only) | src/cards/BT5/BT5-094.test.ts |
| BT5-095 | catalog + KB query + src/cards/BT5/BT5-095.ts (IR-only) | src/cards/BT5/BT5-095.test.ts |
| BT5-096 | catalog + KB query + src/cards/BT5/BT5-096.ts (IR-only) | src/cards/BT5/BT5-096.test.ts |
| BT5-097 | catalog + KB query + src/cards/BT5/BT5-097.ts (IR-only) | src/cards/BT5/BT5-097.test.ts |
| BT5-098 | catalog + KB query + src/cards/BT5/BT5-098.ts (IR-only) | src/cards/BT5/BT5-098.test.ts |
| BT5-099 | catalog + KB query + src/cards/BT5/BT5-099.ts (IR-only) | src/cards/BT5/BT5-099.test.ts |
| BT5-100 | catalog + KB query + src/cards/BT5/BT5-100.ts (IR-only) | src/cards/BT5/BT5-100.test.ts |
| BT5-101 | catalog + KB query + src/cards/BT5/BT5-101.ts (IR-only) | src/cards/BT5/BT5-101.test.ts |
| BT5-102 | catalog + KB query + src/cards/BT5/BT5-102.ts (IR-only) | src/cards/BT5/BT5-102.test.ts |
| BT5-103 | catalog + KB query + src/cards/BT5/BT5-103.ts (IR-only) | src/cards/BT5/BT5-103.test.ts |
| BT5-104 | catalog + KB query + src/cards/BT5/BT5-104.ts (IR-only) | src/cards/BT5/BT5-104.test.ts |
| BT5-105 | catalog + KB query + src/cards/BT5/BT5-105.ts (IR-only) | src/cards/BT5/BT5-105.test.ts |
| BT5-106 | catalog + KB query + src/cards/BT5/BT5-106.ts (IR-only) | src/cards/BT5/BT5-106.test.ts |
| BT5-107 | catalog + KB query + src/cards/BT5/BT5-107.ts (IR-only) | src/cards/BT5/BT5-107.test.ts |
| BT5-108 | catalog + KB query + src/cards/BT5/BT5-108.ts (IR-only) | src/cards/BT5/BT5-108.test.ts |
| BT5-109 | catalog + KB query + src/cards/BT5/BT5-109.ts (IR-only) | src/cards/BT5/BT5-109.test.ts |
| BT5-110 | catalog + KB query + src/cards/BT5/BT5-110.ts (IR-only) | src/cards/BT5/BT5-110.test.ts |
| BT5-111 | catalog + KB query + src/cards/BT5/BT5-111.ts (IR-only) | src/cards/BT5/BT5-111.test.ts |
| BT5-112 | catalog + KB query + src/cards/BT5/BT5-112.ts (IR-only) | src/cards/BT5/BT5-112.test.ts |

## Validation record

- Individual serial card-test results: all 112 catalog cards, BT5-001 through BT5-112, passed in this worktree using one fork and no file parallelism. Targeted fidelity repairs cover BT5-006, BT5-016, BT5-018, BT5-070, BT5-099, BT5-102, and BT5-109; BT5-003's Q1282 remains covered by its three-Digimon host fixture.
- Final serial collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/BT5 --pool=forks --poolOptions.forks.maxForks=1 --no-file-parallelism` — 121 files / 291 tests passed.
- Typecheck: `pnpm typecheck` passed. Whitespace validation: `git diff --check` passed before ledger closeout; re-run after the ledger commit for final delivery.
