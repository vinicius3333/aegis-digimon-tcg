import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] 1 of your Digimon gets +2000 DP for the turn.",
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          amount: 2000,
          duration: "forTheTurn",
        },
        {
          effectTextPart:
            "Then, by placing 1 Digimon card with [Gammamon] in its name from your hand under 1 of your Digimon as its bottom digivolution card, ＜Draw 1＞. (Draw 1 card from your deck.)",
          kind: "PlaceUnder",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }] },
            count: 1,
            from: ["hand"],
          },
          underFilter: { controller: "mine", kind: ["Digimon"] },
          position: "bottom",
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart:
            "Then, by placing 1 Digimon card with [Gammamon] in its name from your hand under 1 of your Digimon as its bottom digivolution card, ＜Draw 1＞. (Draw 1 card from your deck.)",
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: { kind: "ifThisEffectActed", raw: "this effect placed Gammamon" },
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }] },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };
registerIrCard("BT10-094", compiled);
