import type { Action, CardEffect, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const dracomonOrExamonText: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
  printedTextOnly: true,
};

const trashStackCards: Action = {
  kind: "TrashDigivolution",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
    count: "all",
  },
  amount: 1,
  scope: "acrossDigimon",
  scaling: { per: 1, filter: { controllerDefault: "mine" }, unit: "digivolutionCards" },
  raw: "For each of this Digimon's digivolution cards, trash any 1 digivolution card from your opponent's Digimon",
};

const returnFewestStackDigimon: Action = {
  kind: "Return",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDigivolutionCards" },
    count: "all",
  },
  to: "deckBottom",
  optional: true,
  raw: "you may return all of their Digimon with the fewest digivolution cards to the bottom of the deck",
};

const preventLeave: Action = {
  kind: "Replacement",
  event: "wouldLeavePlay",
  mode: "prevent",
  optional: true,
  affectsAll: true,
  target: { filter: dracomonOrExamonText, count: "all" },
  cost: {
    kind: "suspend",
    target: { filter: dracomonOrExamonText, count: 1 },
    raw: "by suspending 1 of your [Dracomon]/[Examon]-text Digimon",
  },
  raw: "When any of your [Dracomon] or [Examon] text Digimon would leave the battle area, by suspending 1 of your such Digimon, they don't leave.",
};

const leavePrevention = (isInherited: boolean): CardEffect => ({
  trigger: "AllTurns",
  frequency: "OncePerTurn",
  ...(isInherited ? { isInherited: true } : {}),
  actions: [preventLeave],
});

const removalEffect = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [trashStackCards, returnFewestStackDigimon],
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Raid", raw: "＜Raid＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    removalEffect("OnPlay"),
    removalEffect("WhenDigivolving"),
    leavePrevention(false),
    leavePrevention(true),
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["Wingdramon", "Groundramon"], cost: 3, isAlternate: true }],
  assemblyRequirement: [
    {
      materials: [5, 4, 3].map((level) => ({
        count: 1,
        level,
        nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" as const }],
      })),
      reduceCost: 5,
    },
  ],
};

registerIrCard("EX13-024", compiled);
