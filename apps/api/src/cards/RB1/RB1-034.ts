import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Green"],
            nameOrTrait: [{ tokens: ["Beast", "Animal", "Sovereign"], match: "traitContains" }],
            excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              optional: true,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
            },
          ],
          raw: "When one of your Digimon would digivolve into a qualifying green Beast, Animal or Sovereign card, you may suspend this Tamer to reduce the cost by 1",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              suspended: true,
              nameOrTrait: [{ tokens: ["Angoramon"], match: "text" }],
            },
            count: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("RB1-034", compiled);
