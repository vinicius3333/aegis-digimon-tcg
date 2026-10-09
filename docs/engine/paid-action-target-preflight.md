# Paid action target preflight

## Current contract (2026-09-27)

Comprehensive Rules §15-7-5 permits a player to execute an optional processing
condition even when its following payload cannot be executed. The printed `By`
wording on an executable `deleteOwn` cost therefore permits payment without a
current payload target. `processingCondition.ts` classifies that printed wording;
`allowCostWithoutTarget` remains available for effects whose IR cannot carry it.

The public BT23-064 and BT17-061 proofs exercise this rule when no opposing
level-4-or-lower Digimon can be deleted. EX13-059's End of Your Turn proof
accepts the `By` condition with no opposing Digimon: the chosen own BigMamemon
goes to trash, while no opposing Digimon is deleted. BT15-027's public turn
proof accepts its `By` deletion even when Q2512's effect-play prohibition
prevents the subsequent Dark Masters play; the own Digimon is trashed, the card
remains in hand, and breeding stays empty. These tests also retain positive and
optional-decline coverage in their card suites.

BT5-081 has a different printed contract: "You may delete 1 of your other
Digimon to delete" an opposing level-5-or-lower Digimon. Its IR and persisted
catalog now preserve that wording instead of calling it `By`; the public Lv.6
negative proves that a targetless activation leaves the own Digimon in play.
`processingCondition.test.ts` verifies the distinction between printed `By`
and "You may ... to" costs.

## Superseded target-preflight finding

The earlier audit treated every destructive `deleteOwn` payment as
transactional and required a legal payload target first. It used EX13-059
with an empty opposing board as evidence that both BigMamemon and a potential
Mamemon payment remained in play. That expectation predates the §15-7-5
correction and is superseded by the current contract and behavioral proofs
above. It must not be used as a rule for other printed `By` costs.
