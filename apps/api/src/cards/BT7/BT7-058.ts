import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["DarkKnightmon"], match: "nameExact" }],
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["DeadlyAxemon"], match: "nameExact" }],
              },
              count: 1,
              from: ["battleArea"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            targetIsPermanent: true,
            shedOwnCards: true,
            raw: "by trashing all digivolution cards of 1 [DeadlyAxemon] and placing it under this Digimon",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: { keyword: "SecurityAttack", amount: 1 },
          duration: "forTheTurn",
          condition: {
            kind: "selfHasNameContaining",
            names: ["Knightmon", "Bagramon"],
            raw: "this Digimon has [Knightmon] or [Bagramon] in its name",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-058", compiled);
