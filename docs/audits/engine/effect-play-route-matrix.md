# Effect play and digivolution route matrix

Reviewed: 2026-09-23. Scope: the six mechanics and five recipient-source routes
specified in `docs/plans/2026-09-23-interaction-coverage-plan.md`, workstream B.
The canonical executable links and complete 30-cell manifest are in
`data/kb/rule-obligations.json`, scope `effect-play-routes`.

## Coverage and source interpretation

| Mechanic              | Manual hand | Effect hand         | Effect trash        | Effect security     | Effect deck reveal  |
| --------------------- | ----------- | ------------------- | ------------------- | ------------------- | ------------------- |
| Assembly              | BT26-014    | EX12-072 → EX12-064 | BT26-067 → BT26-073 | ST10-06 → EX12-064  | EX12-058 → EX12-064 |
| DigiXros              | BT10-077    | BT21-021 → BT19-014 | BT10-084 → BT10-077 | ST10-06 → BT10-077  | BT10-105 → BT10-061 |
| DNA                   | EX13-045    | EX3-020 → EX3-074   | BT17-101 from trash | No printed provider | No printed provider |
| App Fusion            | BT23-021    | BT21-084 → BT21-073 | BT24-087 → BT24-038 | No printed provider | No printed provider |
| Burst                 | BT13-020    | No printed provider | No printed provider | No printed provider | No printed provider |
| Alternate requirement | EX4-051     | BT19-077 → EX4-051  | BT13-085 → BT26-082 | BT16-024 → EX6-028  | BT24-060 → BT20-080 |

Each covered cell has a real-card behavioral test. The column describes the
recipient's source zone, not the effect provider's zone. EX12-072's Security
effect plays Megadramon from hand; it is not a security-source play.

The original matrix incorrectly omitted three applicable routes. BT17-101's
Trash effect explicitly DNA digivolves into itself after a qualifying level-6
play. ST10-06's DNA-triggered effect searches security and plays a level-5-or-lower
Digimon, enabling both Assembly and DigiXros. New regressions assert the actual
physical target, its removal from the source zone and selected materials.

CR §§8-2-2-4, 8-3-2-2 and 8-4-2-2 prohibit substituting a standard-digivolution
effect for DNA, Burst or App Fusion. They do not prohibit a specifically named
effect from selecting a card from security, trash or a revealed deck. The eight
remaining cells are reviewed catalog absences, not normative exclusions.

## Review of cells without printed providers

The input is the committed 4,480-card catalog at
`packages/shared/src/cards/data/cards.json`. Search all `effectText`,
`inheritedEffectText` and `securityEffectText` fields, including clauses stored
on a single line, then inspect the actual operation and recipient zone.

- DNA: inspect text containing `DNA digivolv`, including explicit actions,
  self references and Blast DNA. BT17-101 targets itself from trash; the other
  reviewed providers target hand. BT18-015, BT18-073 and EX11-059 can use trash
  materials but still select the DNA result from hand. References to security
  and deck in other clauses describe outcomes, not a DNA result from those zones.
- App Fusion: the seven explicit providers are BT21-084, BT22-087, BT23-079,
  BT24-087, BT25-089, EX10-062 and P-241. Six select a hand target; BT24-087 selects
  a trash target. None selects security or a revealed deck card.
- Burst: inspect all `burst digivolv` matches, not only `Burst Digivolve:`.
  BT13-020/033/060/092 and BT26-050 contain printed requirements or reminders,
  not an effect instructing Burst digivolution. Blast Digivolve is a different
  mechanic. No printed effect provider was found for these four effect routes.

Search patterns are candidate-finding aids, not automatic semantic proofs.
The manifest records review rationale and candidate IDs and pins both catalog
and rule-index hashes. Changes to either input fail validation until reviewed;
a refresh preserves the old review rather than silently updating its hash.
No current official-catalog completeness claim is made beyond the committed input.

## Behavioral corrections and evidence

