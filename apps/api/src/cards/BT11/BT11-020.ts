// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Gaogamon"], match: "name" }],
              },
              count: 1,
              to: "hand",
            },
            { filter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Blue"] }, count: 1, to: "hand" },
          ],
          rest: "trash",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
          to: "hand",
          condition: {
            kind: "youHave",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"] },
            raw: "you have a Tamer in play",
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

registerIrCard("BT11-020", compiled);
