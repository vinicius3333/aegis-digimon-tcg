# Coordinator review queue

## Initial batches

BT23-001–003 returned to Luna A: legal public egg evolution/source transitions, once-per-turn reset across real turn flow, and Motimon opponent-turn exclusion are missing from the original tests. Existing public attack cases remain useful.

BT23-004–006 returned to Luna B: DemiMeramon original red BT1-010 host over purple egg is not a demonstrated legal evolution; duration only starts on opponent turn. Elizamon Q5586 uses injected OnDeclaration. Huckmon has legal evolution into itself but inherited tests use preassembled hosts and omit next-turn reset. Require targeted additions, preserving useful existing coverage.

## Prioritize after initial batches

BT23-101 and BT23-102 should be assigned early because their historical 10/10 has especially weak direct behavioral proof and may expose reusable gaps.

- Hudiemon: original 5 tests include only one behavioral case, injected OnPlay; others are structural. Require public play/evolution, inclusive cost-5 CS hand play vs cost-6/non-CS/trash negatives, mandatory DP tail after refusal, Hudie Digimon vs Hudie Tamer/opponent counts, single target and duration, attack return-cost/refusal/no-cost-source/repeat/reset, legal CS level-3 recipe, exact Erika recipe at 3/4 Hudie Tamers, inherited Alliance, newly played Tamer attack restriction. Local Q6708 explicitly states Tamer evolution does not trigger When Digivolving or when-a-Digimon-evolves listeners; Q6709 retains bonus draw; Q6710–12 specify Tamer source semantics. Q5572–73 constrain derived timing and rule deletion. Q5257/Q5319 cover two Alliance instances with DNA interaction.
- Mastemon: all original dynamic cases inject timing or security removal; positive same-level setup is Mastemon directly under Mastemon, without a legal route. Require actual legal evolution (including a legal same-level pair), hand/trash yellow/purple <=5 boundaries/refusal with mandatory trim, 2/3/4 security count boundaries and exact top-trash order, natural security checks/removal on each player's turn, immediate Security precedence Q5390, optional own/opponent source with correct physical card destinations, turn usage/reset, Barrier, named Partition and Q5392 self-security exclusion. Trace whether stack cards are trashed rather than all placed in security.
