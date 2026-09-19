# Optional activation and attack declaration

## Report and rules

Discord report: https://discord.com/channels/1525646227608178798/1550895356928331867

EX11-074 prints two independent optional processes in its All Turns once-per-turn
effect: unsuspend itself, then optionally battle an opposing Digimon. Declining
both must leave the effect available for a later suspension that turn.

The committed comprehensive rules establish the shared contract:

- 15-1-6 and 15-14-1: count chosen activation, not whether a board mutation succeeds;
  each physical copy has its own use, and a new turn resets it.
- 11-2-8: attack declaration includes suspending the attacker and choosing a target.
- 15-4-3: effects triggered during the same rule processing are simultaneous;
  each player chooses the next effect, with the turn player first.
- 15-4-5: derived triggers take priority over older pending effects.

## Shared seams

The interpreter's action dispatcher must communicate optional refusal for all
compiled actions, retain acceptance across later refusals, and distinguish control
flow wrappers from actual processing. Direct timing resolution must receive that
result from the interpreter's selection context before recording usage. The
subtrigger registry continues to use its provisional per-turn mark and rollback.

Attack declaration must collect suspension timing effects and suspension watchers
alongside When Attacking, allied/opponent attack watchers, and Alliance. Each
collected suspension effect retains its event payload. An attack made without
suspending must not synthesize a suspension event.

## Behavioral coverage

- `src/engine/subTriggerOptionalOncePerTurn.test.ts`: real Vortexdramon reactions
  driven by play intents, full refusal and partial acceptance across events.
- `src/engine/attackSuspensionTriggerOrdering.test.ts`: player-selected declaration
  order, opposing watcher priority, cross-permanent watchers, derived-effect
  priority, withoutTap, and both orders during nested effect-driven attacks.
- `src/engine/optionalTimingActivation.test.ts`: EX13-043 Leopardmon's modal
  optional processing and shared digivolution/attack limit, using public intents.
- `src/cards/EX11/EX11-074-peer-opt-regressions.test.ts`: EX13-044 normal and
  inherited battle watchers, and EX13-051's inherited unsuspend watcher.
- `src/engine/optionalActivationReceipt.test.ts`: mandatory prefixes, accepted
  ineffective processing, outer optional acceptance, paid whole-effect costs,
  and selected hand-trash costs inside `CostGatedBlock`.
- `src/engine/costGatedOptionalOncePerTurn.test.ts`: BT26-026 retries after
  refusing its cost gate, but consumes its use after payment and a declined body,
  with a second payable cost still available.

The original decline and ordering reproductions, and the Leopardmon decline
case, were observed failing before their corresponding corrections. No card
registration changes or handwritten card exceptions are required.

## Verification

Verification on September 19, 2026, after Luna implementation and independent review:

- Broad engine, EX11, EX13, affected peer cards, and audit-layout run: 527 files,
  10,666 tests; 10,664 passed, with only the fuzzer and capabilities suites hitting
  their 15-second timeout during concurrent typechecks and host contention.
- Those two suites plus the final attack-order, activation-receipt, and real
  cost-gate regressions were rerun after typecheck finished with
  `--testTimeout=60000`: all 5 files / 315 tests passed in 5.47 seconds.
- `pnpm typecheck`: passed for shared, API, and web.
- `oxlint`, `oxfmt --check` on the 16 changed TypeScript files, and
  `git diff --check`: passed.

### Pending attack-step follow-up

The separately captured `attackStepPendingEffects.test.ts` regression is now
resolved. During an effect-directed attack, Blast Digivolve completed its stack
change during Counter Timing, but its nested When Digivolving window remained
parked behind the enclosing effect while combat advanced to Block Timing. The
combat controller now drains the effect-directed attack's pending timing pool
again after the Counter response and before attacker validation and Block Timing.
All three regression cases pass: normal Blast Digivolve, target-switch processing
before battle, and Blast Digivolve during an effect-directed attack.

Reproduce the broad run from the repository root:

```sh
pnpm --filter @aegis/api exec vitest run src/engine src/cards/EX11 src/cards/EX13 src/cards/BT25/BT25-005.test.ts src/cards/BT25/BT25-006.test.ts src/cards/BT25/BT25-044.test.ts src/cards/BT25/BT25-077.test.ts src/cards/BT26/BT26-015.test.ts src/cards/BT26/BT26-026.test.ts src/cards/EX5/EX5-034.test.ts src/cards/EX10/EX10-019.test.ts src/cards/EX3/EX3-026.test.ts src/cards/BT9/BT9-018.test.ts src/cards/RB1/RB1-010.test.ts src/cards/audit-docs.test.ts --exclude src/engine/attackStepPendingEffects.test.ts --maxWorkers=1 --no-file-parallelism
```

Reproduce the timeout/final-regression rerun:

```sh
pnpm --filter @aegis/api exec vitest run src/engine/fuzzer.test.ts src/engine/effects/capabilities.test.ts src/engine/costGatedOptionalOncePerTurn.test.ts src/engine/optionalActivationReceipt.test.ts src/engine/attackSuspensionTriggerOrdering.test.ts --maxWorkers=1 --no-file-parallelism --testTimeout=60000
```

This targeted fix does not claim a full collection audit or change any collection's
completion status. No card-specific exception, deployment, or Discord status change
was made.

### Same-effect continuation after attack declaration

Issue #4868 exposed a distinct continuation gap in EX13-045. Its single When
Digivolving effect declares an attack and then directly battles an opposing Digimon.
The interpreter previously awaited the complete forced-attack lifecycle before moving
to the next action in that same effect, so security was checked before the printed
“Then” battle.

`runEffect` now exposes the remaining sibling actions as a one-shot continuation while
dispatching a non-final `Attack` action. Combat invokes that continuation immediately
after attack declaration and before declaration-triggered effects, Counter Timing, the
block window, and security. If no legal attack is declared, ordinary sequential
resolution continues and the later actions are not skipped.

Behavioral proof is the EX13-045 test “resolves its direct battle after declaring the
attack but before that attack checks security”: Examon declares against the player,
then loses its direct battle to a 30000 DP Digimon; the open attack consequently ends
without checking either security card. The test was observed failing with both security
cards removed before the correction.
