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
              kind: "TrashDigivolution",
              target: { filter: { controller: "mine", kind: ["Tamer"], digivolutionCards: "hasAny" }, count: 1 },
              amount: 1,
              fromTop: false,
              optional: true,
            },
            { kind: "UseOptionWithoutCost", from: ["hand"], payCost: false, optional: true, filter: option.filter },
          ],
        },
      ],
    },
    {
      trigger: "None",
      isInherited: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "permanent" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["Glowing Dawn"], cost: 2, isAlternate: true }],
};
registerIrCard("BT26-053", compiled);
export default compiled;
