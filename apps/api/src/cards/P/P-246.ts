import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const deletedSukamonOrMamemon: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  excludeSelf: true,
  nameOrTrait: [{ tokens: ["Sukamon", "Mamemon"], match: "name" }],
};

const compiled: CompiledCard = {
  cardId: "P-246",
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: deletedSukamonOrMamemon,
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Sukamon", "Etemon", "Mamemon"], match: "name" }],
              },
              from: ["hand"],
              payCost: true,
              costDelta: -2,
              optional: true,
              raw: "this Digimon may digivolve into a Digimon card with [Sukamon], [Etemon] or [Mamemon] in its name in the hand with the cost reduced by 2",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("P-246", compiled);
