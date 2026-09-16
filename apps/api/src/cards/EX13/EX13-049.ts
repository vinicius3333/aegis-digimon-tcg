import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const X_ANTIBODY_OR_CHRONICLE: Filter = {
  controllerDefault: "mine",
  nameOrTrait: [{ tokens: ["X Antibody", "Chronicle"], match: "trait" }],
};

const revealThreeAddOne = (): Action => ({
  kind: "RevealAdd",
  revealCount: 3,
  add: [{ filter: X_ANTIBODY_OR_CHRONICLE, count: 1, to: "hand" }],
  rest: "deckTopOrBottom",
  raw: "Reveal the top 3 cards of your deck. Add 1 card with the [X Antibody] or [Chronicle] trait among them to the hand. Return the rest to the top or bottom of the deck.",
});

export const compiled: CompiledCard = {
  cardId: "EX13-049",
  effects: [
    { trigger: "WhenMoving", actions: [revealThreeAddOne()] },
    { trigger: "OnPlay", actions: [revealThreeAddOne()] },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
          amount: -2000,
          duration: "forTheTurn",
          raw: "1 of your opponent's Digimon gets -2000 DP for the turn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { namesExact: ["Dorimon"], cost: 0, isAlternate: true },
    { level: 2, colors: ["Black"], traits: ["X Antibody"], cost: 0, isAlternate: true },
  ],
};

registerIrCard("EX13-049", compiled);
