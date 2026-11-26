import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          add: [
            {
              effectTextPart: "Add 1 [Mukuro Kasukabe]",
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Mukuro Kasukabe"], match: "nameExact" }],
              },
              count: 1,
              to: "hand",
            },
            {
              effectTextPart: "and 1 Digimon card with the [Wizard] trait among them to the hand.",
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Wizard"], match: "trait" }],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD05-05", compiled);
