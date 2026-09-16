import type { Action, CardEffect, CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const dracomonOrExamonText: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
  printedTextOnly: true,
};

const suspendUpToTwo: Action = {
  kind: "Suspend",
  target: {
    filter: { controllerDefault: "any", kind: ["Digimon", "Tamer"] },
    count: 2,
    upTo: true,
  },
  optional: true,
  raw: "You may suspend up to 2 Digimon or Tamers",
};

const lockTwoOpponentPermanents: Action = {
  kind: "Restrict",
  target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 },
  restriction: "unsuspend",
  duration: "untilOpponentTurnEnd",
  raw: "2 of your opponent's Digimon or Tamers can't unsuspend until their turn ends",
};

const suspendWindow = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [suspendUpToTwo, lockTwoOpponentPermanents],
});

const battleOnAllySuspend: Action = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { controller: "mine", kind: ["Digimon"] },
  actions: [
    {
      kind: "Battle",
      attacker: { filter: dracomonOrExamonText, count: 1 },
      defender: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } satisfies Target,
      optional: true,
    },
  ],
  raw: "When any of your Digimon suspend, 1 of your Digimon with [Dracomon] or [Examon] in its text may battle 1 of your opponent's Digimon",
};

const battleClause = (isInherited: boolean): CardEffect => ({
  trigger: "AllTurns",
  frequency: "OncePerTurn",
  ...(isInherited ? { isInherited: true } : {}),
  actions: [battleOnAllySuspend],
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Piercing", raw: "＜Piercing＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    suspendWindow("OnPlay"),
    suspendWindow("WhenDigivolving"),
    battleClause(false),
    battleClause(true),
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["Groundramon", "Wingdramon"], cost: 3, isAlternate: true }],
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

registerIrCard("EX13-044", compiled);
