// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const tsTrashCost = {
  kind: "trash",
  target: { count: 1, filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } },
};
const startMainCost = {
  kind: "return",
  target: {
    count: 1,
    filter: {
      zone: "trash",
      controller: "mine",
      kind: ["Digimon"],
      nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
    },
  },
  to: "deckBottom",
};
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: startMainCost,
          optional: true,
          abortOnDecline: true,
          actions: [
            { kind: "GainMemory", amount: 1 },
            {
              kind: "Return",
              to: "hand",
              target: {
                count: 1,
                filter: {
                  zone: "trash",
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Giant Slayer"], match: "nameExact" }],
                },
              },
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: tsTrashCost,
          optional: true,
          abortOnDecline: true,
          actions: [{ kind: "Draw", controller: "mine", amount: 2 }],
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT26-087", compiled);
