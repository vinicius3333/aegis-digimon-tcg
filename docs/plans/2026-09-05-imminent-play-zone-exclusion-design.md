# Exclude the imminent play instance consistently

The EX9-030 payment work propagates the instance being played into the
would-be-played window. That instance cannot also be offered as an ordinary
origin-zone card for paying its own processing cost (CR 7-1-3 / 15-15-3-1).

The initial exclusion was inside the array collector used for hand, trash,
deck, security and breeding top cards. Direct iteration over stacks, linked
cards and cards under Tamers bypassed it. Five focused candidate-resolution
tests reproduced the omission while retaining an independent eligible source.

Apply the exclusion once at the result boundary of `looseCardsInZone`.
This covers direct iterators and combined aliases without duplicating a guard
in each branch. Preserve order, metadata and all unrelated instances; when
there is no imminent-play trigger, return the complete ordinary result.

Verification includes the candidate-resolution tests with and without the
trigger, plus EX9-030 payment and EX9-057 mixed-zone regressions. This change
does not finalize the broader pending free-play payment work; final runtime
review, collection gates and delivery of those other changes remain required.
