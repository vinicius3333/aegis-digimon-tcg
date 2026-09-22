import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              zone: "battleArea",
              nameOrTrait: [{ tokens: ["Veemon", "Veedramon"], match: "name" }],
            },
            raw: "you have a Digimon with [Veemon] or [Veedramon] in its name",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          effectTextPart: "[Your Turn] When any of your Digimon unsuspend, by suspending this Tamer, ＜Draw 1＞.",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
            {
              kind: "Digivolve",
              effectTextPart:
                "After, 1 of your Digimon may digivolve into a Digimon card with [Veedramon] in its name in the hand with the cost reduced by 2.",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }],
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
            },
          ],
          cost: {
            kind: "suspend",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer",
          },
          optional: true,
          abortOnDecline: true,
          raw: "When any of your Digimon unsuspend, by suspending this Tamer, ＜Draw 1＞. After, 1 of your Digimon may digivolve into a Digimon card with [Veedramon] in its name in the hand with the cost reduced by 2.",
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

registerIrCard("EX13-069", compiled);
