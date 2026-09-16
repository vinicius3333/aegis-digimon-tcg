import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const returnTokenCardFromTrash: Action = {
  kind: "Return",
  target: {
    filter: {
      zone: "trash",
      controller: "mine",
      excludeKind: ["DigiEgg"],
      nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
    },
    count: 1,
  },
  to: "hand",
  optional: true,
  raw: "You may return 1 non-Digi-Egg card with [Dracomon] or [Examon] in its text from your trash to the hand",
};

const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [returnTokenCardFromTrash] },
    { trigger: "WhenDigivolving", actions: [returnTokenCardFromTrash] },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
          },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Examon"], match: "text" }],
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
            },
          ],
          raw: "When any of your other Digimon with [Dracomon] or [Examon] in their texts are played, this Digimon may digivolve into a Digimon card with [Examon] in its text in the hand with the cost reduced by 2",
        },
      ],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, names: ["Dracomon"], cost: 2, isAlternate: true }],
};

export { compiled };

registerIrCard("EX13-039", compiled);
