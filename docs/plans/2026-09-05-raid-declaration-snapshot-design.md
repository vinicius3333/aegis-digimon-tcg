# Raid eligibility at attack declaration

EX9-001 attack evolution exposes inherited Raid from EX9-008 or EX9-010.
Local Q4751/Q4752 prohibit that newly acquired effect from triggering for the
attack already declared. Both focused runtime cases reproduced the incorrect
redirect before the engine change.

The combat controller queried Raid after resolving When Attacking effects.
Capture its eligibility at the start of attack declaration instead, before
suspension or effect resolution can evolve the attacker. Continue selecting
the opponent's highest-DP unsuspended target at resolution; target state must
remain live even though trigger eligibility is captured.

Reordering the entire combat trigger queue would be substantially broader.
Checking only the current top-card identity would incorrectly suppress an
already triggered inherited effect after evolution. The declaration boolean
addresses this particular non-retroactivity defect without those changes.

Verification includes both EX9-001 regressions, existing inherited Raid
acceptance/refusal in EX9-008, and the advanced-keyword combat regressions.
This does not claim that all attack keyword ordering is redesigned or audited.

Independent review also identified departure during When Attacking: a captured
Raid trigger could still open a redirect choice after the attacker left play.
The BT3-086 production attack effect reproduces that departure; a test-seam
Raid grant isolates the keyword eligibility. Reuse `attackerStillValid` before
opening the Raid choice. The regression asserts no redirect, no Raid choice,
no security check and no pending decision after departure. The combined
focused run passes 3 files / 39 tests after this additional guard.
