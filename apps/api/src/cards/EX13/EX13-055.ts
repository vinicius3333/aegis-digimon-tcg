import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const minusThreeThousand = (): Action => ({
  kind: "ModifyDP",
  target: { filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
  amount: -3000,
  duration: "forTheTurn",
  raw: "1 of your opponent's Digimon gets -3000 DP for the turn",
});

export const compiled: CompiledCard = {
  cardId: "EX13-055",
  effects: [
    { trigger: "OnPlay", actions: [minusThreeThousand()] },
    { trigger: "WhenDigivolving", actions: [minusThreeThousand()] },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
          },
          from: ["hand", "trash"],
          payCost: true,
          optional: true,
          raw: "This Digimon may digivolve into a Digimon card with the [Chronicle] trait in the hand or trash",
        },
      ],
    },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { namesExact: ["Dorumon"], cost: 2, isAlternate: true },
    { level: 3, traits: ["Chronicle"], cost: 2, isAlternate: true },
  ],
};

registerIrCard("EX13-055", compiled);
