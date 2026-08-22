import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          toTop: true,
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "SecurityManipulation",
          op: "revealAllChooseToDeckTopShuffleRest",
          controller: "opponent",
        },
      ],
    },
    {
      trigger: "StartOfOpponentsTurn",
      actions: [
        {
          kind: "DeclareCategoryImmunity",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          controller: "opponent",
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-020", compiled);
