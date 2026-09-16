import type { Action, CardEffect, CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };

const opponentDigimon: Filter = { controller: "opponent", kind: ["Digimon"] };

const maySuspendOne: Action = {
  kind: "Suspend",
  target: { filter: opponentDigimon, count: 1 },
  optional: true,
  raw: "You may suspend 1 of your opponent's Digimon",
};

const mayChooseBattleTarget: Action = {
  kind: "SelectBind",
  target: { filter: opponentDigimon, count: 1, bindAs: "paladinBattleTarget" },
  optional: true,
  abortOnDecline: true,
  raw: "you may return all digivolution cards of 1 of their Digimon to the bottom of the deck and have this Digimon battle it",
};

const compareDigivolutionCards: Action = {
  kind: "GainKeyword",
  target: self,
  keyword: { keyword: "IceClad", raw: "＜Ice Clad＞" },
  duration: "untilEndOfBattle",
  raw: "Compare the number of digivolution cards instead of DP in this battle",
};

const returnAllDigivolutionCards: Action = {
  kind: "ReturnTopDigivolutionCards",
  target: { filter: opponentDigimon, count: 1, fromSelectionRef: "paladinBattleTarget" },
  cardsPerTarget: 99,
  position: "bottom",
  raw: "return all digivolution cards of 1 of their Digimon to the bottom of the deck",
};

const battleBoundTarget: Action = {
  kind: "Battle",
  attacker: self,
  defender: { filter: opponentDigimon, count: 1, fromSelectionRef: "paladinBattleTarget" },
  raw: "have this Digimon battle it",
};

const suspendAndBattleEffect = (trigger: "OnPlay" | "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: "ir-shared-paladin-suspend-battle",
  actions: [
    maySuspendOne,
    mayChooseBattleTarget,
    compareDigivolutionCards,
    returnAllDigivolutionCards,
    battleBoundTarget,
  ],
});

const battleWonEffect: CardEffect = {
  trigger: "AllTurns",
  frequency: "OncePerTurn",
  actions: [
    {
      kind: "SubTrigger",
      event: "whenBattleWon",
      sourceFilter: { isSelfRef: true },
      raw: "When this Digimon wins a battle",
      actions: [
        {
          effectTextPart:
            "[All Turns] [Once Per Turn] When this Digimon wins a battle, you may return 1 of your opponent's Digimon to the bottom of the deck.",
          kind: "Return",
          target: { filter: opponentDigimon, count: 1 },
          to: "deckBottom",
          optional: true,
          raw: "you may return 1 of your opponent's Digimon to the bottom of the deck",
        },
        {
          effectTextPart: "Then, this Digimon may unsuspend.",
          kind: "Unsuspend",
          target: self,
          optional: true,
          raw: "this Digimon may unsuspend",
        },
      ],
    },
  ],
};

export const compiled: CompiledCard = {
  cardId: "EX13-076",
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Piercing", raw: "＜Piercing＞" },
        { keyword: "Vortex", raw: "＜Vortex＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Evade", raw: "＜Evade＞" },
      ],
    },
    suspendAndBattleEffect("OnPlay"),
    suspendAndBattleEffect("WhenDigivolving"),
    suspendAndBattleEffect("WhenAttacking"),
    battleWonEffect,
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: self,
          grant: "trait",
          tokens: ["Free"],
          raw: "[Rule] Trait: Has [Free] Attribute.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 6, traits: ["Free", "Royal Knight"], cost: 5, isAlternate: true }],
  assemblyRequirement: [
    {
      reduceCost: 8,
      materials: [{ count: 6, kinds: ["Digimon"], traits: ["Free", "Royal Knight"], differentNames: true }],
    },
  ],
};

registerIrCard("EX13-076", compiled);
