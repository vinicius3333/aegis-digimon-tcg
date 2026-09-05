# EX9-039 hand-to-bottom placement

The catalog requires an optional card from the controller's hand to become
the source Digimon's face-down bottom digivolution card. The previous IR
omitted both the source zone and the position. The interpreter consequently
searched hand, trash and deck, and inserted immediately below the top card.

Use the existing `from: ["hand"]` and `position: "bottom"` fields in both
On Play and When Digivolving. Changing interpreter defaults would affect
unrelated cards and is unnecessary. Keep suspension and the optional attack
independent from accepting placement, as required by Q4793.

Two focused regressions failed before the fix: exact ordered stack identity
and preservation of trash/deck when the hand is empty. Both now pass.
Additional proof uses real legal Green evolution, mandatory draw, printed
evolution cost, suspension followed by battle, explicit placement refusal,
and inherited deletion after a security battle against Digimon/Tamer targets.

Follow-up scenarios exercise Training through its public activation intent,
off-color DM evolution against a non-DM negative, and explicit refusal of an
available attack. This delivery does not claim a complete collection audit.
