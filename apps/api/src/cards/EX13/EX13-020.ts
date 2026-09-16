import type { Action, CardEffect, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const selfDpBuff: Action = {
  kind: "ModifyDP",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  amount: 1000,
  duration: "untilOpponentTurnEnd",
  scaling: { per: 1, unit: "colors", filter: { zone: "trash", controller: "any" } },
  raw: "This Digimon gets +1000 DP until your opponent's turn ends for each color in trashes",
};

const opponentDigimon: Target = { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 };

const opponentDpDebuff: Action = {
  kind: "ModifyDP",
  target: opponentDigimon,
  amount: -4000,
  duration: "untilOpponentTurnEnd",
  scaling: { per: 5000, unit: "selfDP" },
  raw: "to 1 of your opponent's Digimon, give -4000 DP until their turn ends for every 5000 DP this Digimon has",
};

const unsuspendFreeOrRoyalKnight: Action = {
  kind: "Unsuspend",
  target: {
    filter: {
      controller: "mine",
      kind: ["Digimon"],
      nameOrTrait: [{ tokens: ["Free", "Royal Knight"], match: "trait" }],
    },
    count: 1,
  },
  optional: true,
  raw: "1 of your [Free] or [Royal Knight] trait Digimon may unsuspend",
};

const buffEffect = (trigger: "OnPlay" | "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: "ir-shared-buff",
  actions: [selfDpBuff, opponentDpDebuff],
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Armor Purge", raw: "＜Armor Purge＞" },
      ],
    },
    buffEffect("OnPlay"),
    buffEffect("WhenDigivolving"),
    buffEffect("WhenAttacking"),
    {
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [unsuspendFreeOrRoyalKnight],
    },
    {
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [unsuspendFreeOrRoyalKnight],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["Veemon"], cost: 3, isAlternate: true }],
  assemblyRequirement: [{ reduceCost: 2, materials: [{ namesExact: ["Veemon"], count: 1 }] }],
};

registerIrCard("EX13-020", compiled);
