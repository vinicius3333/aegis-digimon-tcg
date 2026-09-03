import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }],
              },
              count: 1,
            },
            raw: "By trashing 1 Digimon card with a [Hybrid] trait",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 2000 },
          while: {
            kind: "selfHasTrait",
            filter: {
              nameOrTrait: [
                { tokens: ["Hybrid"], match: "trait" },
                { tokens: ["Ten Warriors"], match: "trait" },
              ],
            },
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT12-009", compiled);
