# EX9-018 optional trash-placement cost

## Contract

EX9-018's On Play and When Digivolving text starts with a mandatory-looking
"by placing 1 Digimon card from your trash face down" condition. The controller
must be able to decline the optional effect window, however, and a missing trash
card means the condition cannot be met. Q4761 requires the later `Then` return
to be skipped when that placement condition is not met. Q4760 separately limits
digivolution-card removal to one chosen opponent Digimon.

There is a second observable case: after the placement succeeds, the chosen
opponent Digimon may already have no digivolution cards. The trash step is then
a no-op, but the `Then` clause can still return that source-free Digimon. The
payment and the return are therefore not gated by the same target preflight.

## Decision

Both body timings use an optional `ConditionalBranch` with a true condition.
The branch owns the single face-down trash placement cost and has
`abortOnDecline: true`. Its true branch runs `TrashDigivolution` followed by
`Return`; the nested trash action has no second payment and does not abort when
the selected Digimon has no sources. This keeps the payment transactional while
preserving the printed sequencing and avoids the generic target preflight
skipping the optional-cost prompt when no opposing digivolution cards exist.

The implementation remains compiled IR registered only with `registerIrCard`.
No shared interpreter behavior is changed.

## Evidence

The focused card tests cover accepted On Play and When Digivolving paths,
two face-down source scaling from one selected opponent Digimon, exact stack and
deck zones, Q4761 missing-payment refusal, explicit On Play refusal, a paid
source-free target that is returned, When Digivolving refusal, both Cyborg and
Ver.2 reduction payments, free effect play (Q4759), and inherited end-of-turn
unsuspension/Once Per Turn behavior.
