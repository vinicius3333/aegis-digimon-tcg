# Deferred DNA attack trigger resolution

BT20-036 (BanchoLeomon) and BT20-043 (Varodurumon) allow an End of Your Turn DNA digivolution followed by an attack. The committed KB Q4345/Q4346 and Q4361/Q4362 require the pending evolution and attack effects to resolve in the attack timing window; a second follow-up attack cannot begin during an existing attack.

## Reproduced defects

- Deferred P-221 effects were still present after resolution. Nested Security and end-turn windows resolved the same three effects again (nine resolutions instead of three). See `pending-dna-triggers-red.log`.
- Varodurumon's follow-up did not bind the DNA result. With an unrelated ally present, the original implementation produced no attack. See `varodurumon-result-binding-red.log` (original 043 module restored temporarily, then restored to the fix).
- Even after correctly draining the pending effects before Counter, a 20000-DP target reduced to zero remained on the field when Counter opened. The enclosing effect-body depth suppressed state-based rules. See `pending-dna-zero-dp.log` (one failure, two passing controls).

## Changes and observable proof

The engine retires the exact deferred trigger object before resolving it. Both cards use the existing attack timing drain, and Varodurumon binds its newly created DNA permanent. The forced-attack primitive pauses enclosing effect-body depth only while draining the attack's pending window, restoring it in a finally block, so rule processing runs between those effects.

The mechanism test drives public Main end and Counter pass. P-221's two When Digivolving effects and one When Attacking effect resolve exactly once, before Counter and Security. A 25000-DP target survives at 5000; a 20000-DP target is already in trash before Counter. Varodurumon's inherited -4000 applies during the attack (1000 remaining DP) and expires at turn end (5000 remaining DP). An unrelated ally does not attack.

## Validation

- `pending-dna-final-focus.log`: focused mechanism plus BT20-036/043, 3 files / 17 tests passed, including distinct affordable DNA results in the second-copy fixture.
- `pending-dna-affected-suites.log`: stack, resolution, primitives, rule processing, Execute/Partition, timing conformance, Security, and Blast DNA; 16 files / 284 tests passed.
- `pending-dna-attack-peers.log`: eight peer cards using the same attack drain plus interpreter; 9 files / 251 tests passed.

Catalog synchronization, typecheck, style, final focused rerun and collection validation are recorded separately. This mechanism checkpoint does not confer complete card or collection scores.

## Independent review and static checks

Luna B reviewed the shared changes read-only against `09b392891`, including pending-object identity, depth restoration on exceptions, fallback behavior, and async serialization. No blocker was found. BT20-scoped effects synchronization changes only 036/043; `pending-dna-effects-check.log` confirms all 102 records synchronized. The seven affected source/test files pass Oxlint with zero findings and Oxfmt. `git diff --check` passes. The first workspace typecheck found missing imports in pending card tests026/091; root corrected both and will record the API rerun independently. Shared and web typechecks passed in that invocation.

`pending-dna-api-typecheck-rerun.log` passes after the pending test-import fixes. Together with the successful shared/web checks in the workspace invocation, all workspace projects typecheck at this checkpoint. Remaining broad card-fixture followups are separate from this mechanism change.
