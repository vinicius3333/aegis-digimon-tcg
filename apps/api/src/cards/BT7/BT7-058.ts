// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [{
        kind: "Digivolve",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DarkKnightmon"], match: "name" }] },
        from: ["hand"],
        payCost: false,
        draw: true,
        optional: true,
        cost: {
          kind: "place",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DeadlyAxemon"], match: "name" }] },
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
      }],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [{
        kind: "GainKeyword",
        target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Knightmon", "Bagramon"], match: "name" }] }, count: "all" },
        keyword: { keyword: "SecurityAttack", amount: 1 },
        duration: "untilOwnerTurnEnd",
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-058", compiled);
