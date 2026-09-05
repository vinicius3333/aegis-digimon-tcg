# EX9-074 mandatory per-color selection

The local rulings Q5003–Q5005 require considering all seven opposing colors,
selecting each permanent at most once, and not sacrificing another possible
selection by assigning a multicolor permanent to the wrong color. Two focused
runtime regressions currently fail: a white opponent survives a six-color
source stack, and preferring the red/blue opponent leaves a red opponent alive.

Sorting single-color targets first only biases automatic answers; it does not
constrain the choices offered to a player. A deterministic matching would
remove legitimate player choices. Instead, offer only choices that preserve
the maximum matching between remaining colors and remaining permanents.

A small pure helper computes maximum cardinality using augmenting paths.
For each color, a candidate is legal if reserving it still permits the remaining
maximum number of distinct targets. The interpreter retains interactive choices
among all legal candidates and deletes the selected targets together. Seven
color nodes bound the work; no exponential subset search is necessary.

EX9-074 is the sole current DeletePerColor card consumer. Its six-color condition
remains in IR; the action considers all seven colors, not only source colors.
Focused runtime tests and pure matching regressions must pass before closeout.
These regressions do not by themselves establish the full card's audit score.
