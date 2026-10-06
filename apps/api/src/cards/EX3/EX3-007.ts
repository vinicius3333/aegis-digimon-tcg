import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 3000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "selfHasOnPlayEffect",
            raw: "this Digimon has an [On Play] effect",
          },
        },
      ],
      isInherited: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: {
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Rock Dragon", "Earth Dragon", "Bird Dragon", "Machine Dragon", "Sky Dragon"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
            { filter: { nameOrTrait: [{ tokens: ["Hina Kurihara"], match: "nameExact" }] }, count: 1, to: "hand" },
          ],
          rest: "deckBottom",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-007", compiled);
export default compiled;
