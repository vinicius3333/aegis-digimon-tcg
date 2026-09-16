import type { Action, CardEffect, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trashBottomTwoSources: Action = {
  kind: "TrashDigivolution",
  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
  amount: 2,
  fromTop: false,
  raw: "trash the bottom 2 digivolution cards of 1 of your opponent's Digimon",
};

const suspendLock: Action = {
  kind: "Restrict",
  target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
  restriction: "suspend",
  blocksCombatSuspend: true,
  duration: "untilOpponentTurnEnd",
  raw: "1 of their Digimon or Tamers can't suspend until their turn ends",
};

const strikeEffect = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [trashBottomTwoSources, suspendLock],
});

const selfInBattleArea: Target = {
  filter: { isSelfRef: true, zone: "battleArea" },
  count: 1,
  isSelf: true,
};
const slayerdramonAlias: Action = {
  kind: "GrantStatic",
  target: selfInBattleArea,
  grant: "name",
  tokens: ["Slayerdramon"],
  raw: "This Digimon is also treated as [Slayerdramon]",
};
const examonDnaLevelSix: Action = {
  kind: "GrantStatic",
  target: selfInBattleArea,
  grant: { kind: "TreatAsLevel", level: 6, context: "DNADigivolution", intoNames: ["Examon"] },
  raw: "This Digimon is also treated as Lv.6 for [Examon]'s DNA digivolution",
};

const unsuspendHostOnSuspend: Action = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { isSelfRef: true },
  hostFilter: { nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }], printedTextOnly: true },
  actions: [
    {
      kind: "Unsuspend",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      optional: true,
      raw: "it may unsuspend",
    },
  ],
  raw: "When this Digimon with [Dracomon] or [Examon] in its text suspends, it may unsuspend",
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
    },
    strikeEffect("OnPlay"),
    strikeEffect("WhenDigivolving"),
    {
      trigger: "AllTurns",
      actions: [slayerdramonAlias, examonDnaLevelSix],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [unsuspendHostOnSuspend],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["Coredramon"], cost: 3, isAlternate: true }],
};

registerIrCard("EX13-021", compiled);
