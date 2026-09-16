import type { Action, CardEffect, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const SHARED_USE_KEY = "EX13-029/security-debuff";

const ownTopSecurity = {
  filter: { controller: "mine", zone: "security", position: "top" },
  count: 1,
} as const;

const debuffOpponentDigimon: Action = {
  kind: "ModifyDP",
  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
  amount: -4000,
  duration: "forTheTurn",
  cost: {
    kind: "trash",
    target: ownTopSecurity,
    raw: "By trashing your top security card",
  },
  raw: "By trashing your top security card, 1 of your opponent's Digimon gets -4000 DP for the turn",
};

const deleteSmallOpponentDigimon: Action = {
  kind: "Delete",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } },
    count: 1,
  },
  condition: {
    kind: "zoneCount",
    seat: "mine",
    zone: "security",
    op: "lte",
    value: 3,
    raw: "you have 3 or fewer security cards",
  },
  raw: "After, if you have 3 or fewer security cards, delete 1 of your opponent's Digimon with 4000 DP or less",
};

const debuffWindow = (trigger: "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: SHARED_USE_KEY,
  actions: [debuffOpponentDigimon, deleteSmallOpponentDigimon],
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }],
    },
    debuffWindow("WhenDigivolving"),
    debuffWindow("WhenAttacking"),
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Wizardmon"],
          raw: "[Rule] Name: Also treated as [Wizardmon].",
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "opponentEffect",
          sourceFilter: {
            isSelfRef: true,
            kind: ["Digimon"],
            printedTextOnly: true,
            nameOrTrait: [{ tokens: ["Dynasmon", "Witchelny"], match: "text" }],
          },
          actions: [],
          cost: {
            kind: "trash",
            target: ownTopSecurity,
            raw: "by trashing your top security card",
          },
          raw: "When this Digimon with [Dynasmon] or [Witchelny] in its text would leave the battle area by your opponent's effects, by trashing your top security card, it doesn't leave",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, texts: ["Witchelny"], cost: 2, isAlternate: true }],
};

registerIrCard("EX13-029", compiled);
