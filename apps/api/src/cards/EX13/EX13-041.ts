import type { Action, CardEffect, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const suspendOne: Action = {
  kind: "Suspend",
  target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
  raw: "Suspend 1 of your opponent's Digimon or Tamers",
};

const unsuspendLock: Action = {
  kind: "Restrict",
  target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
  restriction: "unsuspendDuringOwnUnsuspendPhase",
  duration: "untilOpponentNextUnsuspendPhase",
  raw: "1 of their Digimon or Tamers can't unsuspend in their next unsuspend phase",
};

const strikeEffect = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [suspendOne, unsuspendLock],
});

const selfInBattleArea: Target = {
  filter: { isSelfRef: true, zone: "battleArea" },
  count: 1,
  isSelf: true,
};
const breakdramonAlias: Action = {
  kind: "GrantStatic",
  target: selfInBattleArea,
  grant: "name",
  tokens: ["Breakdramon"],
  raw: "This Digimon is also treated as [Breakdramon]",
};
const examonDnaLevelSix: Action = {
  kind: "GrantStatic",
  target: selfInBattleArea,
  grant: { kind: "TreatAsLevel", level: 6, context: "DNADigivolution", intoNames: ["Examon"] },
  raw: "This Digimon is also treated as Lv.6 for [Examon]'s DNA digivolution",
};

const securityTrashOnBattleWin: Action = {
  kind: "SubTrigger",
  event: "whenDeletesInBattle",
  sourceFilter: {
    controller: "mine",
    kind: ["Digimon"],
    nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
    printedTextOnly: true,
  },
  actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
  raw: "When any of your Digimon with [Dracomon] or [Examon] in their texts delete your opponent's Digimon in battle, trash their top security card",
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Fortitude", raw: "＜Fortitude＞" }],
    },
    strikeEffect("OnPlay"),
    strikeEffect("WhenDigivolving"),
    {
      trigger: "AllTurns",
      actions: [breakdramonAlias, examonDnaLevelSix],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [securityTrashOnBattleWin],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["Coredramon"], cost: 3, isAlternate: true }],
};

registerIrCard("EX13-041", compiled);
