import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          mode: "prevent",
          leaveCause: "byBattle",
          optional: true,
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Garurumon", "Omnimon"],
                match: "name",
              },
            ],
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                isSelfRef: true,
                sameLevelPair: true,
              },
              count: 2,
              from: ["digivolutionCards"],
            },
            raw: "by trashing 2 cards of the same level from this Digimon's digivolution cards",
          },
          raw: "you may trash 2 cards of the same level in this Digimon's digivolution cards to prevent that deletion",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Garurumon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT9-024", compiled);
