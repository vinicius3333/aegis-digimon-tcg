// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX4-033 (Terriermon Assistant).
// Card has effectText AND inheritedEffectText as separate sections:
// effectText:
//   "(Rule) Name: Also treated as [Terriermon]."
//   "[Your Turn] When an effect suspends this Digimon, 1 of your Digimon gets +4000 DP for the turn."
// inheritedEffectText:
//   "[Your Turn] When <Alliance> suspends one of your Digimon, this Digimon may digivolve
//    into a 2-color green Digimon card in your hand for the cost.
//    When this Digimon would digivolve by this effect, reduce the cost by 2."
//
// runtime-effect fixes:
// - effect[0] GrantStatic "Terriermon" — preserved (correct).
// - effect[1] (non-inherited) SubTrigger: should fire when THIS CARD is suspended by any
//   effect. sourceFilter targets self (isSelfRef:true). No Alliance or bySourceController
//   restriction — the text says "when an effect suspends this Digimon" (any effect).
// - effect[2] (isInherited:true) SubTrigger: should fire when <Alliance> suspends one of
//   your Digimon. bySourceKeyword:"Alliance" + sourceFilter: controller:"mine" Digimon.
//   Then this Digimon digivolves into a 2-color green from hand, cost reduced by 2.
//   (CAP-C-17 bySourceKeyword gate — source attribution is carried by the suspension seam.)
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "name",
          tokens: ["Terriermon"],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: 4000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          bySourceKeyword: "Alliance",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                multicolor: true,
                colorCount: 2,
                colors: ["Green"],
              },
              from: ["hand"],
              payCost: true,
              costDelta: -2,
              optional: true,
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-033", compiled);
