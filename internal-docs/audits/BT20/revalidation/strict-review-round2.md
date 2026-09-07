# Strict review checkpoint after the named-source and immediate-return corrections

These are lead integration notes from independent Luna reviews, not final scores.

- Six named-source conditions (019/024/026/028/059/102) are fixed in pushed commit 144ead257. CR 2-3-1-2 and P-139 Q4246 require exact card names, not a shared X Antibody trait; EX5-070's Rule alias qualifies. The existing generic matcher handles this without a new runtime matcher.
- Public return effects exposed another real engine gap: nested timing deferral delayed `wouldBeReturned` until the target had already moved. The current root fix exempts that immediate event only. Public hand/deck return replacement and refusal are covered by `immediateReturnReaction.test.ts`; the affected 152-test run is green. The resulting full collection passes 800 tests and workspace typecheck; the correction is pushed in 826045f62.
- 046 Machine/nonmatching evolution,048 Chronicle Option search,050 natural two-attack OPT/reset,052/055 natural face-up Security end-turn play,053 actual attack-time evolution/immunity, and055 exact source-count boundary now have passing public tests. Mutation evidence for050 and055 fails observable state assertions. These additions are pushed through 3b90441f3.
- 063 Q4285/Q4286 is already naturally covered in006: a legal006 egg/063 source/068 host dies in public battle,006 recovery moves either the deleted host or its source, and the pending inherited memory effect follows the deleted host's area identity. Do not add an inferior direct-primitive duplicate.
- CR 15-7-1 explicitly defines `by X, Y` as an optional processing condition;15-7-4 permits declining it. Reviewer claims that062/065/067 costs become mandatory without the word “may” are incorrect.065 now adds a feasible public refusal case. Plain mandatory `Trash ... Then ...` instructions are a different rule shape.
- 074 now has a public opponent Cocytus Breath DNA replacement, feasible refusal, missing-result negative, and actual BT2-107 Security suppression/control. The defending player's Security memory gain reduces the attacker's memory, so the control is8 from10. The engine correction is pushed in 826045f62.
- 080 now publicly evolves a legal064→070→071→080 stack, declines the initial trash play, plays and Mind Links BT14-087, accepts the reactivated070 trash play, and separately declines the optional attack. Its earlier invalid Bulkmon/stack/auto-response fixtures are superseded.

## Follow-up candidates still requiring lead adjudication

- 056 actual breeding-area evolution during an attack, and inherited Ouryuken leave prevention; verify existing mechanism coverage before duplicating it.
- 057 combined external and self play-cost reductions (for example013 playing057 with a qualifying named Digimon) needs a direct comparison if not already covered.
- 078 Q4401 public effect-driven opponent evolution with simultaneous When Digivolving and Reapermon watcher ordering.
- 081–102 still need the same strict independent review pass; their committed tests and the full green snapshot are evidence, not automatic acceptance.
- Re-read all remaining reports before assigning final scores. Some older reports list already-resolved gaps; others still identify real omissions.

## Invalid suggested fixtures rejected by the lead

- A former evolution base becomes a digivolution card before When Digivolving, so024's public Gomamon X→Seadramon X negative is valid. Adding a second level3 below it would not improve legality.
- An ordinary Main digivolution cannot be performed on the opponent's turn to test a Your Turn modifier. Use a legal effect-driven path or existing shared timing proof.
- 037's On Play lock affects a selected existing permanent. Playing an unrelated new copy does not test that lock; a real pending On Play interleaving would be required. Existing shared timing/restriction coverage may discharge this risk.
- Main End of Attack Draw on050 is not inherited; an Examon host above050 cannot prove it. The accepted proof uses HoverEspimon itself plus public Garurumon unsuspension.

The current acceptance checkpoint is 13/102 cards at 10/10, pushed in 3bcee0925. The remaining strict review notes above do not grant final scores.
