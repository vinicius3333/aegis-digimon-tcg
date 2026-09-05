# Preserve derived-trigger activation tiers

EX9-069 Q4830 and comprehensive rules 15-4-5-2/3 require both reactions to
the first start-main placement to precede the other pending start-main effect.
The public ordering decision reproduced a mixed offer after resolving only one
derived reaction. Two small resolver tests also fail for same-seat and
opposing-seat derived effects: parent, child-a, older, child-b.

The previous resolver remembered only whether an effect had ever been active.
After one derived member resolved, its unresolved sibling became indistinguishable
from the older pending parent group. Sorting new effects first is insufficient;
eagerly draining a stored snapshot would bypass the existing live activation
and cancellation checks.

Assign each newly active batch a monotonically increasing tier, retained by
instance/effect key throughout the timing window. Re-collect and revalidate as
before, but offer only the highest remaining active tier. Nested derived batches
interrupt that tier; turn-player priority applies within each tier. Resolution,
decline, cancellation and loop protections remain unchanged.

Verify the real two-Tamer ordering decisions, both resolver seat variants,
existing stack tests and relevant timing regressions before delivery.
