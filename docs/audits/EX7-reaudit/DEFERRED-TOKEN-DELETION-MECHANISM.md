# Deferred Token On Deletion mechanism

An effect-cost deletion triggers On Deletion immediately but defers activation until the causing effect finishes. Tokens leave the match instead of entering trash, so a deferred window cannot recollect their source afterward.

The engine now snapshots deleted Token instances into nested deferred On Deletion windows, as it already does for pooled rule deletions. Ordinary deleted cards are still recollected from their legal destination, preserving the existing activation-after-trigger checks.

EX7-030 Q3847 publicly deletes Familiar for Overclock, observes Familiar's -3000 DP together with Cendrillmon's -6000 DP, and completes the forced attack. Token, Overclock, and leave-prevention regressions remain green.
