# EX6 Luna Reaudit

Date: 2026-08-27  
Branch: `audit-ex6-luna`  
Scope: `EX6-001` through `EX6-074`, reviewed in ascending card-ID order by three Luna agents.

## Method

Each card was checked against `packages/shared/src/cards/data/cards.json`, the
local knowledge base (`node tools/kb/query.mjs card <CARD-ID>`), its direct
compiled-IR module, the shared runtime primitives it relies on, and its
colocated test. All 74 modules have `coverage: "full"`, an empty residual list,
and exclusive `registerIrCard` registration. No EX6 module uses `registerCard`.

Per the user's explicit instruction, no Vitest or typecheck command was run
after that instruction. One focused command for EX6-026 had already completed
before the instruction arrived (1 file, 3 tests passed). Updated tests below
are therefore unexecuted in this reaudit, and the report does not claim a fresh
10/10 behavioral gate.

## Card-by-card result

| Card    | Result    | Card    | Result    |
| ------- | --------- | ------- | --------- |
| EX6-001 | corrected | EX6-038 | faithful  |
| EX6-002 | faithful  | EX6-039 | faithful  |
| EX6-003 | faithful  | EX6-040 | faithful  |
| EX6-004 | corrected | EX6-041 | faithful  |
| EX6-005 | corrected | EX6-042 | faithful  |
| EX6-006 | faithful  | EX6-043 | faithful  |
| EX6-007 | faithful  | EX6-044 | faithful  |
| EX6-008 | faithful  | EX6-045 | faithful  |
| EX6-009 | faithful  | EX6-046 | faithful  |
| EX6-010 | faithful  | EX6-047 | faithful  |
| EX6-011 | faithful  | EX6-048 | faithful  |
| EX6-012 | faithful  | EX6-049 | faithful  |
| EX6-013 | faithful  | EX6-050 | faithful  |
| EX6-014 | faithful  | EX6-051 | faithful  |
| EX6-015 | faithful  | EX6-052 | faithful  |
| EX6-016 | faithful  | EX6-053 | faithful  |
| EX6-017 | faithful  | EX6-054 | faithful  |
| EX6-018 | faithful  | EX6-055 | faithful  |
| EX6-019 | faithful  | EX6-056 | faithful  |
| EX6-020 | faithful  | EX6-057 | corrected |
| EX6-021 | faithful  | EX6-058 | faithful  |
| EX6-022 | faithful  | EX6-059 | faithful  |
| EX6-023 | faithful  | EX6-060 | faithful  |
| EX6-024 | faithful  | EX6-061 | faithful  |
| EX6-025 | faithful  | EX6-062 | faithful  |
| EX6-026 | faithful  | EX6-063 | faithful  |
| EX6-027 | faithful  | EX6-064 | faithful  |
| EX6-028 | faithful  | EX6-065 | faithful  |
| EX6-029 | faithful  | EX6-066 | faithful  |
| EX6-030 | faithful  | EX6-067 | faithful  |
| EX6-031 | faithful  | EX6-068 | faithful  |
| EX6-032 | faithful  | EX6-069 | faithful  |
| EX6-033 | faithful  | EX6-070 | faithful  |
| EX6-034 | faithful  | EX6-071 | faithful  |
| EX6-035 | faithful  | EX6-072 | faithful  |
| EX6-036 | faithful  | EX6-073 | faithful  |
| EX6-037 | faithful  | EX6-074 | corrected |

## Corrections

- EX6-001 now requires the digivolution-card placement to be caused by an
  effect, matching the printed trigger rather than accepting rule-based stack
  changes.
- EX6-004 now gives the DP bonus to any one of the controller's Digimon and
  scopes the suspension event to one of that controller's Digimon, rather than
  forcing the inherited host or filtering by the effect's controller.
- EX6-005 now accepts any `Legend-Arms` card from this Digimon's sources,
  including non-Digimon cards, while explicitly retaining the self-host stack
  boundary.
- EX6-057 now treats “another Digimon” as either player's Digimon while
  excluding Lilithmon itself.
- EX6-074 now lets the controller choose any of their Digimon for the trash
  digivolution; the trait Digimon that was played only triggers the effect.

Each corrected contract has a corresponding colocated test update. Those
updates were not executed in this reaudit at the user's request.

## Static verification

- Catalog entries reviewed: 74/74.
- Direct modules present: 74/74.
- Colocated tests present: 74/74.
- `registerIrCard` modules: 74/74.
- Legacy `registerCard` modules: 0/74.
- `git diff --check`: passed.
- Oxlint on all changed TypeScript files: passed.
- Oxfmt check on all changed files: passed.
- Vitest/typecheck: not run after the explicit no-test instruction.
