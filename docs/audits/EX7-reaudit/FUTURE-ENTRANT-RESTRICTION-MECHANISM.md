# Future-entrant restriction mechanism

EX7-049 Q3855 requires a resolved all-target restriction to cover matching Digimon that enter later during the same duration. The card marks the restriction `whileMatchesTargetFilter`; the interpreter stores a player-scoped predicate instead of a snapshot of current permanent IDs.

The predicate re-evaluates the battle-area level filter for every queried permanent and applies the ordinary opponent-effect immunity gate using the source card's kind. This preserves Q3853 (an immune level 4 is unaffected) and Q3854 (breeding is outside the battle-area filter), while the duration sweep removes the player entry at the opponent-turn boundary.

Public proof plays a level 4 after Metallicdramon resolves, observes the live restriction, rejects its otherwise legal evolution, and separately proves that same evolution succeeds after expiry.
