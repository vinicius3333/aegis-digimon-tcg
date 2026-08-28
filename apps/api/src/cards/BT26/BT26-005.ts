// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon", "Tamer"],
              playCostLte: 5,
              nameOrTrait: [
                { tokens: ["Avian"], match: "trait" },
                { tokens: ["DATA SQUAD"], match: "trait" },
              ],
            },
          },
          cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-005", compiled);
