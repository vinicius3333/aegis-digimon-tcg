import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "you may suspend this Tamer",
          },
          actions: [],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            { kind: "GainMemory", amount: 1 },
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
              condition: {
                kind: "anyOf",
                raw: "you have [Argomon] or a yellow Digimon with [Agumon]/[Greymon]",
                conditions: [
                  {
                    kind: "youHave",
                    filter: {
                      controllerDefault: "mine",
                      kind: ["Digimon"],
                      nameOrTrait: [{ tokens: ["Argomon"], match: "nameExact" }],
                    },
                    raw: "you have [Argomon]",
                  },
                  {
                    kind: "youHave",
                    filter: {
                      controllerDefault: "mine",
                      kind: ["Digimon"],
                      colors: ["Yellow"],
                      nameOrTrait: [{ tokens: ["Agumon", "Greymon"], match: "nameExact" }],
                    },
                    raw: "you have a yellow Digimon with [Agumon]/[Greymon]",
                  },
                ],
              },
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

registerIrCard("BT17-089", compiled);
