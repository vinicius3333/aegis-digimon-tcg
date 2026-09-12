# Rush lifecycle audit

Status: in progress. Bounded public attack and turn-end proof; neither keyword nor collection certification.

## Rules and consumers

Reviewed `comprehensive-0233`, §16-15, SHA-256 `6f597fcf757c2632ff18ed331c9d1fd671a194944ac62dfdc95564ba4305b7aa`, states that Rush permits attacking in the turn the Digimon was played and is persistent. The conformance suite verifies this fingerprint in its Rush group hook. ST17-10 separately grants Rush for the turn after its selected host evolves; the grant duration comes from the committed card contract rather than interpreting persistent Rush as an unlimited grant.

## Reproducible public proof

`apps/api/src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts` publicly plays BT4-038 and BT8-077 in separate cases, alongside a freshly played vanilla BT1-009. The neutral Digimon's attack is rejected without suspension; the printed Rush Digimon's attack succeeds and completes a security check. Weak BT1-011 security preserves the attacker. A reserve hand card keeps the Main phase open until explicit public phase ending. Printed Rush remains on the same permanent after the turn ends.

`apps/api/src/cards/ST17/ST17-10.test.ts` publicly plays ST17-02, proves its fresh attack refusal, then activates Henry's Main effect. The same permanent evolves to ST17-08, receives Rush, attacks and completes a security check. Memory is ten minus three for playing and four for evolution. Explicit public turn ending removes the temporary Rush while retaining the permanent identity and exact paid stack.

Temporarily removing the shared `isSummoningSick` Rush exception made all three public attack cases fail at attack acceptance (three failures / seventeen skipped). Temporarily changing Henry's grant from `forTheTurn` to `permanent` made its expiry case fail (one failure / seven passes). Both mutations were restored in `finally`; no engine, card module or persisted IR change is retained. Final focused proof passed two files / twenty tests. Independent read-only review found no blockers in fresh-play controls, security survival, phase milestones or grant expiry.

## Remaining obligations

This does not establish a complete Rush inventory or normative denominator. Inherited and multiple grants, top-card changes, departure and re-entry, interactions with other attack restrictions, grants ending on other players' turns, and other duration domains remain open. The wider engine audit and other keyword obligations remain open.

Delivery gates: conformance/combat/effects/ST17/BT4/BT8 regression passed 385 files / 2919 tests. API typecheck, scoped Oxlint, changed-file Oxfmt, audit document layout (4/4) and `git diff --check` passed. These gates apply to this bounded proof rather than the full engine audit denominator.
