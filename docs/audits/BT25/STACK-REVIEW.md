# BT25 evolution-stack review

Astra added a read-only AST scan after repeated review found purportedly realistic fixtures using the wrong printed levels. `BT1-010` and `BT1-013` are **level 3**, according to the committed catalog; earlier informal assumptions that they were level 4 were incorrect.

Reproduce candidate discovery from the repository root after the normal shared/API build: `node tools/audit-bt25-stack-candidates.mjs`; append `--json` for structured output. The scanner reads literal `under` stacks and resolves simple card constants. It checks each adjacent source/top pair with the engine's printed and alternate evolution comparators. It does not understand effect placement, DNA/App Fusion history, runtime variables or all context gates. Findings are review candidates, not automatic illegality verdicts. The first run found 77 candidate transitions across the collection.

Independent inspection confirmed missing or illegal ordinary evolution progressions in approved evidence for **005, 012, 016, 025 and 027**. Their approvals are withdrawn until repaired and rerun. The inventory records concrete offending cards and required proof. No production card defect is inferred solely from these fixtures. Other candidates remain part of the per-card review queue, including several already-unapproved inherited hosts and later unreviewed cards.

The 1087-test checkpoint remains a reproducible passing regression result. It does not override this stricter evidence review or establish 10/10 for a card with an invalid proof fixture.

## Reviewed candidate dispositions

| Card     | Candidate                               | Disposition                                                                                                                                                   |
| -------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BT25-005 | BT10-064 → EX7-066                      | Intentional Option-effect placement under an already legal host; the surrounding inherited chain is now black Lv.2 BT25-005 → BT10-058 → BT10-062 → BT10-064. |
| BT25-038 | BT1-053 → BT1-062 and BT1-001 → BT1-060 | Invalid seeded chains repaired to BT1-053 → BT1-060 and BT1-053 → BT1-060 → BT1-062.                                                                          |
| BT25-040 | BT25-040 → BT1-009                      | Invalid inherited host repaired to yellow Lv.6 BT1-062 over yellow Lv.5 BT25-040.                                                                             |
| BT25-041 | BT25-041 → BT25-057                     | Invalid same-level inherited host repaired to yellow Lv.6 BT1-062 over yellow Lv.5 BT25-041.                                                                  |

All remaining scanner candidates are unresolved until their owning card audit records whether the transition is an effect placement, a special evolution route, or an invalid seeded stack.
