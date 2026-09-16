import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playableMamemonOrMutant: Filter = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  playCostLte: 7,
  nameOrTrait: [
    { tokens: ["Mamemon"], match: "name" },
    { tokens: ["Mutant"], match: "trait", orPrevious: true },
  ],
};

const revealAndFreePlay = (): Action => ({
  kind: "RevealAdd",
  revealCount: 3,
  add: [{ filter: playableMamemonOrMutant, count: 1, to: "play", optional: true }],
  rest: "trash",
  raw: "Reveal the top 3 cards of your deck. You may play 1 play cost 7 or lower Digimon card with [Mamemon] in its name or the [Mutant] trait among them without paying the cost. Trash the rest",
});

const deleteLowestPlayCost = (count: 1 | "all"): Action => ({
  kind: "Delete",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
    count,
  },
  cost: {
    kind: "deleteOwn",
    target: {
      filter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Mamemon"], match: "name" }],
      },
      count: 1,
    },
    raw: "By deleting 1 of your Digimon with [Mamemon] in its name",
  },
  optional: true,
  abortOnDecline: true,
  raw:
    count === "all"
      ? "By deleting 1 of your Digimon with [Mamemon] in its name, delete all of your opponent's Digimon with the lowest play cost"
      : "By deleting 1 of your Digimon with [Mamemon] in its name, delete 1 of your opponent's Digimon with the lowest play cost",
});

export const compiled: CompiledCard = {
  cardId: "EX13-059",
  effects: [
    { trigger: "WhenDigivolving", actions: [revealAndFreePlay()] },
    { trigger: "OnDeletion", actions: [revealAndFreePlay()] },
    { trigger: "EndOfYourTurn", frequency: "OncePerTurn", actions: [deleteLowestPlayCost(1)] },
    {
      trigger: "EndOfYourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [deleteLowestPlayCost("all")],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-059", compiled);
