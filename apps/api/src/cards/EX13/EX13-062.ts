import type { Action, CardEffect, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentLowestPlayCostDigimon: Action = {
  kind: "Delete",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
    count: "all",
  },
  optional: true,
  raw: "you may delete all of your opponent's Digimon with the lowest play cost",
};

const immuneToOpponentEffects: Action = {
  kind: "GrantImmunity",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  immuneFrom: "opponentEffects",
  duration: "untilOpponentTurnEnd",
  raw: "Your opponent's effects don't affect this Digimon until their turn ends",
};

const immunityWindow = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [immuneToOpponentEffects],
});

const compiled: CompiledCard = {
  cardId: "EX13-062",
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Reboot", raw: "＜Reboot＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    immunityWindow("OnPlay"),
    immunityWindow("WhenDigivolving"),
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [opponentLowestPlayCostDigimon],
          raw: "When this Digimon suspends, you may delete all of your opponent's Digimon with the lowest play cost",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 3000,
              duration: "untilYourTurnEnd",
              raw: "it gets +3000 DP until your turn ends",
            },
          ],
          raw: "When this Digimon unsuspends, it gets +3000 DP until your turn ends",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [
        { count: 1, level: 5, colors: ["Black"], nameOrTrait: [{ tokens: ["＜Blocker＞"], match: "text" }] },
        { count: 1, level: 4, colors: ["Black"], nameOrTrait: [{ tokens: ["＜Blocker＞"], match: "text" }] },
        { count: 1, level: 3, colors: ["Black"], nameOrTrait: [{ tokens: ["＜Blocker＞"], match: "text" }] },
      ],
    },
  ],
};

export { compiled };

registerIrCard("EX13-062", compiled);
