---
title: Intrinsic play-cost deduplication
updated: 2026-09-27
---

# Intrinsic play-cost deduplication

The continuous pass installs a hand-resident self cost modifier for each physical card. The play-cost predicate matches the card definition, so two identical hand copies used to contribute two reductions to a single play. Retained app logs show two BT6-112 plays on 2026-09-27: at 02:54:53 UTC, seven qualifying trash cards and memory 6 resulted in cost 0 instead of 5; at 03:00:43 UTC, nine qualifying trash cards and memory 8 resulted in cost 0 instead of 3. Both card movements were from hand to battle area. The report's description of a play from trash could refer to another game or to BeelStarmon's subsequent Option recovery.

At `ModifierLedger.playCostFor`, matching modifiers from the same intrinsic card and compiled action count once. Entries remain separate in the ledger so each source keeps its own lifecycle. Unrelated card effects and separate printed actions continue to stack. This mirrors the existing intrinsic evolution-cost query behavior.

Behavioral regressions cover BT6-112 BeelStarmon (seven trash reducers, two hand copies), BT4-115 Lucemon (ten trash cards, two hand copies), and BT2-023 Gomamon (two opposing source-less Digimon, two hand copies).
