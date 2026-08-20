# BT21 audit ledger

Audit scope: `BT21-102` down through `BT21-001`, using the committed catalog,
`node tools/kb/query.mjs card <ID>`, the compiled IR in
`packages/shared/src/effects/effects.json`, the direct module under this
directory, and the colocated test.

The static inventory found 102/102 catalog records with a module, a colocated
test, and an effects record. The compiled IR reports `coverage: full` and no
residual for 96 cards. The following six cards retain explicit implementation
residuals or direct-module coverage and therefore cannot receive 10/10 without
runtime proof: `BT21-058`, `BT21-062`, `BT21-086`, `BT21-093`, `BT21-094`, and
`BT21-097`.

No card receives 10/10 in this audit run. Vitest, pnpm, and the local Vitest
binary were unavailable; `npm run typecheck` failed because its script invokes
missing `pnpm`. Behavioral, typecheck, and IR-runtime items are therefore
marked **not verified**, as required by the rubric.

## Per-card inventory

Every row maps to:

- implementation: `apps/api/src/cards/BT21/<ID>.ts`
- behavioral proof: `apps/api/src/cards/BT21/<ID>.test.ts`
- catalog: `packages/shared/src/cards/data/cards.json`
- compiled IR: `packages/shared/src/effects/effects.json` (or the module's
  exported `compiled` record for direct modules)

| Card | Static source status | Score |
|---|---|---|
| BT21-102 | IR full, no residual | not verified |
| BT21-101 | IR full, no residual | not verified |
| BT21-100 | IR full, no residual | not verified |
| BT21-099 | IR full, no residual; module comment records zone residual risk | not verified |
| BT21-098 | IR full, no residual | not verified |
| BT21-097 | IR partial/direct behavior seam | not verified |
| BT21-096 | direct module, static full | not verified |
| BT21-095 | IR full, no residual | not verified |
| BT21-094 | IR partial/top-stack behavior seam | not verified |
| BT21-093 | IR partial/direct behavior seam | not verified |
| BT21-092 | direct module, static full | not verified |
| BT21-091 | IR full, no residual | not verified |
| BT21-090 | IR full, no residual | not verified |
| BT21-089 | IR full, no residual | not verified |
| BT21-088 | IR full, no residual | not verified |
| BT21-087 | direct module, static full | not verified |
| BT21-086 | direct module with explicit residual | not verified |
| BT21-085 | IR full, no residual | not verified |
| BT21-084 | IR full, no residual | not verified |
| BT21-083 | direct module, static full | not verified |
| BT21-082 | IR full, no residual | not verified |
| BT21-081 | IR full, no residual | not verified |
| BT21-080 | IR full, no residual | not verified |
| BT21-079 | IR full, no residual | not verified |
| BT21-078 | IR full, no residual | not verified |
| BT21-077 | IR full, no residual | not verified |
| BT21-076 | IR full, no residual | not verified |
| BT21-075 | IR full, no residual | not verified |
| BT21-074 | IR full, no residual | not verified |
| BT21-073 | IR full, no residual | not verified |
| BT21-072 | IR full, no residual | not verified |
| BT21-071 | IR full, no residual | not verified |
| BT21-070 | IR full, no residual | not verified |
| BT21-069 | IR full, no residual | not verified |
| BT21-068 | IR full, no residual | not verified |
| BT21-067 | IR full, no residual | not verified |
| BT21-066 | IR full, no residual | not verified |
| BT21-065 | IR full, no residual | not verified |
| BT21-064 | IR full, no residual | not verified |
| BT21-063 | IR full, no residual | not verified |
| BT21-062 | direct module with explicit residual | not verified |
| BT21-061 | IR full, no residual | not verified |
| BT21-060 | IR full, no residual | not verified |
| BT21-059 | IR full, no residual | not verified |
| BT21-058 | direct module with explicit residual | not verified |
| BT21-057 | IR full, no residual | not verified |
| BT21-056 | IR full, no residual | not verified |
| BT21-055 | IR full, no residual | not verified |
| BT21-054 | IR full, no residual | not verified |
| BT21-053 | IR full, no residual | not verified |
| BT21-052 | IR full, no residual | not verified |
| BT21-051 | IR full, no residual | not verified |
| BT21-050 | IR full, no residual | not verified |
| BT21-049 | IR full, no residual | not verified |
| BT21-048 | IR full, no residual | not verified |
| BT21-047 | IR full, no residual | not verified |
| BT21-046 | IR full, no residual | not verified |
| BT21-045 | IR full, no residual | not verified |
| BT21-044 | IR full, no residual | not verified |
| BT21-043 | IR full, no residual | not verified |
| BT21-042 | IR full, no residual | not verified |
| BT21-041 | IR full, no residual | not verified |
| BT21-040 | IR full, no residual | not verified |
| BT21-039 | IR full, no residual | not verified |
| BT21-038 | IR full, no residual | not verified |
| BT21-037 | IR full, no residual | not verified |
| BT21-036 | IR full, no residual | not verified |
| BT21-035 | IR full, no residual | not verified |
| BT21-034 | IR full, no residual | not verified |
| BT21-033 | IR full, no residual | not verified |
| BT21-032 | IR full, no residual | not verified |
| BT21-031 | IR full, no residual | not verified |
| BT21-030 | IR full, no residual | not verified |
| BT21-029 | IR full, no residual | not verified |
| BT21-028 | IR full, no residual | not verified |
| BT21-027 | IR full, no residual | not verified |
| BT21-026 | IR full, no residual | not verified |
| BT21-025 | IR full, no residual | not verified |
| BT21-024 | IR full, no residual | not verified |
| BT21-023 | IR full, no residual | not verified |
| BT21-022 | IR full, no residual | not verified |
| BT21-021 | IR full, no residual | not verified |
| BT21-020 | IR full, no residual | not verified |
| BT21-019 | IR full, no residual | not verified |
| BT21-018 | IR full, no residual | not verified |
| BT21-017 | IR full, no residual | not verified |
| BT21-016 | IR full, no residual | not verified |
| BT21-015 | IR full, no residual | not verified |
| BT21-014 | IR full, no residual | not verified |
| BT21-013 | IR full, no residual | not verified |
| BT21-012 | IR full, no residual | not verified |
| BT21-011 | IR full, no residual | not verified |
| BT21-010 | IR full, no residual | not verified |
| BT21-009 | IR full, no residual | not verified |
| BT21-008 | IR full, no residual | not verified |
| BT21-007 | IR full, no residual | not verified |
| BT21-006 | IR full, no residual | not verified |
| BT21-005 | IR full, no residual | not verified |
| BT21-004 | IR full, no residual | not verified |
| BT21-003 | IR full, no residual | not verified |
| BT21-002 | IR full, no residual | not verified |
| BT21-001 | IR full, no residual | not verified |

## Blockers

- `pnpm` is not installed, so the requested serial low-memory Vitest run could
  not start.
- No local `vitest` binary is present; no behavioral result is claimed.
- `npm run typecheck` cannot run because the repository script delegates to
  `pnpm`.
- The KB query returned no entry for some IDs. Those absences are evidence
  blockers, not permission to infer rulings or clauses; the affected IDs are
  `BT21-102`, `100`, `094`, `091`, `089`, `079`, `076`, `075`, `070`, `069`,
  `067`, `059`, `053`, `052`, `051`, `047`, `046`, `045`, `043`, `042`,
  `041`, `039`, `038`, `037`, `036`, `035`, `034`, `033`, `027`, `026`,
  `019`, `016`, `015`, `012`, `009`, `007`, `006`, `005`, `004`, and `003`.
