# Exact suspension-cost payment

EX8-074 Q3986 requires suspending two Digimon for its four-memory reduction.
A public play at memory zero with only one eligible Digimon currently succeeds:
the fixed-count target resolver returns the available subset and `payCost`
compares the suspension receipt only with that subset, not the printed count.

The correction belongs in shared suspension-cost payment, before mutations.
Reject a non-`upTo` numeric target whose selected count differs from its required
count. Keep `all`, implicit self costs, and explicit `upTo` selection semantics.
Retain the existing post-suspension receipt validation for failed state changes.

Alternatives rejected: a card-specific exception would duplicate payment rules;
changing general effect targeting would incorrectly stop ordinary effects from
doing as much as possible. This change validates costs only.

Verification: EX8-074 public one-target failure and two-target success; focused
shared payment regressions for exact two, explicit up-to two, and normal self
costs. Review the diff and run affected type/style checks before delivery.
Immunity and declaration-time affordability are separate gates and are not
claimed solved by this count check.
