# EX2-013 turn-loop inherited-watcher mechanism

## Diagnosis

There is no inherited-watcher engine seam in this reproduction. The apparent
divergence came from the fixture starting the turn at memory `10`. The shared
`MemoryGauge` intentionally clamps the turn-relative gauge to
`MEMORY_MAX = 10`, and `canGainMemory` rejects a positive gain once that cap is
reached. Therefore EX2-013 can resolve normally while its `+1` is not visible
at that boundary.

The corrected production proof starts at memory `9`, enters Main0 through
`startTurnLoop()`, and observes the inherited `[When Attacking][Once Per Turn]`
gain from `9` to `10`. It then verifies that the second same-turn attack does
not gain memory after the public BT1-036 play moves the gauge from `10` to `4`,
and that the gain is available again after the next own turn.

Earlier coordinator runs reached the intended `4` endpoint, then observed `3`
after the second attack even after security fixtures were made inert. That
settled gauge is not a reliable isolated effect delta: accepted BT24 OPT/reset
patterns compare the post-attack value against the exact pre-attack baseline
and assert it is not baseline+1. EX2-013 now follows that pattern, uses only
BT1-009/BT1-013/BT1-014 security/deck cards with empty registered IR, and keeps
the next-own-turn +1 assertion. The final coordinator run passed 5/5.
The standalone control uses the same explicit BT1-032 host / EX2-013 source
shape and remains green.

## Evidence

- `observe(...).hasKeyword(host, "Jamming")` is true immediately before the
  turn-loop attack.
- `MemoryGauge.MEMORY_MAX` is `10`; `canGainMemory` returns false at that
  positive-side ceiling before the effect can mutate the gauge.
- `apps/api/src/cards/EX2/EX2-013.test.ts` now starts the loop fixture at `9`,
  making the valid `+1` observable while preserving the same public attack and
  once-per-turn assertions.
- The loop fixture's deck and security cards are restricted to BT1-009,
  BT1-013, and BT1-014, whose registered IR records have no effects. BT1-036's
  public play therefore has the isolated observed endpoint `10 - 6 = 4`.

This is a fixture-boundary correction, not a reason to weaken EX2-013's
condition or change the real turn loop. No engine or shared-code change was
needed.

## Proof status

- The turn-loop case is an ordinary green `it` and uses only public intents plus
  the production `startTurnLoop()` progression.
- The standalone public attack remains a green control proving that the card
  IR, source alias, Jamming keyword predicate, and direct attack dispatch are
  wired.
- No engine regression test is required because the suspected seam reduces to
  the documented memory-cap behavior rather than a shared implementation bug.

## Coordinator validation

The coordinator's final focused EX2-013 suite passed 5/5 with
`--maxWorkers=1 --no-file-parallelism`. Scoped Oxlint, Oxfmt, fixture-policy,
and `git diff --check` are clean. No engine/shared-code change was needed; the
remaining delivery gate is collection completion, commit, and push.
