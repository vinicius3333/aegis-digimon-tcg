import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: { kind: "memoryAtMost", controller: "mine", value: 2, raw: "you have 2 memory or less" },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCardReturnsFromTrashToHand",
          sourceFilter: {
            kind: ["Digimon"],
            colors: ["Red"],
            nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "trait" }],
            excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Red"],
                  nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "trait" }],
                  excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
                  dp: { op: "lte", value: 13000 },
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
              dpCeilingModifier: {
                mode: "lowerCeiling",
                amount: 2000,
                scaling: { per: 1, unit: "security", filter: { controller: "opponent" } },
              },
              cost: {
                kind: "return",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "By returning this Tamer to the hand",
              },
              abortOnDecline: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-082", compiled);
export { compiled };
