import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              zone: "battleArea",
              controller: "mine",
              kind: ["Digimon"],
              excludeColors: ["White"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Sukamon"],
                match: "name",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          ignoreRequirements: true,
          optional: true,
          raw: "1 of your non-white Digimon may digivolve into a Digimon card with [Sukamon] in its name in your hand without paying the cost, ignoring its digivolution requirements.",
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "SetBaseDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          value: 3000,
          duration: "untilYourTurnEnd",
          raw: "Until the end of your turn, change 1 of your opponent's Digimon into having 3000 DP.",
        },
        {
          kind: "GrantStatic",
          target: {
            filter: {},
            count: 1,
            sameTarget: true,
          },
          grant: {
            dp: 3000,
            color: "white",
            originalName: "Sukamon",
          },
          duration: "untilYourTurnEnd",
          raw: "Until the end of your turn, change that Digimon into being white, having 3000 DP, and having an original name of [Sukamon].",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-097", compiled);
export { compiled };
