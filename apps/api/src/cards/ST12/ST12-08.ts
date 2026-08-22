// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "ST12-08";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GrantCanAttackUnsuspended",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Sistermon"], match: "name" }] },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] },
            raw: "this Digimon has [Royal Knight] in its traits",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
