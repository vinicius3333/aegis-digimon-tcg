# Live source DP scaling

## Scope and sources

This bounded audit resolves EX13-020 Magnamon's known numeric residual;
it does not certify the collection or all DP-dependent effects.

- Exact EX13-020 committed catalog identity, costs, alternate Veemon route,
  Assembly, keywords, three shared once-per-turn timings and both unsuspend
  clauses were read. Its opponent reduction uses every 5000 DP this Digimon
  has, after the preceding increase per color in both trashes.
- `node tools/kb/query.mjs card EX13-020` returns no card entries (pre-release).
- `data/kb/rules/comprehensive.md` SHA-256
  `19106a66edc44722faa460baa6746f8dc06414bd0775fda980914000f86e1de6`:
  §§1-3-7/8 (integer values and combined modifiers), 15-1-2/4/5 (ordered,
  complete mandatory processing). Whole 5000-DP units follow the printed
  every-N clause; no partial unit is credited.
- Direct module and colocated tests are
  `apps/api/src/cards/EX13/EX13-020.ts` and `EX13-020.test.ts`.

## Obligation ledger and consumer scope

| Obligation                                                           | Source             | Engine / public proof                                        | Status           |
| -------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------ | ---------------- |
| Read post-buff source DP, not target DP or printed source DP         | EX13-020; §15-1-2  | selfDP; five public play boundaries                          | verified bounded |
| Count whole 5000 units                                               | EX13-020; §1-3-7   | 9000 vs 10000 public controls; scaling arithmetic boundaries | verified bounded |
| Union trash colors across both owners                                | EX13-020           | printed quiet trash pool split across seats                  | verified bounded |
| Preserve played identity, cost and unresolved-decision cleanup       | EX13-020; §15-1-4  | exact public memory/hand/stack/trash assertions              | verified bounded |
| Lower zero-unit public producer and 15000+ public source             | EX13-020           | arithmetic seams only; public interactions pending           | queued           |
| Complete duration, inherited/keyword and full evolution interactions | full card contract | existing supplemental seams, not fresh full proof            | queued           |

The inspected executable consumer is EX13-020, whose three distinct trigger
entries share the same action sequence and use key. Public OnPlay execution
is newly proved; existing public evolution cost tests and explicit timing
cases supplement it. This does not establish an exhaustive denominator for
all differently worded DP-scaling clauses or other mechanism compositions.

## Implementation and public proof

`Scaling.unit: "selfDP"` reads the source permanent's authoritative effective
DP, falling back to currentDP only when that adapter is absent. An absent
source supplies zero. Negative values are clamped to zero; the existing
scale resolver divides by `per` and floors. EX13-020 uses per=5000 and
amount=-4000, without changing its shared frequency, controller, count,
registration, optionality or duration. Only `registerIrCard` registers it.
The preceding ModifyDP process finishes before the next scaling evaluation.

Five public `playCard` intents spend printed seven memory from ten and
produce a source with 7000, 9000, 10000, 11000 or 13000 DP. Zero, two,
three, four or six distinct colors are supplied by exact printed quiet
trash cards split between both owners (Monodramon, Armadillomon, Tsukaimon,
Goblimon, Golemon, Sandiramon). No Veemon material is available for Assembly.
The opposing seeded BT12-112 Superior Mode has its printed 17000 DP;
its OnPlay is not fired, and its owner-turn Option-security restriction
cannot alter this DP comparison. Both target reductions preserve exact
trash IDs, clear the played hand card, retain an empty source stack and
leave no pending decision. Magnamon's own OnPlay is triggered publicly.

The genuine baseline against 538ef381f, after correcting ArraySchema
assertions to compare instance-ID arrays, fails precisely the three
10000/11000/13000 cases: target actual 13000, expected 9000. The 7000/9000
controls pass. Baseline: three failures, twenty-three passes and one old
expected failure (27 total). The initial fixture assertion failures are
not numeric counterfactual evidence. The restored implementation passes
all 27 ordinary card cases and 12 scaling cases (39 across two files).
The old expected failure now uses printed 17000 DP rather than a synthetic
20000-DP Monodramon and passes as an ordinary explicit timing-seam check.

Ten new primitive cases prove 0/4999/5000/9999/10000/14999/15000/negative
DP boundaries, authoritative DP over a stale projection, and absent source.
These are arithmetic/adapter seams, not public producer or leave proofs.
Independent read-only review found no blocker in timing, adapter lookup,
registration, target/frequency/duration preservation or bounded proof scope.

## Gates

Final focused command `pnpm --filter @aegis/api exec vitest run src/cards/EX13/EX13-020.test.ts src/engine/effects/interpreter/scaling.test.ts src/cards/audit-docs.test.ts --maxWorkers=1 --no-file-parallelism`
passes three files / 43 tests (27 card, 12 scaling, four layout).
`pnpm effects:sync:set --set EX13 --base 538ef381f` and matching
`effects:check:set` pass: 60 records synchronized, one semantic change in
EX13-020 only, zero semantic or byte changes outside the collection.
Persisted IR carries selfDP scaling in all three shared timing entries,
with only that known residual removed; registration remains exclusively IR.
`pnpm --filter @aegis/api exec vitest run src/engine/ src/cards/EX13/ --maxWorkers=1 --no-file-parallelism`
passes 339 files / 8601 tests and two declared expected failures (8603 total),
in 36.54 seconds. `pnpm typecheck` passes shared, API and web. Scoped Oxlint
passes the five changed TypeScript files; Oxfmt passes all eight changed
files. The status index remains current at 66 sets and `git diff --check`
is clean. Final full API command `pnpm --filter @aegis/api exec vitest run --maxWorkers=1 --no-file-parallelism` passes 5108 files / 42295 tests, with two declared expected failures (42297 total), in 192.46 seconds. These remain EX13-043 Option-use reduction and EX13-063 pooled Guard saving; the full generic audit remains open.

## Open obligations

- Full initial breeding/play/evolution line and alternate/Assembly material
  interactions are not freshly certified by these public standalone plays.
- Existing trait-unsuspend and duration cases include seeded/timing/turn
  seams; complete comparative trait pools, public turn boundaries and
  Blocker/Armor Purge interactions remain below whole-card certification.
- Public reductions below 5000 and at 15000+, nested/continuous DP changes,
  source departure during a selection and other DP-scaling producer shapes
  remain to be proven. Adapter arithmetic tests do not substitute for them.
- Source inventory and the complete generic keyword/mechanism audit remain
  open. Full coverage metadata records executable expressibility; current
  card score remains capped at eight rather than promoted to ten.
