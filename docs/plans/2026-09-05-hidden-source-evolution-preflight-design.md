# Hidden source payment may create an evolution target

EX9-006 Q4748 permits evolution into the card just trashed as its bottom
face-down source cost. The activation preflight previously rejected an empty
trash before payment could create that target. The focused runtime case
reproduced no evolution before the fix.

Both effect activation and action confirmation call `canAttemptDigivolve`.
Keep the exception there rather than duplicating it at only one call site.
When a payable cost trashes a face-down digivolution card and the evolution
can use trash, defer destination eligibility until payment. A valid base must
still exist; the normal cost check remains authoritative. Do not inspect the
hidden card's identity or traits to decide whether to offer activation.

The resolver rebuilds the trash pool after payment and applies ordinary
filter and evolution-requirement checks. A nonmatching hidden source can
therefore be paid without granting an illegal evolution. The explicit
negative test proves this behavior and unchanged memory.

Alternatives rejected: blindly skipping all evolution preflight would weaken
unrelated effects; predicting the hidden card's match would leak information;
patching only the action confirmation leaves the earlier activation gate red.

Focused regression: EX9-006, P-092, EX10-066 and EX9-070 pass 4 files / 41 tests.
The earlier suspected EX9-006 Once Per Turn defect was a test expectation
error: the first paid source correctly remained in trash after the second
attack. The revised test compares source instance IDs across both attacks.
