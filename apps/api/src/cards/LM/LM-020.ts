// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      // No [Once Per Turn] is printed on this clause.
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          // "By placing 1 Digimon on top of ITS OWNER's security stack": the Digimon carries no
          // possessive, so either player's is eligible, and the destination follows its owner.
          source: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
          ownerSecurity: true,
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
