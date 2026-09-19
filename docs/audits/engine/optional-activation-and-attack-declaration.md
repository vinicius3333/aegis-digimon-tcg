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
- The unrelated, concurrently edited `src/engine/attackStepPendingEffects.test.ts`
  was excluded from the broad run and left untouched.

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
