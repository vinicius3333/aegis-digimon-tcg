# EX9-049 paid evolution

## Contract and failure

The committed Sukamon text permits evolution into a Ver.3 Digimon from hand or trash after placing exactly three Ver.3 Digimon from trash face down under itself. It does not waive the evolution cost. Comprehensive rules 2-3-5 and 8-1 define that cost; Q4804 requires the complete three-card placement payment.

Real turn-end tests reproduced a free evolution into EX9-074 from both zones: after passing, memory remained at -3 instead of paying its printed five-memory evolution cost and reaching -8. The interpreter treats an omitted Digivolve `payCost` flag as false.

## Decision

Set `payCost: true` on EX9-049's existing Digivolve action, matching the explicit paid-evolution pattern already used by EX9-028. Preserve compiled IR registration and the shared interpreter. Changing the interpreter's default would also affect legitimately free evolutions; adding a card-specific engine exception is unnecessary.

## Verification

Focused tests exercise both zones through the production turn machine, exact payment, face-down bottom placement below an existing source, bonus draw, full memory payment, optional refusal, two-of-three payment failure, the alternate DM route and nonmatching base, a non-Ver.3 evolution rejection, and live inherited Blocker combat. The paired EX9-028 regression passed with the initial correction.

The nonmatching evolution test does not prove Once Per Turn: preflight rejects the evolution before placement. A separate repeat-activation proof remains an audit follow-up, not a claim of this payment correction.

Effects synchronization and collection-wide closeout remain part of the pending EX9 audit.
