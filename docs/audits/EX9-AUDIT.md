# EX9 Card Implementation Revalidation

## Scope and source of truth

This independent audit starts from immutable base
`53616a8e464dacbcb4e73dd31deb043ae59f88e0` on
`audit-ex9-card-by-card-20260904`. The committed catalog contains 74 contiguous
IDs, EX9-001 through EX9-074. All 74 direct modules and 74 colocated test files
exist. Two additional collection files, EX9-074.behavior.test.ts and
EX9.audit.test.ts, bring the exact collection inventory to 76 test files.
Every direct module registers IR; the inventory found no legacy
registration or RawUnparsed node. Structural presence is not a runtime score.

EX1 through EX8 were delivered separately. The remaining sequential scope is
EX9 (74 cards), EX10 (74), EX11 (74), and EX12 (77). EX10 through EX12 are not
started here. Earlier audit scores and green baselines are not adopted without
fresh catalog, local knowledge-base, IR and runtime review.

## Work ownership and verification

Three Luna/high workers own EX9-001..025, EX9-026..050 and EX9-051..073.
The coordinator owns EX9-074 and its shared color-selection review.
Each proceeds one card at a time. The coordinator owns shared engine changes,
independent review, this ledger, effects synchronization and all Git staging,
commits and delivery. Workers never stage or commit shared worktree changes.

Focused command, substituting the exact card ID:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-NNN.test.ts --no-file-parallelism --pool=forks --maxWorkers=1 --reporter=dot
```

Behavioral evidence must use legal stacks and neutral peers, resolve decisions,
and explicitly assert final state. A settle predicate alone is not an assertion.
Inherited limits need real repeat-activation boundaries and duration expiry;
reveal routing needs an unrevealed anchor. Shared fixes require a red-capable
regression and scoped mechanism checks. Collection tests, typechecks, builds,
style, effects synchronization and independent review are closure gates, not
per-card repeated work.

## Current results

No card is claimed complete from the initial inventory. Dependencies installed
offline from the existing cache with the frozen lockfile, without tracked
changes. The initial shared build passed.

| Card | Fresh result | Evidence / unresolved work |
| --- | --- | --- |
| EX9-001 | Pending | Fresh audit required |
| EX9-002 | Pending | Fresh audit required |
| EX9-003 | Pending | Fresh audit required |
| EX9-004 | Pending | Fresh audit required |
| EX9-005 | Pending | Fresh audit required |
| EX9-006 | Pending | Fresh audit required |
| EX9-007 | Pending | Fresh audit required |
| EX9-008 | Pending | Fresh audit required |
| EX9-009 | Pending | Fresh audit required |
| EX9-010 | Pending | Fresh audit required |
| EX9-011 | Pending | Fresh audit required |
| EX9-012 | Pending | Fresh audit required |
| EX9-013 | Pending | Fresh audit required |
| EX9-014 | Pending | Fresh audit required |
| EX9-015 | Pending | Fresh audit required |
| EX9-016 | Pending | Fresh audit required |
| EX9-017 | Pending | Fresh audit required |
| EX9-018 | Pending | Fresh audit required |
| EX9-019 | Pending | Fresh audit required |
| EX9-020 | Pending | Fresh audit required |
| EX9-021 | Pending | Fresh audit required |
| EX9-022 | Pending | Fresh audit required |
| EX9-023 | Pending | Fresh audit required |
| EX9-024 | Pending | Fresh audit required |
| EX9-025 | Pending | Fresh audit required |
| EX9-026 | Pending | Fresh audit required |
| EX9-027 | Pending | Fresh audit required |
| EX9-028 | Pending | Fresh audit required |
| EX9-029 | Pending | Fresh audit required |
| EX9-030 | Pending | Fresh audit required |
| EX9-031 | Pending | Fresh audit required |
| EX9-032 | Pending | Fresh audit required |
| EX9-033 | Pending | Fresh audit required |
| EX9-034 | Pending | Fresh audit required |
| EX9-035 | Pending | Fresh audit required |
| EX9-036 | Pending | Fresh audit required |
| EX9-037 | Pending | Fresh audit required |
| EX9-038 | Pending | Fresh audit required |
| EX9-039 | Pending | Fresh audit required |
| EX9-040 | Pending | Fresh audit required |
| EX9-041 | Pending | Fresh audit required |
| EX9-042 | Pending | Fresh audit required |
| EX9-043 | Pending | Fresh audit required |
| EX9-044 | Pending | Fresh audit required |
| EX9-045 | Pending | Fresh audit required |
| EX9-046 | Pending | Fresh audit required |
| EX9-047 | Pending | Fresh audit required |
| EX9-048 | Pending | Fresh audit required |
| EX9-049 | Pending | Fresh audit required |
| EX9-050 | Pending | Fresh audit required |
| EX9-051 | Pending | Fresh audit required |
| EX9-052 | Pending | Fresh audit required |
| EX9-053 | Pending | Fresh audit required |
| EX9-054 | Pending | Fresh audit required |
| EX9-055 | Pending | Fresh audit required |
| EX9-056 | Pending | Fresh audit required |
| EX9-057 | Pending | Fresh audit required |
| EX9-058 | Pending | Fresh audit required |
| EX9-059 | Pending | Fresh audit required |
| EX9-060 | Pending | Fresh audit required |
| EX9-061 | Pending | Fresh audit required |
| EX9-062 | Pending | Fresh audit required |
| EX9-063 | Pending | Fresh audit required |
| EX9-064 | Pending | Fresh audit required |
| EX9-065 | Pending | Fresh audit required |
| EX9-066 | Pending | Fresh audit required |
| EX9-067 | Pending | Fresh audit required |
| EX9-068 | Pending | Fresh audit required |
| EX9-069 | Pending | Fresh audit required |
| EX9-070 | Pending | Fresh audit required |
| EX9-071 | Pending | Fresh audit required |
| EX9-072 | Pending | Fresh audit required |
| EX9-073 | Pending | Fresh audit required |
| EX9-074 | OPEN: 1/2 behavior tests | Initial primary plus behavior baseline passed 5/5. Adding a white opponent to the existing six-source-color case exposes Q5003: white survives although the rule requires considering all seven opposing colors. Current DeletePerColor iterates only source colors. Q5004/Q5005 choice constraints and full public/legal-stack proof remain under review |

## Delivery status

In progress. No collection completion, runtime 10/10 total, final commit or push
is claimed yet. Upon full verified completion the coordinator must update the
Orca worktree status and notify the parent coordinator before becoming idle.
