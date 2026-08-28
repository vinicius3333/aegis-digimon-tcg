// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const option = {
  filter: {
    controller: "mine",
    zone: "hand",
    kind: ["Option"],
    playCostLte: 4,
    nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
  },
  count: 1,
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }], actions: [] },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "CostGatedBlock",
              cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 },
              optional: true,
              abortOnDecline: true,
              actions: [
                {
                  kind: "UseOptionWithoutCost",
                  from: ["hand"],
                  payCost: false,
                  allowMultiColor: true,
                  selectionRequired: true,
                  filter: option.filter,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["Glowing Dawn"], cost: 2, isAlternate: true }],
};
registerIrCard("BT26-053", compiled);
export default compiled;
