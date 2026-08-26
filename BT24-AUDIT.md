# BT24 Luna audit ledger

Audit scope: BT24-102 down through BT24-001 (2026-08-26). The committed
catalog contains 102 BT24 cards. Every card has a direct module in
`apps/api/src/cards/BT24`, and every card has a colocated Vitest file (102/102;
the set also has the shared `BT24-ResidualTruth.test.ts`).

## Evidence policy

For each ID, the catalog entry in
`packages/shared/src/cards/data/cards.json` was compared with the printed text
returned by `node tools/kb/query.mjs card <ID>`, then mapped to the direct module
and colocated test. All 102 direct modules expose `coverage: "full"` and
`residual: []`, and registration is exclusively through `registerIrCard` (no
BT24 module uses legacy `registerCard`).

## Inventory (newest to oldest)

| IDs | Catalog | KB | Direct IR | Focused test | Result |
|---|---|---|---|---|---|
| BT24-102…BT24-090 | 13/13 | 13/13 | 13/13 full | 13/13 | no causal gap found |
| BT24-089…BT24-077 | 13/13 | 13/13 | 13/13 full | 13/13 | no causal gap found |
| BT24-076…BT24-064 | 13/13 | 13/13 | 13/13 full | 13/13 | no causal gap found |
| BT24-063…BT24-051 | 13/13 | 13/13 | 13/13 full | 13/13 | no causal gap found |
| BT24-050…BT24-038 | 13/13 | 13/13 | 13/13 full | 13/13 | no causal gap found |
| BT24-037…BT24-025 | 13/13 | 13/13 | 13/13 full | 13/13 | no causal gap found |
| BT24-024…BT24-012 | 13/13 | 13/13 | 13/13 full | 13/13 | no causal gap found |
| BT24-011…BT24-001 | 11/11 | 11/11 | 11/11 full | 11/11 | no causal gap found |

Highest-ID spot checks included Homeros (BT24-102), Jupitermon (BT24-101),
In-Between Theater (BT24-100), Super Hacking (BT24-099), Invasion of the
Titans (BT24-098), Soul Fear (BT24-097), Seventh Graviton (BT24-096), Sonic
Shot (BT24-095), Central Town: Throne Room (BT24-094), Temple of Beginnings
(BT24-093), Shock Plasma (BT24-092), Tidal Stream (BT24-091), and Abyss
Sanctuary: Throne Room (BT24-090). Their modules use compiled IR and tests
cover their declared trigger/effect clauses. KB queries returned a card record
for each; no unresolved ruling was exposed that requires an implementation
change.

## Causal-gap result

No BT24 Luna static causal gap was identified. This is a static audit only;
focused or broad test execution was intentionally not run per task scope.

## Follow-up causal/timing pass (newest to oldest)

A second static pass reviewed the highest-risk timing vocabulary across
BT24-102…BT24-001, including Delay/sub-triggers, security-removal seat
filters, once-per-turn frequency placement, replacement effects, temporary
durations, and evolution-stack top-card sourcing. No justified causal or
timing finding was identified: the reviewed clauses have explicit IR timing,
controller/seat boundaries, and source-zone constraints. This remains static
evidence only; no tests were executed.
