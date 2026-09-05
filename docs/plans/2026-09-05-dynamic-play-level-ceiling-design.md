# Dynamic level ceilings for effect-driven play

EX9-054 raises its level-four play ceiling once per two exact named Negamon
cards across trash and digivolution sources (Q4808). Loose-card matching uses
static definitions, so leaving `levelComparison.scaling` unresolved loses the
dynamic ceiling even when permanent matching can evaluate that shape.

Materialize the computed increment into a static comparison value before both
optional-action preflight and actual play candidate selection. Remove the
consumed scaling field; preserve controller, text matching and other target
constraints. Both phases must use the same calculation to avoid suppressing a
valid optional effect before its candidate can be selected.

Verification covers static/no-scaling passthrough, a scaled unit comparison,
two exact named Negamon (including Digi-Eggs), nonmatching text mentions and
Q4808's mixed trash/surviving-stack count. The mixed case plays level five,
retains the level-six candidate and charges no memory. Other audit clauses
remain governed by the collection ledger and final review.
