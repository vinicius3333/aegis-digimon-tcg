import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const mamemonNamed: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Mamemon"], match: "name" }],
};

const playableMamemonOrMutant: Filter = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  playCostLte: 10,
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
  raw: "Reveal the top 3 cards of your deck. You may play 1 play cost 10 or lower Digimon card with [Mamemon] in its name or the [Mutant] trait among them without paying the cost. Trash the rest",
});

const deleteHighestPlayCost = (): Action => ({
  kind: "Delete",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestPlayCost" },
    count: 1,
  },
  raw: "Delete 1 of your opponent's highest play cost Digimon",
});

const grantKeyword = (keyword: "Blocker" | "Guard"): Action => ({
  kind: "Aura",
  target: { filter: mamemonNamed, count: "all" },
  effect: { kind: "keyword", keyword: { keyword, raw: `＜${keyword}＞` } },
  raw: `All of your Digimon with [Mamemon] in their names gain ＜${keyword}＞`,
});

export const compiled: CompiledCard = {
  cardId: "EX13-063",
  effects: [
    { trigger: "OnPlay", actions: [revealAndFreePlay()] },
    { trigger: "WhenDigivolving", actions: [revealAndFreePlay()] },
    { trigger: "OnDeletion", actions: [revealAndFreePlay()] },
    { trigger: "OnDeletion", actions: [deleteHighestPlayCost()] },
    { trigger: "AllTurns", actions: [grantKeyword("Blocker"), grantKeyword("Guard")] },
  ],
  coverage: "full",
  residual: [],
  assemblyRequirement: [
    {
      reduceCost: 4,
      materials: [
        {
          count: 3,
          levelMax: 5,
          nameOrTrait: [{ tokens: ["Mamemon"], match: "text" }],
          differentNames: true,
        },
      ],
    },
  ],
};

registerIrCard("EX13-063", compiled);
