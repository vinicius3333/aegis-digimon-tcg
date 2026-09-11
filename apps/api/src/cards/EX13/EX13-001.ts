import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored implementation for EX13-001 (Gigimon), a red Digi-Egg.
// Printed inherited effect (the card's only text):
//   [Your Turn] [Once Per Turn] When any of your red Tamers are played, this Digimon may
//   digivolve into a Digimon card with [Growlmon] or [Gallantmon] in its name in the hand
//   with the cost reduced by 2.
//
// Shape follows the established "watch a play event, then let the host digivolve cheaply
// out of hand" family: P-188 / BT25-002 supply the `whenPlayed` + Tamer `sourceFilter`
// half, BT23-053 supplies the `Digivolve` + `into.nameOrTrait` + `reduceCost: 2` half.
// `match: "name"` is the substring form the printed "in its name" wording requires, so
// WarGrowlmon and Gallantmon: Crimson Mode are legal destinations too.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Tamer"],
            colors: ["Red"],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isSelfRef: true,
                  kind: ["Digimon"],
                },
                count: 1,
                isSelf: true,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  { tokens: ["Growlmon"], match: "name" },
                  { tokens: ["Gallantmon"], match: "name" },
                ],
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
            },
          ],
          raw: "When any of your red Tamers are played, this Digimon may digivolve into a Digimon card with [Growlmon] or [Gallantmon] in its name in the hand with the cost reduced by 2",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-001", compiled);
