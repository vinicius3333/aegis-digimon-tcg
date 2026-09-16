import type { Action, CardEffect, CompiledCard, Condition, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1 as const, isSelf: true };
const theirDigimon: Filter = { controller: "opponent", kind: ["Digimon"], zone: "battleArea" };

const thinOwnSecurity: Condition = {
  kind: "zoneCount",
  seat: "mine",
  zone: "security",
  op: "lte",
  value: 3,
  raw: "you have 3 or fewer security cards",
};

const trashBoostTrash = (): Action[] => [
  { kind: "trashSecurityTop", controller: "mine", count: 1, raw: "trash your top security card" },
  {
    kind: "ModifyDP",
    target: self,
    amount: 10000,
    duration: "untilOpponentTurnEnd",
    raw: "this Digimon gets +10000 DP until your opponent's turn ends",
  },
  {
    kind: "trashSecurityTop",
    controller: "opponent",
    count: 1,
    condition: thinOwnSecurity,
    raw: "trash their top security card",
  },
];

const TRASH_USE_KEY = "EX13-037/trash-and-boost";

const trashWindow = (trigger: "OnPlay" | "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: TRASH_USE_KEY,
  actions: trashBoostTrash(),
});

const keywordWindow = (keyword: "Raid" | "Piercing" | "Blocker"): CardEffect => ({
  trigger: "Static",
  actions: [],
  keywords: [{ keyword, raw: `＜${keyword}＞` }],
});

export const compiled: CompiledCard = {
  cardId: "EX13-037",
  effects: [
    keywordWindow("Raid"),
    keywordWindow("Piercing"),
    keywordWindow("Blocker"),
    trashWindow("OnPlay"),
    trashWindow("WhenDigivolving"),
    trashWindow("WhenAttacking"),
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          raw: "[All Turns] [Once Per Turn] When security stacks are removed from, 1 of your opponent's Digimon gets -12000 DP until their turn ends. Then, if you have 3 or fewer security cards, ＜Recovery +1＞",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: theirDigimon, count: 1 },
              amount: -12000,
              duration: "untilOpponentTurnEnd",
              raw: "1 of your opponent's Digimon gets -12000 DP until their turn ends",
            },
            { kind: "Recover", amount: 1, condition: thinOwnSecurity, raw: "＜Recovery +1＞" },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, texts: ["Witchelny"], cost: 3, isAlternate: true }],
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [
        { level: 5, count: 1, nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }] },
        { level: 4, count: 1, nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }] },
        { level: 3, count: 1, nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }] },
      ],
    },
  ],
};

registerIrCard("EX13-037", compiled);
