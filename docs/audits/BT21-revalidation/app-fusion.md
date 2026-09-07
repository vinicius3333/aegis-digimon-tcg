# App Fusion: independent mechanism correction

Sources: committed comprehensive rules 6-5-1-2-4, 8-4-2-1/2/3 and 8-4-3; [official App Fusion procedure](https://world.digimoncard.com/rule/revised/). Exact BT22-039 Q4892 says cards without Link cannot be linked by its effect.

## Reproduced defects

- `logs/app-fusion-stack-red-v2.log`: both public Haru routes leave the partner linked instead of stacking it above the prior top. Both assertions fail for the missing material.
- `logs/app-fusion-public-red-v1.log`: the new explicit partner declaration was ignored by ordinary evolution. Four intended public boundaries fail; a fifth fixture failure from an incorrectly assumed normal color route was replaced with an actual ordinary cost-3 control.
- `logs/app-fusion-cost-red-v1.log`: normal App Fusion pays SnowAgumon's source-less host surcharge, but public Haru App Fusion skips it (memory 1 instead of 0).

## Corrected behavior

The existing digivolve intent now accepts `appFusionLinkedInstanceId`. Its presence declares the exact pair: own Main phase, own battle-area Digimon, result in own hand, correct distinct recipe names, and current selected linked card. The normal evolution path remains independent. Common evolution restrictions and passive/interactive costs apply before App Fusion placement. The partner is rechecked after awaited pre-payment hooks, preventing stale-card duplication or removal of an unrelated link. The suspended state, ordinary evolution draw, and manual provenance are preserved; the event reports `appFusion`.

The effect primitive selects a partner only when there is more than one valid option, pays through the existing evolution-cost seam, and puts the chosen partner above the prior top. Other links remain linked. It checks digivolution restrictions, preserves the permitted effect source zones, and retains the destination When Digivolving window. Moving a partner into the stack does not trash it or trigger a Link-trash cost.

## Evidence and review

Public Haru tests prove both pair orientations, exact stack order, two draws, removed Link DP, and no trash movement. Public declaration tests prove exact name/instance/zone boundaries, an ordinary cost-3 comparison, both suspension states, and a real inherited SnowAgumon surcharge plus source-present negative. A supplemental mechanism grants capacity for two links and verifies that only the selected partner moves. A separate restriction setup proves atomic refusal. The standalone action regression moves the partner during an awaited pre-payment hook and asserts that result hand, unrelated link, memory and top card remain intact.

Luna B independently reviewed the final shared implementation after the stale-partner guard was added and reported no additional concrete defect. The first 49/49 mechanism assertions pass in `logs/app-fusion-final-mechanisms-v1.log`; the subsequent both-suspension expansion is included in the final collection gate. The cost and Q4892 gate passes 13/13 in `logs/app-fusion-cost-green-v1.log`. Globemon, Timemon, and Charismon now use public App Fusion intents and pass 36/36 in `logs/app-fusion-cards-public-v1.log`.

Cross-set tests were corrected only where this shared change disproved their old stack expectations. BT22-039's old Q4892 assertion was vacuous because Fakemon had stayed linked throughout the test. Both its recipe materials lack Link and must stay in the stack after its When Digivolving play; no Link eligibility relaxation is authorized or implemented.

Final full collection, typecheck, style, commits and push remain recorded in the checkpoint ledger. This mechanism correction alone does not complete the collection.

## Stable integration gate

`logs/collection-app-fusion-v10.log` passes **2316/2316 across 136 files**. Shared/API/web typecheck and all 155-path style checks pass. Set-scoped effects check confirms 102 synchronized BT21 records, 18 semantic changes against baseline and zero changes outside BT21. The production card modules themselves are unchanged by this mechanism correction.
