# Integration review notes

No card is accepted solely because its focused file passes. Lead acceptance remains separate from worker proposals.

## Test execution policy

The lead now owns every Vitest invocation. Luna agents write and debug assigned tests using the returned failure logs. No worker launches Vitest or a package build. This replaces the initial request/grant test-slot policy and ensures one process in this worktree.

## Observed fixture pitfalls

- `Permanent.stack` contains digivolution cards only, bottom first; `topCard` is separate. A rookie evolved from an egg has a one-card stack.
- `setupEngine` starts in Main. Digivolution can occur there in breeding, but `moveFromBreeding` must occur in the real Breeding phase. A Digimon in breeding cannot attack.
- The initial player's first turn skips its normal draw. Assert exact card identities against that rule when testing Start of Main Phase; do not classify a first-versus-second deck card mismatch as an engine gap.
- `advance.fire(OnEndTurn)` fires a timing, not the full lifecycle or duration sweep. Use the real turn and end-phase intent for expiry proof.
- Every asynchronous action must settle before the next action. An early keyword milestone does not prove the subsequent security battle completed.
- Every negative needs a feasible positive alternative. A second level-4 destination on an already level-4 host cannot prove once-per-turn suppression.
- Catalog alternate evolution requirements are part of printed text and compiled requirements. Liollmon can evolve from a level-2 ACCEL source such as Pinamon, regardless of its ordinary yellow/black evolution fields. The lead rerun proved that public route succeeds.
- Read all inherited effects in the chosen legal stack. Jesmon over Huckmon and BaoHuckmon receives two additional +1000 DP auras alongside DemiVeemon's +2000 DP.
- Pending On Deletion effects must follow the deleted host, as Q4285/Q4286 specify. Recovering the host and recovering an inherited source have different results.

## Current reproduced failures

- `001-004-review.log`: BT20-001 expected 13000 DP but the live legal stack produces 15000 because of the two allied inherited auras; BT20-004 incorrectly expected the top card inside `stack`. Both are fixture assertions under correction.
- `007-natural-review.log`: BT20-007 naturally draws the first deck card, while the test incorrectly expected the second after assuming a normal first-turn draw. Its public Bebydomon evolution succeeds.
- BT20-005 Q4284 reproduced an engine defect: Jamming was applied before the immediate Security decision. The prepareRevealTriggers fix passes the card regression and synthetic late-installation/removed-anchor/face-down priority cases. Cross-family ordering remains unresolved: reveal watchers, OnSecurityCheck, and OnLoseSecurity still form separate pools, contrary to the simultaneous ordering requirement.

Every failed experiment stays below full behavioral acceptance until the exact fixture or engine cause is resolved and rerun.