- The original route tests checked some stack membership without its order.
  Strengthening BT21-021 → BT19-014 exposed DigiXros materials being stacked by
  candidate/source-zone order instead of printed recipe order (CR §7-2-2-8).
  Both direct and effect plays now use the same recipe slot assignment, including
  name aliases and substitution. Counted single-slot recipes retain the player's
  ordering. The Chapter 7 regression swaps which material starts on field and
  which starts in hand; both produce the same printed order.
- Charismon's App Fusion test now follows the complete printed flow: its
  optional When Digivolving effect moves the former host into linked cards.
  That move was not an App Fusion implementation bug; both physical cards are
  accounted for in their resulting zones.
- Manual Assembly and DigiXros assert reduced costs (15 → 10 and 10 → 7).
  Alternate requirement routes assert exact costs from hand, trash and security,
  and the waived cost for the revealed-deck route. Tests retain exact recipient
  identities and check the material/source-zone transitions relevant to each route.
- The Metal Empire seed proves its level filter accepts the level-5, play-cost-7
  Megadramon while leaving the level-6 card in hand. The Examon seed uses the
  two printed level-5 providers treated as level 6 for its DNA requirement.
- The Biting Crush seed observes the opponent's effect play, pays Delay by
  trashing Biting Crush and plays the exact Leviamon from trash. This is linked
  to CR §16-17-1; it does not claim the additional Leviamon X chain in Q4735 or
  the distinct own-effect/opponent-play branch in Q3678.

## Local verification

```bash
NODE_OPTIONS=--max-old-space-size=2048 node tools/kb/verify-rule-scenarios.mjs effect-play-routes
```

The verifier checks 14 obligations, 30 scenario links and 28 distinct tests after
the UI-flow follow-up added the real-room DigiXros scenario (see `ui-rule-flows.md`). Its
report includes all 30 route cells; eight reviewed absences are not counted as
executed tests. Expected failures, skipped tests, missing names, missing cells,
unrelated rule references and stale source/catalog reviews are rejected.

All Node processes retain the 2 GB heap limit and test workers are serialized.
Full API typecheck exceeds this limit; a temporary TypeScript configuration
covering the changed modules/tests and their import graph is checked separately.
This completes a bounded route matrix, not every possible card interaction or
whole-engine parity. No CI changes or deployment are part of this work.

The extended collection regression also exposed timing-test latency from the
previous rule-check changes. The quiet-window fix and its isolated baseline
comparison are recorded in `trigger-ordering.md`; no test wait limits were widened.
The BT10-111 substitute-material and BT21-021 Q4727 tests were updated to assert
printed stack order rather than the previous candidate enumeration order.

A further BT21-083 regression exposed a real pass/play race: Main could end while
an accepted play was still resolving Taiki's forced Rush attack. The router now
keeps a valid pass pending until accepted main-action continuations finish.
`mainVerbEndPhase.test.ts` proves both the completed security attack before turn
end and preservation of paid memory when the gauge has already crossed. These
cases are linked to CR §6-5-1, which permits Main actions only without unresolved
processing. Decision, seat, combat and game-over guards remain authoritative.

### Verification results (2026-09-23)

- Route verifier: 14 obligations, 29 links and 27 distinct tests verified;
  22 covered cells and eight reviewed catalog absences, with no verification errors.
- Trigger verifier: 31 obligations, 72 links and 59 distinct tests verified,
  including engine and UI scenarios.
- Full engine conformance: 85 files and 743 tests passed.
- Collection regressions: BT10 (683), BT19 (1,325) and BT21 (1,436),
  totaling 335 files and 3,444 passing tests.
- Main-phase regressions: six files and 30 tests passed.
- Scenario and matrix tooling: 25 tests passed; audit layout: four tests passed.
- Citation validation: all 497 recognized citations pinned, with no errors,
  unresolved references, hash mismatches or warnings.
- Scoped API TypeScript validation and formatting/lint checks passed for the
  changed implementation. Full API typecheck remains limited by the 2 GB heap.
- `git diff --check` passed.

The King Drasil joint-placement regression now answers its pending card-order
decision before ending Main. The final conformance run includes that correction.
These results establish the bounded scenarios above; the remaining obligation
inventory and interactions outside these scenarios still require evidence.
