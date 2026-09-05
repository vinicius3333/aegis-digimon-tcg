# Promo, LM and RB1 audit — coordinator evidence

Status: audit verification passed; integration with the latest main is in progress. Scope: 338 catalog cards (P: 243; LM: 62;
RB1: 33). P-226 is absent. Historical scores were rechecked against catalog text,
local KB rulings, direct IR and observable test assertions.

The isolated branch is `audit-promo-lm-rb-20260905`, based on
`7209adb8984fa3b8f28d974e6ac5ec1657091aba`. Three Luna workers performed bounded
card reviews; the coordinator reviewed evidence, corrected weak fixtures and
integrated changes. The [plan](../plans/2026-09-05-promo-lm-rb-audit-plan.md)
records ownership and acceptance criteria.

## Corrections

- **P-116:** requires Agumon, Pulsemon **and** Gammamon, using exact names across
  both players. Its absolute zero-cost modifier must be active from hand.
  The old slash shorthand and unasserted cost concealed both defects. The
  [official card text](https://world.digimoncard.com/cards/?card_no=P-116&search=true)
  and [Q4224/Q4225](https://world.digimoncard.com/rule/?card_no=P-116) establish
  the conjunction and controller scope. Commit `d6880deb1` aligns direct IR,
  catalog text and persisted effects. Seven focused tests assert actual paid
  costs, incomplete names, exact names, Main and Security. Shared interpreter
  and cost mechanisms passed 221 tests across four files.
- **P-122:** inherited -2000 DP applies to opposing Security Digimon, rather than
  opposing battle-area Digimon. Commit `a11f088d4` changes `ModifyDP` to
  `ModifySecurityDP`, proves a legal evolution stack and actual Security battle,
  and includes a rendered GameScreen scenario using a real room. P-096's Security
  return-to-hand proof is committed separately as `f78a8512b`.
- **P-147:** the attack effect activates the newly placed Pulsemon-text card's
  When Digivolving effect. Replacing self-reactivation with `ActivateForeignEffect`
  and `lastPlacedOnly` restores that behavior (commit `1e34f5cce`). Tests cover paid placement, optional
  refusal, source identity and once-per-turn use.
- **P-227–P-232:** their Delay opportunity belongs to the named Tamer play event.
  It must not grant permanent Delay followed by an unrelated Main activation.
  The corrected IR uses intrinsic reactive Delay (commit `411dac2c1`). The
  [official P-227 text](https://world.digimoncard.com/cards/?card_no=P-227&search=true)
  and local comprehensive rules §16-17 establish timing and source-trash cost.
  Tests cover exact reduced payment, source trash, placement-turn guard, refusal,
  wrong Tamer, no deferred Main activation, mixed eligible/ineligible candidates,
  level/trait boundaries and P-232's trash source.
- **RB1-036:** its cost-3 alternate evolution requires an Arcturusmon in the
  Proximamon stack. Commit `ab92324cf` adds the existing shared stack-name
  requirement and distinguishes the alternate path from printed evolution.
  The same checkpoint strengthens RB1-030 inherited copying and exclusion,
  RB1-033 hand/level/turn/refusal boundaries and RB1-035 Security behavior.
- **LM Memory Boosts:** 15 color variants lacked runtime Delay proof. Commit
  `dd8b4026b` adds 30 assertions through public play/activation covering +2 memory,
  exact source trash, reuse rejection and the placement-turn guard.

## Artifact parity

At baseline, persisted effects differed from normalized executable modules in
154 P, 51 LM and 15 RB1 records. Synchronization uses
`tools/sync-effects-from-card-modules.mjs`, preserving other sets' bytes.
RB1 synchronization is included in `ab92324cf`; LM in `573677b48`.

The new 338-card parity guard reads the persisted JSON independently. Comparing
only the shared in-memory registry is insufficient because registration overwrites
that record. The guard reproduced stale RB1, P-116, P-122 and P-147 records before
synchronization. Its latest verified run passed all 339 assertions.

## Evidence review

P-177's paired Q5758/Q5759 proofs distinguish removal of the deleted top card from
removal of a lower inherited source. The first apparent failure was a fixture with
missing peer-module registration, not a shared-engine defect. Required peer imports,
a positive control and event-order assertions make the evidence reproducible.

The P-232 trash-path investigation likewise required an explicit evolution-route
choice and a memory baseline after paying the Tamer cost. No shared production
engine change was necessary for either investigation. Temporary instrumentation
and skipped reproductions are not accepted as final evidence.

Additional proofs exercise P-141's inherited host, P-163's alternate evolution,
P-185's five-Hybrid Tamer evolution, P-194's inherited Barrier, P-213's independent
attack clause and P-221's DNA immunity behavior.

## Verification

All commands run from the isolated audit checkout. Tests use `--maxWorkers=1
--no-file-parallelism`.

- Final workspace `pnpm typecheck`: shared, API and web passed.
- Combined P/LM/RB1 and persisted parity: 362 files, 1,988 tests passed.
- Related mechanisms: 12 files, 343 tests passed.
- LM collection: 67 files, 506 tests passed, including the 62-card registration gate
  and 15-card Memory Boost proof.
- RB1 checkpoint: 35 files, 82 tests passed.
- Security DP, Delay placement, delayed effects, reactive Delay, copied effects and
  alternate evolution mechanisms: six files, 90 tests passed.
- Rendered P-122 evolution-stack scenario: one test passed.

All 338 canonical rows were recalculated at 10/10 from the reviewed evidence and green aggregate gates. Changed-file lint/format and diff checks passed. Independent review found no remaining functional defect; its duplicate-import cleanup was applied and P-177 rechecked (five tests).

The user subsequently authorized merging into main and pushing. Main advanced with EX10 audit work during this run. Integration must preserve those changes and revalidate the combined engine before merge delivery and the Orca completion update.
