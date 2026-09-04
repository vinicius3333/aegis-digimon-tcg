// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
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
            nameOrTrait: [
              {
                tokens: ["Dark Dragon", "Evil Dragon"],
                match: "trait",
              },
            ],
          },
          from: ["trash"],
          payCost: true,
          optional: true,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 4,
            raw: "you have 4 or fewer cards in your hand",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-006", compiled);
