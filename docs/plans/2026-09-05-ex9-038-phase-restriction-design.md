# EX9-038 optional cost and phase-specific restriction

The catalog and Q4791/Q4792 limit the selected opponent Digimon's next unsuspend
phase. They do not prohibit an effect from unsuspending it. The restriction still
applies when the selected Digimon was already suspended.

Reuse EX9-037's optional cost-bearing ConditionalBranch: payment gates Suspend and
the same-target Restrict together, while an unchanged orientation does not abort
the restriction. Use `unsuspendDuringOwnUnsuspendPhase` with
`untilOpponentNextUnsuspendPhase`, not blanket `unsuspend` through turn end.
No shared engine change is needed; registration remains `registerIrCard` only.

The original restriction failed public behavior tests: BT1-095's security effect
could not unsuspend the target, and the restriction remained during opponent Main.
The corrected card passes these cases, accepted and refused costs at both timings,
Q4792, Training, evolution-route boundaries, and inherited Piercing after two real
digivolutions. EX9-037 supplies the shared duration regression for an effect granted
after the opponent's current unsuspend phase. Synchronize the EX9 effects record
at collection closeout.
