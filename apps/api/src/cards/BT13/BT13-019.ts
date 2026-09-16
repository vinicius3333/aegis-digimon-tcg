import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playFromTrashOrBreeding = () =>
  [
    {
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          excludeNameOrTrait: [{ tokens: ["Omnimon", "Gankoomon"], match: "nameExact" }],
          or: [
            {
              nameOrTrait: [{ tokens: ["Sistermon"], match: "name" }],
            },
            {
              trait: "Royal Knight",
              hostFilter: {
                zone: "breeding",
              },
            },
          ],
        },
        count: 1,
        upTo: true,
      },
      from: ["trash", "digivolutionCards"],
      payCost: false,
      optional: true,
    },
  ] satisfies Action[];
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: playFromTrashOrBreeding(),
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: playFromTrashOrBreeding(),
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-019", compiled);
