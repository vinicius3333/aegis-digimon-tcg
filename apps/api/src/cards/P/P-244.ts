import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const vemmonExact = [{ tokens: ["Vemmon"], match: "nameExact" as const }];
const vemmonText = [{ tokens: ["Vemmon"], match: "text" as const }];

export const compiled: CompiledCard = {
  effects: [
    {
      effectKey: "P-244/main",
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Vemmon", "Zenith"], match: "nameExact" }] },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      effectKey: "P-244/delay-digivolve",
      trigger: "YourTurn",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controller: "mine", kind: ["Digimon"], byEffect: true },
          addedDigivolutionCardFilter: { nameOrTrait: vemmonExact },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: vemmonText },
                count: 1,
              },
              into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: vemmonText },
              from: ["hand", "trash"],
              reduceCost: 3,
              payCost: true,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      effectKey: "P-244/security",
      trigger: "Security",
      actions: [{ kind: "ActivateMain" }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-244", compiled);
