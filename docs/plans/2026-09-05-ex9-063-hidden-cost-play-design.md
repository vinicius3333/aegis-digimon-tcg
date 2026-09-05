# EX9-063 hidden-source cost and trash play

Digitamamon may trash its bottom face-down source to play an eligible DM Digimon
from trash. The paid source itself can become that candidate. A real attack with
an initially empty trash reproduced the bug: the optional-play preflight returned
before payment, leaving the hidden EX9-010 source in place.

Extend the existing cost-creates-trash exception to a payable structured trash cost
whose target is face-down digivolution cards, only when the play draws from trash.
This follows the existing EX9-006 hidden-source evolution preflight: hidden identity
must not gate payment. Do not mutate or expose the hidden card during validation.
The normal cost resolver reveals/trashes it, then normal play filtering enforces DM,
play-cost ceiling, controller, and other restrictions.

Public negative tests pay hidden non-DM and over-cost DM cards but do not play them.
Existing face-up/foreign-source negatives continue to reject unpayable costs.
No card-module changes or global removal of optional-play validation are needed.
