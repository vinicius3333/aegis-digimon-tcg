// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT24-025 Shellmon
// Fix: [Your Turn] effect must fire when another blue TS Digimon unsuspends (SubTrigger),
//   not on every YourTurn. This Digimon digivolves into [Venusmon] from hand ignoring level.
//   Q5603: "ignoring level" only bypasses the level requirement; digivolution requirements
//   (color/trait) still apply and the player chooses which to use (Q5604).
//   New capability `ignoreLevelRequirement` on DigivolveAction specified in LANE_H.md (CAP-H-08).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            colors: ["Blue"],
            nameOrTrait: [
              {
                tokens: ["TS"],
                match: "trait",
              },
            ],
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
                nameOrTrait: [
                  {
                    tokens: ["Venusmon"],
                    match: "name",
                  },
                ],
              },
              from: ["hand"],
              payCost: true,
              ignoreLevelRequirement: true,
              optional: true,
            },
          ],
          raw: "When any of your other blue Digimon with the [TS] trait unsuspend, this Digimon may digivolve into [Venusmon] in the hand, ignoring level",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Jamming",
          raw: "＜Jamming＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-025", compiled);
