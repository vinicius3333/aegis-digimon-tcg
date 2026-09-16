import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Rei Katsura"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              condition: {
                kind: "permanentCount",
                seat: "mine",
                filter: { controller: "mine", kind: ["Tamer"] },
                op: "lte",
                value: 1,
                raw: "you have 1 or fewer Tamers",
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      isLinked: true,
      actions: [],
      keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      traits: ["Appmon"],
      cost: 0,
      isAlternate: true,
    },
  ],
  linkRequirement: [{ traits: ["Appmon"], cost: 1 }],
};

registerIrCard("BT24-067", compiled);
