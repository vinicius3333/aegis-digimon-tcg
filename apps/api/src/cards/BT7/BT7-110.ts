import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT7-110 Evolution Ancient (Option Card)
// Static (prerequisite): if you have a Digimon with [Hybrid] in its traits in play,
//   you may use this Option without meeting its color requirements. (WaiveColorRequirement)
// [Main] Your level 4 Digimon can digivolve into 1 Digimon card in your hand with
//   matching colors and [Ten Warriors] in its traits for its digivolution cost,
//   ignoring its level.
//   - target: level 4 Digimon (yours)
//   - into: Ten Warriors trait, matching colors, from hand
//   - payCost: true (for its digivolution cost)
//   - ignoreLevelRequirement: true (ignoring its level — only level req bypassed,
//     color requirements still apply via standard digivolution rules)
// See LANE_E.md CAP-E-01 for ignoreLevelRequirement capability spec.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon with [Hybrid] in its traits in play",
          },
          optional: false,
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levels: [4],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Ten Warriors"],
                match: "trait",
              },
            ],
          },
          from: ["hand"],
          payCost: true,
          ignoreLevelRequirement: true,
          colorsMatchDigivolvingSource: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-110", compiled);
