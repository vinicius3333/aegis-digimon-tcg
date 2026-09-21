# Pending trigger condition revalidation

SubTrigger watchers preserve the identity and event snapshot captured when their event occurs,
but their action-level board condition remains live until activation. The engine now includes that
condition in the watcher's live `matches` gates, which are checked before every pending trigger in
the chosen resolution order.

EX13-067 Q7435 demonstrates the boundary: two Nokia Shiramine copies trigger together while the
player controls one Digimon. The first may suspend and play Gabumon; that changes the Digimon count,
so the second pending Nokia no longer meets `permanentCount <= 1` and neither suspends nor plays.
Event identity, trigger ordering, and frozen event-subject semantics remain unchanged.
